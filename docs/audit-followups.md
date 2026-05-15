# Audit Follow-Ups

Items from the 2026-05-14 codebase audit that were **not** addressed by the
9-commit batch ending at `db817ae`. Each item is self-contained — you should
be able to pick up any one of them without reading the rest.

Last sweep state: **252 unit + 481 integration backend tests, 618 frontend tests, all green.**

---

## 1. OpenAPI codegen (DTO duplication)

**Status.** DONE.

**What landed.**
- `openapi-typescript` installed as a devDep.
- `npm run generate:api` → fetches `http://localhost:5000/openapi/v1.json` and
  writes `src/sdamanagement-web/src/api-generated/schema.ts`.
- `npm run generate:api:check` → CI-safe smoke check.
- Two ASP.NET OpenAPI transformers added to make the doc consumable:
  - `DtoSchemaTransformer` — registers all `SdaManagement.Api.Dtos.*` types
    as `components.schemas` entries (controllers return untyped `IActionResult`
    so the emitter wouldn't see them otherwise).
  - `NumericTypeSchemaTransformer` — strips the `string` half of
    `"type": ["integer", "string"]` numeric unions, and rebuilds each
    schema's `required` array based on which properties are non-nullable.
- All 10 service files (`activityService`, `userService`, `departmentService`,
  `activityTemplateService`, `programScheduleService`, `configService`,
  `setupProgressService`, `systemHealthService`) and `types/public.ts` now
  re-export types directly from `@/api-generated/schema`. Hand-rolled
  duplicates deleted.

**What's left (small).**
- Wire `generate:api` into CI as a drift detector (e.g. fail if regenerating
  produces a non-empty diff). The infrastructure is in place; this is just a
  CI job change.

---

## 2. `useActivityCrud` extraction (god-page split)

**Problem.** `pages/DepartmentDetailPage.tsx` (769 LOC) and
`pages/AdminActivitiesPage.tsx` (624 LOC) are near-duplicates of each other:
7 `useState` declarations, 3 mutations, 4 dialogs, identical conflict-handler
pairs. Mutation block `AdminActivitiesPage.tsx:165-224` duplicates
`DepartmentDetailPage.tsx:166-217` line-for-line.

**What to do.**
- Extract `src/sdamanagement-web/src/hooks/useActivityCrud.ts` taking an
  optional `departmentId`. It owns:
  - the 3 mutations (create, update with force-flag, delete)
  - the conflict-state machine (`handleConflictReload` / `handleConflictOverwrite`)
  - the `startTime + ":00"` time-format normalization (also in `activityService.ts`)
- Refactor both pages to consume the hook. Expected delta: ~400 LOC removed.

**Scope.** 1 focused day. Carefully match the existing
`useActivityCacheInvalidation` integration that already landed.

**Why deferred.** High-LOC change with regression risk on the two
most-touched pages in the redesign.

---

## 3. `ActivityService.UpdateAsync` split (god method)

**Problem.** `Services/ActivityService.cs:199–361` is a 162-line method doing
concurrency-token handling, snapshot diffing, sanitization, role
reconciliation (two-pass add/update/delete), post-validation, save, refetch,
change-set computation, and SignalR notification.

**What to do.**
- Extract the role-reconciliation loop (`:276-323` in the pre-split layout)
  into a private `ReconcileRolesAsync(existing, request, allRoles)` method.
- Extract the change-set computation into a separate method.
- The snapshot pattern (`:213-219`) could be replaced with EF's native
  `Entry.Properties.Where(p => p.IsModified)` — only if you can prove
  semantic parity via tests first.

**Scope.** 1 day. Add unit tests for each extracted method on the way out.

**Why deferred.** High-blast-radius refactor; existing concurrency tests
(now in the integration project under Postgres) need to keep passing.

---

## 4. 38 raw Tailwind sequences → `<Eyebrow>` component

**Problem.** The string `font-mono text-[10px] uppercase tracking-[0.18em]`
appears 38× across 22 files even though `<Eyebrow>` exists at
`src/sdamanagement-web/src/components/ui/typography.tsx:8`. The reverent
redesign added the component but didn't grep for legacy usage.

**What to do.**
```bash
rg -l 'font-mono text-\[10px\] uppercase tracking-\[0.18em\]' src/sdamanagement-web/src
```
For each file, replace the `<span className="font-mono text-[10px] uppercase tracking-[0.18em]">…</span>`
pattern with `<Eyebrow>…</Eyebrow>`. Watch for variants with extra classes
that may want to stay raw or take an `as`-prop.

**Scope.** 2–3 hours, mechanical. Add a lint rule afterward (or a custom
ESLint regex rule) to prevent regression.

**Why deferred.** Tedious; no test coverage to lean on; needs visual smoke.

---

## 5. FE inline-guest form-state bug

**Problem.** Per `project_guest_inline_creation_bug.md` (auto-memory): when an
admin creates a guest user via the inline form during activity-role
assignment, the user is created at the API but is NOT assigned to the
activity role.

**Status.** Backend contract is proven correct — see
`tests/SdaManagement.Api.IntegrationTests/Activities/InlineGuestAssignmentTests.cs`
(landed in commit `fead160`). The bug is purely on the FE form-state side:
after `POST /api/users/guests` returns the new user id, the React form fails
to push it into the activity's `roles[].assignments[]` array before submit.

**What to do.**
- Find the inline-guest creation in `src/sdamanagement-web/src/components/activity/`
  (likely `GuestInlineForm.tsx` or similar — `GuestInlineForm.test.tsx` is
  the FE test). Trace the flow from "user clicks Create Guest" to "form
  submits the activity update".
- The bug is likely a missing `setValue` / `append` call on the form's
  `roles` field after the guest POST resolves.

**Scope.** 30 min once you have the file. Add a vitest that reproduces.

**Why deferred.** The audit's job was to identify; the BE test marker is
in place so this bug can't silently come back from a backend regression.

---

## 6. `AuthController` / `AvatarsController` direct `DbContext` access

**Problem.** Layering violation:
- `Controllers/AuthController.cs:38–193` queries `dbContext.Users`,
  writes `PasswordResetToken` entities, mutates user state, and hashes
  passwords directly.
- `Controllers/AvatarsController.cs:34–54` queries `db.Set<UserDepartment>()`
  for a department-overlap auth check.

**What to do.**
- Introduce `Services/IAuthService.cs` with `InitiateAsync`, `LoginAsync`,
  `SetPasswordAsync`, `RequestPasswordResetAsync`, `ConfirmPasswordResetAsync`,
  `GoogleCallbackAsync`. Move all `dbContext` access out of `AuthController`.
- For `AvatarsController`, push the dept-overlap check into a helper —
  either a method on the existing `Auth.IAuthorizationService` (e.g.,
  `SharesDepartmentWithAsync(int targetUserId)`) or a dedicated
  `IUserVisibilityService`.

**Scope.** 1 day. The auth tests are heavy; expect to touch `tests/SdaManagement.Api.IntegrationTests/Auth/`.

**Why deferred.** Out of scope for the policy-migration wave; the inline
DbContext access doesn't affect security correctness, only architectural
hygiene.

---

## 7. `_bmad/` and `_bmad-output/` committed (~773 files)

**Decision needed.** These are BMAD planning artifacts. Per the audit:
- `_bmad/` (705 files) and `_bmad-output/` (68 files) are tracked.
- They swamp git diff/blame and balloon repo size.

**Two valid choices:**
- **Keep tracked**: leave as-is; treat as planning history.
- **Gitignore them**: add `_bmad/` and `_bmad-output/` to `.gitignore`,
  then `git rm -r --cached _bmad _bmad-output` and commit. History is
  preserved; new edits won't pollute diffs.

This needs a human call, not a code change.

---

## 8. Rotate Google OAuth secret

**Action item.** The current `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` Google
OAuth secret lives in `src/SdaManagement.Api/appsettings.Development.local.json`
(gitignored, not committed). The audit flagged this as a "rotate anyway"
hygiene issue since the secret has lived on disk in a tracked-shaped path
and an accidental gitignore loosening would expose it.

**What to do.**
- Generate a new client secret in the Google Cloud Console.
- Update `appsettings.Development.local.json` locally and on any deployment.
- Revoke the old secret.

Human action, not a code change.

---

## 9. FE assertions brittle on French copy

**Problem.** Tests like
`tests/sdamanagement-web/.../AdminActivitiesPage.test.tsx:446` hard-code
`"Êtes-vous sûr de vouloir supprimer cette activité ?"`. Every i18n key
change breaks the assertion.

**What to do.**
- Sweep the FE test suite for hard-coded French strings.
- Replace with role-based queries: `getByRole('alertdialog')`,
  `getByRole('button', { name: /supprimer/i })`, etc.

**Scope.** 1–2 hours. Mechanical.

**Why deferred.** Not blocking; the tests currently pass.

---

## Suggested order

If you're picking these up sequentially, the highest leverage path is:

1. **#5 (inline-guest)** — bite-sized, closes an open bug.
2. **#4 (Eyebrow cleanup)** — quick design-system hygiene.
3. **#2 (useActivityCrud)** — biggest LOC delete on the FE.
4. **#1 (OpenAPI codegen)** — biggest BE↔FE drift reduction.
5. **#3 (UpdateAsync split)** + **#6 (AuthController layering)** — paired
   structural cleanup on the BE.
6. **#9 (test brittleness)** — sweep at the end.

Items **#7** and **#8** are decisions/actions, not code work.
