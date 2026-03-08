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

## Focus Test Queue

| ID | Area | Task | Status | Notes |
|---|---|---|---|---|
| F01 | Files | Verify upload drop area size and whether upload destination path is visible | passed | User reported everything works |
| F02 | Files | Verify renaming files and folders | failed | Rename mostly works; preview breaks until hard refresh |
| F03 | Meetings | Verify files and recordings are separated correctly in meetings | failed | Structure mostly works; multiple meeting-related regressions found |
| F04 | Roles | Verify admin is not assigned to a single group and has access everywhere | passed | User reported it works |
| F05 | Language | Verify users can change language from the user-facing app | in progress | Next active focus task |
| F06 | Translations | Verify languages can be added or changed in translations | pending |  |
| F07 | Translations | Verify translations are grouped clearly enough to navigate | pending |  |

## Current Task

### F05

Goal: verify that end users can change language from the app UI.

Steps:

1. Open the user-facing area where language selection should be available.
2. Find the language switcher or related setting.
3. Change the language to another available option.
4. Confirm the UI updates to the selected language.
5. Reload the page and check whether the selected language persists.

Expected:

- A language change control is available to the user.
- Changing language updates visible UI text.
- The selected language persists after reload if that is the intended behavior.

Your reply format:

- `F05 passed`
- or `F05 failed: ...`
- or `F05 blocked: ...`

## Issues / Bugs

- Add short notes here as you find them.
- `[OBS-01] Logout does not work`
- `result: using logout redirects back to the main dashboard instead of signing the user out`
- `expected: logout should end the session and move the user to the correct logged-out screen`
- `severity: high`
- `notes: dashboard and sidebar components are still visible`
- `[OBS-02] Registration page is not reachable`
- `result: cannot navigate to registration`
- `expected: registration page should be accessible from the auth flow`
- `severity: high`
- `[OBS-03] Preview breaks after file rename until refresh`
- `result: after renaming a file, clicking preview shows "File not found"; hard refresh fixes it`
- `expected: preview should work immediately after rename without a manual refresh`
- `severity: medium`
- `notes: likely stale UI state after rename`
- `[OBS-04] Meeting chat loads very slowly`
- `result: opening meeting chat can take around 5 seconds even with little data`
- `expected: chat messages should load promptly for low-volume meetings`
- `severity: medium`
- `notes: observed on both develop and production; example endpoint /api/chat/messages?meetingId=iZZBZqsTDmfHNA-WsgScP&limit=100 returned once in 5648ms and then in 328ms`
- `[OBS-05] Meeting files sidebar has broken CSS`
- `result: files UI in the meeting sidebar shows broken layout and horizontal scrollbar`
- `expected: sidebar content should fit without horizontal scrolling`
- `severity: medium`
- `[OBS-06] Admin cannot join old meeting`
- `result: joining an older meeting as admin fails; /api/room/join returns 502 after RealtimeKit 401 Invalid Basic token`
- `expected: admin should be able to join existing meetings`
- `severity: high`
- `notes: user reports this as a regression introduced with translation changes`
- `[OBS-07] New meeting creation should infer current group`
- `result: create meeting flow allows setting group manually`
- `expected: the selected dashboard group should be inferred automatically`
- `severity: medium`

## Suggested Note Format

- `[task-id] short description`
- `result: what happened`
- `expected: what should happen`
- `severity: low / medium / high`

## Left To Verify

- F03-F07 are still pending.
