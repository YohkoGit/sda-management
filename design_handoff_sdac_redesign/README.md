# Handoff: SDAC St-Hubert — Reverent & Timeless Redesign

## Overview

This is a **redesign of the SDAC St-Hubert church operations app**. The original BMAD planning artifact called for a distinctive design language (indigo + slate, rounded-[2rem] cards, font-black micro-labels, operational/military vocabulary), but the shipped implementation in `src/sdamanagement-web/` is vanilla shadcn/ui with default purple primary, default radius, and default neutrals — it doesn't feel like a church app at all.

This redesign replaces the visual direction entirely with a **reverent & timeless** publication aesthetic:
- Parchment + deep ink + candlelight gold palette
- Spectral display serif + IBM Plex Sans + IBM Plex Mono
- Hairline rules instead of card boxes
- Typography-led layouts, like a printed church program
- Drops the "operational/military" vocabulary in favour of warm, dignified French

The package contains:
- Design rationale + tokens (this README)
- HTML/React prototype files showing every key screen at desktop + mobile (`prototype/`)
- A migration playbook for the existing Vite + React + TypeScript + Tailwind + shadcn/ui codebase

## About the Design Files

The files in `prototype/` are **design references created in HTML/JSX (Babel-in-browser)** — prototypes showing intended look and behaviour, not production code to copy directly.

The task is to **recreate these designs inside the existing codebase** at `src/sdamanagement-web/` (Vite + React 19 + TypeScript + Tailwind CSS v4 + shadcn/ui), preserving its data layer, routing, i18n setup, hooks, contexts, and component file structure. **Replace the visual layer; keep the architecture.**

Each existing component (e.g. `HeroSection.tsx`, `AppSidebar.tsx`, `ActivityForm.tsx`, the auth dashboard pages) should be refactored to match the redesign while keeping the same props, data sources, and test contracts.

## Fidelity

**High-fidelity** for visual design (colors, typography, spacing, layout structure are final). The developer should recreate the UI pixel-close in Tailwind. Some screens (Activity create, Department detail, Auth dashboard) are designed for one role/state — the developer needs to extend the patterns to cover all roles (OWNER, ADMIN, VIEWER, anonymous) and all states (empty, loading, error, populated). The pattern is established; the application across role/state matrix is the developer's work.

---

## Strategy

Do these in order:

### 1. Foundation (one PR, lands the new look on every page at once)

a. **Replace `src/sdamanagement-web/src/index.css`** with the new tokens (full file content in `tokens/index.css`).

b. **Update `vite.config.ts` / index.html** to load fonts:
```html
<link href="https://fonts.googleapis.com/css2?family=Spectral:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400;1,500&family=IBM+Plex+Sans:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet" />
```

c. **Add a `tailwind.config.ts` extension** (or directly to `index.css` via `@theme inline`) for the new colors, font families, and radii. See `tokens/theme-extension.md`.

d. Restyle the **shadcn `Button`**, `Input`, `Card`, `Badge`, `Separator`, `Sidebar`, `Dialog`, `Popover`, and `Select` components to use the new tokens. shadcn components live in your codebase (`src/components/ui/`) — they are designed to be customized in place. Replace the default radius (rounded-md), default font-weights, default focus rings, etc.

After step 1 is in place, every existing page will already look closer to the redesign because the underlying tokens changed. Then do the layout-level refactors:

### 2. Public layer (warm side)
- `pages/HomePage.tsx` + `components/public/HeroSection.tsx` — replace with the typographic "Sabbath bulletin" hero (see `prototype/screens-public.jsx` → `PublicHomeDesktop` and `PublicHomeMobile`)
- `components/public/UpcomingActivitiesSection.tsx` — replace card grid with hairline-rule print rows (see `UpcomingRow`)
- `components/public/DepartmentOverviewSection.tsx` — replace card grid with `DeptRow` list
- `components/public/YouTubeSection.tsx` — show only when live; redesign as the dark ink section with side-by-side layout
- `pages/PublicCalendarPage.tsx` + `components/calendar/CalendarView.tsx` — replace the Schedule-X calendar with the publication-style monthly grid (Sunday column tinted gilt, Saturday tinted parchment-2, sabbath days marked with gilt dots, Sainte-Cène day washed in gilt). The calendar is one of the most visible screens — the existing Schedule-X library may need to be replaced with a custom grid, or its theme heavily overridden.

### 3. Auth layer (dignified, denser, same design system)
- `components/layout/AppSidebar.tsx` — replace shadcn Sidebar with the new sidebar (Wordmark + user identity card + numerated nav items with gilt active indicator). See `prototype/screens-member.jsx` → `AuthShell`.
- `pages/DashboardPage.tsx` + `components/dashboard/*` — replace the "CENTRE DE COMMANDE / REGISTRE PERSONNEL" eyebrows with the new copy ("Bonjour, Marie."). Use `AssignmentRow` and the right-rail "this week" pattern.
- `pages/DepartmentDetailPage.tsx` — apply the redesigned department detail (stats strip with romanesque numerator values, sub-ministries list, member roster)
- `pages/AdminActivitiesPage.tsx` + `components/activity/ActivityForm.tsx` — apply the redesigned create flow with the new pickers (Date, Time, Dept, ContactPicker, TagPicker)

### 4. Pickers
The pickers are not free shadcn — they're styled wrappers around shadcn primitives:
- `DateField` → wraps shadcn `Popover` + a custom calendar grid (Sunday-first, gilt sabbath markers). Replace the existing date picker in `ActivityForm.tsx`.
- `TimeField` → shadcn `Popover` + a 15-min time grid
- `DeptField` → shadcn `Select` styled with department swatches
- `ContactPickerField` → shadcn `Popover` + chip input + department-grouped list. Replace `components/activity/ContactPicker.tsx`.
- `TagPicker` → toggle group of segmented pills (use Radix ToggleGroup)

### 5. Vocabulary pass
Update `public/locales/fr/common.json` to replace operational/military vocabulary with warm dignified French. **Specific replacements:**

| Old key/value | New value |
|---|---|
| `CENTRE DE COMMANDE` | (remove — replaced with date eyebrow `Mercredi 13 mai · 2026`) |
| `REGISTRE PERSONNEL` | `Mes affectations` (lowercase, in mono caps) |
| `Bonjour, Marie` (font-bold sans) | `Bonjour, Marie.` (Spectral display serif, period in ink-2) |
| `Terminate Session` / equivalent | `Se déconnecter` |
| `Protocol Node` | (remove, use simple breadcrumb) |
| Activity types kept as-is in French | (no change) |

---

## Design Tokens

### Colors (use these exact hex values)

```
/* Parchment (warm whites) */
--parchment:   #FAF8F2;   /* page background */
--parchment-2: #F4EFE2;   /* card/section wash, form fields */
--parchment-3: #ECE5D3;   /* deeper wash, avatar background */
--hairline:    #E2D9C2;   /* primary rules, dividers */
--hairline-2:  #D4C8AB;   /* input borders, stronger dividers */

/* Ink (deep navy-charcoal) */
--ink:         #1B2530;   /* primary text, primary button */
--ink-2:       #2F3D4A;   /* secondary text */
--ink-3:       #5A6976;   /* captions, eyebrows */
--ink-4:       #8A95A1;   /* placeholders, disabled */

/* Gilt (candlelight gold — used sparingly, max once per screen) */
--gilt:        #B89146;   /* sabbath dots, accents */
--gilt-2:      #9C7A32;   /* gilt text */
--gilt-soft:   #E8D9B0;   /* borders for gilt tags */
--gilt-wash:   #F5EBCF;   /* gilt-tagged backgrounds, sabbath calendar cell */

/* Accents */
--rose:        #8B3A3A;   /* LIVE indicator only — never decoration */
--moss:        #4A6B5C;   /* dept color: Diaconnat */
--bordeaux:    #6B2F35;   /* dept color: JA */
--azure:       #2A5673;   /* dept color: Music */
--umber:       #7A5A3C;   /* dept color: MIFEM */
--plum:        #5A3F5C;   /* dept color: MF */

/* Status */
--staffed:     #4A6B5C;   /* fully staffed (green-ish moss) */
--gaps:        #B58527;   /* roles to fill (amber) */
```

### Typography

```
Spectral         — display headlines, large numbers, italic accents (300/400/500/600)
IBM Plex Sans    — UI, body, buttons, form fields (300/400/500/600)
IBM Plex Mono    — eyebrows, micro-labels, dates, times, serial numbers (400/500)
```

**Scale:**
| Token | Size | Family | Weight | Use |
|---|---|---|---|---|
| Display XL | 84–124px | Spectral | 300–400 | Hero "Sainte-Cène" title |
| Display L | 56–72px | Spectral | 400 | Page titles ("Bonjour, Marie.") |
| Display M | 38–42px | Spectral | 400 | Section headings |
| Display S | 22–28px | Spectral | 400–500 | Activity titles, card titles |
| Body L | 17px | Plex Sans | 400 | Hero body, long-form |
| Body | 14px | Plex Sans | 400 | Default body |
| Body S | 13px | Plex Sans | 400 | Compact rows, secondary |
| Eyebrow | 10–11px | Plex Mono | 500 | UPPERCASE, letter-spacing 0.16em, ink-3 |
| Numerator | 30–124px | Spectral | 300–400 | Date numbers, statistics |

### Spacing & Geometry

- Default radius: `4px` (`var(--radius)`). Pill radius for chips: `999px`. **No more `rounded-[2rem]`**.
- Section padding: 48–80px desktop, 20–28px mobile
- Form fields: 12px vertical padding inside field-shell, 14px horizontal
- Hairline rules: 1px `var(--hairline)`, thicker emphasis: 1px `var(--ink)` for top-of-section
- No drop shadows on cards. Use rules + parchment-2 wash for separation. Shadows only on floating elements (popovers): `0 20px 40px -20px rgba(27, 37, 48, 0.25)`.

---

## Screens

For each redesigned screen, see the prototype file and a brief spec:

### 1. Public — Home (`HomePage.tsx`)
Prototype: `prototype/screens-public.jsx` → `PublicHomeDesktop` / `PublicHomeMobile`

- **Top nav**: parchment background, Wordmark left (Spectral "Saint-Hubert" + mono caps subtitle), nav links centered with gilt underline on active, FR/EN toggle + Connexion button right
- **Hero**: 2-column grid (1.1fr / 1fr separated by hairline rule)
  - Left: gilt eyebrow ("Ce Sabbat · 23ᵉ semaine"), huge Spectral title with italic second word and gilt period, body, hairline rule, 3-column meta (Date/Horaire/Lieu)
  - Right: massive numerator "23" (220px Spectral 300) + month/year italic, predicateur block with portrait image-slot, biblical quote in Spectral italic
- **Live section** (only when stream is active): dark ink background, 2-column with live badge + body left, video embed with rose LIVE badge right
- **Upcoming activities**: hairline rule rows, 5-column grid: serial number | numerator date | weekday/title/note | dept swatch/code | time (right-aligned mono)
- **Departments**: 2-column hairline rows, serial + swatch + dept name + member count + "Voir →" link
- **Footer**: parchment-2 background, 4-col grid (brand/horaires/social/direction)

### 2. Public — Calendar (`PublicCalendarPage.tsx`)
Prototype: `PublicCalendarDesktop` / `PublicCalendarMobile`

- **Header**: eyebrow + Spectral "Mai MMXXVI" + view switcher (Jour/Semaine/Mois/Année) as ink-filled mono buttons
- **Month grid**:
  - Sunday-first weekday header row, Sunday column header in gilt-2
  - Day cells minimum 132px tall, parchment background
  - Saturday column: parchment-2 background
  - Sabbath days (every Saturday): no special treatment beyond column wash
  - **Sainte-Cène day** (or any featured day): full cell gilt-wash background, gilt eyebrow tag "✣ Sainte-cène"
  - Today: bumped to numerator 24px + gilt eyebrow "Aujourd'hui"
  - Event chips: 4px dept swatch dot + 11px event title (truncated)
- **Mobile**: 7-day week strip across the top, then full-width hairline rows for each day with events

### 3. Sign-in (`LoginPage.tsx`)
Prototype: `screens-member.jsx` → `SignInScreen`

- **Desktop**: split 50/50. Left = ink background with church photograph image-slot at 55% opacity, Wordmark top, hero copy bottom. Right = form panel.
- **Form**: numerated eyebrow "01 — Connexion", Spectral display "Bienvenue à la maison.", body copy mentioning named admins, Google OAuth button (with logo), "ou" hairline divider, email + password fields with leading icons (and "Afficher" toggle on password), primary "Se connecter →" + "Mot de passe oublié?" inline
- **Mobile**: single column, no image side
- Footer fine-print: "✣ Soli Deo gloria" in mono caps

### 4. Auth Dashboard (`DashboardPage.tsx`, member view)
Prototype: `AuthDashboardDesktop` / `AuthDashboardMobile`

- **Sidebar (260px)**: Wordmark, user identity card (avatar + name + role · dept), "Naviguer" mono caps section header, nav items with mono caps icon glyphs and gilt left-border on active. If user is ADMIN, second "Administration" section with gilt eyebrow. Footer: language + sign-out.
- **Top of content**: greeting in date eyebrow ("Mercredi 13 mai · 2026"), Spectral "Bonjour, Marie." (italic period), body summarizing next assignment count, right-aligned "Prochaine affectation · dans 3 jours · Sam. 23 mai · 10 h 00"
- **My assignments**: featured first assignment with gilt top rule, large numerator date (56px), Spectral title (32px), dept swatch + role eyebrow, hairline rule, avatar stack of "Avec vous" people
- **Right rail**: "Ce sabbat" card (parchment with hairline border), recent activity feed (typography rows)

### 5. Department Detail (`DepartmentDetailPage.tsx`, admin)
Prototype: `DepartmentDetail`

- **Header**: breadcrumb (mono caps), eyebrow with department swatch + ministère number, Spectral "Ministère des femmes" (italic second word), body summary, buttons right
- **Stats strip**: 4-column grid with hairline separators, eyebrow label + large numerator (56px). Stats with warnings render in `--gaps` amber.
- **Upcoming activities table**: 6-column grid (serial | date numerator | weekday-title | status dot+text | status label | chevron)
- **Right column**: Sub-ministries (hairline rows), members list (avatar + name + role)

### 6. Activity Create (`AdminActivitiesPage.tsx` → form)
Prototype: `ActivityCreate`

- **Stepper**: 4 horizontal segments (Modèle/Détails/Rôles/Révision), top hairline rule colors: gilt for done/active, hairline-2 for upcoming
- **Form fields**: see Pickers spec below
- **Role roster**: hairline rows, role title + count, chip stack of assigned people with × remove, dashed "+ Attribuer" chip. Empty roles show eyebrow "● À pourvoir" in gaps amber.
- **Right rail**:
  - Public preview card (mini hero in parchment with hairline border)
  - Verification checklist (round badge with ✓ in staffed green, ! in gaps amber)
  - "Continuer →" primary button + "Sauvegarder" ghost

---

## Pickers (detailed spec)

All pickers share the **field-shell**: parchment-2 background, 1px hairline-2 border, 4px radius, 12px vertical / 14px horizontal padding, focus state swaps to ink border + parchment background.

### DateField
- Closed: chevron-right shape on right, calendar icon on left, value text in ink
- Open (Popover below, 8px gap): mini calendar
  - 280px wide, parchment background, hairline-2 border, 6px radius
  - Header: prev arrow / "Mai 2026" Spectral 15px / next arrow
  - Weekday row: 7 columns, Sunday column gilt-2 caption, others ink-3
  - Day cells: 6px vertical padding, mono 11px
    - Dim cells (prev/next month): ink-4
    - Selected: ink background, parchment text
    - Today: 600 weight
    - Sabbath days: 3px gilt dot below number
  - Footer: hairline rule, legend "● Sabbat" + "Aujourd'hui · 13"

### TimeField
- Closed: clock icon left, "10 h 00" mono text
- Open: 260px Popover, parchment, hairline-2 border
  - Header: "Début" eyebrow + "Pas de 15 min" mono caption
  - 4-column grid of 15-min slots, mono 11px, 7px padding, 1px hairline border
  - Selected slot: ink background, parchment text

### DeptField
- Closed: department swatch dot left, dept name in ink, chevron right
- Open: shadcn Select popover with each option row: swatch + name (flex 1) + member count eyebrow right

### ContactPickerField
- Closed: chip-style chips for selected (avatar + name + ×), input field flowing inline, 6px padding (more generous than other shells for chip breathing room)
- Open: Popover below
  - Department-grouped sections
  - Each section header: swatch + dept eyebrow + count right
  - Person row: avatar + name (Spectral 14) + role (mono caps 9px below) + check on right if selected
  - Selected rows: parchment-2 background
  - Max height 340px with overflow auto

### TagPicker
- Inline (no popover)
- Pills: mono 10px uppercase, 0.14em tracking, 7px vertical / 12px horizontal padding, 1px hairline-2 border, 2px radius
- Selected: ink background + parchment text + check glyph left
- Single-select segmented control

---

## Interactions & Behavior

- **Sidebar nav**: Active item has gilt left border (2px) + parchment-2 background. Hover: parchment-2 background only (no border).
- **Buttons**:
  - Primary: ink background, parchment text. Hover: lighten to ink-2.
  - Ghost: transparent, ink text, 1px hairline-2 border. Hover: border becomes ink.
  - Gilt: transparent, ink text, 1px gilt border. Hover: gilt-wash background.
- **Live indicator**: pulsing rose dot, mono caps "EN DIRECT", pulse animation `1.8s infinite, opacity 1→0.4, scale 1→0.85`
- **Calendar cells**: hover applies parchment-3 background. Click opens day-detail dialog (existing pattern in codebase).
- **Form field focus**: 150ms transition on border-color and background
- **Toast / "Publié" confirmation**: parchment-2 background, hairline-2 border, Spectral title 16px "Publié" + body "Voir l'aperçu public →" link in gilt-2. Slide up from bottom-right, 4s auto-dismiss.

## State Management

The redesign does not change data flow. All existing TanStack Query hooks (`useNextActivity`, `useChurchInfo`, `useMyAssignments`, etc.), AuthContext, and route structure stay. Only the JSX rendering changes.

## Image Assets

The prototype uses `<image-slot>` web components (drag-and-drop placeholders). In the real app, these become:
- **Hero predicateur portrait**: `activity.predicateurAvatarUrl` (existing field). Fallback to initials avatar.
- **Sign-in cover photograph**: New asset. Suggest the church commissions a wide photograph of the sanctuary interior. Place at `public/img/sanctuary-cover.jpg`. Recommended dimensions: 2400×1600. Apply `opacity: 0.55` overlay.
- **Live stream still**: YouTube oEmbed thumbnail from the configured live URL.

## Vocabulary Rules

These rules apply globally — the developer should grep the codebase for old vocabulary and replace:

| Avoid | Use instead |
|---|---|
| "Centre de commande" / "Command Center" | (drop entirely) |
| "Registre personnel" | "Mes affectations" |
| "Centre d'opérations" | (drop) |
| "Terminer la session" | "Se déconnecter" |
| Uppercase French headings | Title case Spectral display |
| Indigo / purple anywhere | Replace with ink for primary, gilt for sparing accent |
| "Protocol Node →" breadcrumbs | Simple `Section / Subpage` mono caps |

The new tone is **dignified, warm, plain French** — the way a thoughtfully designed church bulletin would speak.

---

## Motion

Reverent never bounces. The motion language is measured slow-out easing, modest durations, opacity + transform — never jarring layout shifts. Drawers and popovers should feel like a page turning in a hymnal, not an app reacting.

### Tokens (already in `tokens/index.css`)

```
--ease:        cubic-bezier(0.4, 0.2, 0.2, 1);   /* General */
--ease-out:    cubic-bezier(0.0, 0.0, 0.2, 1);   /* Entries — slow-out, favour for everything appearing */
--ease-in:     cubic-bezier(0.4, 0.0, 1, 1);     /* Exits */

--dur-instant: 80ms;     /* button color shift */
--dur-fast:    150ms;    /* hover, focus, popover lift */
--dur:         240ms;    /* drawer, toast, dialog */
--dur-slow:    360ms;    /* hero rise, page entry */
```

### Named animations (utility classes in `tokens/index.css`)

| Class | Used by | Spec |
|---|---|---|
| `.anim-drawer-in` | Mobile menu opening | `translateX(-100%) → 0`, 240ms ease-out |
| `.anim-drawer-out` | Mobile menu closing | reverse, 240ms ease-in |
| `.anim-fade-in` / `.anim-fade-out` | Backdrop overlays | opacity 0↔1, 240ms |
| `.anim-popover-in` | Date picker, time picker, contact picker, select | opacity 0→1 + `translateY(-4px) scale(0.985) → 0`, 150ms ease-out, `transform-origin: top center` |
| `.anim-toast-in` | "Publié" toast notification | `translateY(12px) → 0` + fade, 240ms ease-out |
| `.anim-rise` | Hero on first paint (use **once per page**, never on lists) | `translateY(8px) → 0` + fade, 360ms ease-out |

### Where to use animation in the codebase

| Component | Animation |
|---|---|
| Mobile menu (`PublicMobileNav`, `AppSidebar` mobile branch) | `.anim-drawer-in` on the open panel + `.anim-fade-in` on the backdrop. On close, swap to `.anim-drawer-out` / `.anim-fade-out` and unmount after 240ms. |
| `Popover`, `Select`, `Dialog` (shadcn) | The shadcn primitives already animate on `data-state="open"`. Override their default keyframes to use `.anim-popover-in` (drop the bouncy zoom-in shadcn ships with). |
| Toasts (`useToast`) | `.anim-toast-in`. Auto-dismiss 4s. Position bottom-right desktop, full-width top on mobile. |
| Hero on Public Home | `.anim-rise` once on initial mount. Do **not** animate per-section as the user scrolls. |
| Sidebar active state | The gilt left border (`border-left: 2px solid var(--gilt)`) needs no animation — it shows instantly on route change. Tempting to slide it in; don't. |
| Calendar cell hover | `transition: background var(--dur-fast) var(--ease)`. |
| Form field focus | Already specced: 150ms border + background swap. |
| Buttons | `transition: background-color var(--dur-instant), border-color var(--dur-instant)`. **No** scale/shadow on hover. |
| Live indicator | Pulse keyframe already defined as `sdac-pulse 1.8s infinite`. |

### Principles

1. **Never bounce.** No spring physics, no overshoot. The hymnal page does not bounce when it turns.
2. **Transform, not layout.** Animate `opacity` and `transform` only. Never animate `width`, `height`, or `top/left` — they trigger layout and feel cheap.
3. **Respect the user.** Every animation honours `prefers-reduced-motion`. The CSS already collapses durations to 0.01ms globally — no per-component code needed.
4. **One thing at a time.** Never stagger more than two elements. Never animate a list of cards in on mount. The page already feels alive through typography — don't overdecorate.

### Anti-patterns to avoid

- ❌ `@keyframes zoomIn` from 0 → 1 scale (the shadcn default — too violent)
- ❌ Stagger animations on card grids
- ❌ Number counters animating up to their value
- ❌ Parallax scroll effects
- ❌ Slide-in-from-right for nav items
- ❌ Scale-bounce on button click

---

## Files in This Bundle

```
design_handoff_redesign/
├── README.md                          (this file)
├── prototype/
│   ├── index.html                     (workspace shell, fonts, mounts the React app)
│   ├── styles.css                     (all design tokens + base styles + form-shell + buttons)
│   ├── components.jsx                 (Wordmark, Eyebrow, Avatar, Tag, Btn, DateBlock, Frames)
│   ├── pickers.jsx                    (Field, TextField, DateField, TimeField, DeptField, ContactPickerField, TagPicker, MiniCalendar)
│   ├── design-system.jsx              (the design system tab — palette/type/principles/components/pickers)
│   ├── screens-public.jsx             (Home + Calendar, desktop + mobile)
│   ├── screens-member.jsx             (Sign-in, Auth Dashboard, Department Detail, Activity Create)
│   ├── main.jsx                       (workspace router/rail nav)
│   └── image-slot.js                  (web component for drag-drop image placeholders)
└── tokens/
    ├── index.css                      (drop-in replacement for src/sdamanagement-web/src/index.css)
    └── theme-extension.md             (Tailwind config + utilities reference)
```

To preview the prototype: `open prototype/index.html` — it runs in any modern browser, no build step.

## Recommended PR Sequence for Implementation

1. **PR 1 — Tokens & primitives** (foundation). Replace `index.css`, add fonts, restyle shadcn UI primitives. Estimated: 2 days. _Result: every page already looks dramatically different._
2. **PR 2 — Public Home + Calendar**. Highest-visibility public screens. Estimated: 3 days.
3. **PR 3 — Auth shell + Dashboard**. Replace AppSidebar + Dashboard. Estimated: 2 days.
4. **PR 4 — Pickers + Activity create**. Build the picker components, refactor ActivityForm. Estimated: 3 days.
5. **PR 5 — Department detail + remaining admin pages**. Estimated: 2 days.
6. **PR 6 — Vocabulary pass + i18n cleanup**. Estimated: 1 day.

**Total estimated: ~13 dev-days** for a one-person rebuild, much faster with Claude Code assistance.
