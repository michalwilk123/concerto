# Concerto Design System

The source of truth for UI/UX in the **web app**. Goal: a calm, consistent,
"work / education app" feel. When a component disagrees with this doc, the doc wins.

> Scope: web app only for now. Expo mobile is a separate, later pass.

---

## 1. Principles

1. **Label everything.** Every *action* shows a text label (icon optional, leading).
   No icon-only buttons for actions — see §4.
2. **Tokens, not inline values.** Color, spacing, and radius come from CSS variables
   (`globals.css`). Components must not hardcode hex colors, px spacing, or px radius.
3. **One way to do a thing.** One Button family, one IconButton, one Tabs, one
   SidebarNavItem. No bespoke per-screen reimplementations.
4. **Hierarchy through tokens, not novelty.** Differentiate with variant/size/weight,
   not new colors or one-off styles.

---

## 2. Color tokens

Use the semantic tokens. **Do not introduce new hex values in components.**

| Token | Use |
|---|---|
| `--accent-purple` (#8b5cf6) | Primary action, active nav, focus ring, links |
| `--accent-red` | Destructive only (delete, leave, remove) |
| `--accent-green` | Success / positive state |
| `--accent-orange` | Warning / attention |
| `--text-primary/secondary/tertiary` | Text hierarchy |
| `--bg-primary…elevated` | Surface elevation |
| `--border-subtle/default` | Dividers / outlines |

**Fix required:** `--accent-blue` is currently `#8b5cf6` — identical to purple — and is
used for links/focus rings. There is no real "blue." Action: **delete `--accent-blue`**,
repoint all usages (`globals.css:105,157,177` + components) to `--accent-purple`.
Reconcile the duplicate shadcn HSL token set (`globals.css:81-100`) so it derives from
these values rather than defining its own.

---

## 3. Spacing & radius

- Spacing: `--space-xs/sm/md/lg/xl/2xl` (4 → 32px). No raw px margins/padding.
- Radius: `--radius-sm/md/lg` only (4/6/8px). Buttons = `md`, cards/panels = `lg`,
  chips/badges = `sm`.

---

## 4. Buttons

**One family.** The canonical `Button` lives at `components/ui/button.tsx` (the shadcn base,
reshaped). `IconButton` is its square sibling. `InlineButton` becomes a **deprecation shim**
that maps its old props to the canonical `Button`, so the 30 existing call sites keep working
and migrate screen-by-screen; delete the shim when the last caller is gone.

> **Styling mechanism:** Tailwind v4 utility classes. The shadcn color classes were dead
> because `globals.css` had no `@theme` mapping — fixed by adding `@theme inline` that maps
> `--color-primary: hsl(var(--primary))` etc. Audit confirmed `ui/button.tsx` was the only
> file using those classes, so wiring `@theme` restyles nothing else. Tailwind classes (not
> inline styles) are required so `:hover` / `:focus-visible` / `:active` states are
> consistent — inline styles cannot express them, which is part of why buttons felt random.

### Canonical API
```tsx
<Button variant="primary" size="md" iconStart={<Plus />}>{t('common.actions.create')}</Button>
<Button variant="danger">{t('common.actions.delete')}</Button>
<IconButton aria-label={t('common.actions.close')}><X /></IconButton>
```

### Button
- Props: `variant` × `size` × optional `iconStart` × `loading` × `disabled`.
- **variant:** `primary` (purple fill) · `secondary` (neutral border) · `ghost`
  (transparent) · `danger` (red).
- **size:** `sm` (dense rows / sidebar) · `md` (default) · `lg` (form submit / login).
- Always text. Leading icon optional. Never icon-only.
- Built-in, consistent: hover, `:focus-visible` ring (`--accent-purple`), disabled,
  loading spinner.

### IconButton — narrow exception
Reserved for **universal symbols, never actions**: modal close `×`, expand/collapse
chevrons, sidebar toggle. ~4 conventional glyphs total.
- **Mandatory `aria-label` + tooltip.**
- Anything that is an *action* (rename, delete, copy, approve, download, settings,
  leave) is a text `Button`, even in dense rows.

### Decision rule
> Is it an action? → text `Button`.
> Is it a universal symbol (× or chevron)? → `IconButton` with aria-label.
> Nothing else is icon-only.

---

## 4b. Shared label vocabulary (i18n)

Button/label **text is shared, not duplicated per screen.** Today the same string lives
under many keys — `"Cancel"` ×7, `"Delete"` ×4, `"Confirm"` ×3, `"Sign In"` ×4,
`"Email"` ×5 (see `lib/translations.ts`). That is the anti-pattern to remove.

**Rule:** one key per distinct piece of text, in a **structured namespace** (not a flat
`common.*` junk drawer); the *visual* difference comes from the Button `variant`, not from
a separate translation key.

```
common.actions.cancel    "Cancel"      common.fields.email     "Email"
common.actions.delete    "Delete"      common.fields.password  "Password"
common.actions.confirm   "Confirm"     common.fields.name      "Name"
common.actions.save      "Save"        common.navigation.dashboard "Dashboard"
common.actions.close     "Close"       common.navigation.files     "Files"
common.actions.copyLink  "Copy link"   common.navigation.meetings  "Meetings"
```

- ❌ `manage.users.confirm`, `meeting.confirm`, `files.confirm` → 3 identical strings.
- ✅ `common.actions.confirm` used in all three; the destructive one is just
  `<Button variant="danger">{t('common.actions.delete')}</Button>`.

**Share only by UI intent, not by English string.** Same English text can mean different
things. **Safe to share:** `cancel, delete, confirm, save, close, copyLink, email,
password, name`. **Do NOT auto-share** (object/context/grammar-dependent): `leave, open,
add, create, start, role` — keep these per-feature unless proven identical in every locale.

**Benefits:** consistency by construction; the admin Translations panel gets a clean
`common.actions / common.fields / common.navigation` structure instead of scattered dupes.

**The one caveat (Polish/grammatical context):** a word identical in English can differ by
grammatical context in another language (case, gender, verb vs noun). For those rare cases,
keep a context-specific key and document why inline. Default to sharing; branch only on a
real translation conflict — not preemptively.

**Migration note:** when collapsing duplicate keys, migrate any existing overrides in
`data/translations.json` that reference the old keys to the new shared key, so admin
customizations aren't lost.

---

## 5. Navigation vs Tabs (two different components)

These look related (shared tokens) but are **not the same component**.

- **`SidebarNavItem`** — primary app navigation; changes major context.
  Text + icon, single active style (purple left-accent / fill). Used by the dashboard
  left sidebar.
- **`Tabs`** — swaps a view *in place* within one context. Used by the meeting
  side panel, the admin Manage panel, and the mobile tab bar. One implementation,
  config-driven (`{ id, label, icon?, badge? }`).

---

## 6. Surface specs

### App header (`AppHeader.tsx`)
Logo (link) · context title · right side = text `Button`s + the sidebar-toggle
`IconButton`. No hand-styled links acting as buttons.

### Dashboard sidebar (`DashboardSidebar.tsx`)
- `SidebarNavItem`s: Files · Meetings · Manage · Translations (text + icon, one active style).
- Group selector is **part of** the nav (top of sidebar), not a floating select.
- Storage usage demoted to a quiet sidebar **footer**.

### Meeting room (`VideoRoom.tsx`, `ResizableSidebar.tsx`, `MobileTabBar.tsx`)
- **RealtimeKit owns the in-video controls** (mic/cam/screen-share) in their own
  grouped bar — we do not restyle them. The app owns everything around them.
- Panel nav = `Tabs`: **Video · Chat · Files · People · Waiting** (text labels).
- Meeting actions = text `Button`s: **Copy link · Dashboard · Leave** (Leave = `danger`).
- **Same labels + translations on mobile and desktop.** `MobileTabBar` must use i18n
  keys, not hardcoded English.

### Row actions (files / meetings / users / participants)
All actions are `sm` text `Button`s (variant `ghost`, `danger` for delete). No icon-only
row actions. Group them with a shared spacing pattern.

---

## 7. Accessibility (rides along with the sweep)

- Every `IconButton` has `aria-label` + tooltip.
- Standard `:focus-visible` ring on all interactive elements (token: `--accent-purple`).
- Color is never the only signal (destructive = red **+** the word "Delete"/"Leave").

---

## 7b. Implementation sequence

**UI primitives first, i18n second.** Do not migrate translations globally up front — it is
noisy and risky and delays visible UX improvement. Make the components real, prove them on
two screens, then migrate labels *alongside* each UI sweep (only for labels in files being
touched).

**Stage 0 — foundation**
1. Token cleanup (`@theme` mapping; delete `--accent-blue` → `--accent-purple`).
2. Canonical `Button` + `IconButton` (+ `InlineButton` shim).
3. `SidebarNavItem`.
4. Shared `Tabs`.
5. Apply to `AppHeader` + `DashboardSidebar` (visible proof).
6. Add shared `common.*` i18n keys **only** for labels touched in those two files.

**Then, per surface (meeting room → files → meetings → admin tables):** apply components,
migrate that surface's labels to `common.*`, migrate `data/translations.json` overrides,
remove now-dead keys. Commit per surface so each step is reviewable.

## 8. Out of scope (explicitly)

- RealtimeKit internal controls — left as-is (fragile; see project memory).
- Expo mobile app — separate later pass.
- `file_metadata` table and other backend concerns.
