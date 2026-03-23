# Automated Test Assertion Checklist

> **Living document** — Updated after each epic retrospective with new patterns discovered during code review.
> Source patterns: Epic 1 retro (2026-03-23), Epic 2 retro (2026-03-23).

## How to Update This Document

After each epic retrospective, review the retro's "Recurring Review Feedback Patterns" table.
For each new pattern: add a checkbox item to the appropriate section (backend, frontend, or cross-cutting).
For patterns no longer relevant: remove the item with a brief comment in the git commit message.
For patterns that need refinement: update the wording based on new understanding.

---

## Backend Integration Tests

### OWNER-only Endpoints

- [ ] Owner returns 200/201 (success case)
- [ ] Admin returns 403 Forbidden
- [ ] Viewer returns 403 Forbidden
- [ ] Anonymous returns 401 Unauthorized
- [ ] Validation errors return 400 with ProblemDetails (`urn:sdac:*` URI)
- [ ] Conflict cases return 409 (where applicable)
- [ ] HTML sanitization verified on all text inputs (sanitize → validate → save pipeline)

### ADMIN-scoped Endpoints

- [ ] Owner returns 200/201 (success case)
- [ ] Admin (in-scope department) returns 200/201
- [ ] Admin (out-of-scope department) returns 403 Forbidden
- [ ] Viewer returns 403 Forbidden
- [ ] Anonymous returns 401 Unauthorized
- [ ] Validation errors return 400 with ProblemDetails
- [ ] HTML sanitization verified on all text inputs

### Authenticated Endpoints (VIEWER+)

- [ ] Viewer returns 200 (success case)
- [ ] Anonymous returns 401 Unauthorized

### Public Endpoints

- [ ] Anonymous returns 200 (success case — no auth tests needed)

---

## Frontend Component Tests

### Admin Page with Form Dialog

- [ ] Empty state renders correctly when no data exists
- [ ] List/card grid renders with data
- [ ] Form fieldset disabled during mutation (prevents double submit)
- [ ] Generic error toast displayed on mutation failure
- [ ] Non-authorized role sees access denied or redirect
- [ ] Delete confirmation dialog appears before destructive action (on card/list item or within dialog)

### Admin Page with Detail View

- [ ] Loading state renders (skeleton/spinner)
- [ ] Error state renders with user-friendly message
- [ ] Not-found handling (404 route or empty state)

### Viewer-Facing Page (Authenticated, Non-Admin)

- [ ] Authenticated user sees expected content
- [ ] Anonymous user redirected to login or sees 401
- [ ] Loading state renders (skeleton/spinner)
- [ ] Error state renders with user-friendly message
- [ ] Empty state renders when no data exists

---

## Cross-Cutting Concerns

- [ ] File list updated per task (not retroactively at story end)
- [ ] HTML sanitization integration tests for all text inputs
- [ ] i18n keys added to both FR and EN locales + test-utils.tsx
- [ ] ListItem DTO carries all fields needed by card components (avoid per-card getById queries)
- [ ] DRY shared validation rules when create/update validators share logic
- [ ] Resource disposal: no `BuildServiceProvider()` leaks, HttpClient instances disposed, IDisposable services properly scoped
- [ ] Anti-enumeration: auth endpoints return consistent error shapes — don't reveal whether a user/resource exists via different 404 vs 403 responses
- [ ] Shared test helpers: when a test helper is used in 2+ test files, extract to shared base class in the same story

---

## SM Selection Guidance

When creating a story, the SM uses these rules to decide which sections to inline into Dev Notes:

- **If the story creates or modifies endpoints:** include the matching backend auth-type block (OWNER-only, ADMIN-scoped, authenticated, or public)
- **If the story creates or modifies frontend pages/components:** include the matching frontend component block (form dialog, detail view, viewer-facing page)
- **If the story has any backend or frontend work:** include the full cross-cutting block
- **If no backend/frontend section matches** (e.g., infrastructure, docs-only, real-time): write `### Mandatory Assertions: N/A — [rationale]` in the story Dev Notes explaining why no checklist section applies
- **When in doubt, include the section** — over-testing is cheaper than under-testing
