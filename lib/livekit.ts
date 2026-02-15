import { AccessToken, RoomServiceClient, WebhookReceiver } from "livekit-server-sdk";

const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY || "devkey";
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET || "secret";
const LIVEKIT_URL = process.env.LIVEKIT_URL || "ws://localhost:7880";

export const LIVEKIT_CLIENT_URL = process.env.LIVEKIT_CLIENT_URL || LIVEKIT_URL;

export const roomService = new RoomServiceClient(LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);

export const webhookReceiver = new WebhookReceiver(LIVEKIT_API_KEY, LIVEKIT_API_SECRET);

// Export for internal API use only - do not use in client code
export { AccessToken, LIVEKIT_API_KEY, LIVEKIT_API_SECRET };
