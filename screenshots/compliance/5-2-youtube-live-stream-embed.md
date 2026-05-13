# UI Compliance Report — Story 5.2: YouTube Live Stream Embed

**Date:** 2026-03-12
**Story:** 5-2-youtube-live-stream-embed
**Epic:** 5 — Public Dashboard & Anonymous Experience
**Screens Captured:** 8 / 8 (0 skipped)
**Overall Assessment:** PASS

## UX Spec Sections Referenced

- §6 Visual Design Foundation — Color System (`--live: rose-500`, `--background: white`, `--border: slate-200`)
- §6 Visual Design Foundation — Typography System (public register min 14px, heading text-2xl font-bold)
- §6 Visual Design Foundation — Spacing & Layout (rounded-2xl cards, aspect-video)
- §10 UX Consistency Patterns — Register-Aware Patterns (public register: no micro-labels, min 14px)
- §11 Responsive Design — Breakpoint Mapping (base mobile, sm: tablet, lg: desktop, NO md:)
- §6 Semantic Status Colors — Live now: rose-500 pulsing dot (8px)

## Per-Screen Compliance

### Screen 01 — YouTube Link Card Mobile (375×812)
| # | Check | Result |
|---|---|---|
| 1 | YouTube section visible below hero | [x] PASS |
| 2 | Heading 'Suivez le culte en direct' in text-2xl font-bold text-slate-900 | [x] PASS |
| 3 | NO live indicator (EN DIRECT) shown | [x] PASS |
| 4 | Link card with YouTube play icon (red circle, white triangle) | [x] PASS |
| 5 | 'Regarder sur YouTube' text in text-base font-semibold | [x] PASS |
| 6 | Card has rounded-2xl border border-slate-200 bg-slate-50 | [x] PASS |
| 7 | aspect-video maintained (16:9 ratio) | [x] PASS |
| 8 | Section bg-white (contrast with dark hero above) | [x] PASS |
| 9 | Minimum 14px text (public register) | [x] PASS |
| 10 | Full-width on mobile | [x] PASS |

### Screen 02 — YouTube Link Card Desktop (1280×800)
| # | Check | Result |
|---|---|---|
| 1 | YouTube section below hero, constrained by max-w-7xl | [x] PASS |
| 2 | Heading + content within px-4 sm:py-12 padding | [x] PASS |
| 3 | Link card centered in container | [x] PASS |
| 4 | rounded-2xl card with subtle border | [x] PASS |
| 5 | Content not full-bleed, proper max-width constraint | [x] PASS |

### Screen 03 — YouTube Live Embed Mobile (375×812)
| # | Check | Result |
|---|---|---|
| 1 | YouTube section visible below hero | [x] PASS |
| 2 | Heading 'Suivez le culte en direct' | [x] PASS |
| 3 | LiveIndicator: pulsing rose-500 dot (8px) + 'EN DIRECT' text | [x] PASS |
| 4 | EN DIRECT text in text-sm font-semibold text-rose-500 | [x] PASS |
| 5 | Heading + LiveIndicator inline-flex on same line (gap-3) | [x] PASS |
| 6 | iframe embed visible with 16:9 aspect ratio (aspect-video) | [x] PASS |
| 7 | iframe has rounded-2xl overflow-hidden shadow-lg | [x] PASS |
| 8 | Full-width embed on mobile | [x] PASS |

### Screen 04 — YouTube Live Embed Desktop (1280×800)
| # | Check | Result |
|---|---|---|
| 1 | iframe embed at 16:9 ratio within max-w-7xl | [x] PASS |
| 2 | LiveIndicator inline with heading | [x] PASS |
| 3 | rounded-2xl shadow-lg on embed container | [x] PASS |
| 4 | sm:py-12 vertical padding | [x] PASS |

### Screen 05 — YouTube Static Embed Mobile (375×812)
| # | Check | Result |
|---|---|---|
| 1 | iframe embed visible (static video from URL) | [x] PASS |
| 2 | NO live indicator shown (not live) | [x] PASS |
| 3 | aspect-video 16:9 ratio maintained | [x] PASS |
| 4 | rounded-2xl shadow-lg on embed | [x] PASS |

### Screen 06 — No YouTube URL Mobile (375×812)
| # | Check | Result |
|---|---|---|
| 1 | NO YouTube section visible | [x] PASS |
| 2 | Hero section renders normally | [x] PASS |
| 3 | No empty container, no broken embed, no gap | [x] PASS |
| 4 | Page flows directly from hero to next section placeholder | [x] PASS |

### Screen 07 — LivePage Link Card Desktop (1280×800)
| # | Check | Result |
|---|---|---|
| 1 | Page title 'En Direct' in text-2xl font-black | [x] PASS |
| 2 | YouTubeSection rendered below title | [x] PASS |
| 3 | Link card mode (channel URL, not live) | [x] PASS |
| 4 | Page wrapper mx-auto max-w-7xl px-4 py-6 | [x] PASS |
| 5 | Content constrained, not full-bleed | [x] PASS |

### Screen 08 — LivePage Live Embed Mobile (375×812)
| # | Check | Result |
|---|---|---|
| 1 | Page title 'En Direct' | [x] PASS |
| 2 | YouTubeSection with live embed iframe | [x] PASS |
| 3 | LiveIndicator pulsing rose-500 dot + 'EN DIRECT' | [x] PASS |
| 4 | Full-width embed on mobile | [x] PASS |

## Findings Summary

| Severity | Screen | Issue |
|---|---|---|
| — | — | No findings — all checks pass |

## AC Coverage via Screenshots

| AC | Covered By | Status |
|---|---|---|
| AC #1 — YouTube section visible | Screens 01, 02 | PASS |
| AC #2 — Live indicator from API | Screens 03, 04, 08 | PASS |
| AC #3 — No URL configured = hidden | Screen 06 | PASS |
| AC #4 — LivePage enhanced | Screens 07, 08 | PASS |
| AC #5 — Mobile responsive | Screens 01, 03, 05, 08 | PASS |
| AC #6 — URL format handling | Screen 05 (video URL → static embed) | PASS |
| AC #7 — Graceful degradation | Not visually testable (server-side) | Covered by unit tests |
| AC #8 — API security | Not visually testable (server-side) | Covered by integration tests |

## Notes

- All API responses mocked via Playwright `page.route()` interception (backend was not running)
- Auth errors in console (`/api/auth/me` 500) are expected — anonymous user, auth endpoint not mocked
- The `animate-pulse` on the LiveIndicator dot is confirmed present in screenshots 03, 04, 08
- Three display modes all verified: link card (01, 02, 07), live embed (03, 04, 08), static embed (05)
- AC #7 and #8 are backend concerns — covered by YouTubeServiceTests and LiveStatusEndpointTests, not visually verifiable
