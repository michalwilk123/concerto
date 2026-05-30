# Publishing Concerto Meetings to the iOS App Store

This is a linear checklist. Work top to bottom; do not skip steps. Items marked **(one-time)** only need to be done for the very first 1.0 submission — subsequent versions skip those.

App facts (use these verbatim when filling in forms):

| Field | Value |
|---|---|
| Display name | `Concerto Meetings` |
| Bundle ID | `com.micwilk.concerto` |
| SKU (App Store Connect) | `concerto-meetings` |
| Primary language | English (U.S.) |
| Backend URL (production) | `https://concerto.micwilk.com` |
| Pricing | Free |
| Tracking / IDFA | None — answer **No** to App Tracking Transparency |
| In-app purchases | None |

---

## 0. Prerequisites

- [ ] Apple Developer Program membership is active (the same one used for `financ3` / `com.financ3.app`).
- [ ] Xcode is installed and signed in with the Apple ID that owns the Developer account (`Xcode → Settings → Accounts`).
- [ ] CocoaPods works on the machine (`pod --version` succeeds).
- [ ] EAS CLI installed: `npm i -g eas-cli` (or use `bunx eas-cli`).
- [ ] Logged in: `eas login` (same Expo account that owns the `financ3` EAS project, if you want them grouped).

---

## 1. **(one-time)** Reserve the bundle ID on Apple Developer

1. Visit https://developer.apple.com/account/resources/identifiers/list
2. Click **+** → App IDs → App.
3. Description: `Concerto Meetings`. Bundle ID: explicit, `com.micwilk.concerto`.
4. Capabilities — leave defaults. You do **not** need Push Notifications, Sign In with Apple, or In-App Purchase for this app.
5. Register.

If EAS Build's credentials flow asks to create this for you on first build, that also works — but doing it manually now avoids surprises later.

---

## 2. **(one-time)** Create the App Store Connect record

1. Visit https://appstoreconnect.apple.com/apps → **+** → New App.
2. Platform: **iOS**. Name: `Concerto Meetings`. Primary Language: English (U.S.).
3. Bundle ID: select `com.micwilk.concerto - Concerto Meetings` from the dropdown.
4. SKU: `concerto-meetings`.
5. User Access: Full Access.
6. Create.
7. Once created, look at the URL bar: `https://appstoreconnect.apple.com/apps/<APP_ID>/...`. Copy that numeric `<APP_ID>`.
8. Open `expo-app/eas.json`, replace `REPLACE_WITH_APP_STORE_CONNECT_APP_ID` with the numeric ID.

---

## 3. **(one-time)** Link the local Expo project to EAS

```bash
cd expo-app
eas init                  # adds extra.eas.projectId to app.config.js
eas credentials           # confirm iOS distribution cert + provisioning profile (let EAS manage both)
```

If prompted: choose **Let EAS manage credentials**. Same flow as financ3.

---

## 4. Build the production `.ipa`

```bash
cd expo-app
eas build --platform ios --profile production
```

- Takes ~15–25 min on EAS cloud builders.
- `autoIncrement: true` in `eas.json` bumps `buildNumber` on every cloud build, so you never need to edit it by hand.
- The build picks up `EXPO_PUBLIC_API_BASE_URL` from `eas.json` `build.production.env`, so the binary will hit `https://concerto.micwilk.com` not localhost.

When done, EAS prints an artifact URL — save it. You do not need to download the `.ipa` manually; `eas submit` pulls it.

---

## 5. Submit the build to TestFlight

```bash
cd expo-app
eas submit --platform ios --profile production --latest
```

First time you run this, EAS asks for an App Store Connect API key. Easiest path: let EAS create one via your Apple ID (it'll open a browser). The key is then saved server-side and reused for future submissions.

After submit succeeds:

- [ ] In App Store Connect → **TestFlight** tab, wait for the build to leave "Processing" (10–60 min).
- [ ] Apple emails you if processing fails (usually due to missing privacy strings — but you have all four declared, so this should pass).
- [ ] Add yourself as an Internal Tester (TestFlight → Internal Testing → + Tester).
- [ ] Install TestFlight on your iPhone, accept the invite, install the build.
- [ ] **Smoke test on real device** — see Section 9 below before doing anything else.

---

## 6. Fill in the App Store listing

In App Store Connect → your app → **App Information** (left sidebar):

- [ ] Category: **Education** (primary). Optional secondary: **Business**.
- [ ] Content Rights: check **Does not contain, show, or access third-party content**.
- [ ] Age Rating: open the questionnaire. Honest answers given the chat feature:
  - Unrestricted Web Access: **No**
  - User-Generated Content (chat): **Infrequent / Mild** → this lands the app at **12+**. (Apple requires this whenever users can post text other users can see.)

In **Pricing and Availability**:

- [ ] Price Schedule: **Free**.
- [ ] Availability: All countries, or restrict if you prefer.

---

## 7. App Privacy questionnaire (the important one)

In App Store Connect → **App Privacy** → Get Started.

**"Do you or your third-party partners collect data from this app?"** → **Yes**.

Then declare exactly these data types (everything else: leave unchecked):

| Data Type | Linked to User? | Used for Tracking? | Purposes |
|---|---|---|---|
| Contact Info → Email Address | Yes | No | App Functionality |
| Contact Info → Name | Yes | No | App Functionality |
| User Content → Photos or Videos | Yes | No | App Functionality |
| User Content → Other User Content (chat messages, uploaded files) | Yes | No | App Functionality |
| Identifiers → User ID | Yes | No | App Functionality |

For every row above, when asked "Is the data collected from this app linked to the user's identity?" — answer **Yes** (it's tied to their account). When asked "Is the data used for tracking purposes?" — answer **No**.

- [ ] Tracking section: **No, this app does not track users.**

Save and Publish the privacy responses.

---

## 8. Version-specific listing (for the 1.0 release)

App Store Connect → your app → **1.0 (Prepare for Submission)**.

- [ ] **Promotional Text** (170 chars, can be edited without a new build): one-line elevator pitch, e.g. _"Join your group's online meetings, share files, and chat — all from your phone."_
- [ ] **Description** (4000 chars max): a few paragraphs covering: what the app does, who it's for (students in a group/class context), the core features (join meetings, upload/download files, chat), and that it requires an existing account on the Concerto platform.
- [ ] **Keywords** (100 chars, comma-separated, no spaces): e.g. `meetings,classroom,group,chat,video,students,education,files,share,online`
- [ ] **Support URL**: required. Use `https://concerto.micwilk.com/support` (create a simple support page on the backend if it doesn't exist) or a `mailto:` page.
- [ ] **Marketing URL** (optional): `https://concerto.micwilk.com`
- [ ] **Copyright**: e.g. `2026 Michał Wilk` (year + name or company).
- [ ] **Build**: click **+** under Build, select the TestFlight build from Section 5.
- [ ] **App Review Information**:
  - [ ] Contact Information: your name, phone, email.
  - [ ] **Sign-in required**: **Yes**. Provide a **demo account** the reviewer can use:
    - Create a dedicated test account on the production backend (e.g. `appstore-review@example.com`) with a memorable password, joined to a group that has at least one upcoming meeting and a few sample files. Apple reviewers will not register their own account.
    - Fill in **User Name** and **Password** boxes with those credentials.
  - [ ] **Notes**: short explanation, e.g. _"This app is the mobile companion for the Concerto web platform. Reviewers can sign in with the demo account above. After login, tap a group → a meeting to test joining. The meeting view requests camera and microphone permission, which is required for the call. Chat is reachable inside the meeting UI."_

### Screenshots

Required: **6.7-inch iPhone display** (iPhone 15/16 Pro Max sizes — accepts 1290×2796 or 1320×2868 portrait). 3 to 10 images.

Because you set `ios.supportsTablet: false`, **iPad screenshots are not required**.

Easiest way to capture them:

```bash
# Boot an iPhone 16 Pro Max simulator, install the app, then:
xcrun simctl io booted screenshot ~/Desktop/concerto-shot-1.png
```

Suggested screens to capture (in order):

1. Login screen
2. Meetings list (the home screen after login)
3. A group's files screen
4. Meeting view with chat panel open
5. Waiting-for-host state (optional)

Drag the PNGs into the App Store Connect screenshots dropzone.

---

## 9. Smoke test on a real device (before submitting for review)

Apple reviewers test on real hardware. Make sure these work on your iPhone before clicking Submit:

- [ ] Cold install from TestFlight, launch the app.
- [ ] Register a new account → success, takes you to the meetings list (or waiting-for-approval, depending on backend policy).
- [ ] Log out, log back in with existing credentials → success.
- [ ] Open a group, browse files, download a file → success.
- [ ] Upload a file from photo library → iOS shows the photo picker → permission prompt fires the **first** time → upload succeeds.
- [ ] Join a meeting → camera + microphone permission prompts fire → you can see yourself and hear yourself → chat works.
- [ ] Kill the app, reopen → still logged in (session token persisted via expo-secure-store).
- [ ] Force-quit during a meeting → app does not crash on next launch.

If any of these fail, **fix and rebuild before submitting** — Apple will reject for crashes or for permission strings that misrepresent why the app accesses a resource.

---

## 10. Submit for review

App Store Connect → your app → 1.0 page → **Add for Review** → **Submit to App Review**.

- [ ] Export Compliance: the wizard pops up — answer **"Your app does not use encryption"** is correct **only** if `ITSAppUsesNonExemptEncryption: false` is in your Info.plist (it is, you set it). Reason: HTTPS is exempt; Apple does not consider it "encryption" for this question. No annual self-classification report needed.
- [ ] Confirm release option:
  - **Manually release** = you click a button after approval. Recommended for 1.0 so you can announce on your terms.
  - **Automatically release** = goes live the moment Apple approves.

Review typically takes **24–48 hours**. You'll get an email when status changes.

---

## 11. After approval

- [ ] If you chose Manual: hit **Release This Version** in App Store Connect.
- [ ] Verify the app shows up in the App Store search after ~2 hours.
- [ ] Optional: open `App Store Connect → Sales and Trends` after a day to see download numbers.

---

## 12. Future updates (1.0.1, 1.1, etc.)

The streamlined flow once everything above is set up:

```bash
cd expo-app
# edit app.config.js -> version: "1.0.1" (or "1.1.0" etc — semantic versioning, your call)
eas build --platform ios --profile production    # buildNumber auto-increments
eas submit --platform ios --profile production --latest
# In App Store Connect: create a new "+ Version" record, paste "What's New" text, attach build, submit for review.
```

Skip sections 1–3, 6 (only edit changed parts), 7 (only edit if data collection changes), 8 (description / keywords can stay the same).

---

## Common rejection causes (read once, then act on them above)

| Reason | Mitigation in this checklist |
|---|---|
| **Guideline 1.2 — UGC without report/block** | The chat is user-generated. Apple has occasionally required a "report message" and "block user" mechanism. If rejected for this reason, the fix is server-side (add a report endpoint and a block list) and re-submitting. **Worth scoping before 1.0** — see open question below. |
| **Guideline 2.1 — App crashes on review device** | Section 9 catches this. |
| **Guideline 2.1 — Reviewer cannot sign in** | Demo account required — Section 8 covers it. |
| **Guideline 5.1.1 — Privacy strings misrepresent purpose** | All four privacy strings written in plain English with the exact reason — already in `app.config.js`. |
| **Guideline 5.1.5 — Camera/mic requested before user understands why** | Camera/mic are only requested when joining a meeting (user action). Fine. |

---

## Open items to decide before submitting

- [ ] **Chat moderation (Guideline 1.2)** — the chat allows any group member to post text other members will read. Apple sometimes accepts this for closed-group/EDU apps without a report mechanism; sometimes not. **Lower risk if you add a "report message" link in the chat UI before 1.0**. If rejected, you'll have to add it anyway.
- [ ] **Privacy policy URL** — required. If you do not have one yet, draft a simple one covering what's in Section 7 (email, name, chat messages, files, session token; no tracking; data hosted on `concerto.micwilk.com`) and host it at `https://concerto.micwilk.com/privacy`. Add the URL in App Store Connect under **App Privacy → Privacy Policy URL** before submitting.
- [ ] **Support URL** — Section 8 lists `https://concerto.micwilk.com/support`. Make sure that page exists, even if it's just a one-line "email me at …".
