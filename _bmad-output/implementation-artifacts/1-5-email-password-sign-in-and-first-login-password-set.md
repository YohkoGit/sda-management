# Story 1.5: Email/Password Sign-In & First-Login Password Set

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **user without a Google account**,
I want to sign in with my email and password,
so that I can access the system using the fallback authentication method.

## Acceptance Criteria

1. **Given** the login page
   **When** the user enters their email and clicks "Continuer"
   **Then** `POST /api/auth/initiate` checks the account state
   **And** if the user has a password set, the page transitions to show the password field
   **And** if the user has no password set (first login, FR14), the page transitions to show new password + confirm fields with a strength indicator
   **And** if the email is not found, the page transitions to show the password field (anti-enumeration: same as has-password)

2. **Given** step 1 resolved to "password" flow
   **When** the user enters their correct password and clicks "Se connecter"
   **Then** `POST /api/auth/login` validates credentials via bcrypt
   **And** httpOnly Secure SameSite=Strict JWT cookies are set (access 15 min, refresh 7 days)
   **And** the user is redirected to the authenticated dashboard

3. **Given** step 1 resolved to "set-password" flow (first login)
   **When** the user enters a valid new password (8+ chars, uppercase, lowercase, digit) and confirms it
   **And** clicks "Definir le mot de passe"
   **Then** `POST /api/auth/set-password` hashes the password with bcrypt cost factor 12+ (NFR7)
   **And** httpOnly JWT cookies are set and the user lands on the authenticated dashboard
   **And** a success toast "Mot de passe defini avec succes. Bienvenue!" is shown

4. **Given** a user who has forgotten their password
   **When** they click "Mot de passe oublie?" and enter their email
   **Then** `POST /api/auth/password-reset/request` always returns 200 (anti-enumeration)
   **And** in MVP, the response includes a reset token and the frontend auto-redirects to `/reset-password?token=...`
   **And** the user enters a new password and confirms it via `POST /api/auth/password-reset/confirm`
   **And** the reset token expires after 30 minutes and is single-use

5. **Given** invalid credentials (wrong email or wrong password)
   **When** the user submits the password in step 2
   **Then** a generic "Identifiants invalides" error is shown (no email enumeration — same error for unknown email and wrong password)
   **And** FluentValidation validates input structure, ProblemDetails returns structured errors
   **And** rate limiting enforces max 5 attempts/min/IP on all `/auth/*` endpoints

## Prerequisites

### Local Dev Environment Requirements

| Tool | Minimum Version | Install | Verify |
|---|---|---|---|
| **.NET SDK** | 10.0 LTS | [dotnet.microsoft.com](https://dotnet.microsoft.com/download) | `dotnet --version` |
| **Node.js** | 20+ | [nodejs.org](https://nodejs.org/) | `node --version` |
| **Docker Desktop** | Latest stable | [docker.com](https://www.docker.com/products/docker-desktop/) | `docker --version` |
| **PostgreSQL** | 17 (via Docker) | `docker compose up -d` | `docker compose ps` |

### Completed Stories (Hard Dependencies)

- **Story 1.1** — Project scaffolding, Docker Compose, Vite proxy to `/api`
- **Story 1.2** — IntegrationTestBase with Testcontainers, pre-configured HttpClients per role, Respawn DB reset
- **Story 1.3** — User entity with `PasswordHash` (nullable), OWNER seed, `ICurrentUserContext`, `IAuthorizationService`, JWT pipeline
- **Story 1.4** — Google OAuth flow, `TokenService` (JWT generation, refresh rotation, cookie management), Axios 401→refresh→retry interceptor, `AuthContext`

## Tasks / Subtasks

- [x] **Task 1: Backend — Initiate Auth Endpoint** (AC: #1)
  - [x] Create `InitiateAuthRequest` DTO with `Email` property
  - [x] Create `InitiateAuthRequestValidator` (FluentValidation): email required + valid format + max 255 chars, reject Unicode control characters
  - [x] Create `InitiateAuthResponse` DTO with `Flow` property (string: `"password"` or `"set-password"`)
  - [x] Implement `POST /api/auth/initiate` in `AuthController`: query user by email, if user exists and `PasswordHash == null` return `{ flow: "set-password" }`, otherwise return `{ flow: "password" }` (covers both "has password" and "not found" — anti-enumeration)
  - [x] Rate limiting applied via existing `[EnableRateLimiting("auth")]` at class level

- [x] **Task 2: Backend — Login Endpoint** (AC: #2, #5)
  - [x] Create `LoginRequest` DTO with `Email` and `Password` properties
  - [x] Create `LoginRequestValidator` (FluentValidation): email required + valid format + max 255 chars, password required + min 8 chars + max 256 chars, both reject Unicode control characters
  - [x] Implement `POST /api/auth/login` in `AuthController` (replace 501 stub): validate credentials, hash-compare via `BCrypt.Net.BCrypt.EnhancedVerify`, call `TokenService.GenerateTokenPairAsync`, set cookies, return `AuthMeResponse`
  - [x] Return generic 401 ProblemDetails (`urn:sdac:invalid-credentials`) for both "email not found" and "wrong password" — prevent enumeration
  - [x] Return 400 ProblemDetails (`urn:sdac:validation-error`) for FluentValidation failures

- [x] **Task 3: Backend — First-Login Password Set** (AC: #3)
  - [x] Create `SetPasswordRequest` DTO with `Email` and `NewPassword` properties
  - [x] Create `SetPasswordRequestValidator`: same email rules + password min 8, max 256, must contain uppercase + lowercase + digit
  - [x] Implement `POST /api/auth/set-password` endpoint: verify user exists with `PasswordHash == null`, hash new password with `BCrypt.Net.BCrypt.EnhancedHashPassword(password, 12)`, save, auto-login by calling `TokenService.GenerateTokenPairAsync`, set cookies
  - [x] Return 400 if user already has a password set (prevent re-use of this endpoint)
  - [x] Return 404 ProblemDetails (`urn:sdac:not-found`) if email not found

- [x] **Task 4: Backend — Password Reset Flow** (AC: #4)
  - [x] Create `PasswordResetToken` entity: `Id`, `UserId`, `TokenHash` (bcrypt-hashed), `ExpiresAt`, `CreatedAt`, `UsedAt` (nullable)
  - [x] Add EF Core migration for `password_reset_tokens` table
  - [x] Create `RequestPasswordResetRequest` DTO (email only) + validator
  - [x] Implement `POST /api/auth/password-reset/request`: generate cryptographically random token, hash with bcrypt, store, return raw token in response (MVP — no email delivery). Always return 200 regardless of email existence (anti-enumeration)
  - [x] Create `ConfirmPasswordResetRequest` DTO (token + new password) + validator
  - [x] Implement `POST /api/auth/password-reset/confirm`: validate token not expired (30 min), hash-compare, update `PasswordHash`, mark token used

- [x] **Task 5: Frontend — Identity-First Login Page** (AC: #1, #2, #3, #5)
  - [x] Create Zod schemas in `src/schemas/authSchema.ts`: `emailSchema` (email only for initiate), `loginSchema` (email + password), `setPasswordSchema` (email + newPassword + confirmPassword with strength rules)
  - [x] Create `LoginPage.tsx` in `src/pages/` as a **three-state component**:
    - **State `"email"`**: Email field + "Continuer" button + Google OAuth button above with "Ou" separator + "Mot de passe oublie?" link
    - **State `"password"`**: Email (read-only) + password field + "Se connecter" button + "Retour" link to go back to email state
    - **State `"set-password"`**: Email (read-only) + new password + confirm password + real-time strength indicator (checkmarks: 8+ chars, uppercase, lowercase, digit) + "Definir le mot de passe" button + "Retour" link
  - [x] State transitions: `"email"` → call `POST /api/auth/initiate` → transition to `"password"` or `"set-password"` based on response `flow` field
  - [x] `"password"` submit → `POST /api/auth/login` → on success call `checkAuth()` from `AuthContext`, navigate to `/dashboard`
  - [x] `"set-password"` submit → `POST /api/auth/set-password` → on success toast + `checkAuth()` + navigate to `/dashboard`
  - [x] Error handling: map ProblemDetails `type` URIs to i18n keys, display inline below fields + `sonner` toast for server errors
  - [x] Integrate all forms with `react-hook-form` + `@hookform/resolvers/zod`
  - [x] Use simple `useState<"email" | "password" | "set-password">` for step management — no external state library needed

- [x] **Task 6: Frontend — Password Reset Flow** (AC: #4)
  - [x] Create `ForgotPasswordPage.tsx`: email field + submit → `POST /api/auth/password-reset/request` → on success auto-redirect to `/reset-password?token=...` with token from response
  - [x] Create `ResetPasswordPage.tsx`: read token from URL param + new password + confirm + strength indicator → `POST /api/auth/password-reset/confirm` → on success toast + redirect to login
  - [x] Add routes: `/forgot-password`, `/reset-password`
  - [x] French success/error toasts via i18n

- [x] **Task 7: i18n Translations** (AC: all)
  - [x] Add French translations in `public/locales/fr/common.json`: all labels, error messages, toasts for login, set-password, and reset flows
  - [x] Add English translations in `public/locales/en/common.json`
  - [x] Key naming: `auth.login.email`, `auth.login.continue`, `auth.login.password`, `auth.login.submit`, `auth.login.back`, `auth.login.error.invalidCredentials`, `auth.setPassword.title`, `auth.setPassword.submit`, `auth.setPassword.success`, `auth.resetPassword.title`, `auth.resetPassword.request`, `auth.resetPassword.confirm`, etc.

- [x] **Task 8: Integration Tests** (AC: all)
  - [x] `InitiateAuthEndpointTests`: existing user with password returns `{ flow: "password" }`, user without password returns `{ flow: "set-password" }`, non-existent email returns `{ flow: "password" }` (anti-enum), invalid email format returns 400
  - [x] `LoginEndpointTests`: valid login returns 200 + JWT cookies, invalid password returns 401, unknown email returns 401 (same error), FluentValidation returns 400, no-password user returns 401
  - [x] `SetPasswordEndpointTests`: first-login set succeeds (200 + cookies), already-has-password returns 400, unknown email returns 404, weak password returns 400
  - [x] `PasswordResetEndpointTests`: request returns 200 regardless, confirm with valid token succeeds, expired token returns 400, used token returns 400
  - [x] `FullAuthFlowTests`: initiate → login (happy path), initiate → set-password (first-login), initiate → login with wrong password (error path)
  - [x] All tests use `IntegrationTestBase`, seed users via `CreateTestUser()`, assert ProblemDetails structure

- [x] **Task 9: Frontend Tests** (AC: all)
  - [x] MSW handlers for `/api/auth/initiate`, `/api/auth/login`, `/api/auth/set-password`, `/api/auth/password-reset/*`
  - [x] `LoginPage.test.tsx`: renders email step, transitions to password step on initiate, transitions to set-password step for first-login users, back button returns to email step, shows password strength indicator
  - [x] `ForgotPasswordPage.test.tsx`: renders form, shows helper text, has back link, submits email and navigates
  - [x] `ResetPasswordPage.test.tsx`: shows no-token error, renders form with token, shows strength indicator, submits and navigates

## Dev Notes

### Architecture Compliance

- **Identity-first login flow**: `POST /api/auth/initiate` → returns `{ flow: "password" | "set-password" }`. Anti-enumeration: non-existent emails return `"password"` (same as users with passwords). Only `"set-password"` reveals email existence for first-login users — accepted trade-off for internal church app with pre-registered users
- **Auth endpoint pattern**: Follow `AuthController.cs` existing structure — `[ApiController]`, `[Route("api/auth")]`, `[EnableRateLimiting("auth")]`
- **JWT cookie mechanics**: Reuse `TokenService.GenerateTokenPairAsync()` and `SetTokenCookies()` — identical flow to Google OAuth callback
- **Password hashing**: Use `BCrypt.Net.BCrypt.EnhancedHashPassword(password, 12)` and `BCrypt.Net.BCrypt.EnhancedVerify(password, hash)`. `EnhancedHashPassword` uses SHA-384 pre-hash to handle passwords > 72 bytes (bcrypt native limit). CRITICAL: never mix `HashPassword`/`EnhancedVerify` — always use the Enhanced pair together. Package `BCrypt.Net-Next` v4.1.0 already installed
- **Error responses**: RFC 7807 ProblemDetails with `urn:sdac:*` type URIs. Frontend maps type URIs to i18n keys — never parse English error strings
- **Input validation pipeline**: FluentValidation (structure) → HtmlSanitizer (content) → EF Core parameterized queries (SQL injection). Apply `MustNotContainControlCharacters()` custom rule on all string inputs. FluentValidation supports custom `Must()` predicates and reusable extension methods for shared rules
- **Authorization**: Return-based pattern in controllers (`return Forbid()`, `return Unauthorized()`), never throw exceptions for auth failures
- **CurrentUserContext**: Populated per-request by `CurrentUserContextMiddleware` after JWT validation. Resolves departments from DB (not JWT claims)
- **Middleware order**: Serilog → ExceptionHandler → CORS → RateLimit → Authentication → Authorization → Controllers
- **Password reset MVP**: Token returned directly in API response (no email delivery). Frontend auto-redirects to reset form with token as URL param. Token is cryptographically random, SHA-256-hashed in DB (indexed for O(1) lookup), 30-min expiry, single-use. Always return 200 from request endpoint regardless of email existence

### Security Constraints

- **Anti-enumeration strategy**: `/initiate` returns `"password"` for both "has password" and "not found" — identical response. `/login` returns identical 401 for "email not found" and "wrong password". `/password-reset/request` always returns 200. KNOWN ACCEPTED RISK: `/initiate` returning `"set-password"` for first-login users does reveal the email exists. This is accepted because (a) users are pre-registered by admin who tells them their email, (b) internal church app with ~30 users, (c) rate limiting mitigates abuse
- **bcrypt cost 12+**: Non-negotiable per NFR7. Use `EnhancedHashPassword`/`EnhancedVerify` pair exclusively
- **httpOnly Secure SameSite=Strict**: All auth cookies. Never localStorage
- **Rate limiting**: 5 attempts/min/IP on all `/auth/*` endpoints via existing `[EnableRateLimiting("auth")]` — includes `/initiate`
- **Password reset tokens**: Cryptographically random, SHA-256-hashed in DB (with index on TokenHash), 30-min expiry, single-use. SHA-256 is correct for high-entropy 256-bit random tokens (bcrypt is for low-entropy passwords)
- **No self-registration**: FR12 — login/set-password/initiate only work for pre-existing user records. `/set-password` rejects users who already have a password

### Frontend Patterns

- **Form library**: `react-hook-form` v7.71 + `zod` v4.3 + `@hookform/resolvers` v5.2 — same pattern as any existing forms
- **HTTP client**: Use the configured Axios instance from `src/lib/api.ts` (has `withCredentials: true` and 401→refresh interceptor)
- **State management**: `AuthContext` for auth state. Call `checkAuth()` after successful login to update context. Login page uses simple `useState<"email" | "password" | "set-password">` for step management — no zustand or external state needed
- **Toast notifications**: `sonner` — `toast.error()` for failures (persistent), `toast.success()` for success (3s auto-dismiss)
- **Component library**: shadcn/ui — use `Input`, `Button`, `Label` components. No Dialog/Sheet needed (first-login is inline, not modal)
- **Validation UX**: Validate on blur (not keystroke). Exception: password strength indicator in set-password step updates in real-time as user types
- **i18n**: All strings through `react-i18next`. `useTranslation()` hook. JSON files in `public/locales/{lang}/`
- **Page architecture**: `LoginPage` is a single component with three internal states. Not three separate pages. Keep email in React state across transitions so it persists when moving between steps. "Retour" link resets to `"email"` state

### UX Design Requirements

- **Identity-first login flow**: Single-column card (400-500px centered). Three visual states within one page, no separate modal
  - **Step "email"**: Google OAuth button + "Ou" separator + email field + "Continuer" button + "Mot de passe oublie?" link below
  - **Step "password"**: Email displayed read-only + password field + "Se connecter" button + "Retour" link
  - **Step "set-password"**: Email displayed read-only + "Definir votre mot de passe" heading + helper "Ceci est votre premiere connexion. Veuillez definir un mot de passe securise." + new password field + confirm password field + strength indicator + "Definir le mot de passe" button + "Retour" link
- **Buttons**: Primary (indigo-600). Full-width on mobile, right-aligned on desktop. Disabled until required fields have valid values. Loading state: spinner replaces text
- **Password strength indicator** (set-password step only): Real-time checkmarks updating as user types (exception to blur-only validation). Criteria: `○/✓ Minimum 8 caracteres`, `○/✓ Majuscules`, `○/✓ Minuscules`, `○/✓ Chiffres`. Red when unmet, `emerald-600` when met
- **Error display**: Red border (`red-600`) + inline `text-sm` message below field. Clear on user edit. Validate on blur (not keystroke). Generic "Identifiants invalides" for login failures — never reveal which field is wrong
- **Touch targets**: Min 44px x 44px. Input font-size: 16px (prevents iOS zoom)
- **Border radius**: `rounded-lg` (8px) for inputs/buttons. `rounded-2xl` (16px) for card container
- **Colors**: `indigo-600` primary, `red-600` destructive, `emerald-600` success. Use semantic tokens only (`bg-primary`, not `bg-indigo-600`)
- **Typography**: Inter font. Labels `text-base font-medium` (above fields, never floating). Body/errors `text-sm font-normal`. Placeholders `text-foreground-muted`
- **Responsive**: Mobile-first. Card: `w-full sm:w-[400px] lg:w-[500px]`. Breakpoints: `sm:` (640px) and `lg:` (1024px) only. `md:` intentionally skipped
- **Accessibility**: WCAG 2.1 AA. `aria-describedby` for errors. `aria-invalid` on invalid fields. Focus moves to first new field on step transition. `prefers-reduced-motion` respected. Keyboard: Tab through fields, Enter submits, visible focus ring (indigo)
- **Step transitions**: Instant (no animation). Focus management: auto-focus first input field of new step

### Project Structure Notes

**Backend files to create/modify:**
```
src/SdaManagement.Api/
├── Controllers/AuthController.cs        # MODIFY: implement Login(), add Initiate(), SetPassword(), PasswordReset endpoints
├── Dtos/Auth/
│   ├── InitiateAuthRequest.cs           # CREATE
│   ├── InitiateAuthResponse.cs          # CREATE
│   ├── LoginRequest.cs                  # CREATE
│   ├── SetPasswordRequest.cs            # CREATE
│   ├── RequestPasswordResetRequest.cs   # CREATE
│   └── ConfirmPasswordResetRequest.cs   # CREATE
├── Validators/
│   ├── InitiateAuthRequestValidator.cs  # CREATE
│   ├── LoginRequestValidator.cs         # CREATE
│   ├── SetPasswordRequestValidator.cs   # CREATE
│   ├── RequestPasswordResetRequestValidator.cs  # CREATE
│   └── ConfirmPasswordResetRequestValidator.cs  # CREATE
├── Data/
│   ├── Entities/PasswordResetToken.cs   # CREATE
│   ├── AppDbContext.cs                  # MODIFY: add PasswordResetTokens DbSet
│   └── Migrations/                      # CREATE: new migration for password_reset_tokens
└── Services/
    ├── IPasswordService.cs              # CREATE: interface for password operations
    └── PasswordService.cs               # CREATE: bcrypt hashing, reset token generation
```

**Frontend files to create/modify:**
```
src/sdamanagement-web/src/
├── schemas/
│   └── authSchema.ts                    # CREATE: Zod schemas (emailSchema, loginSchema, setPasswordSchema, resetPasswordSchema)
├── pages/
│   ├── LoginPage.tsx                    # CREATE: three-state identity-first login (email → password | set-password)
│   ├── ForgotPasswordPage.tsx           # CREATE: email entry + auto-redirect with token
│   └── ResetPasswordPage.tsx            # CREATE: token from URL + new password + confirm
├── contexts/AuthContext.tsx             # MODIFY: add email/password login support alongside Google OAuth
├── mocks/handlers/auth.ts              # CREATE: MSW handlers for /initiate, /login, /set-password, /password-reset/*
└── public/locales/
    ├── fr/common.json                   # MODIFY: add auth.login.*, auth.setPassword.*, auth.resetPassword.* keys
    └── en/common.json                   # MODIFY: add English equivalents
```

**Test files to create:**
```
tests/SdaManagement.Api.IntegrationTests/Auth/
├── InitiateAuthEndpointTests.cs         # CREATE
├── LoginEndpointTests.cs                # CREATE
├── SetPasswordEndpointTests.cs          # CREATE
├── PasswordResetEndpointTests.cs        # CREATE
└── FullAuthFlowTests.cs                 # CREATE: scenario-based chained tests

tests/SdaManagement.Api.UnitTests/
├── Validators/InitiateAuthRequestValidatorTests.cs  # CREATE
├── Validators/LoginRequestValidatorTests.cs         # CREATE
├── Validators/SetPasswordRequestValidatorTests.cs   # CREATE
└── Services/PasswordServiceTests.cs                 # CREATE

src/sdamanagement-web/src/pages/
├── LoginPage.test.tsx                   # CREATE: tests all three states + transitions
├── ForgotPasswordPage.test.tsx          # CREATE
└── ResetPasswordPage.test.tsx           # CREATE
```

### Previous Story Intelligence (from Story 1.4)

- **TokenService** is the single source of truth for JWT generation. Do NOT create a separate token generation mechanism — reuse `GenerateTokenPairAsync()` and `SetTokenCookies()`
- **JsonWebTokenHandler** (not legacy `JwtSecurityTokenHandler`) is used for JWT creation
- **Refresh token rotation**: generates cryptographically random 64-byte base64 string, revokes old token, creates new — single `SaveChangesAsync()` per operation
- **Dual auth scheme**: `GoogleOAuthTemp` (transient for OAuth callback) + `JwtBearer` (default). Email/password login uses `JwtBearer` scheme only
- **AuthController** already has `[EnableRateLimiting("auth")]` at class level — new endpoints automatically rate-limited
- **Frontend AuthContext** has `login()` (currently redirects to Google), `logout()`, `checkAuth()`. The Google login redirects to `/api/auth/google-login`. Email/password login does NOT use `login()` — it calls `/api/auth/initiate` then `/api/auth/login` or `/api/auth/set-password` directly via Axios. After success, call `checkAuth()` to refresh auth state. Do NOT modify the existing `login()` method — it's Google-only
- **Axios interceptor** in `src/lib/api.ts` handles 401→refresh→retry with request queuing. New login endpoints benefit from this automatically
- **Error handling**: Story 1.4 used `?error=user_not_found` query params for OAuth errors. Email/password should use inline form errors instead (better UX)
- **Code review feedback from 1.4**: Ensure single `SaveChangesAsync()` per operation, avoid N+1 queries, keep controllers thin (delegate to services)

### Git Intelligence

Recent commit pattern: `feat(auth): Story 1.X — <description>`
- Files follow established structure: Controllers, Services, Dtos, Data/Entities
- Tests follow `Auth/` subfolder organization in both integration and unit test projects
- EF Core migrations auto-applied on startup via `Database.Migrate()`

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 1, Story 1.5]
- [Source: _bmad-output/planning-artifacts/architecture.md — Authentication & Authorization section]
- [Source: _bmad-output/planning-artifacts/architecture.md — Security section, NFR6-NFR12]
- [Source: _bmad-output/planning-artifacts/architecture.md — API Design Patterns]
- [Source: _bmad-output/planning-artifacts/prd.md — FR9, FR10, FR12, FR14, FR15]
- [Source: _bmad-output/planning-artifacts/prd.md — NFR7, NFR8, NFR13-NFR18, NFR22]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Login Form, First-Login Modal, Form Patterns]
- [Source: _bmad-output/implementation-artifacts/1-4-google-oauth-sign-in-flow.md — TokenService, AuthController, Axios interceptor patterns]

## Code Review Record

### Review Model
Claude Sonnet 4.6 (initial) → Claude Opus 4.6 (re-review + fixes)

### Findings Summary
**1 HIGH, 5 MEDIUM, 6 LOW** — all resolved.

### Findings & Fixes Applied

| ID | Sev | Finding | Fix |
|---|---|---|---|
| H1 | HIGH | Anti-enumeration bypass in `/password-reset/request` — different response bodies (`{ message }` vs `{ token }`) leak email existence | Return fake random token for non-existent emails |
| M1 | MED | bcrypt used for reset token hashing — wrong algorithm for high-entropy random tokens, forces full table scan | Replaced with SHA-256 + indexed DB lookup via `CryptographicOperations.FixedTimeEquals` |
| M2 | MED | `ValidationExtensions` exempts `\n`, `\r`, `\t` from control character check — violates story spec | Removed exemptions, reject ALL `char.IsControl()` |
| M3 | MED | `PasswordStrengthIndicator` duplicated in LoginPage and ResetPasswordPage | Extracted to shared `@/components/auth/PasswordStrengthIndicator.tsx` |
| M4 | MED | Missing unit tests for `RequestPasswordResetRequestValidator` and `ConfirmPasswordResetRequestValidator` | Created test files with 15 total test methods |
| M5 | MED | Email not normalized to lowercase — PostgreSQL `=` is case-sensitive | Added `.ToLowerInvariant()` on all auth endpoints |
| L1 | LOW | bcrypt for reset tokens is unnecessarily slow for 256-bit random input | Covered by M1 fix (SHA-256) |
| L2 | LOW | `ForgotPasswordPage` catches error details it never uses (dead code) | Simplified to `catch { toast.error(...) }` |
| L3 | LOW | `ConfirmPasswordResetRequestValidator` missing `MaximumLength` on Token | Added `.MaximumLength(128)` |
| L4 | LOW | Login query missing `.AsNoTracking()` for read-only operation | Added `.AsNoTracking()` |
| L5 | LOW | `PasswordStrengthIndicator` uses translated strings as React keys | Fixed with stable `key={check.id}` in shared component |
| L6 | LOW | `ForgotPasswordPage.test.tsx` doesn't assert token presence in redirect URL | Added `expect(window.location.search).toContain("token=")` |

### Additional Fix: Validator Null Safety
During test verification, discovered `ConfirmPasswordResetRequestValidator` and `SetPasswordRequestValidator` crash on null password input — `.Must(p => p.Any(...))` throws `ArgumentNullException` when `p` is null. Fixed by adding `.Cascade(CascadeMode.Stop)` after `.NotEmpty()` on the `NewPassword` rule chain in both validators.

### Post-Review EF Core Migration
Created migration `AddPasswordResetTokenHashIndex` for the new index on `PasswordResetTokens.TokenHash`.

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (claude-opus-4-6)

### Debug Log References

- FluentValidation v12.1.1 has no auto-validation package (FluentValidation.AspNetCore dropped). Used manual `IValidator<T>` injection via `[FromServices]` in controller methods.
- `ValidationProblem()` does not accept FluentValidation `ValidationResult` directly. Wrapped in `BadRequest(new ValidationProblemDetails(validation.ToDictionary()))`.
- `ShouldHaveAnyValidationError()` does not exist on `TestValidationResult<T>`. Used `result.Errors.Count.ShouldBeGreaterThan(0)` with Shouldly.
- Integration tests required `using Microsoft.Extensions.DependencyInjection;` for `CreateScope()` extension method.
- Zod v4 uses `z.email()` top-level API (not `z.string().email()`) and `{ error: }` param (not `{ message: }`).
- Frontend tests: password strength indicator text includes "○ " prefix — required regex matchers `/Minimum 8 caractères/` instead of exact string match.
- Frontend tests: `jsdom` needed as explicit dev dependency for Vitest jsdom environment.

### Completion Notes List

- All 9 tasks completed and verified
- Code review completed: 1 HIGH, 5 MEDIUM, 6 LOW findings — all resolved
- Backend: 65 unit tests passing, 31 integration tests passing (96 total)
- Frontend: 14 vitest tests passing (LoginPage: 5, ForgotPasswordPage: 4, ResetPasswordPage: 5)
- Grand total: 110 tests passing across all projects
- Extracted `IPasswordService`/`PasswordService` for bcrypt + SHA-256 operations (testability + DRY)
- Created `ValidationExtensions.MustNotContainControlCharacters()` reusable extension
- Created private `ValidationError()` helper in AuthController for FluentValidation → ProblemDetails conversion
- Installed shadcn/ui components: Button, Input, Label (new-york style)
- No rate limiting tests included (rate limit behavior tested in Story 1.4 infrastructure)
- Code review fix: reset tokens now use SHA-256 (not bcrypt) with indexed DB lookup
- Code review fix: email normalized to lowercase across all auth endpoints
- Code review fix: extracted shared `PasswordStrengthIndicator` component
- Code review fix: anti-enumeration hardened on `/password-reset/request`

### File List

**Backend — Created:**
- `src/SdaManagement.Api/Dtos/Auth/InitiateAuthRequest.cs`
- `src/SdaManagement.Api/Dtos/Auth/InitiateAuthResponse.cs`
- `src/SdaManagement.Api/Dtos/Auth/LoginRequest.cs`
- `src/SdaManagement.Api/Dtos/Auth/SetPasswordRequest.cs`
- `src/SdaManagement.Api/Dtos/Auth/RequestPasswordResetRequest.cs`
- `src/SdaManagement.Api/Dtos/Auth/ConfirmPasswordResetRequest.cs`
- `src/SdaManagement.Api/Validators/ValidationExtensions.cs`
- `src/SdaManagement.Api/Validators/InitiateAuthRequestValidator.cs`
- `src/SdaManagement.Api/Validators/LoginRequestValidator.cs`
- `src/SdaManagement.Api/Validators/SetPasswordRequestValidator.cs`
- `src/SdaManagement.Api/Validators/RequestPasswordResetRequestValidator.cs`
- `src/SdaManagement.Api/Validators/ConfirmPasswordResetRequestValidator.cs`
- `src/SdaManagement.Api/Data/Entities/PasswordResetToken.cs`
- `src/SdaManagement.Api/Services/IPasswordService.cs`
- `src/SdaManagement.Api/Services/PasswordService.cs`
- `src/SdaManagement.Api/Data/Migrations/*_AddPasswordResetTokens.cs` (migration + designer)

**Backend — Modified:**
- `src/SdaManagement.Api/Controllers/AuthController.cs` — added Initiate, Login (replaced stub), SetPassword, RequestPasswordReset, ConfirmPasswordReset endpoints + helper methods
- `src/SdaManagement.Api/Data/AppDbContext.cs` — added PasswordResetTokens DbSet + entity configuration
- `src/SdaManagement.Api/Extensions/ServiceCollectionExtensions.cs` — registered FluentValidation validators + IPasswordService

**Frontend — Created:**
- `src/sdamanagement-web/src/schemas/authSchema.ts`
- `src/sdamanagement-web/src/pages/LoginPage.tsx`
- `src/sdamanagement-web/src/pages/ForgotPasswordPage.tsx`
- `src/sdamanagement-web/src/pages/ResetPasswordPage.tsx`
- `src/sdamanagement-web/src/components/ui/button.tsx`
- `src/sdamanagement-web/src/components/ui/input.tsx`
- `src/sdamanagement-web/src/components/ui/label.tsx`
- `src/sdamanagement-web/src/components/auth/PasswordStrengthIndicator.tsx` *(code review: extracted shared component)*
- `src/sdamanagement-web/vitest.config.ts`
- `src/sdamanagement-web/src/test-setup.ts`
- `src/sdamanagement-web/src/test-utils.tsx`
- `src/sdamanagement-web/src/mocks/handlers/auth.ts`

**Frontend — Modified:**
- `src/sdamanagement-web/src/App.tsx` — added BrowserRouter, Routes, Toaster
- `src/sdamanagement-web/public/locales/fr/common.json` — added auth translations
- `src/sdamanagement-web/public/locales/en/common.json` — added auth translations
- `src/sdamanagement-web/src/pages/LoginPage.tsx` — *(code review: import shared PasswordStrengthIndicator)*
- `src/sdamanagement-web/src/pages/ResetPasswordPage.tsx` — *(code review: import shared PasswordStrengthIndicator)*
- `src/sdamanagement-web/src/pages/ForgotPasswordPage.tsx` — *(code review: simplified error handler)*

**Unit Tests — Created:**
- `tests/SdaManagement.Api.UnitTests/Validators/InitiateAuthRequestValidatorTests.cs` (8 tests)
- `tests/SdaManagement.Api.UnitTests/Validators/LoginRequestValidatorTests.cs` (8 tests)
- `tests/SdaManagement.Api.UnitTests/Validators/SetPasswordRequestValidatorTests.cs` (8 tests)
- `tests/SdaManagement.Api.UnitTests/Validators/RequestPasswordResetRequestValidatorTests.cs` (5 tests) *(code review)*
- `tests/SdaManagement.Api.UnitTests/Validators/ConfirmPasswordResetRequestValidatorTests.cs` (10 tests) *(code review)*
- `tests/SdaManagement.Api.UnitTests/Services/PasswordServiceTests.cs` (8 tests)

**Integration Tests — Created:**
- `tests/SdaManagement.Api.IntegrationTests/Auth/InitiateAuthEndpointTests.cs` (4 tests)
- `tests/SdaManagement.Api.IntegrationTests/Auth/LoginEndpointTests.cs` (5 tests)
- `tests/SdaManagement.Api.IntegrationTests/Auth/SetPasswordEndpointTests.cs` (4 tests)
- `tests/SdaManagement.Api.IntegrationTests/Auth/PasswordResetEndpointTests.cs` (5 tests)
- `tests/SdaManagement.Api.IntegrationTests/Auth/FullAuthFlowTests.cs` (3 tests)

**Frontend Tests — Created:**
- `src/sdamanagement-web/src/pages/LoginPage.test.tsx` (5 tests)
- `src/sdamanagement-web/src/pages/ForgotPasswordPage.test.tsx` (4 tests)
- `src/sdamanagement-web/src/pages/ResetPasswordPage.test.tsx` (5 tests)
