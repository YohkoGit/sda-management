# Tailwind + shadcn Theme Extension

The project uses **Tailwind CSS v4** with `@theme inline` blocks driving shadcn/ui's CSS-variable design tokens. The redesign uses this same plumbing — no tailwind.config.ts changes are required if you replace `index.css` wholesale. Below is a reference of what each token means and which Tailwind class names will start producing the new look automatically.

## How the token chain works

```
:root sets brand-level vars   →   @theme inline maps brand vars to color-* vars
  --ink: #1B2530                    --color-primary: var(--primary)
  --primary: var(--ink)             --color-foreground: var(--foreground)
                                ↓
                          Tailwind generates:
                            bg-primary, text-foreground, border-border, etc.
                                ↓
                          shadcn components use those classes
                            <Button> bg-primary text-primary-foreground
```

So changing `:root` is enough — every shadcn `<Button>`, `<Input>`, `<Card>`, `<Badge>`, `<Separator>`, `<Sidebar>`, etc. inherits the new look without changing component source.

## New utility classes you can now use

Drop the new index.css into the project, and these classes become available automatically:

| Class | What it does | Example |
|---|---|---|
| `bg-parchment` / `bg-parchment-2` / `bg-parchment-3` | Warm whites for sections, cards, washes | `<section class="bg-parchment-2">` |
| `bg-ink` / `text-ink` / `text-ink-2` / `text-ink-3` / `text-ink-4` | The deep navy family | `<h1 class="text-ink">…</h1>` |
| `text-gilt` / `text-gilt-2` / `bg-gilt-wash` / `border-gilt` | Candlelight gold accents | `<span class="text-gilt-2">23ᵉ semaine</span>` |
| `text-rose` | LIVE indicator only — do not use as decoration | `<span class="text-rose">EN DIRECT</span>` |
| `border-hairline` / `border-hairline-2` | Print-style dividers | `<hr class="h-px bg-hairline">` |
| `text-staffed` / `text-gaps` | Status colors for staffing indicators | `<span class="text-gaps">À pourvoir</span>` |
| `bg-dept-diaconnat`, `bg-dept-ja`, etc. | Department spot colors | `<span class="w-2 h-2 rounded-full bg-dept-mifem">` |
| `font-display` / `font-sans` / `font-mono` | Spectral / IBM Plex Sans / IBM Plex Mono | `<h1 class="font-display text-5xl">` |
| `.eyebrow` | Mono 10px uppercase 0.18em tracking | `<div class="eyebrow">Ce sabbat</div>` |
| `.eyebrow-gilt` | Same as above, in gilt-2 | `<div class="eyebrow eyebrow-gilt">À venir</div>` |
| `.numerator` | Large display number (dates, stats) | `<span class="numerator text-7xl">23</span>` |
| `.rule` | 1px hairline rule | `<hr class="rule">` |
| `.rule-thick` | 1px ink rule (section breaks) | `<hr class="rule-thick">` |
| `.field-shell` | Container for input fields (see below) | see Pickers section |
| `.live` | Live indicator with pulsing dot | `<span class="live">En direct</span>` |

## Restyling shadcn primitives

Most shadcn components in `src/components/ui/` only need small edits. Here's what to change:

### `button.tsx`
Replace the default `cn(...)` variants:

```diff
- "bg-primary text-primary-foreground shadow-xs hover:bg-primary/90"
+ "bg-ink text-parchment hover:bg-ink-2 rounded-[var(--radius)] font-sans font-medium"
```

Add a new `gilt` variant:
```ts
gilt: "bg-transparent text-ink border border-gilt hover:bg-gilt-wash",
```

Drop the `shadow-xs` default — the redesign uses no button shadows.

### `input.tsx`
Wrap the actual `<input>` in a `.field-shell` div. Update the default styling to use the parchment-2 background + hairline-2 border instead of the default white/black.

```tsx
<div className="field-shell">
  <input className="bg-transparent border-0 outline-none flex-1 font-sans text-sm text-ink placeholder:text-ink-4" {...props} />
</div>
```

### `card.tsx`
Drop the default border + shadow. Cards in the redesign are typographic surfaces with parchment-2 backgrounds, not boxed containers. The recommended replacement:

```tsx
className="bg-parchment border border-hairline rounded-[var(--radius)] p-6"
```

But prefer hairline rule rows in most places (`border-t border-hairline` on a `<div>` row) over `<Card>` containers.

### `badge.tsx`
Replace default rounded-full with rounded-sm and mono uppercase styling:

```ts
"inline-flex items-center font-mono text-[10px] uppercase tracking-[0.12em] px-2 py-1 border border-hairline-2 text-ink-2 rounded-sm bg-parchment"
```

Variant `gilt`:
```ts
"text-gilt-2 border-gilt-soft bg-gilt-wash"
```

### `separator.tsx`
Switch to a 1px hairline by default:
```tsx
className="h-px w-full bg-hairline border-0"
```

### `sidebar.tsx`
The shadcn `<Sidebar>` is a complex component. Easier path: build a new `AppSidebar.tsx` from scratch using the prototype's structure (see `prototype/screens-member.jsx` → `AuthShell`). Replace the existing `src/components/layout/AppSidebar.tsx` entirely.

### `dialog.tsx` / `popover.tsx`
Bgrounds become parchment, border becomes hairline-2, radius 4–6px. Drop the heavy shadow; use `shadow-[0_20px_40px_-20px_rgba(27,37,48,0.25)]` (soft, warm).

## Sidebar primer-color override

The existing sidebar uses indigo highlight via `--sidebar-ring` and `--sidebar-primary`. After replacing `index.css`, those become ink + gilt-wash, so the existing AppSidebar will look closer to the redesign automatically. **But** the redesign uses a **gilt left border** on active nav items (not a background fill), which requires AppSidebar.tsx to be updated — see migration spec in README §3.

## A note on TanStack Router / React Router

Routing and route-level providers stay the same. The redesign doesn't introduce new routes. Some pages get renamed in copy (`Mes Affectations` → `Mes affectations`, case change) but routes stay the same.

## i18n

`public/locales/{fr,en}/common.json` need a vocabulary pass — see README "Vocabulary Rules" section. Concretely, search-and-replace these keys in `fr/common.json`:

```
nav.auth.dashboard           "Centre de commande" → "Tableau de bord"
nav.auth.signOut             "Terminer la session" → "Se déconnecter"
pages.dashboard.greeting     keep "Bonjour, {name}" but render the period as italic ink-2
sections.myAssignments       "REGISTRE PERSONNEL" → "Mes affectations" (lowercase; the eyebrow styling applies the uppercase)
```

Update the matching `en/common.json` keys to plain English equivalents — drop "COMMAND CENTER" / "PERSONNEL REGISTER" entirely.
