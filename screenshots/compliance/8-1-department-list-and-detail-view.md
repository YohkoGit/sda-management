# UI Compliance Report: 8-1-department-list-and-detail-view

**Date:** 2026-03-18
**Validated by:** Claude Opus 4.6 (UI Validation Workflow)
**Screens captured:** 6
**Overall assessment:** PASS

## UX Spec Sections Referenced

- §6 Visual Design Foundation — Department Color Palette, Semantic Status Colors
- §7 Typography System — Type Scale (H1 text-2xl font-black, H3 text-lg font-bold), Micro-labels (uppercase tracking-wide)
- §8 User Journey Flows — Journey 3 (Department Director Monitoring), Journey 4 (Pastor Cross-Department)
- §9 Component Strategy — StaffingIndicator, DepartmentBadge, Card design
- §10 UX Consistency Patterns — Vocabulary Register ("Unités Ministérielles")
- §11 Responsive Design — Breakpoint Behavior Per View (Department View), sm: tablet trigger
- §12 Empty States — Encouraging tone (Design Principle #4)

## Per-Screen Compliance

### Screen 01: dept-list-desktop (1280x800)
| Check | Result |
|---|---|
| Page heading "Unités Ministérielles" (operational vocabulary) | [x] PASS |
| 3-column card grid (lg:grid-cols-3) | [x] PASS |
| Color-coded 4px left border per department color | [x] PASS — CU rose, JA teal, MIFEM violet, DIA sky, ME amber |
| Department name (text-lg font-bold) + abbreviation Badge | [x] PASS |
| Description text (line-clamp-2, text-sm text-slate-600) | [x] PASS |
| Sub-ministry count (text-xs text-slate-400) | [x] PASS |
| Aggregate staffing dots: CU green, JA amber, MIFEM red outline | [x] PASS |
| DIA has no staffing dot (NoActivities) | [x] PASS |
| Cards are fully clickable links (entire card) | [x] PASS — confirmed via accessibility snapshot |
| rounded-2xl card corners | [x] PASS |
| mx-auto max-w-7xl container | [x] PASS |
| Authenticated sidebar visible | [x] PASS |

### Screen 02: dept-list-mobile (375x812)
| Check | Result |
|---|---|
| Single-column card stack (grid-cols-1) | [x] PASS |
| Page heading visible | [x] PASS |
| Color-coded left borders | [x] PASS |
| Abbreviation badges visible | [x] PASS |
| Staffing dots visible | [x] PASS |
| Cards fill available width | [x] PASS |
| No horizontal scroll | [x] PASS |

### Screen 03: dept-detail-desktop (1280x800, JA department)
| Check | Result |
|---|---|
| Breadcrumb: "Unités Ministérielles / JA" with link back | [x] PASS |
| 2-column layout: pipeline left, sidebar right | [x] PASS |
| Teal color bar accent on sidebar | [x] PASS |
| Department name + abbreviation badge in sidebar | [x] PASS |
| Description text | [x] PASS |
| Sub-ministries as rounded-full chips: Explorateurs, Tisons, Ambassadeurs | [x] PASS |
| "SOUS-MINISTERES" uppercase tracking-wide heading | [x] PASS |
| 3 upcoming activities shown (past "Ancien programme" filtered) | [x] PASS |
| Activity rows: date+time, title, staffing dot | [x] PASS |
| Programme JA: green filled dot (FullyStaffed) | [x] PASS |
| Sortie Explorateurs: amber half-dot (PartiallyStaffed) | [x] PASS |
| Camp de jeunesse: red outline (CriticalGap) + "camp" badge | [x] PASS |
| Activity rows are links to /activities/:id | [x] PASS — confirmed via snapshot |
| No edit/create controls (read-only) | [x] PASS |

### Screen 04: dept-detail-mobile (375x812, JA department)
| Check | Result |
|---|---|
| Stacked layout: sidebar info FIRST (order-first) | [x] PASS |
| Breadcrumb visible | [x] PASS |
| Teal color bar accent | [x] PASS |
| Sub-ministry chips wrap naturally | [x] PASS |
| Activity rows fill width | [x] PASS |
| Staffing dots visible | [x] PASS |
| No horizontal scroll | [x] PASS |

### Screen 05: dept-empty-viewer-desktop (1280x800, DIA department)
| Check | Result |
|---|---|
| Viewer empty state: "Aucune activité planifiée" | [x] PASS |
| Italic text-sm text-slate-400 style | [x] PASS |
| "Aucun sous-ministère" when no sub-ministries | [x] PASS |
| Sky-blue color bar accent (DIA color) | [x] PASS |
| No create/edit controls | [x] PASS |

### Screen 06: dept-empty-admin-desktop (1280x800, JA department as ADMIN)
| Check | Result |
|---|---|
| Admin empty state: "Prêt à planifier. Créez votre première activité." | [x] PASS |
| Different from viewer empty state (role-aware) | [x] PASS |
| Sub-ministries visible (Explorateurs, Tisons, Ambassadeurs) | [x] PASS |
| No write controls (deferred to Stories 8.2/8.3) | [x] PASS |
| Admin sidebar shows additional nav (Administration, Activités) | [x] PASS |

## Findings Summary

| # | Severity | Screen | Issue |
|---|---|---|---|
| — | — | — | No findings |

## Notes

- All 6 screens pass UX compliance checks with zero findings.
- Past activity filtering confirmed working (Screen 03: "Ancien programme" from Feb 2026 correctly excluded).
- Role-aware empty states confirmed working (Screen 05 vs 06: different messages for VIEWER vs ADMIN).
- Aggregate staffing dot logic confirmed: green (FullyStaffed), amber half-dot (PartiallyStaffed), red outline (CriticalGap), hidden (NoActivities).
- Breadcrumb accessibility confirmed via snapshot: aria-hidden separator, aria-current="page" on abbreviation.
- Route interception used for all API mocks to ensure consistent screenshot data.
- Mobile detail layout correctly shows sidebar info first (order-first) then pipeline below — matching UX spec's mobile stacking order for Department View.
