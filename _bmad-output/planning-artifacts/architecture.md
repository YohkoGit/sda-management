---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
inputDocuments:
  - docs/product-brief-sdac-ops.md
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/ux-design-specification.md
documentCounts:
  briefs: 1
  prd: 1
  uxDesign: 1
  research: 0
  projectDocs: 0
  projectContext: 0
workflowType: 'architecture'
lastStep: 8
status: 'complete'
completedAt: '2026-02-28'
project_name: 'sda-management'
user_name: 'Elisha'
date: '2026-02-28'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Key Principles

Five non-negotiable truths for every AI agent implementing this system:

1. **Security boundary is the API layer, never the frontend.** Frontend hides UI affordances for UX; API enforces permissions. All authorization checks happen server-side through the centralized authorization service.
2. **Public endpoints return dedicated public DTOs, never entities.** No EF Core entities in any API response. Public DTOs live in a separate namespace with explicitly whitelisted fields. No `[JsonIgnore]` as a security mechanism.
3. **Mutations via HTTP, notifications via SignalR (push-only).** SignalR is server→client notifications only. REST API handles all reads and writes. A SignalR disconnection doesn't block writes — only delays push notifications to other clients.
4. **No hardcoded strings — i18n from commit 1.** All user-facing strings go through the i18n system from the first component. Layout must accommodate French string lengths (20-30% longer than English).
5. **PRD is the contract, product brief is historical context.** The PRD's MVP feature set defines implementation scope. The product brief's flat `SabbathAssignment` entity and broader feature set (Virtual Rooms, Transcripts, MinistryProject pipelines) are explicitly superseded and must not be implemented.

### Requirements Overview

**Functional Requirements:**
65 FRs across 11 categories. The heaviest areas are Activity Scheduling (10 FRs — the core domain), Authentication & Authorization (8 FRs — dual auth + 4-tier RBAC), and Department Management (8 FRs — scoped admin with sub-ministries). Public Access (7 FRs) defines the anonymous-first design. Guest Speaker Handling (4 FRs) introduces the ghost user pattern. Avatar display, calendar, user admin, church config, and i18n round out the scope.

**Non-Functional Requirements:**
23 NFRs that drive architecture: Performance (page load <2s, API <500ms, WebSocket <1s, bundle <200KB gzipped), Security (HTTPS, bcrypt cost 12+, JWT refresh rotation, department-scoped auth enforcement at API layer, input sanitization), Accessibility (WCAG 2.1 AA, keyboard nav, 4.5:1 contrast, 12px min text, prefers-reduced-motion), Reliability (99.5% uptime, WebSocket reconnect with polling fallback, daily backups 7-day retention), Media (profile images <500KB, cache-bust via updatedAt timestamp).

**UX Architecture Requirements:**
Component system built on shadcn/ui (Radix UI primitives, edit-in-place). Calendar via @schedule-x/react. Contact picker via cmdk Command. Semantic CSS token system with register-aware theming (public vs operational). Self-hosted Inter font (WOFF2, font-display: swap). Three avatar sizes (48px, 28px) as optimized WebP at 2x. Mobile-first with sm:/lg: breakpoints only (md: intentionally unused). Bottom sheets on mobile, side panels on desktop.

**Scale & Complexity:**

- Primary domain: Full-stack web application (React SPA + ASP.NET Core REST API + PostgreSQL)
- Complexity level: Low-Medium
- Single congregation: ~100-200 users, ~30 officers, ~12 departments
- Estimated architectural components: ~8-10 API controllers (mapped to aggregate roots, not entities), ~12 core entities, ~25 React page/feature components, ~15 shared UI components
- Real-time: SignalR with 3 scoped group levels
- Auth: Google OAuth 2.0 + email/password, JWT, 4-tier RBAC with department scoping

### Scope Boundary — PRD Is the Contract

The product brief (Phase 1) includes features the PRD explicitly excludes from MVP: Virtual Rooms, Transcripts/Archives, MinistryProject pipelines, Excel import. The architecture is scoped to the **PRD's MVP feature set only**. The product brief serves as historical context and vision reference — not an implementation contract. AI agents must reference the PRD for scope decisions, not the brief.

**Data Model Evolution — Canonical Model:**
The product brief proposed a flat `SabbathAssignment` entity with fixed columns (PredicateurId, AncienServiceId, AnnoncesId, etc.). The PRD evolved this into a **flexible activity model**: any activity, any day, configurable service roles with variable headcounts. The normalized `Activity → ActivityRole → RoleAssignment` structure is the **canonical data model**. The product brief's flat entity design is explicitly superseded and must not be implemented.

### Technical Constraints & Dependencies

- **Solo developer** — architecture must favor convention over configuration, minimize moving parts
- **Tech stack decided** — C#/.NET 10 LTS, ASP.NET Core, EF Core, PostgreSQL (backend); React 18, TypeScript, Tailwind CSS, Vite (frontend)
- **Hosting target** — Azure free tier or Docker on VPS. Must remain low-cost/free.
- **No multi-tenancy** — single congregation, single deployment
- **No ACMS integration** — independent system
- **No self-registration** — admin-only user creation, Google emails matched to pre-existing records
- **No Excel import** — fresh start for activity data (PRD explicitly states this)
- **Mobile-first constraint** — all admin functions must work on phone (Journey 6)
- **French-primary** — UI default language, English secondary

### Cross-Cutting Concerns (Ranked by Implementation Burden)

**Tier 1 — Architectural (affects multiple components, hard to change later):**

1. **Authentication & Department-Scoped Authorization** — The highest-burden concern. Every API endpoint needs role checking. Every admin write needs `user.departments ∩ resource.department` validation. This is a combinatorial authorization matrix (4 roles × N departments × M operations). Built as a dedicated `IAuthorizationService` with its own unit test suite — not scattered `[Authorize]` attributes. Department assignments resolved from database per-request (not JWT claims) to eliminate stale-claims failure mode. One missed check = data leak. Sprint 0 blocker.
2. **Internationalization (FR/EN)** — Every user-facing string, form label, error message, and toast notification through i18n. Both languages complete for MVP. Day-one constraint — no hardcoded strings from commit 1. Layout must accommodate French string lengths. Sprint 0 blocker.
3. **Real-Time Updates (SignalR)** — Scoped to 3 group levels (public, per-department, per-activity). Push is the cache invalidation signal. Touches mutations only (not reads). Can be layered per-view incrementally — Sprint 1+, not Sprint 0. Broadcasts should be debounced/coalesced for bulk operations. Group memberships cleaned up on disconnect and logout. Push payloads must be group-specific DTOs (public group receives public-safe projections only).
4. **Public vs Authenticated Data Isolation** — API responses must never leak authenticated-only data to anonymous requests. UI renders different content per register. Guest speakers appear identical to members on public layer. `isGuest` flag never in public API responses. Shapes API contract design and DTO strategy.

**Tier 2 — Implementation Discipline (baked into tooling choices):**

5. **Responsive Design (Mobile-First)** — Baked into Tailwind CSS + shadcn/ui. Every component authored for 375px base, enhanced at sm: (640px) and lg: (1024px). md: breakpoint intentionally skipped. Discipline, not architecture.
6. **WCAG 2.1 AA Accessibility** — Baked into shadcn/ui (Radix UI primitives provide ARIA automatically). @axe-core/react in dev, @axe-core/playwright in CI. Discipline with tooling support.
7. **Register-Aware Theming** — Semantic CSS tokens switch between public and operational register. ThemeRegisterProvider context. Set up once, every component inherits.

### Architectural Decisions Summary

**Constraint** = hard architectural boundary, violation causes systemic failure.
**Convention** = recommended pattern, deviation requires justification.

#### P0 — Foundational (before first line of feature code)

| # | Decision | Type | Impact |
|---|---|---|---|
| 1 | **Flexible activity data model** — normalized Activity → ActivityRole → RoleAssignment. Templates are creation-time blueprints (no live binding). DB-level constraints: cascade deletes, unique (ActivityRoleId, UserId). | Constraint | Shapes every query, every endpoint, every UI component |
| 2 | **Centralized authorization service** (`IAuthorizationService`) — explicit per-domain methods, unit tested. Department assignments resolved from DB per-request via `ICurrentUserContext`. Authorization methods return false on failure, never throw. | Constraint | Shapes every controller, single audit point |
| 3 | **httpOnly Secure SameSite=Strict cookie JWT** — not localStorage. Access token 15-30 min TTL. Refresh token 7 days with rotation. | Constraint | Eliminates XSS token theft, shapes auth flow |
| 4 | **Same-origin deployment** — SPA static files served by ASP.NET backend. | Constraint | Eliminates CORS/CSRF complexity |
| 5 | **i18n framework initialized day-one** — all strings through i18n from first component. | Constraint | Prevents costly retrofit |
| 6 | **Frontend state stack** — Auth Context (React Context) + server state (TanStack Query) + UI state (Zustand). | Constraint | Shapes component data flow, caching, SignalR invalidation |
| 7 | **Mutations via HTTP, notifications via SignalR** — SignalR is push-only (server→client). | Constraint | SignalR disconnection doesn't block writes |
| 8 | **Backend is stateless** — no in-memory caches for critical data. All persistent state in PostgreSQL. | Constraint | Safe restarts, Azure free tier compatible |
| 9 | **Activity + roles + assignments as single unit of work** — atomic transaction via EF Core SaveChangesAsync. | Constraint | No partial activity state |
| 10 | **Public API contract** — dedicated public DTO namespace, never return entities. | Constraint | Prevents data leakage |
| 11 | **Separate public/auth route trees** with layout-level code splitting. | Constraint | Bundle optimization, anonymous users never download admin code |

#### P1 — Before Production Users (layered in iteratively)

| # | Decision | Type | Impact |
|---|---|---|---|
| 12 | **Read DTOs with EF Core `.Select()` projections** for all list/dashboard endpoints. Full entity loading only for writes. | Convention | Prevents N+1, meets NFR1/NFR3 performance targets |
| 13 | **SignalR scoped groups** (public, per-department, per-activity) with group-specific DTO payloads. | Constraint | Prevents data leaks via push notifications |
| 14 | **OpenAPI spec generation** from .NET controllers, optional TypeScript client generation. | Convention | Eliminates frontend-backend type drift |
| 15 | **HTTP client: transparent 401 → refresh → retry.** All API calls through single configured client with `withCredentials: true`. | Convention | Admins never lose work to token expiry |
| 16 | **SignalR group cleanup** on disconnect and logout. | Constraint | Prevents push leaks to logged-out users |
| 17 | **Concurrency tokens** via EF Core with PostgreSQL `xmin` for optimistic concurrency on activity updates. | Constraint | Safe concurrent edit detection per PRD FR27 |

#### P2 — When Pattern Is Needed

| # | Decision | Type | Impact |
|---|---|---|---|
| 18 | **SignalR broadcast debouncing** for bulk operations — coalesce within 500ms window. | Convention | Prevents message storms |
| 19 | **SignalR-event-to-query-key invalidation mapping** — document pattern, implement per feature. | Convention | Structured cache invalidation |
| 20 | **Form draft persistence** in sessionStorage for complete session expiry edge case. | Convention | Safety net for lost form data |
| 21 | **MSW mock layer** for frontend development. | Convention | DX enhancement for UI-first prototyping |
| 22 | **Permission delegation path** — FR28 (templates) and FR57 (departments) use role-permission mapping, not hard-coded role checks, so OWNER-only operations can be delegated to ADMINs without schema changes. | Convention | Future operational flexibility |

### Architectural Risk Analysis

#### Security Analysis

**Red Team findings on RBAC and data isolation:**

- **Horizontal privilege escalation:** ADMIN for department A crafting direct API calls to department B resources. **Mitigation:** `IAuthorizationService.EnsureCanManage...()` resolves resource's department, checks intersection with user's departments. Returns 403 if no match. Frontend is UI convenience; API is the security boundary.
- **Public endpoint over-fetching:** Developer adds new entity field that auto-includes in public response. **Mitigation:** Public endpoints use dedicated public DTO classes with whitelisted fields in separate `Dtos.Public` namespace. Never return entities.
- **Guest user enumeration:** Attacker probes user search to discover guest flag. **Mitigation:** User search requires VIEWER+ auth. `isGuest` never in public DTOs. Public dashboard shows names only — no user IDs, no flags.
- **JWT token theft via XSS:** localStorage-stored JWT leaked by XSS. **Mitigation:** httpOnly Secure SameSite=Strict cookies. JavaScript cannot read the token. SameSite=Strict on same-origin deployment eliminates CSRF.

#### Failure Mode Analysis

| Component | Failure Mode | Impact | Prevention |
|---|---|---|---|
| **Authorization Service** | Missing check on new endpoint | Unauthorized access | Convention: every controller method's first line is auth check. Integration tests assert 403 for wrong-role users on every endpoint. |
| **Authorization Service** | Stale department assignments | Temporary over-permission | Resolve departments from DB per-request, not JWT claims. |
| **Activity Model** | Orphaned role assignments | Ghost data | CASCADE DELETE from Activity → ActivityRole → RoleAssignment in migrations. |
| **Activity Model** | Duplicate role assignments | Display glitch | Unique constraint on (ActivityRoleId, UserId) at DB level. |
| **SignalR** | Group membership leak after logout | Privacy violation | Remove connection from all groups on disconnect/logout. Client disconnects hub on logout. |
| **SignalR** | Message storm on bulk edit | Client UI flicker | Debounce/coalesce broadcasts within 500ms window. TanStack Query batches invalidations. |
| **JWT Cookies** | Cookie not sent on API call | 401 errors | Single configured HTTP client with `withCredentials: true`. Never raw `fetch()`. |
| **JWT Cookies** | Refresh token race condition (multi-tab) | Unexpected logout | Grace window: accept same refresh token within 30s. |
| **Frontend State** | Cache stale after SignalR push | Stale data displayed | SignalR handler calls `queryClient.invalidateQueries()` with specific query keys. |
| **Frontend State** | Optimistic update rollback failure | False save confirmation | TanStack Query `onError` reverts cache. `onSettled` always refetches. Test rollback path. |

#### Resilience Patterns

- **Database crash mid-edit:** Activity creation with role assignments is a single EF Core transaction. Crash rolls back atomically. No partial state. Admin sees error toast and retries.
- **SignalR disconnect during peak:** Auto-reconnect with exponential backoff. TanStack Query `refetchOnReconnect` fetches fresh data. HTTP mutations succeed independently of SignalR state.
- **Azure free tier memory restart:** Backend is stateless — no in-memory caches. JWT cookies persist in browser. SignalR reconnects. Database is external. Zero data loss, brief reconnection delay.
- **Token expiry during form editing:** HTTP client interceptor catches 401, sends refresh token, retries original request transparently. Admin never knows it happened.

#### Trade-Off Validation

Cross-functional review (PM + Engineer + Designer) confirmed:

- **Feasibility:** No exotic patterns — all decisions use well-documented .NET + React patterns. Foundational setup is manageable for a solo developer.
- **Desirability:** TanStack Query's loading/error states align naturally with UX spec's skeleton patterns. Same-origin deployment simplifies dev experience (Vite proxy in dev).
- **Viability:** P0/P1/P2 tiers give phased approach — build foundation, ship features, layer in refinements. No big-bang architecture required.

## Starter Template Evaluation

### Primary Technology Domain

Full-stack web application — separate backend (.NET 10 LTS) and frontend (React/Vite) projects in a single repository. Dual-stack project requiring independent starters for each side.

### Starter Options Considered

**Option A: Community Mega-Starters — Rejected.**
Community starters (aspnetcore-webapi-template with GraphQL/Redis/CQRS, vite-react-ts-shadcn-ui with React 19/Tailwind 4) bring opinions we didn't choose and dependencies we don't need. Stripping unwanted packages is more work than adding wanted ones. Violates "boring technology" and "convention over configuration" principles.

**Option B: Official Templates + Incremental Setup — Selected.**
Microsoft's `dotnet new webapi` and Vite's `create vite` with shadcn/ui CLI give clean foundations with zero unwanted opinions. Every additional package is an explicit, documented decision.

### Selected Approach: Official Templates + Incremental Setup

**Rationale:** For a solo developer building a dual-stack project with well-defined requirements, official templates with incremental package addition gives zero unwanted dependencies, exact version control, clean upgrade paths, and full traceability of every dependency choice.

### Backend Initialization

```bash
# .NET 10 LTS (supported until Nov 2028)
dotnet new webapi --use-controllers -o src/SdaManagement.Api --framework net10.0
```

**Core NuGet Packages:**

| Package | Version | Purpose |
|---|---|---|
| `Microsoft.EntityFrameworkCore` | 10.x | ORM |
| `Npgsql.EntityFrameworkCore.PostgreSQL` | 10.x | PostgreSQL provider |
| `EFCore.NamingConventions` | latest | snake_case DB naming via `UseSnakeCaseNamingConvention()` |
| `Microsoft.AspNetCore.Authentication.Google` | 10.x | Google OAuth 2.0 |
| `Microsoft.AspNetCore.Authentication.JwtBearer` | 10.x | JWT cookie auth |
| `Microsoft.AspNetCore.Identity.EntityFrameworkCore` | 10.x | Identity for email/password |
| `Swashbuckle.AspNetCore` | latest | OpenAPI/Swagger spec generation |
| `BCrypt.Net-Next` | latest | Password hashing (bcrypt, cost 12+) |

**Backend Test Packages:**

| Package | Purpose |
|---|---|
| `xunit` | .NET test framework |
| `xunit.runner.visualstudio` | Test runner integration |
| `Microsoft.AspNetCore.Mvc.Testing` | Integration test host for API endpoints |
| `NSubstitute` | Mocking for unit tests |
| `Shouldly` | Readable assertion syntax (MIT license) |
| `Testcontainers.PostgreSql` | Real PostgreSQL in integration tests |

### Frontend Initialization

```bash
# Vite 6 + React 18 + TypeScript
npm create vite@latest src/sdamanagement-web -- --template react-ts
cd src/sdamanagement-web

# shadcn/ui setup (configures Tailwind, path aliases, Radix UI)
npx shadcn@latest init
```

**Core npm Packages:**

| Package | Version | Purpose |
|---|---|---|
| `@tanstack/react-query` | ^5.90 | Server state management |
| `@tanstack/react-query-devtools` | ^5.90 | Dev tools (dev only) |
| `zustand` | ^5.0 | Cross-component UI state |
| `react-router-dom` | ^6 | SPA routing with route guards |
| `react-i18next` | latest | i18n React integration |
| `i18next` | latest | i18n core |
| `@microsoft/signalr` | latest | SignalR client |
| `@schedule-x/react` | latest | Calendar component |
| `sonner` | latest | Toast notifications |
| `axios` | latest | HTTP client with interceptors |
| `cmdk` | latest | Command palette (contact picker base) |

**Frontend Test Packages (P0):**

| Package | Purpose |
|---|---|
| `vitest` | Unit + integration tests (Vite-native) |
| `@testing-library/react` | Component testing utilities |
| `@testing-library/jest-dom` | DOM assertion matchers |
| `@testing-library/user-event` | User interaction simulation |
| `playwright` | E2E tests (375px, 768px, 1280px viewports) |
| `@axe-core/react` | Accessibility violations in dev overlay |
| `@axe-core/playwright` | Accessibility audit in CI pipeline |
| `msw` | Mock Service Worker — API mocking for tests + frontend-first dev |

### i18n Configuration

- **Default locale:** `fr` (French) — hardcoded, no browser detection
- **Fallback locale:** `fr`
- **No `i18next-browser-languagedetector`** — the app always starts in French
- English (`en`) available via explicit UI language toggle only
- User's language preference stored in localStorage (persists across sessions)
- Translation files in `public/locales/{lang}/` as JSON

### Local Development Infrastructure

```yaml
# docker-compose.dev.yml
services:
  db:
    image: postgres:17
    environment:
      POSTGRES_DB: sdamanagement
      POSTGRES_USER: dev
      POSTGRES_PASSWORD: dev
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
volumes:
  pgdata:
```

One command: `docker compose -f docker-compose.dev.yml up -d` — PostgreSQL 17 running with zero local install.

### Development Proxy Configuration

In development, Vite runs on `:5173` and ASP.NET on `:5000`. Same-origin deployment applies to production only. For dev, configure Vite's proxy in `vite.config.ts`:

```typescript
server: {
  proxy: {
    '/api': 'http://localhost:5000',
    '/hubs': {
      target: 'http://localhost:5000',
      ws: true
    }
  }
}
```

This routes `/api/*` and `/hubs/*` to the backend during development. No CORS configuration needed in dev — the proxy handles it.

### Avatar Storage Convention

- **Storage location:** `data/avatars/{userId}.webp` — outside `wwwroot/`, not publicly browsable. Path configurable via `appsettings.json` (`AvatarStorage:Path`).
- **Serve via controller:** `GET /api/avatars/{userId}` — `[AllowAnonymous]`, returns file with cache headers. URL only exposed through API response DTOs (no directory enumeration).
- **Cache headers:** `ETag` based on `updatedAt` timestamp + `Cache-Control: public, max-age=86400`. Browser caches 24h, ETag forces revalidation on update.
- **Upload:** `POST /api/avatars/{userId}` — ADMIN+ only. FluentValidation enforces <500KB, accepts image/jpeg, image/png, image/webp. Converted to optimized WebP on save.
- **Fallback:** When no avatar file exists, API returns 404. Frontend displays initials-based fallback (generated client-side from user name).
- **Security:** No static file serving for avatars. Controller-based serving prevents URL enumeration. Avatar URLs are only discoverable through API responses containing user data.

### Project Structure Conventions

Two project roots with pattern conventions. Actual files emerge from implementation stories — not predetermined.

- `src/SdaManagement.Api/` — ASP.NET Core project root
  - Pattern: Controllers / Services / Data / Dtos (Public + Authenticated namespaces) / Auth
- `src/sdamanagement-web/` — Vite/React project root
  - Pattern: components/ui (shadcn primitives), components/{domain}, pages, hooks, services, locales
- `tests/` — Backend test projects (unit + integration)
- `docker-compose.dev.yml` — Local dev PostgreSQL
- `docker-compose.yml` — Production deployment stack (future)

### Axios Rationale

Axios is a **convenience choice, not an architectural necessity**. Selected for its interceptor pattern which cleanly implements the 401 → refresh → retry flow for JWT token refresh. Adds ~13KB to bundle. If bundle size becomes a concern (NFR5: <200KB gzipped), Axios is the first candidate to swap for a thin fetch wrapper. TanStack Query works natively with either Axios or fetch.

### MSW Rationale

Mock Service Worker (MSW) is **P0 testing infrastructure**, not optional. Intercepts at the network level — tests don't know they're hitting mocks. Enables: (1) frontend unit/integration tests without a running backend, (2) frontend-first development before backend endpoints exist, (3) HTTP-library-agnostic tests (if Axios is swapped for fetch, tests don't change).

**Note:** Project initialization using these commands should be the first implementation story.

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**
- FluentValidation for input validation + HtmlSanitizer for XSS defense-in-depth
- Unicode control character rejection on all text fields
- RFC 7807 ProblemDetails with structured error code URIs
- React Hook Form + Zod for frontend form handling
- Validation field name convention (Zod = DTO = FluentValidation keys)
- Serilog structured logging
- CORS restrictive policy (same-origin only)
- ASP.NET Core Rate Limiting on auth endpoints

**Important Decisions (Shape Architecture):**
- Cursor-based pagination with opaque keyset tokens
- date-fns for date operations
- Health check endpoints
- Environment configuration via appsettings.json + env vars

**Deferred Decisions (Post-MVP):**
- API versioning — unnecessary while single SPA is the only client
- Rich text support — all fields are plain text for MVP; HtmlSanitizer is already in place if needed later

### Data Architecture

**Validation Strategy: FluentValidation 12.x**
- Apache 2.0 license (confirmed — unaffected by the Fluent Assertions licensing change)
- Packages: `FluentValidation` + `FluentValidation.DependencyInjectionExtensions` (the old `.AspNetCore` package is deprecated since v11)
- One validator class per request DTO. Registered via `AddValidatorsFromAssemblyContaining<>()` in DI
- Integrated with ASP.NET Core pipeline via filter or middleware — validation errors returned as ProblemDetails automatically
- Reusable rules: `.MustNotContainControlCharacters()` rejects Unicode control characters (U+0000–U+001F, U+007F, U+200B–U+200F, U+202A–U+202E, U+2066–U+2069) from all text fields — critical for i18n applications to prevent RTL override and zero-width character attacks

**Input Sanitization: HtmlSanitizer 9.x (Ganss.XSS.HtmlSanitizer)**
- Defense-in-depth: strips dangerous HTML tags/attributes before persistence
- Implemented as explicit `ISanitizationService` injected into service layer — transparent, no interceptor magic
- Called before `SaveChangesAsync()` on all user-provided text fields
- Configured with empty allowlist (strip ALL HTML) for plain text fields. If rich text is added later, configure allowed tags per field
- Does not replace FluentValidation — FluentValidation checks structure (length, required, format), HtmlSanitizer cleans content

**Input Sanitization Pipeline (execution order):**
1. **FluentValidation** — structural validation (length, format, required, business rules, Unicode control char rejection)
2. **HtmlSanitizer** — content sanitization (strip HTML/scripts before DB write). Runs after validation passes — don't sanitize invalid input
3. **EF Core** — parameterized queries (SQL injection prevention)
4. **React JSX** — auto-escaping on render (XSS prevention on display)

Four independent layers. No single point of failure for injection attacks.

**Migration Strategy: EF Core Migrations (Code-First)**
- Bundled with EF Core 10.x — no additional package
- `dotnet ef migrations add` for schema changes, `dotnet ef database update` for apply
- Migration files committed to source control for reproducible deployments
- Production applies via `Database.Migrate()` on startup or CI/CD script

**Caching: No Server-Side Caching**
- TanStack Query handles client-side caching with configurable `staleTime` and `gcTime`
- SignalR push events trigger `queryClient.invalidateQueries()` for real-time freshness
- At <200 users with PostgreSQL, database round-trips are sub-millisecond on local network
- Revisit only if NFR performance targets are missed (API <500ms)

### Authentication & Security

**Rate Limiting: ASP.NET Core Rate Limiting Middleware (built-in)**
- Fixed window policy on authentication endpoints: `/auth/login`, `/auth/register`, `/auth/refresh` — 5 attempts per minute per IP
- No third-party package (built into ASP.NET Core since .NET 7)
- Returns `429 Too Many Requests` with `Retry-After` header
- Public read endpoints: no rate limiting for MVP (low traffic, internal use)

**CORS Policy: Restrictive Same-Origin**
- Even though SPA is same-origin deployed, explicitly configure CORS to reject all cross-origin requests
- `AllowedOrigins`: production domain only (no wildcards)
- `AllowCredentials: true` (for cookie-based JWT)
- Defense-in-depth: if deployment model ever changes, CORS is already locked down

### API & Communication Patterns

**Error Response Format: RFC 7807 ProblemDetails with Structured Error Codes**
- ASP.NET Core built-in support via `app.UseExceptionHandler()` and `services.AddProblemDetails()`
- FluentValidation errors mapped to ProblemDetails `errors` dictionary automatically
- Consistent shape for all error responses: `{ type, title, status, detail, errors? }`
- **Structured `type` URIs**: `urn:sdac:validation-error`, `urn:sdac:authorization-denied`, `urn:sdac:not-found`, `urn:sdac:conflict`, `urn:sdac:rate-limited`. Frontend i18n maps these URIs to localized user-facing messages — no parsing of English error strings
- Frontend parses a single error format regardless of error source (validation, auth, server)

**Validation Field Name Convention (Architectural Constraint):**
- Zod schema field names === API request DTO property names (camelCase) === FluentValidation error keys
- One naming convention across three layers. If they drift, contract tests fail.
- This enables frontend form fields to display inline validation errors from both Zod (client-side) and FluentValidation (server-side) using the same field name mapping

**API Versioning: None for MVP**
- Single client (same-origin SPA), deployed atomically with backend
- No external API consumers
- If multi-client or public API is needed later, introduce URL-prefix versioning at that point

**Pagination: Cursor-Based with Opaque Keyset Tokens**
- Format: `?cursor={opaqueToken}&limit=20` with response including `nextCursor` (null when no more pages)
- Cursor is an opaque keyset token encoding `(sortColumn, id)` — backend validates rather than trusts the cursor blindly
- Stable under concurrent inserts (no skipped/duplicate items — important for activity lists that update in real-time)
- EF Core implementation: `WHERE (SortColumn, Id) > (@cursorSort, @cursorId) ORDER BY SortColumn, Id LIMIT @limit + 1` (extra +1 to detect if next page exists)
- **No "jump to page N"** — cursor pagination supports forward/backward traversal only. Frontend uses infinite scroll or "load more" pattern, not page number buttons
- Frontend: TanStack Query's `useInfiniteQuery` maps directly to cursor-based pagination

### Frontend Architecture

**Form Handling: React Hook Form 7.x + Zod 4.x**
- Packages: `react-hook-form` ^7.71, `zod` ^4.3, `@hookform/resolvers` ^5.2
- Zod schemas define validation rules + TypeScript types in one place via `z.infer<typeof schema>` (single source of truth)
- `zodResolver` bridges Zod schemas to React Hook Form
- shadcn/ui `<FormField>` component wraps RHF's `Controller` — zero integration friction
- Complex forms (activity creation with dynamic role rows): `useFieldArray` for add/remove role assignments
- Validation errors displayed inline via shadcn/ui form field error slots
- **Dual validation convention:** Zod validates on frontend for UX speed. FluentValidation validates on backend for security. Structural rules (required, maxLength, format) should match between both. Backend adds DB-level checks that Zod can't do.
- Zod schemas live in `src/sdamanagement-web/src/schemas/` alongside features

**Date/Time: date-fns 4.x**
- Tree-shakeable — only imported functions hit the bundle
- French locale support via `import { fr } from 'date-fns/locale'`
- Covers: date formatting for calendar display, date math for schedule ranges, relative time for "last modified" labels
- Integrates with @schedule-x/react calendar component (both use native Date objects — no adapter needed)
- No timezone library needed — all dates are local (single congregation, single timezone)

### Infrastructure & Deployment

**Logging: Serilog 10.x**
- Package: `Serilog.AspNetCore` 10.0
- Structured logging with JSON output for production, colored console for development
- `app.UseSerilogRequestLogging()` — single structured log line per request (method, path, status, duration). Place after `UseRouting`, before `UseEndpoints`.
- Sinks: Console (dev), File with rolling (prod). Seq or Application Insights added if needed later
- Enrichers: RequestId, CorrelationId, UserName — useful for tracing auth issues

**Health Checks: ASP.NET Core Health Checks (built-in)**
- `/health` endpoint checking PostgreSQL connectivity via `AddNpgsql()` health check
- Package: `AspNetCore.HealthChecks.NpgSql`
- Returns `Healthy`/`Unhealthy` — used by Docker health probe or Azure App Service
- No additional health check packages for MVP

**Environment Configuration: Standard .NET Pattern**
- `appsettings.json` — defaults and non-sensitive settings
- `appsettings.Development.json` — local dev overrides (DB connection string to Docker Compose)
- `appsettings.Production.json` — production structure (values overridden by env vars)
- Environment variables for secrets: `ConnectionStrings__DefaultConnection`, `Google__ClientId`, `Google__ClientSecret`, `Jwt__Secret`
- No `secrets.json` for simplicity — env vars or `.env` file with Docker Compose

### Decision Impact Analysis

**Implementation Sequence:**
1. FluentValidation + HtmlSanitizer + Unicode rule setup (validation pipeline before any endpoint)
2. ProblemDetails error handling with structured `urn:sdac:*` error codes (global error format before any controller)
3. Serilog + Health Checks (observability from first request)
4. CORS + Rate Limiting (security middleware in pipeline)
5. React Hook Form + Zod + field name convention (before first form component)
6. date-fns + i18n French locale (before first date display)
7. Cursor-based pagination (when first list endpoint is built)

**Cross-Component Dependencies:**
- FluentValidation → ProblemDetails: validation errors auto-mapped to standard error format with `urn:sdac:validation-error` type
- HtmlSanitizer → FluentValidation: sanitization runs after validation passes (don't sanitize invalid input)
- Zod field names → DTO property names → FluentValidation error keys: must match (camelCase). Contract tested.
- Structured error URIs → Frontend i18n: `urn:sdac:*` codes mapped to localized messages in translation files
- date-fns → i18n: French locale formatting for all date displays
- Cursor pagination → TanStack Query `useInfiniteQuery`: natural pairing for infinite scroll / "load more"
- Health Checks → Docker/Azure: deployment readiness probes depend on health endpoint

### New Packages Summary

**Backend (add to NuGet):**

| Package | Version | Purpose |
|---|---|---|
| `FluentValidation` | 12.x | Input validation |
| `FluentValidation.DependencyInjectionExtensions` | 12.x | DI registration for validators |
| `HtmlSanitizer` | 9.x | XSS defense — strip HTML before persistence |
| `Serilog.AspNetCore` | 10.0 | Structured logging |
| `AspNetCore.HealthChecks.NpgSql` | latest | PostgreSQL health probe |

**Backend Test Packages (add to NuGet):**

| Package | Purpose |
|---|---|
| `FluentValidation.TestHelper` | `.TestValidate()` for unit testing validators without HTTP context |

**Frontend (add to npm):**

| Package | Version | Purpose |
|---|---|---|
| `react-hook-form` | ^7.71 | Form state management |
| `zod` | ^4.3 | Schema validation + TypeScript types |
| `@hookform/resolvers` | ^5.2 | Zod-to-RHF bridge |
| `date-fns` | ^4.1 | Date formatting/math (tree-shakeable) |

## Implementation Patterns & Consistency Rules

### Pattern Categories Defined

**Critical Conflict Points Identified:** 5 categories, 30+ areas where AI agents could make different choices. All resolved below.

### Naming Patterns

**Database Naming Conventions (snake_case):**
- Tables: `users`, `activities`, `activity_roles`, `role_assignments`, `departments`
- Columns: `user_id`, `created_at`, `department_id`, `is_guest`
- Foreign keys: `{referenced_table}_id` — e.g., `activity_id`, `user_id`
- Indexes: `ix_{table}_{columns}` — e.g., `ix_users_email`, `ix_role_assignments_activity_role_id_user_id`
- Enforced via `Npgsql.EntityFrameworkCore.PostgreSQL`'s `UseSnakeCaseNamingConvention()`. EF entity classes remain PascalCase C# (`User`, `ActivityRole`). No manual `[Column]` or `[Table]` attributes needed — convention handles the mapping automatically.

**API Naming Conventions:**
- Endpoints: plural nouns, lowercase, kebab-case for multi-word — `/api/activities`, `/api/departments`, `/api/role-assignments`
- No verbs in URLs — HTTP method conveys the action
- Route parameters: `{id}` for primary resource, `{activityId}` for nested — e.g., `/api/activities/{activityId}/roles`
- Query parameters: camelCase — `?cursor=abc&limit=20&departmentId=5`
- JSON response fields: camelCase — enforced by `System.Text.Json` with `JsonNamingPolicy.CamelCase`

**DTO Naming Conventions:**
- Request DTOs: `Create{Entity}Request`, `Update{Entity}Request` — e.g., `CreateActivityRequest`, `UpdateActivityRequest`
- Response DTOs (detail): `{Entity}Response` — e.g., `ActivityResponse`, `DepartmentResponse`
- Response DTOs (list): `{Entity}ListItem` — e.g., `ActivityListItem`, `DepartmentListItem`
- Public DTOs: `Public{Entity}Response`, `Public{Entity}ListItem` — in `Dtos/Public/` namespace
- One DTO per file (backend): `ActivityResponse.cs`, `ActivityListItem.cs`, `CreateActivityRequest.cs`
- Naming chain: `CreateActivityRequest` → `CreateActivityRequestValidator` (FluentValidation) → `createActivitySchema` (Zod) → `CreateActivityRequest` type (TypeScript via `z.infer`)

**Code Naming Conventions:**

Backend (C#):
- Classes/methods: PascalCase — `ActivityService`, `GetActivitiesAsync()`
- Local variables/parameters: camelCase — `activityId`, `currentUser`
- Interfaces: `I` prefix — `IAuthorizationService`, `ISanitizationService`
- Async methods: `Async` suffix — `CreateActivityAsync()`, `GetDepartmentsAsync()`
- Constants: PascalCase — `MaxPageSize`, `DefaultCursorLimit`

Frontend (TypeScript/React):
- React components: PascalCase file and export — `ActivityCard.tsx`, `DepartmentList.tsx`
- Non-component files: camelCase — `useActivities.ts`, `activityService.ts`, `activitySchema.ts`
- Functions/variables: camelCase — `getActivities()`, `departmentId`
- Types/interfaces: PascalCase — `ActivityResponse`, `DepartmentListItem`
- Zod schemas: camelCase field names matching DTO properties — `activityName`, `departmentId`, `roleAssignments`
- One schema file per domain: `activitySchema.ts` contains `createActivitySchema`, `updateActivitySchema`, and their inferred types

### Structure Patterns

**Backend Project Organization:**
- Controllers: `src/SdaManagement.Api/Controllers/{Aggregate}Controller.cs`
- Services: `src/SdaManagement.Api/Services/I{Domain}Service.cs` + `{Domain}Service.cs`
- DTOs (authenticated): `src/SdaManagement.Api/Dtos/{Domain}/{DtoName}.cs` — one DTO per file
- DTOs (public): `src/SdaManagement.Api/Dtos/Public/{DtoName}.cs` — one DTO per file
- Validators: `src/SdaManagement.Api/Validators/{DtoName}Validator.cs`
- Entities: `src/SdaManagement.Api/Data/Entities/{Entity}.cs`
- DbContext: `src/SdaManagement.Api/Data/AppDbContext.cs`
- Migrations: `src/SdaManagement.Api/Data/Migrations/`
- Auth: `src/SdaManagement.Api/Auth/` — `IAuthorizationService`, `ICurrentUserContext`, `AuthorizationService`, etc.
- Sanitization: `src/SdaManagement.Api/Services/ISanitizationService.cs` + `SanitizationService.cs`
- Hubs: `src/SdaManagement.Api/Hubs/NotificationHub.cs`
- DI Registration: `src/SdaManagement.Api/Extensions/ServiceCollectionExtensions.cs` — single `AddApplicationServices()` extension method. `Program.cs` calls this one method. All service, validator, sanitizer, and auth registrations go here.

**Frontend Project Organization:**
- Pages: `src/sdamanagement-web/src/pages/{PageName}.tsx`
- Domain components: `src/sdamanagement-web/src/components/{domain}/{ComponentName}.tsx`
- UI primitives: `src/sdamanagement-web/src/components/ui/` (shadcn/ui managed — do not manually edit)
- Hooks: `src/sdamanagement-web/src/hooks/use{Name}.ts`
- Services (API calls): `src/sdamanagement-web/src/services/{domain}Service.ts`
- Schemas (Zod): `src/sdamanagement-web/src/schemas/{domain}Schema.ts` — one file per domain, multiple schemas per file
- Stores (Zustand): `src/sdamanagement-web/src/stores/{name}Store.ts`
- i18n translations: `src/sdamanagement-web/public/locales/{lang}/{namespace}.json`
- Types: `src/sdamanagement-web/src/types/{domain}.ts`

**Test Organization:**
- Backend unit tests: `tests/SdaManagement.Api.UnitTests/` — mirrors `src/` folder structure
- Backend integration tests: `tests/SdaManagement.Api.IntegrationTests/` — organized by controller/feature
- Integration test base: `tests/SdaManagement.Api.IntegrationTests/IntegrationTestBase.cs` — Sprint 0 infrastructure (see Process Patterns)
- Frontend unit/integration tests: co-located `{ComponentName}.test.tsx` next to component file
- Frontend E2E tests: `src/sdamanagement-web/e2e/{feature}.spec.ts`
- MSW handlers: `src/sdamanagement-web/src/mocks/handlers/{domain}.ts`

### Format Patterns

**API Response Formats:**
- Success (single): return data directly, no wrapper — `GET /api/activities/{id}` → `{ "id": 1, "name": "..." }`
- Success (list): paginated wrapper — `{ "items": [...], "nextCursor": "abc" | null }`
- Created: `201` with `Location` header pointing to new resource
- Deleted: `204` No Content
- Error: RFC 7807 ProblemDetails with `urn:sdac:*` type URIs (defined in Step 4)

**Data Exchange Formats:**
- Dates in JSON: ISO 8601 strings — `"2026-03-15T10:00:00"`. Local time, no timezone offset (single congregation, single timezone)
- Null fields: omitted from response — `System.Text.Json` configured with `DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull`
- Booleans: `true`/`false` (never `1`/`0`)
- Empty collections: `[]` (never `null`)
- IDs: integer (`int`) — auto-incremented by PostgreSQL. No GUIDs for MVP.

**HTTP Status Code Usage:**

| Code | Meaning | When Used |
|---|---|---|
| `200` | OK | Successful GET, PUT, PATCH |
| `201` | Created | Successful POST (with `Location` header) |
| `204` | No Content | Successful DELETE |
| `400` | Bad Request | FluentValidation failure, malformed input |
| `401` | Unauthenticated | Missing or expired JWT |
| `403` | Forbidden | Valid JWT but insufficient permissions |
| `404` | Not Found | Resource doesn't exist |
| `409` | Conflict | Optimistic concurrency violation (stale `xmin`) |
| `429` | Too Many Requests | Rate limit exceeded (with `Retry-After`) |
| `500` | Internal Server Error | Unhandled exception |

### Communication Patterns

**SignalR Event Conventions:**
- Event names: PascalCase verb-noun — `ActivityCreated`, `ActivityUpdated`, `ActivityDeleted`, `DepartmentUpdated`
- Payload: the affected entity's read DTO (same shape as GET response). Public group receives public DTO variant.
- Client subscription: `hubConnection.on("ActivityUpdated", (dto: ActivityResponse) => {...})`
- No client-to-server messages via SignalR — all mutations go through REST API

**TanStack Query Key Conventions:**
- Array format, hierarchical: `['activities']`, `['activities', activityId]`, `['activities', { departmentId }]`
- Consistent prefix per domain: `['departments']`, `['users']`, `['activities']`
- SignalR invalidation mapping: `ActivityUpdated` → `queryClient.invalidateQueries({ queryKey: ['activities'] })`
- Detail queries: `['activities', id]` — invalidated by both list and detail SignalR events

**Zustand Store Conventions:**
- One store per UI concern: `useUiStore` (sidebar state, modal state, language preference)
- No server data in Zustand — server state is TanStack Query's exclusive responsibility
- Store actions are verbs: `toggleSidebar()`, `openModal()`, `setLanguage()`

### Process Patterns

**Controller Method Template (Mandatory):**

Every controller action follows this exact pattern — auth check (return-based) → service call → return:

```csharp
[HttpGet("{id}")]
public async Task<IActionResult> GetActivity(int id)
{
    if (!await _auth.CanViewActivity(User, id))
        return Forbid();

    var result = await _activityService.GetActivityAsync(id);
    if (result is null)
        return NotFound();

    return Ok(result);
}
```

- Authorization uses return-based pattern (`return Forbid()`), not throw-based — matches P0 decision that authorization methods return false, never throw
- Controllers are thin: auth check, service call, return. No business logic in controllers.
- Deviation from this template is a code review flag.

**Service Method Conventions:**
- Services return **DTOs** (already projected from entities). Controllers never project.
- Create methods return the full response DTO (or created entity's ID).
- Delete methods return `Task` (void).
- Update methods return the updated response DTO.
- Services handle: entity loading, authorization delegation, sanitization, business logic, projection to DTO, `SaveChangesAsync()`.

**DI Registration Convention:**
- `Program.cs` calls `builder.Services.AddApplicationServices()` — one extension method
- Located in `src/SdaManagement.Api/Extensions/ServiceCollectionExtensions.cs`
- All service, validator, sanitizer, and auth service registrations go here
- Keeps `Program.cs` clean. Agents register new services in one predictable location.

**Middleware Pipeline Order (Program.cs):**
```
1. app.UseSerilogRequestLogging()
2. app.UseExceptionHandler() — ProblemDetails global error handler
3. app.UseCors()
4. app.UseRateLimiter()
5. app.UseAuthentication()
6. app.UseAuthorization()
7. app.MapControllers()
8. app.MapHub<NotificationHub>("/hubs/notifications")
9. app.MapHealthChecks("/health")
```
Order matters: Serilog logs all requests (including errors). Exception handler wraps everything. CORS and rate limiting run before auth. Auth runs before controllers. This order is mandatory.

**SignalR Hub Convention:**
- Hub class: `NotificationHub` in `src/SdaManagement.Api/Hubs/NotificationHub.cs`
- Endpoint: `/hubs/notifications`
- Client connects: `new HubConnectionBuilder().withUrl("/hubs/notifications").build()`
- Push-only: hub has no client-callable methods. Services inject `IHubContext<NotificationHub>` to broadcast.

**`ICurrentUserContext` Interface:**
- Exposes: `UserId` (int), `Role` (enum: Anonymous/Viewer/Admin/Owner), `DepartmentIds` (List<int>, resolved from DB per-request)
- Registered as **scoped** in DI — one instance per HTTP request
- Populated by middleware from JWT claims (UserId, Role) + DB lookup (DepartmentIds)
- Injected into services and `IAuthorizationService` — controllers don't access it directly
- Located in `src/SdaManagement.Api/Auth/ICurrentUserContext.cs` + `CurrentUserContext.cs`

**OWNER Seed Account:**
- EF Core seed migration creates the initial OWNER user record
- Email set via environment variable: `OWNER_EMAIL` (e.g., `OWNER_EMAIL=elisha@example.com`)
- On first Google OAuth login matching that email, the account is activated with OWNER role
- For email/password fallback: seed sets a temporary password, user changes on first login (FR14)

**Error Handling:**

Backend:
- Controllers never catch exceptions for business logic
- Services throw typed exceptions for unexpected states: `NotFoundException`, `ConflictException`
- Authorization failures are return-based (not exceptions) — handled in controller
- Global exception handler middleware maps exception types to ProblemDetails with `urn:sdac:*` type URIs
- Validation errors handled by FluentValidation pipeline filter — never reach controller

Frontend:
- TanStack Query `onError` per-mutation for toast notifications via `sonner`
- Global React error boundary for unexpected crashes — shows friendly error page
- Form validation errors displayed inline via shadcn/ui `<FormMessage>` components
- Network errors (no connectivity): TanStack Query's `networkMode: 'online'` pauses queries automatically

**Loading State Conventions:**
- Use TanStack Query's built-in states: `isLoading` (first load), `isFetching` (background refetch), `isError`
- `isLoading` → skeleton component (matching UX spec patterns)
- `isFetching` → subtle refresh indicator (not full skeleton)
- No custom loading state variables — TanStack Query is the single source of truth for async state
- Empty states: explicit empty state components with i18n messages, not just blank space

**Auth Flow Pattern:**
- Login: user clicks "Sign In" → chooses Google OAuth or email/password → backend validates → sets httpOnly JWT cookies → redirects to authenticated dashboard
- Every API call: Axios interceptor detects 401 → attempts `POST /api/auth/refresh` → retries original request → if refresh fails, clears state and redirects to public view
- Logout: `POST /api/auth/logout` (clears cookies server-side) → disconnect SignalR hub → `queryClient.clear()` → redirect to public home
- Route guards: `ProtectedRoute` component checks auth context, redirects to login if unauthenticated. `AdminRoute` additionally checks role.

**Integration Test Base Class (Sprint 0 Infrastructure):**

`IntegrationTestBase` provides:
- `WebApplicationFactory<Program>` with Testcontainers PostgreSQL
- Pre-configured `HttpClient` per role: `AnonymousClient`, `ViewerClient`, `AdminClient`, `OwnerClient`
- Database reset between tests: truncate all tables, reseed test data
- Helper methods: `CreateTestActivity()`, `CreateTestUser()`, `AuthenticateAs(role)`
- No feature stories start until this base class exists

**Test Naming Conventions:**

Backend: `{MethodName}_{Scenario}_{ExpectedResult}`
- `GetActivities_AsViewer_ReturnsOnlyAssignedDepartments`
- `CreateActivity_WithInvalidData_Returns400WithValidationErrors`
- `DeleteActivity_AsAdminWrongDepartment_Returns403`

Frontend: describe block = component name, it block = user action + expected result
- `describe('ActivityCard')` → `it('displays activity name in French locale')`
- `describe('LoginForm')` → `it('shows validation error for empty email')`

### Enforcement Guidelines

**All AI Agents MUST:**
1. Follow naming conventions exactly — snake_case DB, camelCase JSON/TS, PascalCase C# classes. No exceptions.
2. Place files in the documented directory structure. If a new category emerges, follow the established `{domain}` pattern.
3. Use TanStack Query for all server state. Never store API response data in Zustand or React state.
4. Pass all user-facing strings through i18n — no hardcoded French or English strings in components.
5. Create both a FluentValidation validator (backend) AND a Zod schema (frontend) for every form endpoint. Field names must match (camelCase).
6. Return ProblemDetails for all errors. Never return custom error shapes.
7. Write tests: unit test for every validator, integration test for every endpoint (including 403 wrong-role assertions), co-located component test for every interactive component.
8. Follow the controller method template: auth check (return-based) → service call → return. No business logic in controllers.
9. Use DTO naming convention: `Create{Entity}Request`, `{Entity}Response`, `{Entity}ListItem`, `Public{Entity}Response`.
10. Register all new services in `ServiceCollectionExtensions.AddApplicationServices()`.

**Anti-Patterns (Explicitly Forbidden):**
- Returning EF Core entities from API endpoints
- Storing server data in Zustand or component state instead of TanStack Query
- Using `[JsonIgnore]` as a security mechanism instead of dedicated DTOs
- Hardcoded strings in components instead of i18n keys
- Raw `fetch()` calls instead of the configured Axios instance
- Manual loading state booleans (`const [loading, setLoading] = useState(false)`)
- `any` type in TypeScript — use proper types derived from Zod schemas or API response types
- PascalCase or camelCase in database table/column names
- Catching and swallowing exceptions in controllers
- Throw-based authorization in controllers (use return-based pattern)
- Business logic in controllers (belongs in services)
- Registering services directly in `Program.cs` instead of the extension method

## Project Structure & Boundaries

### Requirements to Structure Mapping

| PRD Category | Controller | Service | Entities | Pages/Components |
|---|---|---|---|---|
| **Authentication & Authorization** (FR1-FR8) | `AuthController` | `AuthService`, `AuthorizationService` | `User`, `UserDepartment`, `RefreshToken` | `pages/Login.tsx`, `components/auth/` |
| **Activity Scheduling** (FR9-FR18) | `ActivitiesController` | `ActivityService` | `Activity`, `ActivityRole`, `RoleAssignment`, `ActivityTemplate` | `pages/Activities.tsx`, `components/activity/` |
| **Department Management** (FR19-FR26) | `DepartmentsController` | `DepartmentService` | `Department`, `SubMinistry` | `pages/Departments.tsx`, `components/department/` |
| **Public Access** (FR27-FR33) | `PublicController` | `PublicService` | (reads existing entities) | `pages/Home.tsx`, `pages/Schedule.tsx`, `components/public/` |
| **Guest Speaker Handling** (FR34-FR37) | `UsersController` (subset) | `UserService` | `User` (with `isGuest` flag) | `components/activity/GuestPicker.tsx` |
| **User Administration** (FR38-FR43) | `UsersController` | `UserService` | `User`, `UserDepartment` | `pages/admin/Users.tsx`, `components/user/` |
| **Calendar Integration** (FR44-FR47) | `CalendarController` | `CalendarService` | (reads Activity entities) | `pages/Calendar.tsx`, `components/calendar/` |
| **Church Configuration** (FR48-FR51) | `ConfigController` | `ConfigService` | `ChurchConfig` | `pages/admin/Settings.tsx` |
| **Avatar Display** (FR52-FR54) | `AvatarsController` | `AvatarService` | `User` (avatar fields) | `components/ui/Avatar.tsx` |
| **Internationalization** (FR55-FR56) | (middleware) | (middleware) | — | i18n framework, `LanguageToggle.tsx` |
| **Department Scoping** (FR57-FR65) | (cross-cutting) | `AuthorizationService` | `UserDepartment` | (cross-cutting route guards) |

### Architectural Boundaries

**API Boundaries (8-10 controllers):**
- `AuthController` — login, logout, refresh, Google OAuth callback. **Public endpoints** (no auth required for login).
- `PublicController` — public dashboard, public schedule, public department overview. **Anonymous access only.**
- `ActivitiesController` — CRUD activities with roles/assignments. **VIEWER+ for read, ADMIN+ for write (department-scoped).**
- `DepartmentsController` — department management, sub-ministries. **ADMIN+ (department-scoped).**
- `UsersController` — user CRUD, guest speaker management, avatar upload. **ADMIN+ for management, VIEWER for search.**
- `CalendarController` — calendar event aggregation. **Public read, VIEWER+ for detail.**
- `ConfigController` — church-wide settings. **OWNER only.**
- `AvatarsController` — avatar image serving. **Public read** (images served via URL, no auth needed for cached images).

**Data Boundaries:**
- **Aggregate roots** (own their children, transactional boundary): `Activity` (owns `ActivityRole` → `RoleAssignment`), `Department` (owns `SubMinistry`), `User` (owns `UserDepartment`, `RefreshToken`)
- **Read-only projections**: `PublicController` and `CalendarController` read across aggregates but never write
- **No cross-aggregate writes**: an activity endpoint never modifies a department. A user endpoint never modifies an activity.

**Frontend Boundaries:**
- **Public route tree**: `/`, `/schedule`, `/calendar`, `/departments` — loads `PublicLayout`, no auth check, lighter bundle
- **Authenticated route tree**: `/dashboard`, `/activities/*`, `/admin/*` — loads `AuthLayout`, `ProtectedRoute` wrapper, full feature set
- **Component ownership**: domain components (`components/activity/`) are owned by their domain page. Shared UI lives in `components/ui/`.
- **State boundaries**: each page owns its TanStack Query hooks. Cross-page state (auth, UI) lives in Context/Zustand.

### Integration Points

**Internal Communication:**
- Frontend → Backend: Axios HTTP calls through `services/{domain}Service.ts` → TanStack Query hooks
- Backend → Frontend: SignalR push notifications through scoped groups
- Auth flow: Google OAuth redirect → backend callback → JWT cookie → frontend auth context update

**External Integrations:**
- **Google OAuth 2.0**: `AuthController` handles OAuth callback, exchanges code for user info
- **YouTube embed**: public page embeds live stream iframe (no API integration — just URL config in `ChurchConfig`)

**Data Flow (Activity Creation — representative example):**
1. Admin fills form → Zod validates → React Hook Form submits
2. Axios POST `/api/activities` with `CreateActivityRequest` body (cookie sent automatically)
3. FluentValidation validates → HtmlSanitizer cleans → `IAuthorizationService.CanManageActivities()` checks department scope
4. `ActivityService.CreateActivityAsync()` → EF Core transaction (Activity + ActivityRoles + RoleAssignments) → `SaveChangesAsync()`
5. Service broadcasts `ActivityCreated` via SignalR to relevant groups
6. Other connected clients receive push → `queryClient.invalidateQueries(['activities'])` → UI refreshes

## Architecture Validation Results

### Coherence Validation ✅

**Decision Compatibility:** All technology choices verified compatible — .NET 10 LTS with FluentValidation 12.x, HtmlSanitizer 9.x, Serilog 10.x, EFCore.NamingConventions. Frontend stack (React 18 + TanStack Query 5.x + Zustand 5.x + react-hook-form 7.x + Zod 4.x) fully compatible. No version conflicts detected.

**Pattern Consistency:** Naming conventions are coherent across all layers — snake_case DB (EFCore.NamingConventions), camelCase JSON (System.Text.Json), PascalCase C# classes. DTO naming chain unbroken: `CreateActivityRequest` → `CreateActivityRequestValidator` → `createActivitySchema` → `CreateActivityRequest` TypeScript type. Controller template, service conventions, and error handling patterns are internally consistent.

**Structure Alignment:** Project structure supports all decisions. Every FR category maps to a specific controller/service/page combination. Aggregate boundaries (Activity, Department, User) align with controller boundaries. Public/authenticated route tree split supports bundle optimization and data isolation.

### Requirements Coverage ✅

**Functional Requirements (65/65 covered):**
- FR1-FR7 (Public Access): PublicController + public route tree
- FR8-FR15 (Auth): AuthController + Google OAuth + JWT cookies + 4-tier RBAC
- FR16-FR18 (Personal Assignments): Authenticated dashboard + TanStack Query
- FR19-FR28 (Activity Scheduling): ActivitiesController + flexible activity model + templates + SignalR + concurrency tokens
- FR29-FR32 (Guest Speakers): isGuest flag + public DTO isolation + inline creation
- FR33-FR34 (Avatar): AvatarsController + secured storage outside wwwroot + controller-served
- FR35-FR40 (Calendar): CalendarController + @schedule-x/react + department filtering
- FR41-FR48 (Department Management): DepartmentsController + sub-ministries + department-scoped auth
- FR49-FR55 (User Administration): UsersController + bulk creation + role/department assignment
- FR56-FR60 (Church Config): ConfigController + OWNER-only + guided setup via empty states + OWNER seed account
- FR61-FR65 (Navigation/i18n/a11y): Dual navigation + react-i18next + shadcn/ui + mobile-first

**Non-Functional Requirements (23/23 addressed):**
- NFR1-NFR5 (Performance): Code splitting, Select projections, SignalR push, Vite optimization
- NFR6-NFR12 (Security): HTTPS, bcrypt, JWT rotation, public DTOs, department-scoped auth, env var secrets, 4-layer sanitization pipeline
- NFR13-NFR18 (Accessibility): shadcn/ui (Radix), axe-core, keyboard nav, contrast, font sizes
- NFR19-NFR22 (Reliability): Health checks, SignalR reconnect, ProblemDetails error format
- NFR23 (Media): Avatar size validation, secured storage, cache-busting via ETag
- NFR21 (Backups): Deferred to deployment story — PostgreSQL backup strategy (pg_dump cron or managed service) is ops, not architecture

### Implementation Readiness ✅

**Self-Consistency Validation:** Three independent traces (data flow, security boundary, package dependency) — zero contradictions found.

**Issues Found and Resolved:**
- Stale .NET 8 reference in Technical Constraints → fixed to .NET 10
- Missing `EFCore.NamingConventions` package → added to backend NuGet packages
- FluentAssertions licensing risk (v8+ commercial) → replaced with Shouldly (MIT)
- Missing middleware pipeline order → added 9-step mandatory sequence
- Missing SignalR hub convention → added NotificationHub at `/hubs/notifications`
- Missing `ICurrentUserContext` shape → added interface definition (UserId, Role, DepartmentIds)
- Missing OWNER seed mechanism → added seed migration with `OWNER_EMAIL` env var
- Missing Vite dev proxy config → added proxy for `/api` and `/hubs` (WebSocket)
- Avatar storage insecure in wwwroot → moved to `data/avatars/`, served via controller
- Occam's Razor: no unnecessary complexity found — every decision traces to a real requirement

### Architecture Completeness Checklist

**✅ Requirements Analysis**
- [x] Project context thoroughly analyzed (65 FRs, 23 NFRs, 6 journeys)
- [x] Scale and complexity assessed (Low-Medium, <200 users)
- [x] Technical constraints identified (solo dev, Azure free tier, no multi-tenancy)
- [x] Cross-cutting concerns mapped and ranked (Tier 1/Tier 2)

**✅ Architectural Decisions**
- [x] Critical decisions documented with versions (P0/P1/P2 priority tiers)
- [x] Technology stack fully specified (.NET 10 + React 18 + PostgreSQL 17)
- [x] Integration patterns defined (REST + SignalR push-only + same-origin)
- [x] Security decisions hardened (Red Team analysis, 4-layer sanitization)
- [x] Data architecture decided (FluentValidation, EF Core Migrations, cursor pagination)
- [x] Frontend architecture decided (RHF + Zod, date-fns, TanStack Query + Zustand)
- [x] Infrastructure decided (Serilog, health checks, env config, CORS, rate limiting)

**✅ Implementation Patterns**
- [x] Naming conventions established (DB, API, DTO, code)
- [x] Structure patterns defined (backend, frontend, tests)
- [x] Communication patterns specified (SignalR events, query keys, Zustand stores)
- [x] Process patterns documented (controller template, service conventions, middleware order, auth flow, test base class)
- [x] Enforcement guidelines with anti-patterns list

**✅ Project Structure**
- [x] Requirements mapped to controllers/services/pages (11 FR categories → specific components)
- [x] Aggregate boundaries defined (Activity, Department, User)
- [x] API boundaries with auth levels per controller
- [x] Frontend route tree split (public vs authenticated)
- [x] Data flow documented (end-to-end Activity Creation example)

### Architecture Readiness Assessment

**Overall Status:** READY FOR IMPLEMENTATION

**Confidence Level:** High

**Key Strengths:**
- Comprehensive security analysis (Red Team, failure modes, resilience, 4-layer sanitization)
- Clear separation of concerns with mandatory patterns, anti-patterns, and code template
- Every decision traced to specific PRD requirements (65 FRs, 23 NFRs)
- Thorough package version verification against current releases
- P0/P1/P2 priority tiers give clear implementation ordering
- Self-consistency validated from 3 independent angles with zero contradictions

**Areas for Future Enhancement (Post-MVP):**
- API versioning (when external consumers exist)
- Server-side caching (if NFR performance targets missed)
- Rich text support (HtmlSanitizer already in place)
- SEO/SSR (Growth phase)
- Backup automation (deployment story)
- Application Insights monitoring (if issues arise)

### Implementation Handoff

**AI Agent Guidelines:**
- Follow all architectural decisions exactly as documented
- Use implementation patterns consistently across all components
- Respect project structure and boundaries
- Refer to this document for all architectural questions
- Key Principles (Section 1) are non-negotiable

**First Implementation Priority:**
1. Project scaffolding (dotnet new webapi + create vite) with all packages installed
2. IntegrationTestBase with Testcontainers
3. Auth pipeline (JWT cookies, Google OAuth, IAuthorizationService, ICurrentUserContext)
4. First entity + migration (Activity model) with snake_case naming verified
5. First endpoint with full pattern: controller template → service → FluentValidation → ProblemDetails
