# Concerto Manual Test Notes

Use this file to track what works, what fails, and what still needs validation.

## Reported Concerns To Verify

- Files upload drop area is too large and should be reduced.
- Upload destination path should be visible so it is clear where files are uploaded.
- File and folder renaming should be possible.
- Files in meetings should be separated from meetings themselves; recordings should be part of meetings.
- Admin should not be assigned to any single group and should be available everywhere.
- Users can change language; language can be changed or added in translations.
- Translations should be grouped in a clearer way so they are easier to navigate.

## How we will work

1. I give you one manual test task at a time.
2. You perform it and reply with the result.
3. If something is wrong, add a short note under `Issues / Bugs`.
4. I update the running status in conversation and move to the next task unless you tell me to stop.
5. Report only one task at a time in chat using the task ID.

## Status Legend

- `pending`
- `in progress`
- `passed`
- `failed`
- `blocked`

## Test Queue

| ID | Area | Task | Status | Notes |
|---|---|---|---|---|
| T01 | Auth | Open login and registration pages and verify they load | in progress | First active task |
| T02 | Auth | Register flow basic validation and waiting approval redirect | pending |  |
| T03 | Auth | Login invalid credentials error handling | pending |  |
| T04 | Auth | Login success and dashboard redirect | pending |  |
| T05 | Auth | Waiting approval page behavior for inactive user | pending |  |
| T06 | Navigation | Dashboard default redirect to first group | pending |  |
| T07 | Files | Dashboard files tab loads and seeded files appear for privileged user | pending |  |
| T08 | Files | Folder creation and breadcrumb navigation | pending |  |
| T09 | Files | File upload and preview behavior | pending |  |
| T10 | Files | Move and delete actions including bulk actions | pending |  |
| T11 | Meetings | Meetings tab loads and meeting list works | pending |  |
| T12 | Meetings | Create meeting flow | pending |  |
| T13 | Meetings | Meeting selection opens chat/files/recordings sidebar states | pending |  |
| T14 | Meeting Room | Lobby or join-key flow to meeting room | pending |  |
| T15 | Moderation | Waiting room approve/reject behavior | pending |  |
| T16 | Moderation | Kick/admin leave/rejoin related flows | pending |  |
| T17 | Chat | Meeting chat send/receive behavior | pending |  |
| T18 | Recordings | Recordings panel visibility and loading behavior | pending |  |
| T19 | Translations | Translations tab loads and language actions behave | pending |  |
| T20 | Manage | Group/user management panel behavior by role | pending |  |

## Current Task

### T01

Goal: confirm the auth entry pages render and basic navigation between them works.

Steps:

1. Start the app if it is not already running.
2. Open the localized login page.
3. Confirm the login form renders with email, password, and submit button.
4. Use the register link from login and confirm the registration page opens.
5. Confirm the registration form renders with full name, email, password, confirm password, and submit button.
6. Use the sign-in link from registration and confirm you can return to login.

Expected:

- Both pages load without crash or blank screen.
- Links between login and register work.
- The visible fields listed above are present.

Your reply format:

- `T01 passed`
- or `T01 failed: ...`
- or `T01 blocked: ...`

## Issues / Bugs

- Add short notes here as you find them.

## Suggested Note Format

- `[task-id] short description`
- `result: what happened`
- `expected: what should happen`
- `severity: low / medium / high`

## Left To Verify

- T02-T20 are still pending.
