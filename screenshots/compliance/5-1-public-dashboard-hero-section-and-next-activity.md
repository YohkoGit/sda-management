# UX Compliance Report: Story 5.1
# Public Dashboard — Hero Section & Next Activity
# Validated: 2026-03-10
# Re-validated: 2026-03-12 (findings fixed)

## UX Spec Sections Referenced
- §6 Visual Design Foundation — Color System, Typography System
- §7 Design Direction — Mock Faithful Command (A+D Hybrid)
- §8 User Journey Flows — Journey 1: Open and Know
- §9 Component Strategy — ActivityCard hero variant
- §10 UX Consistency Patterns — Public Register rules, Navigation Patterns
- §11 Responsive Design & Accessibility

## Screen-by-Screen Compliance

### 01-hero-mobile-empty-state.png — PASS
- [x] bg-slate-800 dark hero background (distinct from white body)
- [x] "Bienvenue" heading visible in white bold text
- [x] Empty message "Aucune activite a venir — revenez bientot!" visible
- [x] French language by default
- [x] Top nav with church name, language toggle, hamburger menu
- [x] Full-width vertically stacked layout

### 02-hero-mobile-loaded.png — PASS
- [x] bg-slate-800 dark hero background
- [x] Church name "Eglise Adventiste de Saint-Hubert" in large bold white text
- [x] Address "5350 Ch de Chambly, Saint-Hubert, QC J3Y 3N7" in lighter text
- [x] Welcome message visible
- [x] Activity title "Vepres du Vendredi — Soiree JA" rendered
- [x] Department badge "JA" with teal color
- [x] Date "vendredi 13 mars" in lowercase French (correct date-fns behavior)
- [x] Time "19h00 - 20h30" visible
- [x] Vertically stacked mobile layout
- [x] Minimum 14px text throughout (public register)
- [x] No predicateur section shown (correct — this activity has no predicateur role assigned via public API)

### 03-hero-desktop-loaded.png — PASS
- [x] lg:flex side-by-side layout — church identity left, activity details right
- [x] Full top nav visible: Accueil (underlined active), Calendrier, Departements, En Direct
- [x] Language toggle "FR" visible in nav
- [x] "Connexion" button right-aligned, dark filled
- [x] Inner content constrained (not full-bleed text)
- [x] Activity info positioned to the right
- [x] Department badge "JA" visible

### 04-public-calendar-page-desktop.png — PASS
- [x] Content has its own max-w wrapper (not full-bleed)
- [x] "Calendrier" heading rendered with proper typography
- [x] Top nav consistent with homepage (same links, same style)
- [x] "Calendrier" link underlined as active state
- [x] Stub page (as expected — Epic 7 implements calendar)

### 05-public-departments-page-desktop.png — PASS
- [x] Content has its own max-w wrapper
- [x] "Departements" heading rendered
- [x] Top nav consistent
- [x] "Departements" link underlined as active state
- [x] Stub page (as expected — Epic 8 implements departments)

### 06-hero-desktop-english-toggle.png — PARTIAL
- [x] Nav labels switched to English: Home, Calendar, Departments, Live, Sign In
- [x] Language toggle shows "EN"
- [x] Church identity stays in French (database content — correct)
- [x] Activity date/time stays in French locale format (correct — data from server)
- [x] **FINDING-1 (FIXED 2026-03-12)**: ~~Activity date remained French after EN toggle.~~ Fixed: `formatActivityDate()` now uses `i18n.language` to select between `fr` and `enUS` date-fns locales dynamically. Test added for English date rendering.

### 07-mobile-hamburger-menu-open.png — PASS
- [x] Dialog/sheet slides in from right
- [x] Menu items: Accueil, Calendrier, Departements, En Direct, Connexion
- [x] Close (X) button visible top-right
- [x] Background content dimmed/overlaid
- [x] Connexion button styled as primary (dark filled, prominent)
- [x] French labels throughout

### 08-login-page-mobile.png — PARTIAL
- [x] Centered card layout
- [x] "Connexion" heading in bold
- [x] "Continuer avec Google" button (full-width, outline style)
- [x] "Ou" divider separating OAuth from email
- [x] "Adresse courriel" label with input field
- [x] "Continuer" primary button (dark filled, full-width)
- [x] "Mot de passe oublie?" link
- [x] French labels throughout
- [x] **FINDING-2 (FIXED — commit 5711712)**: ~~"Continuer" button used dark/black fill instead of indigo-600.~~ Fixed: `--primary` CSS variable updated from shadcn default `oklch(0.205 0 0)` (near-black) to `oklch(0.511 0.262 276.966)` (indigo-600). Screenshots predated this fix.

### 09-login-page-desktop.png — PARTIAL
- [x] Centered card, max-width contained
- [x] Same form layout as mobile (consistent)
- [x] Card has subtle border/shadow
- [x] Vertically centered on page
- [x] **FINDING-3 (FIXED — same as FINDING-2)**: ~~Primary "Continuer" button was dark/black instead of indigo-600.~~ Resolved by same CSS variable fix.

## Findings Summary

| # | Severity | Screen | Issue | Status |
|---|---|---|---|---|
| 1 | Low | 06 | Date formatting doesn't switch locale when language toggled to EN | **FIXED** (2026-03-12) |
| 2 | Medium | 08, 09 | Login "Continuer" button uses dark fill instead of indigo-600 primary color | **FIXED** (commit 5711712) |
| 3 | Medium | 08, 09 | (Same as #2 on desktop) | **FIXED** (commit 5711712) |

## Overall Assessment
- **Screens**: 9 | **Pass**: 6 | **Partial**: 3 | **Fail**: 0
- **Unique findings**: 2 (date locale, button color) — **ALL FIXED**
- **Overall**: PASS (after fixes applied 2026-03-12)

## Fixes Applied
1. **Button color (FINDING-2/3)**: Already fixed in commit `5711712` — `--primary` CSS variable updated to `oklch(0.511 0.262 276.966)` (indigo-600). Screenshots predated this fix.
2. **Date locale (FINDING-1)**: Added `enUS` locale import to `HeroSection.tsx`. `formatActivityDate()` now accepts the current i18n language and selects the correct date-fns locale dynamically. New test added: "renders English formatted date when language is switched to EN".
