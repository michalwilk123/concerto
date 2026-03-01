import type { Role } from "@/types/room";

const RTK_ORG_ID = process.env.RTK_ORG_ID || "";
const RTK_API_KEY = process.env.RTK_API_KEY || "";
const RTK_BASE_URL = "https://api.realtime.cloudflare.com/v2";
const CF_API_BASE_URL = "https://api.cloudflare.com/client/v4";
const CF_ACCOUNT_ID =
  process.env.RTK_ACCOUNT_ID ||
  process.env.CLOUDFLARE_ACCOUNT_ID ||
  process.env.R2_ACCOUNT_ID ||
  "";
const RTK_APP_ID = process.env.RTK_APP_ID || process.env.RTK_ORG_ID || "";
const CF_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN || "";

function authHeader(): string {
  const encoded = Buffer.from(`${RTK_ORG_ID}:${RTK_API_KEY}`).toString("base64");
  return `Basic ${encoded}`;
}

async function rtkFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const method = (options.method || "GET").toUpperCase();
  const bodyStr = typeof options.body === "string" ? options.body : "";
  let parsedBody: unknown = bodyStr;
  try { parsedBody = bodyStr ? JSON.parse(bodyStr) : undefined; } catch { parsedBody = bodyStr; }
  console.log(`[RTK v2] ${method} ${path}`, parsedBody ?? "");

  const res = await fetch(`${RTK_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader(),
      ...options.headers,
    },
  });
  const text = await res.text().catch(() => "");
  console.log(`[RTK v2] ${method} ${path} → ${res.status} ${res.statusText}`, text.slice(0, 1000));
  if (!res.ok) {
    throw new Error(`RealtimeKit API error ${res.status}: ${text}`);
  }
  return new Response(text, { status: res.status, statusText: res.statusText, headers: res.headers });
}

function assertActiveSessionConfig(): void {
  if (!CF_ACCOUNT_ID || !RTK_APP_ID || !CF_API_TOKEN) {
    throw new Error(
      "Missing Cloudflare Active Session config (RTK_ACCOUNT_ID/CLOUDFLARE_ACCOUNT_ID, RTK_APP_ID, CLOUDFLARE_API_TOKEN)",
    );
  }
}

async function cfFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const method = options.method || "GET";
  const bodyStr = typeof options.body === "string" ? options.body : "";
  let parsedBody: unknown = bodyStr;
  try { parsedBody = bodyStr ? JSON.parse(bodyStr) : undefined; } catch { parsedBody = bodyStr; }
  console.log(`[RTK CF v4] ${method} ${path}`, parsedBody ?? "");

  const res = await fetch(`${CF_API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${CF_API_TOKEN}`,
      ...options.headers,
    },
  });
  const raw = await res.text().catch(() => "");
  console.log(`[RTK CF v4] ${method} ${path} → ${res.status} ${res.statusText}`, raw.slice(0, 1000));

  let parsed: unknown = null;
  if (raw) {
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = null;
    }
  }

  if (!res.ok) {
    const message =
      typeof parsed === "object" &&
      parsed !== null &&
      "error" in parsed &&
      typeof (parsed as { error?: { message?: unknown } }).error?.message === "string"
        ? (parsed as { error: { message: string } }).error.message
        : raw || "Unknown Cloudflare API error";
    throw new Error(`Cloudflare API ${method} ${path} failed (${res.status}): ${message}`);
  }

  if (
    typeof parsed === "object" &&
    parsed !== null &&
    "success" in parsed &&
    (parsed as { success?: boolean }).success === false
  ) {
    const message =
      "error" in parsed &&
      typeof (parsed as { error?: { message?: unknown } }).error?.message === "string"
        ? (parsed as { error: { message: string } }).error.message
        : "Cloudflare API responded success=false";
    throw new Error(`Cloudflare API ${method} ${path} rejected request: ${message}`);
  }

  // Keep the same return type for callers that need Response semantics.
  return new Response(raw, {
    status: res.status,
    statusText: res.statusText,
    headers: res.headers,
  });
}

export async function createMeeting(): Promise<string> {
  const res = await rtkFetch("/meetings", { method: "POST", body: JSON.stringify({}) });
  const data = await res.json();
  return data.data.id;
}

export async function addParticipant(
  meetingId: string,
  name: string,
  presetName: string,
  customParticipantId: string,
): Promise<{ id: string; token: string }> {
  const res = await rtkFetch(`/meetings/${meetingId}/participants`, {
    method: "POST",
    body: JSON.stringify({
      name,
      preset_name: presetName,
      custom_participant_id: customParticipantId,
    }),
  });
  const data = await res.json();
  return { id: data.data.id, token: data.data.token };
}

export async function removeParticipant(meetingId: string, participantId: string): Promise<void> {
  await rtkFetch(`/meetings/${meetingId}/participants/${participantId}`, {
    method: "DELETE",
  });
}

export async function updateParticipantPreset(
  meetingId: string,
  participantId: string,
  presetName: string,
): Promise<void> {
  await rtkFetch(`/meetings/${meetingId}/participants/${participantId}`, {
    method: "PATCH",
    body: JSON.stringify({ preset_name: presetName }),
  });
}

export async function listParticipants(
  meetingId: string,
): Promise<Array<{ id: string; name: string; preset_name: string; custom_participant_id?: string }>> {
  const res = await rtkFetch(`/meetings/${meetingId}/participants`);
  const data = await res.json();
  return data.data;
}

export async function kickActiveSessionParticipants(params: {
  meetingId: string;
  participantIds?: string[];
}): Promise<void> {
  assertActiveSessionConfig();
  const { meetingId, participantIds = [] } = params;
  if (participantIds.length === 0) {
    return;
  }
  await cfFetch(
    `/accounts/${CF_ACCOUNT_ID}/realtime/kit/${RTK_APP_ID}/meetings/${meetingId}/active-session/kick`,
    {
      method: "POST",
      body: JSON.stringify({ participant_ids: participantIds }),
    },
  );
}

export async function kickAllActiveSessionParticipants(meetingId: string): Promise<void> {
  assertActiveSessionConfig();
  await cfFetch(
    `/accounts/${CF_ACCOUNT_ID}/realtime/kit/${RTK_APP_ID}/meetings/${meetingId}/active-session/kick-all`,
    {
      method: "POST",
    },
  );
}

export function roleToPreset(role: Role): string {
  switch (role) {
    case "teacher":
      return "group_call_host";
    default:
      return "group_call_participant";
  }
}

export interface RtkRecording {
  id: string;
  meeting_id: string;
  download_url: string;
  file_size: number;
  output_file_name: string;
  stopped_time: string;
  recording_duration: number;
}

export async function listRecordings(): Promise<RtkRecording[]> {
  const res = await rtkFetch("/recordings");
  const data = await res.json();
  return data.data ?? [];
}
