import { createServer } from "node:http";
import next from "next";
import postgres from "postgres";
import { WebSocketServer } from "ws";

const dev = process.env.NODE_ENV !== "production";
const host = process.env.HOSTNAME || "0.0.0.0";
const port = Number(process.env.PORT || 3000);
const chatPath = "/ws/chat";
const chatChannel = "chat_messages";
const heartbeatMs = 30_000;
const metricsLogMs = 60_000;
const allowedOrigin = process.env.BETTER_AUTH_URL;
const maxPayloadBytes = 8 * 1024;
const maxConnectionsPerIp = Number(process.env.CHAT_WS_MAX_CONNECTIONS_PER_IP || 8);
const sessionCookieCandidates = [
	"__Secure-better-auth.session_token",
	"__Host-better-auth.session_token",
	"better-auth.session_token",
	"session_token",
	"authjs.session-token",
];

const app = next({ dev, hostname: host, port });
const handle = app.getRequestHandler();

const clients = new Set();
const connectionsByIp = new Map();
const metrics = {
	upgradeRequests: 0,
	acceptedConnections: 0,
	rejectedUnauthorized: 0,
	rejectedIpLimit: 0,
	closedHeartbeat: 0,
	closedServerShutdown: 0,
	notifyEvents: 0,
	broadcastMessages: 0,
};

function logEvent(event, fields = {}) {
	console.log(
		JSON.stringify({
			level: "info",
			scope: "chat-ws",
			event,
			ts: new Date().toISOString(),
			...fields,
		}),
	);
}

function broadcast(payload) {
	let meetingId = null;
	try {
		const parsed = JSON.parse(payload);
		meetingId = parsed.meetingId ?? null;
	} catch {
		// ignore parse errors
	}
	for (const client of clients) {
		if (client.readyState !== client.OPEN) continue;
		if (meetingId && client.meetingId && client.meetingId !== meetingId) continue;
		client.send(payload);
	}
}

function parseCookies(header) {
	const cookies = new Map();
	for (const part of header.split(";")) {
		const separator = part.indexOf("=");
		if (separator < 0) continue;
		const key = part.slice(0, separator).trim();
		const value = part.slice(separator + 1).trim();
		try {
			cookies.set(key, decodeURIComponent(value));
		} catch {
			cookies.set(key, value);
		}
	}
	return cookies;
}

function getSessionToken(cookieHeader) {
	if (!cookieHeader) return null;
	const cookies = parseCookies(cookieHeader);
	for (const candidate of sessionCookieCandidates) {
		const value = cookies.get(candidate);
		if (value) return value;
	}
	return null;
}

function hasAllowedOrigin(originHeader) {
	if (!allowedOrigin || !originHeader) return true;
	try {
		return new URL(originHeader).origin === new URL(allowedOrigin).origin;
	} catch {
		return false;
	}
}

function getClientIp(request) {
	const forwarded = request.headers["x-forwarded-for"];
	if (typeof forwarded === "string" && forwarded.length > 0) {
		return forwarded.split(",")[0].trim();
	}
	if (Array.isArray(forwarded) && forwarded[0]) {
		return forwarded[0].split(",")[0].trim();
	}
	return request.socket.remoteAddress || "unknown";
}

function incrementIpConnection(ip) {
	const current = connectionsByIp.get(ip) || 0;
	if (current >= maxConnectionsPerIp) return false;
	connectionsByIp.set(ip, current + 1);
	return true;
}

function decrementIpConnection(ip) {
	const current = connectionsByIp.get(ip) || 0;
	if (current <= 1) {
		connectionsByIp.delete(ip);
		return;
	}
	connectionsByIp.set(ip, current - 1);
}

function releaseWsIp(ws) {
	if (!ws.clientIp || ws.ipReleased) return;
	decrementIpConnection(ws.clientIp);
	ws.ipReleased = true;
}

async function isAuthorizedSocket(sql, request) {
	if (!hasAllowedOrigin(request.headers.origin)) {
		return false;
	}

	const sessionToken = getSessionToken(request.headers.cookie);
	if (!sessionToken) {
		return false;
	}

	const authenticated = await sql`
		select s.user_id
		from session s
		join "user" u on u.id = s.user_id
		where s.token = ${sessionToken}
		and s.expires_at > now()
		and coalesce(u.banned, false) = false
		and coalesce(u.is_active, true) = true
		limit 1
	`;

	return authenticated.length > 0;
}

function rejectUnauthorizedSocket(socket) {
	if (socket.destroyed) return;
	socket.write("HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n");
	socket.destroy();
}

function rejectSocketWithStatus(socket, statusLine) {
	if (socket.destroyed) return;
	socket.write(`HTTP/1.1 ${statusLine}\r\nConnection: close\r\n\r\n`);
	socket.destroy();
}

async function main() {
	await app.prepare();
	const upgradeHandler = app.getUpgradeHandler();

	const server = createServer((req, res) => handle(req, res));
	const wss = new WebSocketServer({ noServer: true, maxPayload: maxPayloadBytes });
	const sql = postgres(process.env.DATABASE_URL, { max: 1 });

	wss.on("connection", (ws) => {
		ws.isAlive = true;
		ws.ipReleased = false;
		ws.meetingId = null;
		clients.add(ws);
		metrics.acceptedConnections += 1;
		ws.on("pong", () => {
			ws.isAlive = true;
		});
		ws.on("message", (data) => {
			try {
				const msg = JSON.parse(data.toString());
				if (msg.type === "join" && typeof msg.meetingId === "string") {
					ws.meetingId = msg.meetingId;
				}
			} catch {
				// ignore malformed messages
			}
		});
		ws.on("close", () => {
			clients.delete(ws);
			releaseWsIp(ws);
		});
		ws.on("error", () => {
			clients.delete(ws);
			releaseWsIp(ws);
		});
	});

	const heartbeatInterval = setInterval(() => {
		for (const ws of clients) {
			if (ws.isAlive === false) {
				clients.delete(ws);
				metrics.closedHeartbeat += 1;
				releaseWsIp(ws);
				ws.close(1001, "Heartbeat timeout");
				setTimeout(() => {
					if (ws.readyState !== ws.CLOSED) {
						ws.terminate();
					}
				}, 1_000);
				continue;
			}
			ws.isAlive = false;
			ws.ping();
		}
	}, heartbeatMs);

	const metricsInterval = setInterval(() => {
		logEvent("metrics", {
			activeClients: clients.size,
			uniqueClientIps: connectionsByIp.size,
			...metrics,
		});
	}, metricsLogMs);

	server.on("upgrade", (request, socket, head) => {
		void (async () => {
			let reservedIp = null;
			try {
				metrics.upgradeRequests += 1;
				const requestUrl = new URL(request.url || "/", `http://${request.headers.host}`);
				if (requestUrl.pathname !== chatPath) {
					upgradeHandler(request, socket, head);
					return;
				}

				const clientIp = getClientIp(request);
				if (!incrementIpConnection(clientIp)) {
					metrics.rejectedIpLimit += 1;
					rejectSocketWithStatus(socket, "429 Too Many Requests");
					return;
				}
				reservedIp = clientIp;

				const authorized = await isAuthorizedSocket(sql, request);
				if (!authorized) {
					decrementIpConnection(clientIp);
					reservedIp = null;
					metrics.rejectedUnauthorized += 1;
					rejectUnauthorizedSocket(socket);
					return;
				}
				if (socket.destroyed) {
					decrementIpConnection(clientIp);
					reservedIp = null;
					return;
				}

				wss.handleUpgrade(request, socket, head, (ws) => {
					ws.clientIp = clientIp;
					wss.emit("connection", ws, request);
				});
				reservedIp = null;
			} catch {
				if (reservedIp) {
					decrementIpConnection(reservedIp);
				}
				socket.destroy();
			}
		})();
	});

	await sql.listen(chatChannel, (payload) => {
		metrics.notifyEvents += 1;
		if (typeof payload === "string" && payload.length > 0) {
			metrics.broadcastMessages += 1;
			broadcast(payload);
		}
	});

	const shutdown = async () => {
		clearInterval(heartbeatInterval);
		clearInterval(metricsInterval);
		await sql.end();
		for (const ws of clients) {
			metrics.closedServerShutdown += 1;
			ws.close(1001, "Server shutting down");
		}
		wss.close();
		server.close(() => process.exit(0));
	};

	process.on("SIGINT", shutdown);
	process.on("SIGTERM", shutdown);

	server.listen(port, host, () => {
		console.log(`> Ready on http://${host}:${port}`);
	});
}

main().catch((error) => {
	console.error("Failed to start application server", error);
	process.exit(1);
});
