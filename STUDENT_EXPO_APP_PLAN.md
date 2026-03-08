# Student Expo App Plan

## Goal

Build a new Expo React Native app that exposes only the student-facing subset of Concerto:

- Join meetings in assigned groups
- Read and upload files in group files and meeting files
- Use meeting chat

Explicitly excluded from the mobile app:

- Admin management
- Translations UI and locale switching
- Meeting creation
- Meeting option changes (`isPublic`, `requiresApproval`, rename)
- Recordings
- File deletion

Teacher/admin users may sign into the mobile app, but the mobile app itself should remain student-scoped.

## Important Repo Findings

### 1. This repo is a web app only right now

- There is no existing Expo or React Native workspace in the repository.
- Current app stack is `Next.js 15 + React 19 + Better Auth + Drizzle + PostgreSQL + Cloudflare RealtimeKit`.
- Main entry points are web-first and locale-prefixed.

Relevant files:

- `package.json`
- `app/[locale]/(app)/dashboard/[groupId]/page.tsx`
- `app/[locale]/meet/[key]/page.tsx`

### 2. A lot of the desired student behavior already exists in the backend

The current server already allows group members, not only teachers, to do the following:

- List meetings: `app/api/meetings/route.ts`
- Join meetings: `app/api/room/join/route.ts`
- Rejoin meetings: `app/api/room/rejoin/route.ts`
- List/download group files: `app/api/files/route.ts`
- Upload group files: `app/api/files/upload/route.ts`
- List meeting files: `app/api/meeting-files/route.ts`
- Upload meeting files: `app/api/meeting-files/route.ts`
- Read chat history / send messages: `app/api/chat/messages/route.ts`
- Toggle reactions: `app/api/chat/reactions/route.ts`

This is good news: a limited mobile app can reuse a large part of the existing backend.

### 3. The current backend will still give teacher/admin users elevated meeting power

This is the biggest non-obvious issue.

`lib/api-helpers.ts` currently maps:

- `admin` user -> `teacher`
- group member with role `teacher` -> `teacher`
- everyone else -> `student`

That value is then used by `app/api/room/join/route.ts` to create the RealtimeKit participant preset.

Effect:

- If an admin or teacher signs into the mobile app today, they will still join with teacher permissions inside the meeting.
- Hiding buttons in Expo is not enough if the token itself is elevated.

This is the main place where a mobile-specific policy is needed.

### 4. Recordings are already server-protected

`app/api/recordings/route.ts` requires `requireGroupTeacher(groupId)`.

So recordings are not only hidden in UI; students cannot fetch them from the API either. That part already aligns with the requested mobile scope.

### 5. File deletion and mutation are already teacher-only

Current file restrictions are mostly correct for the student app:

- Group file delete/rename: teacher-only in `app/api/files/route.ts`
- Meeting file delete/rename: teacher-only in `app/api/meeting-files/route.ts`
- Folder create for group files: teacher-only in `app/api/folders/route.ts`
- Folder create for meeting files: teacher-only in `app/api/meeting-files/folders/route.ts`

Important nuance:

- Students can already upload files.
- Students cannot currently create folders.
- Students cannot delete files.

That matches your requested scope well.

### 6. Chat is not simple REST only

Chat uses:

- REST for history and message/reaction writes
- WebSocket push for live updates

The WebSocket server is custom and lives in `server.mjs` under `/ws/chat`.

Important auth detail:

- The WebSocket handshake authorizes by signed Better Auth session cookie only.
- There is no bearer-token or mobile-specific socket auth path right now.

This matters for Expo because mobile cookie handling is more fragile than web cookie handling, especially for WebSocket upgrades.

### 7. Auth is web-cookie oriented

Current auth setup:

- Better Auth server: `lib/auth.ts`
- Better Auth React client: `lib/auth-client.ts`
- Next middleware checks session cookies: `middleware.ts`

Important implication:

- The current auth flow is optimized for browser cookies, not for a native mobile client storing tokens in secure storage.
- Expo can possibly call the same auth endpoints, but the session strategy should be treated as a design item, not assumed to work cleanly out of the box.

### 8. The current web app is deeply locale-based, but the mobile app does not need that

- The whole web app is routed through `app/[locale]/...`
- Locale config is in `i18n/config.ts`
- `middleware.ts` redirects and normalizes locale paths

For the Expo app:

- You can safely omit translations and keep a single English copy for the first version.
- This is a clean separation because translation concerns are strongly web-specific in the current repo.

### 9. Meeting UI is built with the web RealtimeKit SDK

`components/VideoRoom.tsx` uses:

- `@cloudflare/realtimekit-react`
- `@cloudflare/realtimekit-react-ui`

That code is not portable to React Native as-is.

So even if backend meeting join flows are reusable, the actual in-meeting UI will need either:

- a React Native RealtimeKit path, if supported, or
- a dedicated native implementation path that is valid for the final mobile product

This is another major technical decision.

## Current Capability Mapping

### Already compatible with the student app

- List assigned groups
- List meetings
- Join/rejoin meetings
- Upload files to group dashboard
- Upload files to meeting dashboard
- Read/download files
- Read/send chat messages
- React to chat messages
- Hide admin/manage/translations/recordings in client UI

### Needs explicit mobile-specific handling

- Prevent teacher/admin accounts from getting teacher meeting tokens in the mobile app
- Define how Expo authenticates against Better Auth
- Define how Expo receives live chat updates over WebSocket
- Implement a React Native meeting UI path

### Should remain unavailable in mobile app

- `/api/room/create`
- `PATCH /api/meetings/[id]`
- `DELETE /api/meetings/[id]`
- `/api/recordings`
- Folder/file destructive actions
- Group/admin management APIs
- Translation APIs/UI

## Recommended Architecture

## 1. Add a separate Expo app, do not try to “share the Next app”

Recommended structure:

- Keep current Next.js app as the main web product
- Add a new mobile app in this repo, for example `apps/mobile-student`
- Reuse shared TypeScript types later only where they are framework-agnostic

Reason:

- Current app depends on Next routing, locale middleware, DOM APIs, and web-only RealtimeKit UI.
- Trying to co-locate UI code between web and native will slow the first delivery.

## 2. Make the mobile app policy-driven on the server, not only hidden in UI

Recommended addition:

- Introduce a mobile/student-app join mode so the backend can force a `student` meeting role even for teacher/admin accounts when they use the mobile app.

Possible shapes:

- Separate route, e.g. `/api/mobile/room/join`
- Header-based mode, e.g. `X-Client-Platform: mobile-student`
- Signed session claim or app-scoped auth policy

The simplest clean option is a dedicated mobile route layer with a narrower contract.

## 3. Prefer a mobile-specific API facade instead of exposing the whole web API surface

Recommended endpoints for the first mobile version:

- `GET /api/mobile/groups`
- `GET /api/mobile/groups/:groupId/meetings`
- `POST /api/mobile/meetings/:meetingId/join`
- `POST /api/mobile/meetings/:meetingId/rejoin`
- `GET /api/mobile/groups/:groupId/files`
- `POST /api/mobile/groups/:groupId/files`
- `GET /api/mobile/meetings/:meetingId/files`
- `POST /api/mobile/meetings/:meetingId/files`
- `GET /api/mobile/meetings/:meetingId/chat`
- `POST /api/mobile/meetings/:meetingId/chat`
- `POST /api/mobile/chat/reactions`

Benefits:

- Smaller and safer contract
- Easier to enforce “student-only” behavior
- Easier to version without breaking the web app

## 4. Treat chat transport as a first-class mobile task

Options:

- Reuse `/ws/chat` if cookie-based socket auth works reliably in Expo
- Or add a mobile chat channel auth method using bearer/session token

Pragmatic recommendation:

- Keep REST message send/list as-is
- Implement proper real-time transport for the production mobile app
- If current socket auth is not native-safe, extend the backend so that mobile gets a first-class authenticated real-time path

## 5. Keep mobile English-only for v1

Do not pull in:

- `next-intl`
- locale-prefixed routing
- translations editor
- translation cache/revalidation flows

This directly matches your requirement and removes a lot of web-specific complexity.

## Suggested MVP Scope

### Phase 1: mobile shell + auth + limited dashboard

- Sign in
- List groups assigned to the user
- Very limited dashboard menu:
  - Meetings
  - Files
  - Chat only where meeting context exists
- Remove all admin/manage/translations/recordings affordances

### Phase 2: meetings access

- List group meetings
- Join meeting
- Rejoin meeting
- Enforce student meeting role for all mobile users

### Phase 3: files

- Group files: list, view, download/share, upload
- Meeting files: list, view, download/share, upload
- No delete
- No rename
- No folder creation

### Phase 4: chat

- Load history
- Send messages
- Reactions if desired in MVP
- Live updates via socket or temporary polling

### Phase 5: polish and hardening

- Error states
- Permission messaging
- Empty states
- Session persistence
- Device testing

## Initial Implementation Prompt

Use this as the starting implementation prompt for the first build pass:

> Create a new Expo React Native app inside this repository for a student-only Concerto mobile client. Do not modify the main web UX except where backend support is required. The mobile app must allow authenticated users to: see their assigned groups, open a limited dashboard, list and rejoin/join meetings for those groups, read/upload files in group and meeting contexts, and use meeting chat. The mobile app must not expose admin features, translations, recordings, meeting creation, meeting settings changes, file deletion, folder creation, or any destructive file operations. Teacher and admin accounts may sign in, but when using the mobile app they must be treated as student-scoped users and must not receive elevated meeting permissions. Reuse existing backend routes where safe, but prefer a dedicated `/api/mobile/*` facade for mobile-specific policy enforcement. Keep the mobile UI English-only.

## Non-Obvious Risks

### 1. “Teacher can log in but should not get teacher powers” is not just a UI requirement

Without backend policy changes, teacher/admin users will still get teacher meeting presets from `determineRole()`.

### 2. Chat WebSocket auth may be the first mobile integration blocker

Current socket auth expects browser cookies and validates them in `server.mjs`.

### 3. RealtimeKit meeting UI is web-specific in this repo

Meeting token creation is reusable. Meeting UI code is not.

### 4. Session persistence assumptions are browser-based

The web app uses cookies plus `sessionStorage` for meeting reconnection hints. Expo will need a native replacement.

### 5. Public/private meeting rules currently depend on server auth helpers

This is good, but the mobile app should avoid calling broader web endpoints if a narrower mobile policy is intended long-term.

## Concrete Implementation Recommendations

1. Add `apps/mobile-student` as a new Expo app.
2. Add a small mobile API surface under `app/api/mobile/...`.
3. Add a server-side policy that forces mobile join role to `student`.
4. Keep the first mobile dashboard to two root sections:
   - Meetings
   - Files
5. Keep chat contextual to a selected meeting, not as a global standalone section.
6. Reuse current file APIs only if you are comfortable with the existing auth model; otherwise wrap them with mobile routes.
7. Do not attempt translation support in v1.
8. Do not attempt admin parity in mobile later by accident; keep mobile scoped intentionally.

## Questions That Need Your Decision

1. Should the Expo app live inside this repo as a new workspace, or do you want it planned as a separate repository?
2. When a teacher/admin signs into the mobile app, do you want them forced to a pure student role even inside the meeting itself? I recommend yes.
3. Is native in-meeting audio/video required in the first mobile milestone, or can the first milestone cover dashboard/files/chat while meeting transport/UI is validated separately?

## Recommended Next Step

After you answer the three questions above, the next planning artifact should be a build-ready execution plan with:

- final folder structure
- exact mobile API contract
- auth/session strategy
- meeting SDK decision
- phased implementation checklist

## Prompt-by-Prompt Delivery Plan

This project is too cross-cutting for a single prompt. The safest shape is a sequence of medium-large prompts, where each prompt:

- has one architectural goal
- lands complete code, not placeholders
- includes verification
- avoids mixing too many unrelated concerns

The grouping below is meant specifically for Claude Code / agent-style implementation, where context rot becomes likely if auth, mobile scaffolding, RTK, files, and chat are all mixed together.

## Chunking Principles

Use these rules when assigning prompts:

- Each prompt should produce a working, testable slice.
- Each prompt should touch one or two layers deeply, not every layer shallowly.
- Do not combine auth refactors with RTK UI work in the same prompt.
- Do not combine chat transport changes with file browser work in the same prompt.
- Prefer “vertical slices” once the foundations are in place.
- Every prompt should end with code verification and a short note of residual gaps.

## Recommended Prompt Sequence

### Prompt 1: Repo setup and mobile workspace foundation

Goal:

- Create the Expo workspace and wire the monorepo shape without implementing product features yet.

Scope:

- Add the new Expo app, recommended path: `apps/mobile-student`
- Set up TypeScript, linting, formatting alignment as much as practical
- Add base navigation structure
- Add environment handling for API base URL / WS URL / RTK config placeholders
- Add a minimal screen shell:
  - splash/loading
  - login placeholder
  - app placeholder
- Decide and document which code can be shared from the root repo versus copied locally

Must include:

- final folder structure
- app bootstraps on simulator/device
- no fake business logic
- a short architecture note in the repo

Out of scope:

- Better Auth integration
- file browser
- chat
- RTK meeting UI

Why this is a good chunk:

- It is large enough to avoid toy scaffolding
- It does not yet require risky server changes
- It creates the stable base every later prompt depends on

Suggested prompt wording:

> Add a new Expo React Native app inside this repository at `apps/mobile-student`. Set up the workspace, package configuration, TypeScript, navigation, environment configuration, and a minimal screen skeleton for unauthenticated and authenticated flows. Do not implement product logic yet. Keep the app English-only. Document the resulting folder structure and any assumptions for later shared-code reuse.

### Prompt 2: Better Auth mobile login and session persistence

Goal:

- Make mobile authentication real and stable.

Scope:

- Integrate Better Auth against the existing backend
- Implement login flow in Expo
- Implement session persistence suitable for native storage
- Implement logout
- Implement authenticated app bootstrap / session restore on app relaunch
- Add explicit handling for:
  - inactive user
  - invalid session
  - network failure during restore

Must include:

- decision on cookie-based vs token/session handling in Expo
- any required backend support changes
- no web-only auth assumptions left in mobile code

Out of scope:

- dashboard features beyond “you are logged in”
- RTK
- files
- chat

Critical caution:

- This prompt must not “hack around” auth with temporary mock login or hardcoded sessions.
- If Better Auth needs small backend adjustments for native compatibility, they should land here.

Suggested prompt wording:

> Implement real Better Auth login/logout and session restoration for the Expo mobile app against the existing backend. Use a native-safe persistence approach, not browser-only assumptions. Handle inactive users, expired sessions, and bootstrap loading states cleanly. Make only the minimum backend changes required to support a robust native auth flow.

### Prompt 3: Mobile-safe backend policy and `/api/mobile` facade

Goal:

- Create the server contract the mobile app will depend on.

Scope:

- Add a dedicated `/api/mobile/*` surface for the mobile app
- Implement mobile endpoints for:
  - current user summary
  - groups list
  - meetings list
  - meeting join/rejoin
  - group files list/upload/read
  - meeting files list/upload/read
  - chat list/create/react
- Enforce mobile-specific policy:
  - no admin features
  - no translations
  - no recordings
  - no meeting mutation
  - no delete flows
  - teacher/admin accounts using mobile join as student in meetings

Must include:

- shared auth helper strategy for mobile routes
- narrow response shapes optimized for mobile
- tests where practical for policy-critical behavior

Out of scope:

- Expo UI consuming the whole API
- RTK mobile meeting screen

Why this chunk matters:

- It isolates the most dangerous policy logic
- It avoids baking mobile behavior on top of broad web APIs
- It gives later prompts a stable contract

Suggested prompt wording:

> Create a dedicated `/api/mobile/*` API facade for the Expo app. Reuse existing backend logic where safe, but enforce mobile-specific policy on the server: no admin/manage/translations/recordings/destructive file actions/meeting mutations, and all mobile meeting joins must resolve to student-scoped permissions even for teacher or admin accounts. Keep response shapes narrow and mobile-oriented.

### Prompt 4: Limited mobile dashboard and navigation

Goal:

- Deliver the first real authenticated product shell.

Scope:

- Replace placeholders with real mobile screens
- Build the limited dashboard navigation
- Show assigned groups
- Allow group switching if user has multiple groups
- Add root app IA, recommended:
  - Home / Groups
  - Meetings
  - Files
  - Profile or Settings-lite
- Make sure no admin/manage/translations UI is reachable

Must include:

- good loading and empty states
- deep links between groups, meetings, and files
- clear separation between global files and meeting-scoped files

Out of scope:

- detailed file browser interactions
- chat UI
- RTK meeting room UI

Suggested prompt wording:

> Build the first real authenticated mobile product shell for the Expo app using the new mobile APIs. Implement the limited student dashboard, group selection, and navigation structure. Keep the app strictly student-scoped and English-only. Do not implement meeting room UI, chat UI, or advanced file interactions yet.

### Prompt 5: Files vertical slice

Goal:

- Complete file functionality end-to-end.

Scope:

- Group files list
- Meeting files list
- Upload files in both contexts
- Read/view/download/share files in both contexts
- Basic folder traversal if it exists in mobile scope
- File preview behavior where feasible on mobile
- Handle unsupported mime types gracefully

Must include:

- native file picker integration
- native upload flow
- file open/share/download behavior
- no delete, no rename, no create folder

Out of scope:

- chat
- RTK room UI

Important caution:

- This prompt should not change auth foundations.
- This prompt should not add destructive file capabilities “for completeness”.

Suggested prompt wording:

> Implement the file management slice in the Expo app using the mobile API facade: group files and meeting files listing, upload, preview/open/download/share behavior, and folder traversal if supported by the mobile contract. Do not add delete, rename, or folder creation. Handle common mobile file and permission edge cases cleanly.

### Prompt 6: Chat vertical slice

Goal:

- Complete meeting chat end-to-end.

Scope:

- Meeting chat screen
- Load message history
- Send messages
- Reactions
- Live updates transport

Preferred order inside this prompt:

- first make history + send stable
- then add live updates

Must include:

- message composer states
- optimistic or semi-optimistic updates
- reconnect/error handling
- proper cleanup when changing meetings

Out of scope:

- RTK room UI
- file browsing changes

Critical caution:

- Do not mix chat transport redesign with RTK participant state logic.

Suggested prompt wording:

> Implement meeting chat for the Expo app using the mobile API contract. Support history loading, sending messages, reactions, and real-time live updates. Treat the mobile app as a first-class product: do not add fallback transport modes. If the current backend socket auth is not native-safe, extend the backend so Expo has a proper authenticated real-time channel.

### Prompt 7: Meeting list, join flow, and pre-room experience

Goal:

- Make meetings usable from the mobile app before full in-room UI is finished.

Scope:

- Meetings list per group
- Meeting details / action sheet if needed
- Join flow
- Waiting for host state
- Waiting for approval state
- Rejoin behavior
- pre-room loading and error states

Must include:

- use of mobile-safe join endpoints
- proper handling of student-scoped role enforcement
- state restoration when app backgrounds during join flow

Out of scope:

- full in-room AV UI if SDK decision is still pending

Why this can be separate from RTK UI:

- It keeps all workflow/state logic together
- It lets the next prompt focus only on media room integration

Suggested prompt wording:

> Implement the meetings experience in the Expo app: meetings list, join/rejoin actions, waiting-for-host, waiting-for-approval, and error handling using the mobile meeting APIs. Keep the logic independent from the final in-room media UI so the join workflow is complete and testable on its own.

### Prompt 8: RealtimeKit mobile meeting room

Goal:

- Deliver native in-meeting AV functionality.

Scope:

- Integrate the chosen RTK/native meeting SDK path
- Join the room with the token from the mobile API
- In-room student-scoped controls
- Show participants if supported
- Ensure teacher/admin on mobile still behave as student-scoped users

Student-allowed controls should likely include:

- mic toggle
- camera toggle
- leave meeting
- maybe participant list
- maybe in-room meeting files/chat entry points depending on UX

Must not include:

- create meeting
- recording controls
- kick participants
- waiting room approval controls
- settings that change meeting policy

Critical note:

- This prompt should start only after the SDK feasibility is confirmed.
- If RTK has no viable RN support, this prompt becomes a spike/prototype prompt instead of production delivery.

Suggested prompt wording:

> Implement the mobile in-meeting experience in Expo using the selected RealtimeKit-compatible path. Use the existing mobile join tokens and keep the UI strictly student-scoped: join, view participants/media, camera/mic controls, and leave. Do not expose recording, moderation, meeting creation, or host controls.

### Prompt 9: Cross-feature hardening and polish

Goal:

- Bring the mobile app to a production-shaped baseline.

Scope:

- app lifecycle handling
- background/foreground restoration
- network resilience
- permission prompts
- error toasts/banners consistency
- analytics/logging hooks if desired
- cleanup of duplicated models/helpers
- test pass and manual verification notes

Must include:

- no feature expansion
- focus on quality, consistency, and regression cleanup

Out of scope:

- new product capabilities

Suggested prompt wording:

> Harden the Expo app for production-shaped use. Focus on lifecycle handling, permissions, reconnection behavior, error-state consistency, code cleanup, and verification. Do not add new features; improve the reliability and coherence of the existing auth, files, chat, meetings, and in-room flows.

## Alternate Grouping If RTK Is High Risk

If native RTK support is uncertain, use this split instead:

- Prompt 1: Expo workspace
- Prompt 2: Better Auth mobile
- Prompt 3: `/api/mobile` backend policy facade
- Prompt 4: mobile dashboard shell
- Prompt 5: files
- Prompt 6: chat
- Prompt 7: meeting list + join/waiting states
- Prompt 8A: RTK feasibility spike only
- Prompt 8B: production meeting room implementation after feasibility is proven
- Prompt 9: hardening

This is safer than forcing Claude Code to both discover SDK limitations and ship final meeting UI in one pass.

## What Not To Bundle Together

Avoid these combinations in one prompt:

- Better Auth mobile + chat socket transport + RTK SDK integration
- file browser + chat + meetings + global navigation all together
- mobile API facade + Expo UI consumption for every endpoint in one go
- policy changes + design polish + refactors in the same prompt

Those combinations are where agent quality usually degrades.

## Prompt Size Guidance

Use these rough limits:

- 1 foundational prompt for scaffolding
- 1 auth prompt
- 1 backend policy/API prompt
- 4 to 5 feature prompts
- 1 hardening prompt

That puts the project in the healthy range of about `8-9 prompts`.

Less than that:

- too much cross-cutting context
- more likely to get partial implementations and hidden regressions

More than that:

- too much churn
- increased risk of duplicated patterns and inconsistent architecture

## Acceptance Criteria Per Prompt

Every prompt should require Claude Code to return:

- what changed
- which flows now work end-to-end
- which files were added or materially changed
- what was verified
- what is intentionally left for the next prompt

That keeps the series coherent and reduces drift across prompts.

## Parallelization Map

The best way to parallelize this project is not by splitting random screens, but by splitting along dependency boundaries.

Use this mental model:

- some prompts are hard prerequisites
- some prompts can run in parallel after the prerequisites land
- some prompts should be delayed until technical feasibility is confirmed

## Dependency Graph

### Must happen first

- Prompt 1: Expo workspace foundation

### Must happen after Prompt 1

- Prompt 2: Better Auth mobile
- Prompt 3: mobile backend facade and policy

These two should usually stay serialized or at least tightly coordinated, because auth decisions influence the mobile API contract.

### Can start after Prompts 2 and 3 are stable

- Prompt 4: limited dashboard and navigation
- Prompt 5: files vertical slice
- Prompt 6: chat vertical slice
- Prompt 7: meetings list + join/waiting flow

These are the main parallelizable workstreams.

### Should happen after Prompt 7 and SDK feasibility confirmation

- Prompt 8: RTK mobile meeting room

### Should happen last

- Prompt 9: hardening and polish

## Best Parallelizable Feature Groups

### Parallel Group A: mobile shell / navigation

Best prompt:

- Prompt 4

Why parallelizable:

- once auth and mobile APIs exist, app navigation can be built mostly independently
- it depends on data contracts, but not on file upload internals, chat transport internals, or RTK room internals

Touches mostly:

- Expo navigation
- screen composition
- limited dashboard IA
- loading / empty states

### Parallel Group B: files

Best prompt:

- Prompt 5

Why parallelizable:

- files are mostly isolated from chat and RTK
- they share auth and mobile API foundations, but after that they are a self-contained vertical slice

Touches mostly:

- file list UI
- upload flow
- native file picker
- file preview/open/share

Risk of overlap:

- moderate overlap with Prompt 4 in navigation wiring
- low overlap with chat
- low overlap with RTK

### Parallel Group C: chat

Best prompt:

- Prompt 6

Why parallelizable:

- chat can be built against mobile auth + mobile API without waiting for files or RTK room UI
- it is self-contained if meeting selection / routing conventions are already defined

Touches mostly:

- message list UI
- composer
- reactions
- socket or polling transport

Risk of overlap:

- moderate overlap with Prompt 4 for screen routing
- low overlap with files
- medium overlap with meetings if meeting context ownership is unclear

### Parallel Group D: meetings workflow outside the room

Best prompt:

- Prompt 7

Why parallelizable:

- join/rejoin/waiting flows can be completed before the in-room AV UI exists
- this is mostly workflow/state management, not media rendering

Touches mostly:

- meetings list
- join button flows
- waiting-for-host / waiting-for-approval
- pre-room state restoration

Risk of overlap:

- moderate overlap with Prompt 4 for navigation
- medium overlap with Prompt 8 because both touch meeting entry

## What Can Actually Run At The Same Time

The cleanest concurrency window is:

- Prompt 4: dashboard/navigation
- Prompt 5: files
- Prompt 6: chat
- Prompt 7: meetings join workflow

This only works well if Prompts 2 and 3 already established:

- final auth/session behavior
- final mobile API route names
- final response shapes
- final rule that mobile meeting joins are student-scoped

Without that foundation, parallel work will drift and later need reconciliation.

## Recommended Serialized vs Parallel Plan

### Serialized foundation

Run in order:

1. Prompt 1: Expo workspace
2. Prompt 2: Better Auth mobile
3. Prompt 3: `/api/mobile` facade and policy

### Parallel feature window

Then run in parallel:

1. Prompt 4: limited dashboard/navigation
2. Prompt 5: files
3. Prompt 6: chat
4. Prompt 7: meetings workflow

### Serialized finishing

Then run in order:

1. Prompt 8: RTK mobile meeting room
2. Prompt 9: hardening

## Coordination Notes For Parallel Prompts

If you run prompts 4-7 in parallel, lock these contracts first:

- navigation route names
- screen ownership
- shared mobile API client location
- auth/session hook interface
- meeting context model
- group selection model

Otherwise parallel prompts will fight over the same abstractions.

## Shared Surfaces Most Likely To Conflict

These are the hotspots where parallel prompts may collide:

### High-conflict shared surfaces

- mobile API client module
- auth/session provider
- navigation tree
- shared design primitives
- meeting context store

### Low-conflict shared surfaces

- file preview helpers
- chat message rendering helpers
- meeting waiting-state components
- feature-local hooks

## Recommended Ownership Split If Multiple Agents Work In Parallel

Agent 1:

- Prompt 4
- owns navigation shell and top-level app structure

Agent 2:

- Prompt 5
- owns files feature end-to-end

Agent 3:

- Prompt 6
- owns chat feature end-to-end

Agent 4:

- Prompt 7
- owns meetings list/join/waiting workflow

One lead/integration pass should merge these after the parallel window before RTK room work begins.

## Features That Should Not Be Parallelized

Do not parallelize these aggressively:

### Better Auth mobile

Reason:

- auth choices affect every other prompt

### mobile backend policy facade

Reason:

- route naming and authorization rules need to stabilize first

### RTK in-room media implementation

Reason:

- it is likely to require meeting-flow adjustments and SDK-specific changes

### hardening pass

Reason:

- it should reconcile completed features, not compete with them

## Practical Recommendation

If you want the highest throughput with the least codebase drift, use this model:

1. one agent does Prompts 1-3 in sequence
2. up to four agents do Prompts 4-7 in parallel
3. one agent does Prompt 8
4. one final integration/hardening pass does Prompt 9

That is the highest-value parallelization boundary in this project.
