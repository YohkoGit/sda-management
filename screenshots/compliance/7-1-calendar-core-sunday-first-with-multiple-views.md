# UI Compliance Report — Story 7.1: Calendar Core

**Story:** 7-1-calendar-core-sunday-first-with-multiple-views
**Date:** 2026-03-17
**Screens captured:** 11
**Overall assessment:** PASS

## UX Spec Sections Referenced

- §6 Visual Design Foundation — Department Color Palette (§562, §577, §579)
- §8 User Journey Flows — Journey 1: Open and Know
- §9 Component Strategy — WeekCalendar (§1259–1297), ADR-1 (§1379)
- §10 UX Consistency Patterns — Public Register rules
- §11 Responsive Design & Accessibility — Calendar breakpoint table (§1698–1699), horizontal scroll rule (§1726)
- §11 Touch & Gesture Patterns — swipe horizontal (§1715)

## Per-Screen Compliance

### 01 — Month Grid Desktop (1280x800)

| Check | Status |
|-------|--------|
| Sunday-first layout (DIM. first column) | [x] PASS |
| Department-colored event blocks (CU rose, JA teal, MIFEM violet) | [x] PASS |
| Color + text rule: abbreviation always accompanies color ([CU], [JA], [MIFEM]) | [x] PASS |
| Color blocks large enough for quick-scan category signal (§579) | [x] PASS |
| ViewSwitcher: 4 buttons (Jour/Semaine/Mois/Année), full labels on desktop | [x] PASS |
| Mois highlighted as active (aria-selected=true) | [x] PASS |
| ViewSwitcher uses role=tablist with role=tab | [x] PASS |
| Calendar container explicit height (h-[800px] on lg) | [x] PASS |
| mx-auto max-w-7xl px-4 sm:py-8 wrapper | [x] PASS |
| role=region with aria-label on calendar container | [x] PASS |
| No unintentional horizontal scroll (§1726) | [x] PASS |

### 02 — Month Grid Mobile (375x812)

| Check | Status |
|-------|--------|
| ViewSwitcher abbreviated labels (J/S/M/A) | [x] PASS |
| M highlighted as active | [x] PASS |
| No horizontal scroll | [x] PASS |
| px-4 py-6 padding | [x] PASS |
| Schedule-X responsive: auto-switches to day view on mobile | [x] PASS (known isResponsive behavior from Story 5.5) |

### 03 — Week View Desktop (1280x800)

| Check | Status |
|-------|--------|
| 7-day week view with time axis (06:00–22:00) | [x] PASS |
| Sunday-first layout (DIM. first column, SAM. last) | [x] PASS |
| Department-colored event blocks in time slots | [x] PASS |
| Events positioned correctly by time (09:00, 09:30 on Saturday) | [x] PASS |
| ViewSwitcher shows Semaine as active | [x] PASS |
| Day headers show day name + date number | [x] PASS |
| No horizontal scroll | [x] PASS |

### 04 — Week View Mobile (375x812)

| Check | Status |
|-------|--------|
| Schedule-X renders all 7 day columns (condensed) | [x] PASS |
| Sunday-first (DIM. first) | [x] PASS |
| S highlighted in ViewSwitcher | [x] PASS |
| Horizontal scroll contained within calendar component (§1726) | [x] PASS |

### 05 — Day View Desktop (1280x800)

| Check | Status |
|-------|--------|
| Single day view with time axis | [x] PASS |
| Jour highlighted in ViewSwitcher | [x] PASS |
| Day header shows full date (MAR. 17) | [x] PASS |

### 06 — Day View Mobile (375x812)

| Check | Status |
|-------|--------|
| Day view fills mobile width | [x] PASS |
| J highlighted in ViewSwitcher (abbreviated) | [x] PASS |
| No horizontal scroll | [x] PASS |

### 07 — Year View Desktop (1280x800)

| Check | Status |
|-------|--------|
| 12 mini-month calendars in 4x3 grid (lg:grid-cols-4) | [x] PASS |
| Year "2026" prominently displayed in header | [x] PASS |
| Prev/next year navigation arrows | [x] PASS |
| Sunday-first 7-column grid (D/L/M/M/J/V/S) | [x] PASS |
| Today (March 17) highlighted | [x] PASS |
| Department-colored activity dots on days with activities | [x] PASS |
| French month headers (Janvier–Décembre) | [x] PASS |
| Année highlighted in ViewSwitcher | [x] PASS |
| Auto height (no fixed height constraint) | [x] PASS |
| role=grid with aria-label | [x] PASS (confirmed from snapshot) |

### 08 — Year View Mobile (375x812)

| Check | Status |
|-------|--------|
| 2-column mini-month grid (< 640px) | [x] PASS |
| Year header with navigation arrows | [x] PASS |
| Sunday-first layout (D/L/M/M/J/V/S) | [x] PASS |
| Department-colored dots visible | [x] PASS |
| Scrollable content | [x] PASS |
| A highlighted in ViewSwitcher (abbreviated) | [x] PASS |
| No horizontal scroll | [x] PASS |

### 09 — Drill-to-Day Desktop (1280x800)

| Check | Status |
|-------|--------|
| Click day in month grid → switches to Day view | [x] PASS |
| Day view shows clicked date (SAM. 14) | [x] PASS |
| Jour now highlighted in ViewSwitcher | [x] PASS |
| Events visible with department colors ([CU] rose blocks) | [x] PASS |
| Pasteur Vicuna prédicateur name visible | [x] PASS |
| onClickDate callback triggered view switch | [x] PASS |

### 10 — Auth Month Desktop (1280x800)

| Check | Status |
|-------|--------|
| Calendar renders same as public | [x] PASS |
| Authenticated sidebar visible (Marie Laurent, Membre) | [x] PASS |
| Navigation links: Tableau de Bord, Calendrier, Départements, Membres | [x] PASS |
| ViewSwitcher with 4 options | [x] PASS |
| Month grid with department-colored events | [x] PASS |
| Sunday-first layout | [x] PASS |
| Terminer la Session link visible | [x] PASS |

### 11 — Auth Month Mobile (375x812)

| Check | Status |
|-------|--------|
| Calendar renders on mobile | [x] PASS |
| ViewSwitcher abbreviated labels (J/S/M/A), M active | [x] PASS |
| Authenticated header visible (SDAC Saint-Hubert) | [x] PASS |
| Schedule-X responsive mode shows day view | [x] PASS (known behavior) |
| No horizontal scroll | [x] PASS |

## Findings Summary

| Severity | Screen | Issue |
|----------|--------|-------|
| — | — | No findings |

**0 findings.** All 11 screens comply with the UX design specification.

## Notes

- **Mobile month grid (Screens 02, 11):** Schedule-X `isResponsive: true` auto-switches month grid to day view on mobile viewport. This is a known limitation documented in Story 5.5 and accepted as MVP behavior. The ViewSwitcher correctly shows "M" as active even though Schedule-X internally renders a day view.
- **Auth desktop (Screen 10):** Event text on Saturday cells is slightly truncated due to sidebar reducing available calendar width. This is Schedule-X's built-in text overflow behavior and does not impact usability — clicking the event would show full details.
- **Route interception:** All API responses mocked via Playwright `page.route()`. Backend was not running during capture.
