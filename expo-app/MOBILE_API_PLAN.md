# Mobile API Facade Plan

## Principle

Every `/api/mobile/*` route is a **thin wrapper** that calls existing server functions directly. No business logic duplication. The mobile routes only add:

1. Mobile-specific auth (token-based instead of cookie-based)
2. Policy enforcement (student-only scope)
3. Narrower response shapes (strip fields the mobile app doesn't need)

---

## Auth Strategy

### Problem

Current auth uses browser cookies (`better-auth.session_token`). Expo can't reliably use cookies, especially for WebSocket upgrades.

### Solution

Better Auth already stores sessions in the DB with a `token` field. The mobile app will:

1. Call the existing `POST /api/auth/sign-in/email` endpoint to get a session token
2. Store the token in `expo-secure-store`
3. Send it as `Authorization: Bearer <token>` on every request

### Backend Change Required

Add a shared helper that extracts the session from either cookies (web) OR the `Authorization` header (mobile):

```ts
// lib/auth-helpers.ts — modify getSessionOrNull()

async function getSessionOrNull() {
  const headers = await nextHeaders();

  // Try cookie first (web)
  let token = getCookieToken(headers);

  // Fall back to Authorization header (mobile)
  if (!token) {
    const authHeader = headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      token = authHeader.slice(7);
    }
  }

  if (!token) return null;
  // ... existing session validation
}
```

This is a **single change** that makes all existing `requireAuth()`, `requireGroupMember()`, `requireGroupTeacher()` helpers work for mobile automatically. No need to duplicate auth logic in mobile routes.

### WebSocket Auth Change

`server.mjs` needs to accept the token from a query parameter for WebSocket connections:

```js
// server.mjs — modify upgrade handler
const url = new URL(req.url, `http://${req.headers.host}`);
const token = url.searchParams.get("token") || getTokenFromCookies(req);
```

Mobile connects as: `ws://host/ws/chat?token=<session_token>`

---

## Mobile Routes

### Design Rules

1. Each mobile route imports and calls the **same functions** the web routes use
2. Mobile routes live under `app/api/mobile/`
3. Mobile routes use the same `requireAuth()` / `requireGroupMember()` helpers (which now support Bearer tokens)
4. Where policy differs (meeting join), the mobile route overrides the role

---

### Route: `GET /api/mobile/groups`

**Purpose:** List groups the authenticated user belongs to

**Implementation:**
```ts
import { requireAuth } from "@/lib/auth-helpers";
import { db } from "@/db";
import { group, groupMember } from "@/db/schema";

export async function GET() {
  const session = await requireAuth();
  // Same query as GET /api/groups but never returns all groups (no admin mode)
  const groups = await db
    .select({ id: group.id, name: group.name })
    .from(groupMember)
    .innerJoin(group, eq(group.id, groupMember.groupId))
    .where(eq(groupMember.userId, session.user.id));

  return Response.json(groups);
}
```

**Calls:** Direct DB query (same as `/api/groups` for non-admin users)
**Policy:** Always returns only the user's groups, never all groups even for admins

---

### Route: `GET /api/mobile/groups/[groupId]/meetings`

**Purpose:** List meetings for a group

**Implementation:**
```ts
import { requireGroupMember } from "@/lib/auth-helpers";
import { db } from "@/db";
import { meeting } from "@/db/schema";

export async function GET(req, { params }) {
  const { groupId } = await params;
  await requireGroupMember(groupId);

  // Same query as GET /api/meetings
  const meetings = await db
    .select()
    .from(meeting)
    .where(eq(meeting.groupId, groupId))
    .orderBy(desc(meeting.createdAt));

  return Response.json(meetings);
}
```

**Calls:** Direct DB query (identical to `/api/meetings`)
**Policy:** Same as web — group membership required

---

### Route: `POST /api/mobile/meetings/[meetingId]/join`

**Purpose:** Join a meeting, always as student

**Implementation:**
```ts
import { requireAuth, requireGroupMember } from "@/lib/auth-helpers";
import { getOrRestoreRoom, ensureRealtimeKitMeeting, createRealtimeKitParticipant } from "@/lib/api-helpers";
import { meetingRoomService } from "@/lib/services/meeting-room-service";

export async function POST(req, { params }) {
  const { meetingId } = await params;
  const { participantName } = await req.json();

  const room = await getOrRestoreRoom(meetingId);
  if (room instanceof Response) return room;

  const session = await requireAuth();
  if (!room.isPublic) {
    await requireGroupMember(room.groupId, session);
  }

  await ensureRealtimeKitMeeting(meetingId);

  // POLICY: Mobile always joins as student, regardless of user role
  const role = "student";

  const result = await meetingRoomService.joinMeeting({
    meetingId,
    participantName,
    userId: session.user.id,
    role,
    // ... other params from room
  });

  return Response.json(result);
}
```

**Calls:** `getOrRestoreRoom()`, `ensureRealtimeKitMeeting()`, `meetingRoomService.joinMeeting()`
**Policy:** Hardcodes `role = "student"` — skips `determineRole()` entirely. This is the **key difference** from the web route.

---

### Route: `POST /api/mobile/meetings/[meetingId]/rejoin`

**Purpose:** Rejoin an active meeting

**Implementation:**
```ts
import { requireAuth, requireGroupMember } from "@/lib/auth-helpers";
import { getOrRestoreRoom } from "@/lib/api-helpers";

export async function POST(req, { params }) {
  const { meetingId } = await params;
  const session = await requireAuth();

  const room = await getOrRestoreRoom(meetingId);
  if (room instanceof Response) return room;

  await requireGroupMember(room.groupId, session);

  // Same rejoin logic as /api/room/rejoin
  return Response.json({
    groupId: room.groupId,
    meetingId,
    rtkMeetingId: room.rtkMeetingId,
  });
}
```

**Calls:** `getOrRestoreRoom()`, `requireGroupMember()`
**Policy:** Same as web

---

### Route: `GET /api/mobile/groups/[groupId]/files`

**Purpose:** List group files

**Implementation:**
```ts
import { requireGroupMember } from "@/lib/auth-helpers";
import { listGroupFiles } from "@/lib/services/file-service";

export async function GET(req, { params }) {
  const { groupId } = await params;
  await requireGroupMember(groupId);

  const url = new URL(req.url);
  const folderId = url.searchParams.get("folderId") || undefined;

  const files = await listGroupFiles({ groupId, folderId });
  return Response.json(files);
}
```

**Calls:** `listGroupFiles()` from file-service
**Policy:** Same as web — read-only, no delete/rename/move exposed

---

### Route: `POST /api/mobile/groups/[groupId]/files`

**Purpose:** Upload a file to group

**Implementation:**
```ts
import { requireGroupMember, requireAuth } from "@/lib/auth-helpers";
import { uploadGroupFile } from "@/lib/services/file-service";

export async function POST(req, { params }) {
  const { groupId } = await params;
  const session = await requireAuth();
  await requireGroupMember(groupId, session);

  const formData = await req.formData();
  const file = formData.get("file") as File;
  const folderId = formData.get("folderId") as string | undefined;

  const result = await uploadGroupFile({
    file,
    groupId,
    folderId: folderId || undefined,
    uploadedById: session.user.id,
  });

  return Response.json(result);
}
```

**Calls:** `uploadGroupFile()` from file-service
**Policy:** Upload only. No delete/rename/move routes exposed.

---

### Route: `GET /api/mobile/groups/[groupId]/files/[fileId]`

**Purpose:** Download a specific file

**Implementation:**
```ts
import { requireGroupMember } from "@/lib/auth-helpers";
import { readFileById } from "@/lib/services/file-service";

export async function GET(req, { params }) {
  const { groupId, fileId } = await params;
  await requireGroupMember(groupId);

  const file = await readFileById(decodeURIComponent(fileId));
  if (!file) return Response.json({ error: "Not found" }, { status: 404 });

  return new Response(file.buffer, {
    headers: {
      "Content-Type": file.mimeType,
      "Content-Disposition": `attachment; filename="${file.filename}"`,
    },
  });
}
```

**Calls:** `readFileById()` from file-service
**Policy:** Read-only

---

### Route: `GET /api/mobile/meetings/[meetingId]/files`

**Purpose:** List meeting files

**Implementation:**
```ts
import { requireGroupMember } from "@/lib/auth-helpers";
import { listMeetingFiles } from "@/lib/services/file-service";
// + look up meeting to get groupId for auth check

export async function GET(req, { params }) {
  const { meetingId } = await params;
  const meetingRow = await getMeeting(meetingId); // db query
  await requireGroupMember(meetingRow.groupId);

  const folderId = new URL(req.url).searchParams.get("folderId") || undefined;
  const files = await listMeetingFiles({ meetingId, folderId });
  return Response.json(files);
}
```

**Calls:** `listMeetingFiles()` from file-service

---

### Route: `POST /api/mobile/meetings/[meetingId]/files`

**Purpose:** Upload file to meeting

**Implementation:**
```ts
import { requireGroupMember, requireAuth } from "@/lib/auth-helpers";
import { uploadMeetingFile } from "@/lib/services/file-service";

export async function POST(req, { params }) {
  const { meetingId } = await params;
  const session = await requireAuth();
  const meetingRow = await getMeeting(meetingId);
  await requireGroupMember(meetingRow.groupId, session);

  const formData = await req.formData();
  const file = formData.get("file") as File;
  const folderId = formData.get("folderId") as string | undefined;

  const result = await uploadMeetingFile({
    file,
    meetingId,
    groupId: meetingRow.groupId,
    folderId: folderId || undefined,
    uploadedById: session.user.id,
  });

  return Response.json(result);
}
```

**Calls:** `uploadMeetingFile()` from file-service

---

### Route: `GET /api/mobile/meetings/[meetingId]/chat`

**Purpose:** Get chat history for a meeting

**Implementation:**
```ts
import { requireAuth, requireGroupMember } from "@/lib/auth-helpers";
import { db } from "@/db";
import { chatMessage, chatReaction } from "@/db/schema";

export async function GET(req, { params }) {
  const { meetingId } = await params;
  const session = await requireAuth();
  const meetingRow = await getMeeting(meetingId);

  if (!meetingRow.isPublic) {
    await requireGroupMember(meetingRow.groupId, session);
  }

  const limit = Math.min(parseInt(url.searchParams.get("limit") || "100"), 200);

  // Same query as GET /api/chat/messages
  // ... fetch messages + reactions, format response
}
```

**Calls:** Same DB queries as `/api/chat/messages` GET handler
**Policy:** No guest access — mobile always requires auth

---

### Route: `POST /api/mobile/meetings/[meetingId]/chat`

**Purpose:** Send a chat message

**Implementation:**
```ts
import { requireAuth, requireGroupMember } from "@/lib/auth-helpers";
// Same logic as POST /api/chat/messages

export async function POST(req, { params }) {
  const { meetingId } = await params;
  const { content } = await req.json();
  const session = await requireAuth();
  const meetingRow = await getMeeting(meetingId);

  if (!meetingRow.isPublic) {
    await requireGroupMember(meetingRow.groupId, session);
  }

  // Same validation: content <= 2000 chars, rate limit 600ms
  // Same insert + pg_notify
  // Return message
}
```

**Calls:** Same DB insert + pg_notify as `/api/chat/messages` POST handler
**Policy:** No guest messaging on mobile

---

### Route: `POST /api/mobile/chat/reactions`

**Purpose:** Toggle emoji reaction

**Implementation:**
```ts
import { requireAuth } from "@/lib/auth-helpers";
// Identical to POST /api/chat/reactions

export async function POST(req) {
  const session = await requireAuth();
  const { messageId, emoji } = await req.json();
  // Same toggle logic
}
```

**Calls:** Same DB toggle as `/api/chat/reactions`
**Policy:** Identical to web

---

## Routes NOT Exposed on Mobile

These web routes have **no mobile equivalent** by design:

| Web Route | Reason Not Exposed |
|---|---|
| `POST /api/room/create` | No meeting creation on mobile |
| `PATCH /api/meetings/[id]` | No meeting settings changes |
| `DELETE /api/meetings/[id]` | No meeting deletion |
| `POST /api/room/kick` | No moderation controls |
| `POST /api/room/waiting/approve` | No waiting room management |
| `POST /api/room/waiting/list` | No waiting room management |
| `DELETE /api/files` | No file deletion |
| `PATCH /api/files` | No file rename |
| `POST /api/files/move` | No file move |
| `POST /api/files/bulk-*` | No bulk operations |
| `POST /api/folders` | No folder creation |
| `GET /api/recordings` | No recordings access |
| `GET /api/translations` | No translations |
| `POST /api/groups` | No group management |
| `PATCH/DELETE /api/groups/[id]` | No group management |
| `POST/DELETE /api/groups/[id]/members` | No member management |
| `GET/POST /api/admin/users` | No admin panel |
| `POST /api/room/guest-join` | No guest mode on mobile |

---

## Refactoring Opportunity: Extract Shared Logic

Before creating the mobile routes, extract the **inline logic** from several web routes into reusable functions. This avoids copy-paste between web and mobile routes.

### Chat message query → `lib/services/chat-service.ts`

```ts
export async function getMessages(meetingId: string, limit: number, userId?: string) {
  // Move the messages + reactions query from GET /api/chat/messages here
}

export async function sendMessage(params: {
  content: string;
  meetingId: string;
  groupId: string;
  senderId: string;
  senderName: string;
}) {
  // Move the insert + pg_notify from POST /api/chat/messages here
}

export async function toggleReaction(params: {
  messageId: string;
  userId: string;
  userName: string;
  emoji: string;
}) {
  // Move the toggle logic from POST /api/chat/reactions here
}
```

### Meetings list query → `lib/services/meeting-service.ts`

```ts
export async function listMeetings(groupId: string) {
  // Move from GET /api/meetings
}

export async function getMeeting(meetingId: string) {
  // Shared lookup used by several mobile routes
}
```

### Groups list query → `lib/services/group-service.ts`

```ts
export async function listUserGroups(userId: string) {
  // Move from GET /api/groups (non-admin path)
}
```

After extraction, both web and mobile routes call the same functions:

```
Web route  → requireAuth() → serviceFunction() → Response
Mobile route → requireAuth() → serviceFunction() → Response (narrower shape)
```

---

## Summary: What Changes in the Main App

### Modified files (small changes)

| File | Change |
|---|---|
| `lib/auth-helpers.ts` | Add Bearer token fallback in `getSessionOrNull()` |
| `server.mjs` | Accept token from query param for WebSocket |

### New files

| File | Purpose |
|---|---|
| `lib/services/chat-service.ts` | Extracted chat logic |
| `lib/services/meeting-service.ts` | Extracted meeting queries |
| `lib/services/group-service.ts` | Extracted group queries |
| `app/api/mobile/groups/route.ts` | List user groups |
| `app/api/mobile/groups/[groupId]/meetings/route.ts` | List group meetings |
| `app/api/mobile/groups/[groupId]/files/route.ts` | List + upload group files |
| `app/api/mobile/groups/[groupId]/files/[fileId]/route.ts` | Download group file |
| `app/api/mobile/meetings/[meetingId]/join/route.ts` | Join meeting (student-only) |
| `app/api/mobile/meetings/[meetingId]/rejoin/route.ts` | Rejoin meeting |
| `app/api/mobile/meetings/[meetingId]/files/route.ts` | List + upload meeting files |
| `app/api/mobile/meetings/[meetingId]/chat/route.ts` | Get + send chat messages |
| `app/api/mobile/chat/reactions/route.ts` | Toggle reaction |

### Unchanged

- All existing web routes — untouched
- `db/schema.ts` — no schema changes
- `lib/services/file-service.ts` — already well-extracted, used as-is
- `lib/services/meeting-room-service.ts` — used as-is
- `lib/api-helpers.ts` — `determineRole()`, `getOrRestoreRoom()`, etc. used as-is

---

## Implementation Order

1. **Modify `lib/auth-helpers.ts`** — add Bearer token support (unlocks everything)
2. **Extract service functions** — chat, meetings, groups
3. **Create mobile routes** — each one is a thin wrapper
4. **Modify `server.mjs`** — WebSocket token auth (needed for chat)
5. **Test** — verify web still works, verify mobile routes work with Bearer token
