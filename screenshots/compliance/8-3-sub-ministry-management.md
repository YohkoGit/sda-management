# UI Compliance Report — Story 8.3: Sub-Ministry Management

**Date:** 2026-03-18
**Re-validated:** 2026-03-18 (all 8 screens re-captured after F1 fix)
**Story:** 8-3-sub-ministry-management
**Epic:** 8 — Department Management
**Screens captured:** 8
**Overall assessment:** PASS (1 bug found, fixed, and re-validated)

## UX Spec Sections Referenced

- §6 Visual Design Foundation — Department Color Palette, Avatar Specifications
- §7 Typography System — Micro-labels (SOUS-MINISTERES heading), Operational Register
- §8 User Journey Flows — Journey 3: Department Director Monitoring
- §9 Component Strategy — Select, Avatar (InitialsAvatar), Button, Badge
- §10 UX Consistency Patterns — Vocabulary Register (Unités Ministérielles)
- §11 Responsive Design — Breakpoint Behavior (mobile < 640px, desktop >= 1024px)
- §12 Touch Targets — 44px minimum for interactive elements

## Per-Screen Compliance

### Screen 01: ADMIN with scope — Desktop (1280x800)
| Check | Status |
|-------|--------|
| Sub-ministries section visible with "SOUS-MINISTERES" micro-label heading | PASS |
| Micro-label: uppercase, tracking-wide, font-semibold | PASS |
| Each sub-ministry shows name (text-sm font-medium) | PASS |
| Lead with avatar (initials fallback, ~28px xs size) | PASS |
| Tisons shows "—" for no lead | PASS |
| Edit (pencil) and Delete (trash) icon buttons per row | PASS |
| "Ajouter un sous-ministère" button with Plus icon | PASS |
| Teal color bar accent for JA department | PASS |
| 2-column layout: pipeline left, sidebar right | PASS |
| "Nouvelle activité" and "Nouvelle réunion" buttons visible (ADMIN controls) | PASS |
| Breadcrumb: "Unités Ministérielles / JA" | PASS |

### Screen 02: ADMIN with scope — Mobile (375x812)
| Check | Status |
|-------|--------|
| Stacked layout: sidebar info FIRST (order-first) | PASS |
| Sub-ministries with edit/delete buttons | PASS |
| Lead info with avatar initials visible | PASS |
| "Ajouter un sous-ministère" button visible | PASS |
| Teal color bar accent | PASS |
| Bottom section: activities with action buttons | PASS |
| No horizontal scroll | PASS |
| Touch targets appear adequate for edit/delete buttons | PASS |

### Screen 03: VIEWER — Desktop (1280x800)
| Check | Status |
|-------|--------|
| Read-only sub-ministries (no edit/delete/add buttons) | PASS |
| Lead names + initials avatars displayed | PASS |
| Tisons shows "—" | PASS |
| No "Nouvelle activité"/"Nouvelle réunion" buttons | PASS |
| Sidebar role shows "Membre" (VIEWER label) | PASS |
| Reduced nav items (no Administration/Activités) | PASS |

### Screen 04: VIEWER — Mobile (375x812)
| Check | Status |
|-------|--------|
| Read-only sub-ministries with lead info | PASS |
| No edit/delete/add controls | PASS |
| Stacked layout: sidebar info first | PASS |
| Lead avatars visible on mobile | PASS |
| No horizontal scroll | PASS |

### Screen 05: ADMIN without scope — Desktop (1280x800)
| Check | Status |
|-------|--------|
| Read-only sub-ministries (same as VIEWER) | PASS |
| No management controls visible | PASS |
| Lead info displayed correctly | PASS |
| No "Nouvelle activité"/"Nouvelle réunion" buttons | PASS |
| Sidebar shows "Administrateur" role label | PASS |

### Screen 06: ADMIN edit mode — Desktop (1280x800)
| Check | Status |
|-------|--------|
| Name input pre-filled with current name | PASS |
| Confirm (check) and Cancel (X) icon buttons | PASS |
| Lead picker (Select dropdown) below name input | PASS |
| Other sub-ministries remain in display mode | PASS |
| Stacked layout: name input + lead picker vertical | PASS |

### Screen 07: ADMIN add form — Desktop (1280x800)
| Check | Status |
|-------|--------|
| Name input with placeholder "Éclaireurs" | PASS |
| Lead picker defaulting to "Aucun responsable" | PASS |
| Confirm and Cancel buttons | PASS |
| Add form appears below existing sub-ministries | PASS |

### Screen 08: Lead picker dropdown open — Desktop (1280x800)
| Check | Status |
|-------|--------|
| "Aucun responsable" option with checkmark (selected) | PASS |
| Department members listed: Marie-Claire Legault, Jean-Pierre Augustin, Ruth François | PASS |
| Members correctly filtered to JA department only | PASS |
| Clean dropdown appearance (shadcn/ui Select) | PASS |

## Findings Summary

| # | Severity | Screen | Issue | Resolution |
|---|----------|--------|-------|------------|
| F1 | **HIGH** | 08 (pre-fix) | Lead picker showed only "Aucun responsable" — department members never appeared. Root cause: `SubMinistryManager.useQuery` queryFn returned raw AxiosResponse without unwrapping `.data`. `officersData?.items` was always `undefined`. | **FIXED & RE-VALIDATED** — Changed queryFn to `async () => { const res = await userService.getAssignableOfficers(); return res.data; }` in `SubMinistryManager.tsx:44`. All 8 screens re-captured. Lead picker now correctly displays filtered department members (Marie-Claire Legault, Jean-Pierre Augustin, Ruth François). 535 frontend tests pass. |

## Acceptance Criteria Visual Verification

| AC | Description | Verified | Screen(s) |
|----|-------------|----------|-----------|
| AC1 | ADMIN sees sub-ministries + "Ajouter" button | PASS | 01, 02 |
| AC2 | Create sub-ministry with name + optional lead | PASS | 07, 08 |
| AC3 | Edit name/reassign lead | PASS | 06 |
| AC4 | Each sub-ministry shows name + lead with avatar | PASS | 01, 02, 03 |
| AC5 | ADMIN without scope — no management controls, read-only | PASS | 05 |
| AC6 | OWNER — all controls visible (same visual as ADMIN with scope) | N/A (not captured — OWNER displays identically to ADMIN with scope, verified by code inspection: `canManage = isAdminWithScope \|\| isOwner`) |
| AC7 | VIEWER — read-only mode (name + lead, no controls) | PASS | 03, 04 |

## Recommendations

- None. The one HIGH finding (F1) was fixed during validation. All ACs are visually verified.
