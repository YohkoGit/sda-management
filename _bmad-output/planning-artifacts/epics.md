---
stepsCompleted: [step-01-validate-prerequisites, step-02-design-epics, step-03-create-stories, step-04-final-validation]
inputDocuments:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/architecture.md
  - _bmad-output/planning-artifacts/ux-design-specification.md
---

# sda-management - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for sda-management, decomposing the requirements from the PRD, UX Design, and Architecture into implementable stories.

## Requirements Inventory

### Functional Requirements

**1. Public Access & Information Display**
- FR1: Anonymous visitors can view the public dashboard showing the next scheduled church activity and its key details (predicateur, department, activity type)
- FR2: Anonymous visitors can view an embedded YouTube live stream link with current service status on the public dashboard
- FR3: Anonymous visitors can view upcoming church activities for the next 4 weeks
- FR4: Anonymous visitors can view recurring program times (Sabbath School, Divine Service, AY)
- FR5: Anonymous visitors can view a department overview showing all departments with their next scheduled activity
- FR6: Anonymous visitors can view the public calendar showing church-wide activities and special events
- FR7: Anonymous visitors can see church identity information (name, address, welcome message)

**2. Authentication & Session Management**
- FR8: Users can sign in using Google OAuth 2.0 with their existing Google account
- FR9: Users can sign in using email and password as a fallback authentication method
- FR10: The system matches login credentials to a pre-existing user record by email — unrecognized emails receive a "contact your admin" message
- FR11: The system enforces role-based access with four tiers: ANONYMOUS, VIEWER, ADMIN, OWNER
- FR12: The system prevents self-registration — only ADMINs and OWNERs can create user accounts
- FR13: Authenticated users can sign out and end their session
- FR14: Users with email/password accounts can set their password on first login
- FR15: Users can reset a forgotten password

**3. Personal Assignment Management**
- FR16: Authenticated users (VIEWER+) can view their personal upcoming assignments across all activities ("My Assignments")
- FR17: Authenticated users can view the full roster of any activity — all service roles and assigned people
- FR18: Authenticated users can view the authenticated dashboard with personal assignments, full activity details, and ministry overview

**4. Church Activity Scheduling**
- FR19: ADMINs can create church activities on any day of the week (not limited to Sabbath)
- FR20: ADMINs can create activities from pre-defined activity templates that auto-populate with default service roles and headcounts
- FR21: ADMINs can customize any activity's role roster — add roles, remove roles, change the number of people per role
- FR22: ADMINs can assign one or more specific users to each service role on an activity
- FR23: ADMINs can tag activities with special types (Sainte-Cene, Week of Prayer, Camp Meeting, Youth Day, Family Day, Women's Day, Evangelism)
- FR24: ADMINs can set activity visibility as public (visible to anonymous) or authenticated-only
- FR25: ADMINs can edit existing activities — reassign roles, change details, modify roster
- FR26: The system updates all connected clients in real-time when an activity is edited, scoped to relevant views
- FR27: When an admin saves an activity that was modified by another admin since it was loaded, the system displays a warning indicating the activity has changed, allowing the admin to reload current data or overwrite
- FR28: OWNERs can define and manage activity templates with default service roles and default headcounts per role

**5. Guest Speaker Handling**
- FR29: During role assignment, when no matching user is found, ADMINs are offered inline guest creation — name required, phone optional — without leaving the assignment flow
- FR30: Guest speakers are created as lightweight user records with a guest flag — no email required, no authentication credentials, identified by name only
- FR31: Guest users are excluded from frequently assigned suggestions, activity template defaults, and department membership
- FR32: Guest speakers display an "(Invite)" label in authenticated/operational views only; on public-facing views, guest speakers appear identical to regular members

**6. Avatar & Photo Display**
- FR33: The system displays user avatars alongside role assignments across dashboard, calendar, and roster views — uploaded photo when available, initials-based fallback otherwise
- FR34: ADMINs can upload a profile photo for any user (admin-only upload for MVP)

**7. Calendar**
- FR35: All users can view a calendar with Sunday as the first day and Saturday as the seventh day
- FR36: All users can switch between Day, Week, Month, and Year calendar views
- FR37: Anonymous users see only public activities on the calendar; authenticated users see all activities including authenticated-only events
- FR38: Authenticated users can filter the calendar by department
- FR39: Activities display with department color coding on the calendar
- FR40: ADMINs can create activities directly from the calendar view

**8. Department Management**
- FR41: All authenticated users can view the list of all departments with their sub-ministries
- FR42: All authenticated users can view a department's activity pipeline and upcoming schedule
- FR43: ADMINs assigned to multiple departments can view a unified schedule across all their assigned departments
- FR44: ADMINs can manage (create, edit, delete) activities and meetings for departments they are assigned to
- FR45: ADMINs can manage sub-ministries within their assigned departments (create, edit, assign leads)
- FR46: ADMINs can create meetings with either a Zoom link or a physical location (name and address)
- FR47: OWNERs can manage all departments regardless of assignment
- FR48: The system indicates which upcoming activities have unassigned service roles

**9. User & Role Administration**
- FR49: ADMINs can create new user accounts with name, email, role, and department assignments
- FR50: ADMINs can create multiple user accounts efficiently in a single workflow
- FR51: ADMINs can promote VIEWERs to ADMIN and assign them to specific departments
- FR52: ADMINs can reassign users to different departments (supporting nominating committee term transitions)
- FR53: OWNERs can create other OWNER accounts
- FR54: OWNERs can delete user accounts
- FR55: OWNERs can edit any user's role and department assignments

**10. Church Configuration & System Administration**
- FR56: OWNERs can configure church identity settings (church name, address, YouTube channel URL, phone number, welcome message, default locale)
- FR57: OWNERs can create and manage departments (name, abbreviation, color, description)
- FR58: OWNERs can configure recurring program schedules (program title, start/end times, day of week, host, associated department)
- FR59: OWNERs can view system health and infrastructure status
- FR60: The system guides first-time administrators through the initial setup sequence (church settings -> departments -> activity templates -> users -> first activity)

**11. Navigation, Internationalization & Accessibility**
- FR61: The system provides a simplified public navigation for anonymous users and a full operational navigation for authenticated users
- FR62: The system displays all UI elements in French as the primary language
- FR63: The system supports English as a secondary language
- FR64: All users (anonymous and authenticated) can switch between French and English interface language
- FR65: All system capabilities are accessible and usable on mobile devices

### NonFunctional Requirements

**Performance**
- NFR1: Initial page load (first contentful paint) completes within 2 seconds on a 4G/LTE connection
- NFR2: Subsequent SPA route transitions complete within 300 milliseconds
- NFR3: API responses for standard CRUD operations return within 500 milliseconds under normal load
- NFR4: Real-time updates via WebSocket arrive within 1 second of the triggering event
- NFR5: Application bundle uses code splitting so that the initial JavaScript payload does not exceed 200KB gzipped

**Security**
- NFR6: All client-server communication uses HTTPS with TLS 1.2 or higher
- NFR7: Passwords are hashed using bcrypt with a minimum cost factor of 12
- NFR8: Authentication tokens (JWT) expire after a configured maximum session duration and support refresh rotation
- NFR9: Anonymous users can only access data explicitly marked as public; no authenticated-only data leaks through API responses
- NFR10: ADMIN operations are restricted to the departments the user is assigned to; the system enforces department-scoped authorization at the API layer
- NFR11: OAuth client secrets and signing keys are stored in environment variables or a secrets manager, never in source code or client bundles
- NFR12: All user-submitted input is sanitized to prevent XSS, SQL injection, and other injection attacks

**Accessibility**
- NFR13: The application conforms to WCAG 2.1 Level AA success criteria
- NFR14: All interactive elements are keyboard-navigable with visible focus indicators
- NFR15: Text elements maintain a minimum contrast ratio of 4.5:1 against their background
- NFR16: No text element renders below 12px font size
- NFR17: Motion and animations respect the user's prefers-reduced-motion system setting
- NFR18: All non-decorative images and interactive controls have accessible labels compatible with screen readers

**Reliability**
- NFR19: The system maintains 99.5% uptime measured monthly
- NFR20: If the WebSocket connection drops, the client automatically reconnects and falls back to polling until the connection is restored
- NFR21: Database backups run daily with a 7-day retention period and documented restore procedure
- NFR22: The application displays user-friendly error messages for all failure states and never exposes stack traces or internal error details to end users

**Media & Storage**
- NFR23: Profile images are stored as optimized files not exceeding 500KB per image, served with cache headers keyed to the user's last-modified timestamp for cache-busting on update

### Additional Requirements

**From Architecture — Infrastructure & Scaffolding:**
- Starter template: Official templates (dotnet new webapi + create vite + shadcn/ui CLI) — no community mega-starters
- .NET 10 LTS backend, React 18 + TypeScript + Vite frontend
- PostgreSQL 17 via Docker Compose for local dev
- Vite dev proxy for /api and /hubs (WebSocket) routes
- Project structure: src/SdaManagement.Api/ (backend), src/sdamanagement-web/ (frontend), tests/ (backend tests)
- DI registration via single ServiceCollectionExtensions.AddApplicationServices() method

**From Architecture — Security & Auth:**
- httpOnly Secure SameSite=Strict cookie JWT (not localStorage) — access token 15-30 min, refresh token 7 days with rotation
- Same-origin deployment — SPA static files served by ASP.NET backend (eliminates CORS/CSRF complexity)
- Centralized IAuthorizationService with per-request department resolution from DB (not JWT claims)
- ICurrentUserContext interface (UserId, Role, DepartmentIds) — scoped per HTTP request
- OWNER seed account via OWNER_EMAIL environment variable
- CORS restrictive same-origin policy
- Rate limiting on auth endpoints (5 attempts/min/IP)
- 4-layer input sanitization pipeline: FluentValidation -> HtmlSanitizer -> EF Core parameterized queries -> React JSX auto-escaping
- Unicode control character rejection on all text fields

**From Architecture — Data & API:**
- Flexible activity data model: normalized Activity -> ActivityRole -> RoleAssignment (templates are creation-time blueprints, no live binding)
- Activity + roles + assignments as single unit of work (atomic EF Core transaction)
- Concurrency tokens via PostgreSQL xmin for optimistic concurrency (FR27)
- EF Core Migrations (code-first), snake_case DB naming via UseSnakeCaseNamingConvention()
- Cursor-based pagination with opaque keyset tokens
- RFC 7807 ProblemDetails with structured urn:sdac:* error codes
- Public API contract: dedicated public DTO namespace, never return entities
- JSON: camelCase fields, ISO 8601 dates (local time, no timezone), nulls omitted, empty collections as []
- Avatar storage outside wwwroot (data/avatars/{userId}.webp), served via controller with ETag cache headers

**From Architecture — Frontend Patterns:**
- Frontend state stack: Auth Context (React Context) + server state (TanStack Query) + UI state (Zustand)
- React Hook Form + Zod for all forms — field names must match DTO property names and FluentValidation keys
- SignalR push-only (server->client) with 3 scoped group levels (public, per-department, per-activity)
- SignalR group cleanup on disconnect and logout
- Axios HTTP client with 401 -> refresh -> retry interceptor
- TanStack Query for all server state (no API data in Zustand or component state)
- Separate public/auth route trees with layout-level code splitting
- MSW mock layer for frontend development and testing (P0 infrastructure)
- i18n: French default (no browser detection), English via explicit toggle, translations in public/locales/{lang}/ as JSON

**From Architecture — Testing & Observability:**
- IntegrationTestBase with Testcontainers PostgreSQL — pre-configured clients per role (Anonymous, Viewer, Admin, Owner)
- xUnit + NSubstitute + Shouldly (backend), Vitest + Testing Library + Playwright + axe-core (frontend)
- Serilog structured logging with request enrichment
- Health check endpoint (/health) checking PostgreSQL connectivity
- Middleware pipeline order is mandatory (9-step sequence in architecture doc)

**From Architecture — Naming & Convention Enforcement:**
- Controller method template: auth check (return-based) -> service call -> return (no business logic in controllers)
- DTO naming chain: Create{Entity}Request -> {Entity}RequestValidator -> {domain}Schema (Zod) -> TypeScript type
- Backend: PascalCase classes, camelCase locals, IPrefix interfaces, Async suffix
- Frontend: PascalCase components, camelCase files/functions, one schema file per domain
- API: plural nouns, lowercase, kebab-case multi-word endpoints
- Test naming: {MethodName}_{Scenario}_{ExpectedResult} (backend), describe/it (frontend)

**From UX Design — Component & Interaction Patterns:**
- shadcn/ui + Radix UI primitives component system
- @schedule-x/react for calendar component
- cmdk Command palette as contact picker base
- Semantic CSS token system with register-aware theming (public warm vs operational military)
- Self-hosted Inter font (WOFF2, font-display: swap)
- Avatar sizes: 48px and 28px as optimized WebP at 2x
- Mobile-first with sm: (640px) and lg: (1024px) breakpoints only — md: intentionally unused
- Bottom sheets on mobile for complex forms, side panels on desktop
- Department-grouped contact picker (Gmail chip pattern) for role assignment
- Skeleton loading states (Notion pattern) for all API-dependent views
- Identity-first loading on public layer (church name/shell renders before API data)
- Toast notifications via sonner for admin action confirmation ("Publie" with view link)
- Dual vocabulary register: warm church language (public) / operational-military tone (authenticated)
- "Modifie" badge on public dashboard for activities changed within 24 hours of the event
- Smart empty states with guided setup sequence and encouraging copy
- Card hover effects (lift + shadow deepening) on desktop, disabled on touch
- Dark hero section (slate-900) for public dashboard
- Pulsing live indicator (rose/red) for YouTube stream status
- Template selection cards (Notion gallery pattern) for activity creation step 1
- Status indicators: green (staffed), amber/orange (gaps), red (critical gaps) — consistent across all views
- 44px minimum touch targets for mobile interactions
- Offline tolerance: "You're offline" non-intrusive banner when network unavailable

### FR Coverage Map

| FR | Epic | Description |
|---|---|---|
| FR1 | Epic 5 | Public dashboard — next activity |
| FR2 | Epic 5 | YouTube live embed |
| FR3 | Epic 5 | Upcoming activities (4 weeks) |
| FR4 | Epic 5 | Recurring program times |
| FR5 | Epic 5 | Department overview (public) |
| FR6 | Epic 5 | Public calendar |
| FR7 | Epic 2 | Church identity information |
| FR8 | Epic 1 | Google OAuth sign-in |
| FR9 | Epic 1 | Email/password sign-in |
| FR10 | Epic 1 | Email matching to pre-existing user |
| FR11 | Epic 1 | 4-tier RBAC enforcement |
| FR12 | Epic 1 | No self-registration |
| FR13 | Epic 1 | Sign out |
| FR14 | Epic 1 | First-login password set |
| FR15 | Epic 1 | Password reset |
| FR16 | Epic 6 | My Assignments view |
| FR17 | Epic 6 | Full activity roster view |
| FR18 | Epic 6 | Authenticated dashboard |
| FR19 | Epic 4 | Create activities any day |
| FR20 | Epic 4 | Create from templates |
| FR21 | Epic 4 | Customize role roster |
| FR22 | Epic 4 | Assign users to roles |
| FR23 | Epic 4 | Special activity tagging |
| FR24 | Epic 4 | Activity visibility control |
| FR25 | Epic 4 | Edit existing activities |
| FR26 | Epic 9 | Real-time updates via SignalR |
| FR27 | Epic 4 | Concurrent edit detection |
| FR28 | Epic 2 | Activity template management |
| FR29 | Epic 4 | Inline guest creation |
| FR30 | Epic 4 | Guest as lightweight record |
| FR31 | Epic 4 | Guest exclusion from suggestions |
| FR32 | Epic 4 | Guest public/auth display rules |
| FR33 | Epic 4 | Avatar display in rosters |
| FR34 | Epic 3 | Admin avatar upload |
| FR35 | Epic 7 | Sunday-first calendar |
| FR36 | Epic 7 | Day/Week/Month/Year views |
| FR37 | Epic 7 | Public vs authenticated visibility |
| FR38 | Epic 7 | Department filter on calendar |
| FR39 | Epic 7 | Department color coding |
| FR40 | Epic 7 | Admin create from calendar |
| FR41 | Epic 8 | Department list with sub-ministries |
| FR42 | Epic 8 | Department activity pipeline |
| FR43 | Epic 6 | Multi-department unified schedule |
| FR44 | Epic 8 | Manage dept activities/meetings |
| FR45 | Epic 8 | Manage sub-ministries |
| FR46 | Epic 8 | Create meetings (Zoom/physical) |
| FR47 | Epic 8 | OWNER manages all departments |
| FR48 | Epic 4 | Unassigned role indicators |
| FR49 | Epic 3 | Create user accounts |
| FR50 | Epic 3 | Bulk user creation |
| FR51 | Epic 3 | Promote VIEWER to ADMIN |
| FR52 | Epic 3 | Reassign departments (term transitions) |
| FR53 | Epic 3 | OWNER creates OWNER accounts |
| FR54 | Epic 3 | OWNER deletes users |
| FR55 | Epic 3 | OWNER edits any user |
| FR56 | Epic 2 | Church identity settings |
| FR57 | Epic 2 | Department CRUD |
| FR58 | Epic 2 | Program schedule configuration |
| FR59 | Epic 2 | System health view |
| FR60 | Epic 2 | Guided first-time setup |
| FR61 | Epic 1 | Dual navigation (public/auth) |
| FR62 | Epic 1 | French-primary UI |
| FR63 | Epic 1 | English secondary |
| FR64 | Epic 1 | Language toggle |
| FR65 | Epic 5 | Mobile usability |

## Epic List

### Epic 1: Project Foundation & Authentication
Users can sign in with Google OAuth or email/password, the system enforces 4-tier RBAC, and the authenticated shell (sidebar, route guards, session management) is operational. The OWNER seed account is active. Project scaffolding (backend + frontend + Docker Compose + IntegrationTestBase) is complete. i18n works from day one with French-primary and English-secondary.
**FRs covered:** FR8, FR9, FR10, FR11, FR12, FR13, FR14, FR15, FR61, FR62, FR63, FR64

### Epic 2: Church Configuration & First-Time Setup
The OWNER can configure the church's identity, create departments with sub-ministries, define activity templates with default roles and headcounts, configure recurring program schedules, and view system health. The system guides setup via smart empty states. Public page shows church identity.
**FRs covered:** FR7, FR28, FR56, FR57, FR58, FR59, FR60

### Epic 3: User & Role Administration
ADMINs can create user accounts (including bulk creation), assign roles and department scoping, promote/demote users, and manage the officer pool. OWNERs can create other OWNERs, delete users, and edit any user. Admin avatar upload is supported.
**FRs covered:** FR34, FR49, FR50, FR51, FR52, FR53, FR54, FR55

### Epic 4: Activity Scheduling & Role Assignment
ADMINs can create activities from templates, customize role rosters (add/remove roles, change headcount), assign people to roles via department-grouped contact picker, tag activities with special types, set visibility, and edit existing activities. Guest speaker inline creation is supported. Concurrent edit detection warns on stale data. Avatar display and unassigned role indicators are operational.
**FRs covered:** FR19, FR20, FR21, FR22, FR23, FR24, FR25, FR27, FR29, FR30, FR31, FR32, FR33, FR48

### Epic 5: Public Dashboard & Anonymous Experience
Anonymous visitors see the public dashboard with the next activity, YouTube live embed, upcoming activities (4 weeks), recurring program times, department overview, and church identity. The public calendar shows public events. Fully mobile-optimized, zero-login required.
**FRs covered:** FR1, FR2, FR3, FR4, FR5, FR6, FR65

### Epic 6: Authenticated Dashboard & Personal Assignments
Officers see their personal upcoming assignments ("My Assignments"), full activity rosters with all roles and assignees, and the authenticated dashboard with ministry overview. Admins assigned to multiple departments see a unified cross-department schedule.
**FRs covered:** FR16, FR17, FR18, FR43

### Epic 7: Calendar
All users can view a Sunday-first calendar with Day, Week, Month, and Year views. Department color coding on events. Public vs authenticated visibility filtering. Department filtering for authenticated users. Admins can create activities directly from the calendar.
**FRs covered:** FR35, FR36, FR37, FR38, FR39, FR40

### Epic 8: Department Management
Authenticated users view department details with sub-ministries, activity pipelines, and upcoming schedules. ADMINs manage activities, meetings (Zoom or physical), and sub-ministries within their scoped departments. OWNERs manage all departments regardless of assignment.
**FRs covered:** FR41, FR42, FR44, FR45, FR46, FR47

### Epic 9: Real-Time Updates & Live Experience
SignalR pushes activity edits to connected clients in real-time, scoped to relevant views (public, per-department, per-activity). TanStack Query cache invalidation via WebSocket push. SignalR connection lifecycle (reconnection, group management, cleanup on disconnect/logout). The "Modifie" badge shows recent changes on the public dashboard.
**FRs covered:** FR26

---

## Epic 1: Project Foundation & Authentication

Users can sign in with Google OAuth or email/password, the system enforces 4-tier RBAC, and the authenticated shell (sidebar, route guards, session management) is operational. The OWNER seed account is active. Project scaffolding (backend + frontend + Docker Compose + IntegrationTestBase) is complete. i18n works from day one with French-primary and English-secondary.

### Story 1.1: Project Scaffolding & Development Infrastructure

As a **developer**,
I want the backend and frontend projects initialized with all required packages, Docker Compose for PostgreSQL, dev proxy configuration, and CI-ready project structure,
So that all subsequent stories have a working foundation to build on.

**Acceptance Criteria:**

**Given** a fresh clone of the repository
**When** `docker compose -f docker-compose.dev.yml up -d` is run
**Then** PostgreSQL 17 is running on port 5432 with sdamanagement database

**Given** the backend project at src/SdaManagement.Api/
**When** `dotnet build` is run
**Then** it compiles with zero errors with all NuGet packages installed (EF Core, Npgsql, FluentValidation, HtmlSanitizer, Serilog, etc.)

**Given** the frontend project at src/sdamanagement-web/
**When** `npm install && npm run dev` is run
**Then** Vite dev server starts with proxy config routing /api and /hubs to localhost:5000

**Given** the backend is started
**When** a request is made to /health
**Then** the health check endpoint returns Healthy when PostgreSQL is connected

**Given** the middleware pipeline in Program.cs
**When** the application starts
**Then** the 9-step middleware order is configured (Serilog, ExceptionHandler, CORS, RateLimiter, Authentication, Authorization, Controllers, SignalR hub, HealthChecks)
**And** ProblemDetails is configured for error responses with urn:sdac:* type URIs
**And** ServiceCollectionExtensions.AddApplicationServices() registers all services

### Story 1.2: Integration Test Infrastructure

As a **developer**,
I want an IntegrationTestBase class with Testcontainers PostgreSQL and pre-configured HTTP clients per role,
So that all future stories can write integration tests against a real database with role-based test clients.

**Acceptance Criteria:**

**Given** the test project at tests/SdaManagement.Api.IntegrationTests/
**When** IntegrationTestBase is instantiated
**Then** a Testcontainers PostgreSQL instance is running with EF Core migrations applied

**Given** the IntegrationTestBase
**When** a test class inherits from it
**Then** pre-configured HttpClients are available: AnonymousClient, ViewerClient, AdminClient, OwnerClient
**And** each client sends requests with appropriate JWT cookies for its role

**Given** multiple tests running
**When** each test completes
**Then** the database is reset (tables truncated, test data reseeded) to ensure test isolation

**Given** the test project
**When** `dotnet test` is run
**Then** all tests pass with zero manual configuration beyond Docker running

### Story 1.3: User Entity, OWNER Seed & Core Auth Backend

As an **OWNER**,
I want the User entity, OWNER seed migration, JWT cookie authentication, and the core auth pipeline (IAuthorizationService, ICurrentUserContext),
So that the system recognizes my account and enforces role-based access from the first endpoint.

**Acceptance Criteria:**

**Given** the database
**When** EF Core migrations run
**Then** the users table exists with columns: id, email, first_name, last_name, role (enum: Anonymous/Viewer/Admin/Owner), is_guest, password_hash, created_at, updated_at
**And** the user_departments junction table exists
**And** the refresh_tokens table exists
**And** snake_case naming is enforced via UseSnakeCaseNamingConvention()

**Given** the OWNER_EMAIL environment variable is set
**When** the seed migration runs
**Then** an OWNER user record is created with that email

**Given** the auth pipeline
**When** an API request arrives with a valid JWT in an httpOnly cookie
**Then** ICurrentUserContext is populated with UserId, Role, and DepartmentIds (resolved from DB)

**Given** IAuthorizationService
**When** authorization methods are called (CanViewActivity, CanManageActivities, etc.)
**Then** they return true/false (never throw) based on role and department intersection

**Given** any API endpoint
**When** JWT cookie is missing or expired
**Then** the response is 401 Unauthenticated

**Given** rate limiting middleware
**When** more than 5 auth requests per minute arrive from the same IP
**Then** the response is 429 Too Many Requests with Retry-After header

### Story 1.4: Google OAuth Sign-In Flow

As a **church officer**,
I want to sign in with my Google account in one tap,
So that I can access my role-appropriate view without managing a separate password.

**Acceptance Criteria:**

**Given** the public page with a "Connexion" button
**When** the user clicks "Connexion" and selects Google
**Then** they are redirected to Google's OAuth 2.0 consent screen

**Given** a successful Google OAuth callback
**When** the returned email matches a pre-existing user record
**Then** httpOnly Secure SameSite=Strict JWT cookies are set (access token 15-30 min, refresh token 7 days)
**And** the user is redirected to the authenticated dashboard

**Given** a successful Google OAuth callback
**When** the returned email does NOT match any user record
**Then** the user sees a "Contactez votre administrateur" message (FR10)
**And** no account is created (FR12)

**Given** the frontend
**When** an API call receives a 401
**Then** the Axios interceptor attempts POST /api/auth/refresh with the refresh cookie
**And** if refresh succeeds, the original request is retried transparently
**And** if refresh fails, the user is redirected to the public view with auth state cleared

### Story 1.5: Email/Password Sign-In & First-Login Password Set

As a **user without a Google account**,
I want to sign in with my email and password,
So that I can access the system using the fallback authentication method.

**Acceptance Criteria:**

**Given** a user record created by an admin with email but no password set
**When** the user navigates to sign in and enters their email
**Then** they are prompted to set their password (FR14)
**And** the password is hashed with bcrypt cost factor 12+ (NFR7)

**Given** a user with a set password
**When** they enter correct email and password
**Then** httpOnly JWT cookies are set and they are redirected to the authenticated dashboard

**Given** a user who has forgotten their password
**When** they click "Mot de passe oublie" and enter their email
**Then** a password reset flow is initiated (FR15)
**And** they can set a new password

**Given** invalid credentials
**When** the user submits the login form
**Then** a generic "Identifiants invalides" error is shown (no email enumeration)
**And** FluentValidation validates input structure, ProblemDetails returns the error

### Story 1.6: Application Shell, Dual Navigation & i18n

As a **user (any role)**,
I want a public navigation shell for anonymous access and an authenticated sidebar shell for signed-in users, with French as the default language and an English toggle,
So that I see role-appropriate navigation and can use the app in my preferred language.

**Acceptance Criteria:**

**Given** an anonymous visitor
**When** they load the app
**Then** they see the public top navigation bar with: church name, Accueil, Calendrier, Departements, En Direct, "Connexion" button
**And** the UI is in French by default (no browser language detection)

**Given** an authenticated user
**When** they sign in
**Then** the layout transitions to the authenticated shell with 288px sidebar on desktop
**And** the sidebar shows role-filtered navigation items (VIEWERs see fewer items than ADMINs)
**And** sidebar collapses to hamburger menu on mobile

**Given** any user (anonymous or authenticated)
**When** they toggle the language switcher
**Then** all UI strings switch between French and English immediately
**And** the preference is persisted in localStorage

**Given** the frontend bundle
**When** the public routes are loaded
**Then** authenticated route code is NOT included (layout-level code splitting, NFR5)

**Given** the i18n system
**When** any component renders
**Then** all user-facing strings come from translation files in public/locales/{lang}/
**And** no hardcoded French or English strings exist in components

### Story 1.7: Sign Out & Session Cleanup

As an **authenticated user**,
I want to sign out and have my session fully terminated,
So that my account is secure and no stale data remains.

**Acceptance Criteria:**

**Given** an authenticated user
**When** they click "Terminate Session" in the sidebar
**Then** POST /api/auth/logout is called, which clears JWT cookies server-side
**And** the SignalR hub connection is disconnected
**And** queryClient.clear() is called (all cached data removed)
**And** the user is redirected to the public home page

**Given** a signed-out user
**When** they attempt to access an authenticated route directly via URL
**Then** the ProtectedRoute guard redirects them to the login page

---

## Epic 2: Church Configuration & First-Time Setup

The OWNER can configure the church's identity, create departments with sub-ministries, define activity templates with default roles and headcounts, configure recurring program schedules, and view system health. The system guides setup via smart empty states. Public page shows church identity.

### Story 2.1: Church Identity Settings

As an **OWNER**,
I want to configure the church's identity (name, address, YouTube URL, phone, welcome message, default locale),
So that the public page displays the church's identity and the system has its foundational configuration.

**Acceptance Criteria:**

**Given** an OWNER navigating to Admin > Church Settings
**When** the page loads for the first time (empty database)
**Then** a smart empty state guides: "Configurez l'identite de votre eglise" with a setup form

**Given** the church settings form
**When** the OWNER fills in church name, address, YouTube channel URL, phone number, welcome message, and default locale
**Then** FluentValidation validates all fields (required name, valid URL format for YouTube)
**And** HtmlSanitizer cleans all text inputs before persistence

**Given** valid church settings submitted
**When** the OWNER saves
**Then** a ChurchConfig record is created (singleton — only one allowed)
**And** a "Sauvegarde" toast confirms the action
**And** the public page can now display the church name and welcome message (FR7)

**Given** a non-OWNER user
**When** they attempt to access /api/config
**Then** the response is 403 Forbidden

### Story 2.2: Department CRUD & Sub-Ministries

As an **OWNER**,
I want to create and manage departments with names, abbreviations, colors, descriptions, and sub-ministries,
So that the organizational structure is defined for activity scheduling and admin scoping.

**Acceptance Criteria:**

**Given** the OWNER navigating to Admin > Departments
**When** the page loads with no departments
**Then** a smart empty state shows: "Creez vos departements — ils structurent toute l'application"

**Given** the department creation form
**When** the OWNER enters name ("Jeunesse Adventiste"), abbreviation ("JA"), color (#hex), and description
**Then** the department is created with a unique color and abbreviation
**And** the departments table is created via migration with columns: id, name, abbreviation, color, description, created_at, updated_at

**Given** an existing department
**When** the OWNER adds sub-ministries (e.g., Eclaireurs, Ambassadeurs, Compagnons under JA)
**Then** the sub_ministries table stores each with department_id foreign key
**And** the department detail view shows its sub-ministries

**Given** the department list
**When** the OWNER edits or deletes a department
**Then** the changes are persisted and reflected immediately
**And** deletion is prevented if activities are associated (or cascaded per architecture)

**Given** a non-OWNER user
**When** they attempt POST/PUT/DELETE on /api/departments
**Then** the response is 403 Forbidden

### Story 2.3: Activity Template Management

As an **OWNER**,
I want to define activity templates with default service roles and headcounts per role,
So that admins can create activities quickly by selecting a template that pre-populates roles.

**Acceptance Criteria:**

**Given** the OWNER navigating to Admin > Activity Templates
**When** the page loads with no templates
**Then** a smart empty state shows: "Definissez vos modeles d'activites — Sabbat, Sainte-Cene, Reunion..."

**Given** the template creation form
**When** the OWNER creates "Culte du Sabbat" with default roles: Predicateur (1), Ancien de Service (1), Annonces (1), Diacres (2), Diaconesses (2)
**Then** the activity_templates table stores the template
**And** the template_roles table stores each default role with its headcount
**And** templates are creation-time blueprints (no live binding to activities)

**Given** an existing template
**When** the OWNER edits roles (adds "Musique Speciale" with headcount 3)
**Then** the template is updated
**And** existing activities created from the old version are NOT affected

**Given** the template list
**When** displayed
**Then** each template shows its name, description, and default role summary (role names + headcounts)

### Story 2.4: Recurring Program Schedule Configuration

As an **OWNER**,
I want to configure recurring program schedules (Sabbath School times, Divine Service times, AY times),
So that the public page can display consistent program times without per-activity entry.

**Acceptance Criteria:**

**Given** the OWNER navigating to Admin > Program Schedules
**When** the page loads
**Then** the OWNER can create program entries with: title, start time, end time, day of week, host name, associated department

**Given** a program schedule entry "Ecole du Sabbat" on Saturday 9:30-10:30 hosted by "Fr. Joseph" in department "Ecole du Sabbat"
**When** saved
**Then** the program_schedules table stores the entry
**And** the public dashboard can display this as a recurring program time (FR4, FR58)

**Given** existing program entries
**When** the OWNER edits times or host
**Then** changes are reflected on the public page immediately

### Story 2.5: System Health Dashboard

As an **OWNER**,
I want to view system health and infrastructure status,
So that I can verify the system is operational and diagnose issues.

**Acceptance Criteria:**

**Given** an OWNER navigating to Admin > System Health
**When** the page loads
**Then** it displays: database connection status (from /health endpoint), application version, uptime info

**Given** PostgreSQL is connected
**When** the health check runs
**Then** status shows "Healthy" with green indicator

**Given** PostgreSQL is unreachable
**When** the health check runs
**Then** status shows "Unhealthy" with red indicator and error context

**Given** a non-OWNER user
**When** they attempt to access the system health page
**Then** the route guard redirects them (frontend) and /api endpoints return 403 (backend)

### Story 2.6: Guided First-Time Setup Experience

As an **OWNER** opening the app for the first time,
I want the system to guide me through setup in the right order (church settings -> departments -> templates -> users -> first activity),
So that I know exactly what to configure next and the setup feels manageable.

**Acceptance Criteria:**

**Given** a freshly deployed app with empty database (only OWNER seed)
**When** the OWNER signs in and reaches the authenticated dashboard
**Then** a setup progress indicator shows 5 steps with current progress
**And** each uncompleted step links to its configuration page

**Given** church settings are not yet configured
**When** the setup guide renders
**Then** step 1 (Church Settings) is highlighted as "next" with encouraging copy: "Commencez ici"
**And** steps 2-5 are shown as upcoming (not clickable until dependencies met)

**Given** church settings are saved
**When** the OWNER returns to the dashboard
**Then** step 1 shows a checkmark, step 2 (Departments) is now highlighted as "next"

**Given** all 5 setup steps are completed
**When** the OWNER views the dashboard
**Then** the setup guide is no longer shown (or collapsed with a "Setup complete" confirmation)
**And** the dashboard shows the normal operational view

---

## Epic 3: User & Role Administration

ADMINs can create user accounts (including bulk creation), assign roles and department scoping, promote/demote users, and manage the officer pool. OWNERs can create other OWNERs, delete users, and edit any user. Admin avatar upload is supported.

### Story 3.1: Single User Account Creation

As an **ADMIN**,
I want to create a new user account with name, email, role, and department assignments,
So that officers can sign in and access the system with appropriate permissions.

**Acceptance Criteria:**

**Given** an ADMIN navigating to Admin > Users
**When** they click "Ajouter un utilisateur"
**Then** a creation form appears with fields: first name, last name, email, role (VIEWER/ADMIN), department assignment(s)

**Given** a valid user form submission
**When** the ADMIN saves
**Then** the user record is created with no password (Google OAuth users don't need one)
**And** the email is unique (validated by FluentValidation, 409 Conflict if duplicate)
**And** department assignments are stored in user_departments junction table
**And** a "Utilisateur cree" toast confirms the action

**Given** an ADMIN scoped to department JA
**When** they create a user and assign them to department MIFEM (outside their scope)
**Then** the API returns 403 — ADMINs can only assign departments they manage

**Given** the user list page
**When** it loads
**Then** users are displayed with name, email, role, department badges, and avatar (initials fallback)
**And** cursor-based pagination is used for the list

### Story 3.2: Bulk User Creation

As an **ADMIN**,
I want to create multiple user accounts efficiently in a single workflow,
So that I can onboard the ~30 officers without 30 individual form submissions.

**Acceptance Criteria:**

**Given** the ADMIN on the user creation page
**When** they select "Creation en lot"
**Then** a multi-entry form appears where each row has: first name, last name, email, role, department(s)
**And** the ADMIN can add rows dynamically (useFieldArray pattern)

**Given** 10 user entries filled in
**When** the ADMIN submits the batch
**Then** all 10 users are created in a single API call
**And** validation errors are shown inline per row (e.g., row 3: "Email deja utilise")
**And** successfully created users appear in the user list immediately

**Given** a batch with some invalid entries
**When** submitted
**Then** the API returns per-row validation errors
**And** the ADMIN can correct errors and resubmit without losing valid entries

### Story 3.3: User Role & Department Management

As an **ADMIN**,
I want to promote VIEWERs to ADMIN, reassign users to different departments, and manage user roles,
So that I can handle officer changes and nominating committee term transitions.

**Acceptance Criteria:**

**Given** a VIEWER user in the user list
**When** an ADMIN clicks edit and changes their role to ADMIN with department assignments
**Then** the user's role is updated to ADMIN
**And** they are assigned to the specified departments (FR51)
**And** their next sign-in reflects the new role and department access

**Given** a user assigned to departments JA and MIFEM
**When** an ADMIN reassigns them to only MF (term transition)
**Then** the old department assignments are replaced with the new ones (FR52)
**And** the user's access scope updates accordingly

**Given** an ADMIN user
**When** another ADMIN of the same department tries to demote them
**Then** the operation is allowed — ADMINs can manage users in their departments

**Given** an ADMIN scoped to department JA
**When** they try to edit a user only assigned to MIFEM
**Then** the API returns 403 — no cross-department user management for ADMINs

### Story 3.4: OWNER User Management (Full Access)

As an **OWNER**,
I want to create other OWNER accounts, delete users, and edit any user's role and department assignments regardless of my department scope,
So that I have unrestricted system administration capability.

**Acceptance Criteria:**

**Given** an OWNER on the user management page
**When** they create a new user with role OWNER
**Then** the OWNER account is created (FR53)
**And** only OWNERs can assign the OWNER role — ADMINs cannot

**Given** an OWNER viewing any user
**When** they click delete
**Then** a confirmation dialog appears: "Supprimer definitivement [Name]?"
**And** on confirmation, the user is soft-deleted or removed (FR54)
**And** any existing role assignments for that user remain on past activities for historical record

**Given** an OWNER
**When** they edit any user's role or departments
**Then** the changes are saved regardless of department scoping (FR55, FR47)

### Story 3.5: Avatar Upload & Display

As an **ADMIN**,
I want to upload a profile photo for any user in my departments,
So that avatars appear alongside role assignments across the app.

**Acceptance Criteria:**

**Given** an ADMIN viewing a user profile
**When** they click the avatar area and select a photo
**Then** the image is uploaded via POST /api/avatars/{userId}
**And** FluentValidation enforces <500KB file size and accepts image/jpeg, image/png, image/webp
**And** the image is converted to optimized WebP and stored in data/avatars/{userId}.webp (outside wwwroot)

**Given** a user with an uploaded avatar
**When** any page displays that user (roster, dashboard, user list)
**Then** the avatar is served via GET /api/avatars/{userId} with ETag based on updatedAt and Cache-Control: public, max-age=86400

**Given** a user without an uploaded avatar
**When** any page displays that user
**Then** an initials-based fallback avatar is generated client-side from the user's first and last name

**Given** an avatar is re-uploaded
**When** the new image is saved
**Then** the updatedAt timestamp changes, causing ETag mismatch and cache-bust on next request

**Given** a non-ADMIN user
**When** they attempt POST /api/avatars/{userId}
**Then** the response is 403 Forbidden

---

## Epic 4: Activity Scheduling & Role Assignment

ADMINs can create activities from templates, customize role rosters (add/remove roles, change headcount), assign people to roles via department-grouped contact picker, tag activities with special types, set visibility, and edit existing activities. Guest speaker inline creation is supported. Concurrent edit detection warns on stale data. Avatar display and unassigned role indicators are operational.

### Story 4.1: Activity Data Model & Basic CRUD

As an **ADMIN**,
I want to create, view, edit, and delete church activities with a title, date, time, description, department, and visibility setting,
So that I can manage the church schedule for my department.

**Acceptance Criteria:**

**Given** the database
**When** EF Core migrations run
**Then** the activities table exists with columns: id, title, description, date, start_time, end_time, department_id, visibility (public/authenticated), special_type (nullable), concurrency_token (xmin), created_at, updated_at
**And** the activity_roles table exists with: id, activity_id (FK cascade), role_name, headcount, sort_order
**And** the role_assignments table exists with: id, activity_role_id (FK cascade), user_id (FK), with unique constraint on (activity_role_id, user_id)

**Given** an ADMIN scoped to department MIFEM
**When** they create an activity with title "Culte du Sabbat", date 2026-03-07, department MIFEM, visibility "public"
**Then** the activity is created as an atomic transaction
**And** the activity appears in the activity list for MIFEM
**And** a "Cree" toast confirms the action

**Given** an ADMIN scoped to department MIFEM
**When** they attempt to create an activity for department JA
**Then** the API returns 403 — department-scoped authorization enforced

**Given** an existing activity
**When** an ADMIN edits the title, date, or visibility
**Then** the changes are saved and reflected immediately (FR25)

**Given** an existing activity
**When** an ADMIN deletes it
**Then** CASCADE DELETE removes all associated activity_roles and role_assignments

### Story 4.2: Activity Creation from Templates

As an **ADMIN**,
I want to create an activity by selecting a template that auto-populates default service roles and headcounts,
So that I can set up a standard Sabbath program in seconds instead of building from scratch.

**Acceptance Criteria:**

**Given** an ADMIN creating a new activity
**When** they reach the creation flow
**Then** template selection cards (Notion gallery pattern) display available templates with name, description, and role summary

**Given** the ADMIN selects "Culte du Sabbat" template
**When** the template is applied
**Then** the activity form pre-populates with default roles: Predicateur (1), Ancien de Service (1), Annonces (1), Diacres (2), Diaconesses (2)
**And** the ADMIN can proceed to customize before saving (FR20)

**Given** a template is applied
**When** the activity is saved
**Then** the activity_roles are created as independent copies — no live binding to the template (FR28 architecture constraint)
**And** future template changes do NOT affect this activity

**Given** an ADMIN
**When** they choose to create an activity without a template
**Then** the form starts with an empty role roster that can be built manually

### Story 4.3: Role Roster Customization

As an **ADMIN**,
I want to add, remove, and change headcounts for service roles on any activity,
So that I can adapt the roster for special programs (e.g., adding "Special Music" for Women's Day, expanding diaconesses for Sainte-Cene).

**Acceptance Criteria:**

**Given** an activity with pre-populated roles from a template
**When** the ADMIN adds a new role "Musique Speciale" with headcount 3
**Then** the role is added to the activity's roster with sort_order after existing roles
**And** the role appears in the roster with 0/3 assigned indicator

**Given** an activity with a "Diacres" role at headcount 2
**When** the ADMIN changes the headcount to 4
**Then** the headcount is updated and the UI reflects 4 slots

**Given** an activity with role "Annonces" that has no assignments
**When** the ADMIN removes the role
**Then** the activity_role is deleted

**Given** an activity with role "Predicateur" that has an assignment
**When** the ADMIN removes the role
**Then** a confirmation warns that removing will also remove the assignment
**And** on confirmation, the activity_role and its role_assignments are cascade-deleted

**Given** the role roster
**When** displayed on mobile (375px)
**Then** each role row shows: role name, headcount indicator (filled/total), and assigned person chips
**And** all interactions work with 44px minimum touch targets

### Story 4.4: Role Assignment via Contact Picker

As an **ADMIN**,
I want to assign people to service roles using a department-grouped contact picker with search,
So that I can quickly find and assign the right officers to each role.

**Acceptance Criteria:**

**Given** an activity role "Predicateur" with headcount 1
**When** the ADMIN taps the assignment area
**Then** a contact picker opens — on mobile as a full-screen bottom sheet, on desktop as a dropdown panel
**And** the picker shows all non-guest officers grouped by department with search bar at top

**Given** the contact picker is open
**When** the ADMIN types "Vic" in the search bar
**Then** the list filters in real-time showing matching officers (e.g., "Vicuna, L." in department Anciens)

**Given** the ADMIN selects "Vicuna, L."
**When** the selection is confirmed
**Then** a chip appears in the role assignment area showing name + small avatar (28px, initials fallback)
**And** the role_assignment record is created linking the user to the activity_role

**Given** a role "Diacres" with headcount 2 and 1 already assigned
**When** the ADMIN assigns a second person
**Then** both chips display side by side
**And** the headcount indicator shows 2/2 (green — fully staffed)

**Given** an assigned chip
**When** the ADMIN taps the "x" on the chip
**Then** the role_assignment is removed and the slot opens back up

**Given** the contact picker
**When** searching for officers
**Then** guest users (isGuest = true) are excluded from the search results (FR31)

### Story 4.5: Special Activity Tagging & Visibility Control

As an **ADMIN**,
I want to tag activities with special types and control their visibility,
So that special programs are identifiable and some activities are only visible to authenticated users.

**Acceptance Criteria:**

**Given** an activity creation or edit form
**When** the ADMIN selects a special type tag
**Then** available tags include: Sainte-Cene, Week of Prayer, Camp Meeting, Youth Day, Family Day, Women's Day, Evangelism (FR23)
**And** the tag is stored on the activity record

**Given** an activity with a special tag "Journee de la Jeunesse"
**When** displayed on the public dashboard or calendar
**Then** the tag is visible as a badge alongside the activity title

**Given** an activity creation or edit form
**When** the ADMIN sets visibility to "authenticated-only"
**Then** the activity is NOT visible on the public dashboard or public calendar (FR24)
**And** it IS visible to all authenticated users (VIEWER+)

**Given** an activity with visibility "public"
**When** an anonymous visitor views the dashboard or calendar
**Then** the activity appears with its full public details

### Story 4.6: Inline Guest Speaker Creation

As an **ADMIN**,
I want to create a guest speaker record inline during role assignment when no matching user exists,
So that I can assign external speakers without leaving the assignment flow.

**Acceptance Criteria:**

**Given** the contact picker is open for role "Predicateur"
**When** the ADMIN types "Damien" and no results match
**Then** an "Ajouter un invite" option appears at the bottom of the results

**Given** the ADMIN selects "Ajouter un invite"
**When** the inline creation form appears
**Then** it shows: name (required), phone (optional) — minimal fields, no email
**And** the form appears within the picker (no navigation away from the assignment flow)

**Given** the ADMIN enters "Pasteur Damien" and confirms
**When** the guest record is created
**Then** a User record is created with isGuest = true, no email, no password_hash (FR30)
**And** the guest is immediately assigned to the role
**And** the chip shows "Pasteur Damien" with initials avatar

**Given** a guest speaker assigned to a role
**When** displayed in authenticated/operational views
**Then** "(Invite)" label appears beneath the guest's name (FR32)

**Given** a guest speaker assigned to a role
**When** displayed on public-facing views (dashboard, public calendar)
**Then** the guest appears identical to regular members — no "(Invite)" label, no isGuest flag in public API response (FR32)

### Story 4.7: Activity Roster View & Staffing Indicators

As an **ADMIN**,
I want to see the full roster of any activity with staffing status indicators,
So that I can quickly identify which roles are fully staffed and which have gaps.

**Acceptance Criteria:**

**Given** an activity with multiple roles
**When** the roster view loads
**Then** each role displays: role name, assigned people (with avatars — 28px, initials fallback), and headcount indicator (filled/total)

**Given** a role "Diacres" with 2/2 assigned
**When** the roster renders
**Then** a green status dot indicates "fully staffed"

**Given** a role "Predicateur" with 0/1 assigned
**When** the roster renders
**Then** an amber/orange status dot indicates "gap" (FR48)

**Given** the activity list view
**When** displaying multiple upcoming activities
**Then** each activity card shows an overall staffing summary: green (all roles filled), amber (some gaps), red (critical roles unfilled — predicateur, ancien)

**Given** a mobile device (375px)
**When** the roster view renders
**Then** role rows stack vertically with avatar chips wrapping naturally
**And** status indicators are visible without horizontal scrolling

### Story 4.8: Concurrent Edit Detection

As an **ADMIN**,
I want to be warned if another admin edited the same activity while I was viewing it,
So that I don't accidentally overwrite their changes.

**Acceptance Criteria:**

**Given** Admin A loads activity #42 (concurrency token = xmin value V1)
**When** Admin B edits activity #42 and saves (xmin becomes V2)
**And** Admin A then attempts to save their changes with stale token V1
**Then** the API returns 409 Conflict with urn:sdac:conflict error code

**Given** the frontend receives a 409 Conflict
**When** the warning dialog appears
**Then** it shows: "Cette activite a ete modifiee par un autre administrateur"
**And** offers two options: "Recharger les donnees actuelles" (reload) or "Ecraser avec mes modifications" (overwrite)

**Given** the admin selects "Recharger"
**When** the reload triggers
**Then** the activity form refreshes with the latest data from the server (including Admin B's changes)
**And** Admin A's unsaved changes are lost (acknowledged by the choice)

**Given** the admin selects "Ecraser"
**When** the overwrite triggers
**Then** the save is retried with a force flag that bypasses the concurrency check
**And** Admin A's version becomes the current state

---

## Epic 5: Public Dashboard & Anonymous Experience

Anonymous visitors see the public dashboard with the next activity, YouTube live embed, upcoming activities (4 weeks), recurring program times, department overview, and church identity. The public calendar shows public events. Fully mobile-optimized, zero-login required.

### Story 5.1: Public Dashboard — Hero Section & Next Activity

As an **anonymous visitor**,
I want to see the next scheduled church activity with key details immediately when I open the app,
So that I know what's happening at church without logging in or navigating.

**Acceptance Criteria:**

**Given** an anonymous visitor opens the app
**When** the public dashboard loads
**Then** the church name and shell render immediately (identity-first loading) before API data arrives
**And** skeleton loading states display while data loads

**Given** activity data is available
**When** the hero section renders (dark slate-900 background)
**Then** it shows the next upcoming public activity with: predicateur name, department name, activity type/tag, date and time
**And** the warm vocabulary register is used ("Ce Sabbat", not "Programme en cours")

**Given** no upcoming public activities exist
**When** the hero section renders
**Then** a friendly empty state displays: "Aucune activite a venir — revenez bientot!"

**Given** the public dashboard
**When** viewed on mobile (375px)
**Then** the hero section is full-width, content stacks vertically, text is legible
**And** the church identity info (name, address, welcome message) is visible (FR7)

### Story 5.2: YouTube Live Stream Embed

As an **anonymous visitor**,
I want to see the YouTube live stream link with service status on the public dashboard,
So that I or my family members can watch the service from anywhere.

**Acceptance Criteria:**

**Given** the church config has a YouTube channel URL configured
**When** the public dashboard renders
**Then** a YouTube section appears with the warm label "Suivez le culte en direct"
**And** the YouTube embed or link is displayed at 16:9 aspect ratio

**Given** a live stream is currently active
**When** the YouTube section renders
**Then** a pulsing rose/red live indicator shows "EN DIRECT"

**Given** no YouTube URL is configured in church settings
**When** the public dashboard renders
**Then** the YouTube section is hidden (no broken embed)

### Story 5.3: Upcoming Activities & Program Times

As an **anonymous visitor**,
I want to see upcoming church activities for the next 4 weeks and recurring program times,
So that I can plan ahead and know the regular church schedule.

**Acceptance Criteria:**

**Given** the public dashboard
**When** the upcoming activities section renders
**Then** it displays public-visibility activities for the next 4 weeks (FR3)
**And** each activity card shows: date, title, department, special tag (if any), predicateur name
**And** the warm label "Activites a venir" is used

**Given** recurring program schedules are configured (from Epic 2)
**When** the program times section renders
**Then** it displays: program title, day, start/end times, host name (FR4)
**And** examples: "Ecole du Sabbat — Samedi 9h30-10h30", "Culte Divin — Samedi 11h00-12h30"

**Given** public API endpoints /api/public/activities and /api/public/programs
**When** called without authentication
**Then** only public-visibility activities are returned
**And** response uses PublicActivityListItem DTOs (no isGuest flag, no internal IDs beyond what's needed)
**And** no authenticated-only data leaks (NFR9)

### Story 5.4: Public Department Overview

As an **anonymous visitor**,
I want to see a department overview showing all departments with their next scheduled activity,
So that I understand the church's organizational structure and what each department has coming up.

**Acceptance Criteria:**

**Given** the public dashboard
**When** the department overview section renders
**Then** it displays all departments with: name, abbreviation, color, description, and next scheduled public activity (FR5)
**And** the warm label "Nos Departements" is used

**Given** a department has no upcoming public activities
**When** it renders in the overview
**Then** it shows the department info with "Aucune activite planifiee" instead of a next activity

**Given** the public endpoint /api/public/departments
**When** called without authentication
**Then** department data is returned with public activity summaries only
**And** no sub-ministry details, no internal meeting info

### Story 5.5: Public Calendar View

As an **anonymous visitor**,
I want to view a public calendar showing church-wide activities and special events,
So that I can browse what's happening across different weeks and months.

**Acceptance Criteria:**

**Given** an anonymous visitor navigates to "Calendrier"
**When** the public calendar page loads
**Then** a Sunday-first calendar displays with only public-visibility activities (FR6)
**And** activities show with department color coding

**Given** the public calendar
**When** the visitor switches between Day, Week, Month views
**Then** the calendar updates accordingly
**And** only public activities are shown (no authenticated-only events)

**Given** the public calendar on mobile
**When** rendered at 375px
**Then** the calendar adapts to a mobile-friendly layout (day view default, swipe between days)

**Given** the public calendar API /api/public/calendar
**When** called with date range parameters
**Then** only public-visibility activities are returned with PublicActivityListItem DTOs

---

## Epic 6: Authenticated Dashboard & Personal Assignments

Officers see their personal upcoming assignments ("My Assignments"), full activity rosters with all roles and assignees, and the authenticated dashboard with ministry overview. Admins assigned to multiple departments see a unified cross-department schedule.

### Story 6.1: Personal Assignments View ("My Assignments")

As a **VIEWER (officer)**,
I want to see my personal upcoming assignments across all activities,
So that I know exactly what I'm doing, when, and who else is serving alongside me.

**Acceptance Criteria:**

**Given** an authenticated user (VIEWER+) navigating to the dashboard
**When** the "My Assignments" section loads
**Then** it displays all upcoming activities where the current user has a role_assignment
**And** each assignment shows: activity date, activity title, role name, and co-assigned people for the same role

**Given** the user has 3 upcoming assignments (deacon this Saturday, preacher in 3 weeks, announcements next month)
**When** the assignments render
**Then** they are sorted chronologically with the nearest assignment first
**And** the nearest assignment is visually emphasized (larger card or highlighted border)

**Given** the user has no upcoming assignments
**When** the section renders
**Then** a friendly message: "Aucune affectation a venir" with context that assignments appear when admins schedule activities

**Given** the /api/activities/my-assignments endpoint
**When** called by an authenticated user
**Then** it returns only activities where the current user has role_assignments
**And** includes role name, activity details, and co-assignee names with avatars

### Story 6.2: Full Activity Roster View

As an **authenticated user (VIEWER+)**,
I want to view the full roster of any activity showing all service roles and assigned people,
So that I can see who's serving in every role for any given activity.

**Acceptance Criteria:**

**Given** an authenticated user viewing an activity detail
**When** the roster section loads
**Then** all service roles are displayed with: role name, headcount, and assigned people with avatars (48px)
**And** guest speakers show "(Invite)" label in this operational view (FR32)

**Given** the user is a VIEWER
**When** they view the roster
**Then** they see all roles and assignments in read-only mode
**And** no edit controls are visible (role boundaries enforced — FR17)

**Given** the user is an ADMIN for this activity's department
**When** they view the roster
**Then** edit controls are visible (links to activity editing from Epic 4)

**Given** the activity detail endpoint /api/activities/{id}
**When** called by an authenticated user
**Then** the full ActivityResponse DTO is returned with roles, assignments, and user details
**And** VIEWER+ authorization is enforced (anonymous gets 401)

### Story 6.3: Authenticated Dashboard

As an **authenticated user**,
I want a dashboard that shows my personal assignments, upcoming activities for my departments, and ministry overview,
So that I have a single operational view of everything relevant to me.

**Acceptance Criteria:**

**Given** a VIEWER signing in
**When** the authenticated dashboard loads
**Then** it displays: greeting ("Bonjour [Name]"), "My Assignments" section, and upcoming activities visible to their role
**And** the operational vocabulary register is used ("Command Center" title, "Registre Personnel")

**Given** an ADMIN assigned to departments MIFEM and Diaconat
**When** the dashboard loads
**Then** it shows: personal assignments + upcoming activities for MIFEM and Diaconat combined
**And** activities from both departments appear in a unified chronological list
**And** department color badges distinguish which department each activity belongs to

**Given** an ADMIN assigned to ALL departments (pastor)
**When** the dashboard loads
**Then** it shows activities across all departments (FR43 — cross-department visibility)
**And** the view serves as the "big picture" operational overview (Journey 4)

**Given** the dashboard on mobile (375px)
**When** rendered
**Then** sections stack vertically: greeting -> assignments -> upcoming activities
**And** all content is readable and interactive without horizontal scrolling

---

## Epic 7: Calendar

All users can view a Sunday-first calendar with Day, Week, Month, and Year views. Department color coding on events. Public vs authenticated visibility filtering. Department filtering for authenticated users. Admins can create activities directly from the calendar.

### Story 7.1: Calendar Core — Sunday-First with Multiple Views

As a **user (any role)**,
I want to view a calendar with Sunday as the first day and switch between Day, Week, Month, and Year views,
So that I can browse church activities across different time scales.

**Acceptance Criteria:**

**Given** any user (anonymous or authenticated) navigates to the calendar page
**When** the calendar renders
**Then** it displays with Sunday as the first day (day 1) and Saturday as the seventh day (FR35)
**And** the @schedule-x/react component is used

**Given** the calendar page
**When** the user switches between Day, Week, Month, and Year views
**Then** the calendar updates to the selected view (FR36)
**And** the Week view shows Sunday through Saturday as columns

**Given** the calendar on mobile (375px)
**When** rendered in Week view
**Then** it adapts to a mobile-friendly layout (condensed or horizontal scroll)
**And** Day view is usable with swipe left/right to navigate between days

**Given** the Month view
**When** rendered
**Then** days display with colored activity indicators showing how many activities are scheduled
**And** tapping a day drills into the Day view for that date

### Story 7.2: Calendar Visibility & Department Filtering

As an **authenticated user**,
I want to see all activities (including authenticated-only) on the calendar and filter by department,
So that I can focus on the activities relevant to my ministry.

**Acceptance Criteria:**

**Given** an anonymous user viewing the calendar
**When** activities render
**Then** only public-visibility activities appear (FR37)
**And** no department filter is shown

**Given** an authenticated user viewing the calendar
**When** activities render
**Then** both public AND authenticated-only activities appear (FR37)
**And** a department filter control is available

**Given** the department filter
**When** an authenticated user selects "MIFEM" and "JA"
**Then** only activities belonging to those departments are shown (FR38)
**And** the filter persists during the session

**Given** activities on the calendar
**When** rendered
**Then** each activity displays with its department's color coding (FR39)
**And** colors match those configured in department settings (Epic 2)

### Story 7.3: Admin Quick-Create from Calendar

As an **ADMIN**,
I want to create an activity directly from the calendar by tapping a day,
So that I can quickly schedule activities while viewing the calendar without navigating away.

**Acceptance Criteria:**

**Given** an ADMIN viewing the calendar
**When** they tap/click on a specific day
**Then** the activity creation flow opens (bottom sheet on mobile, modal/panel on desktop)
**And** the date field is pre-filled with the selected day (FR40)

**Given** the quick-create flow
**When** the ADMIN selects a template and fills in details
**Then** the full activity creation from Epic 4 is available (template selection, role customization, assignment)
**And** on save, the activity appears on the calendar immediately

**Given** a VIEWER tapping a day on the calendar
**When** the tap occurs
**Then** no creation flow appears — VIEWERs see the day's activities in read-only detail instead

**Given** an anonymous user tapping a day
**When** the tap occurs
**Then** a detail view shows that day's public activities (no creation affordance)

---

## Epic 8: Department Management

Authenticated users view department details with sub-ministries, activity pipelines, and upcoming schedules. ADMINs manage activities, meetings (Zoom or physical), and sub-ministries within their scoped departments. OWNERs manage all departments regardless of assignment.

### Story 8.1: Department List & Detail View

As an **authenticated user (VIEWER+)**,
I want to view all departments with their sub-ministries, activity pipelines, and upcoming schedules,
So that I can see what's happening across the church's organizational structure.

**Acceptance Criteria:**

**Given** an authenticated user navigating to the departments page
**When** the department list loads
**Then** all departments display with: name, abbreviation, color badge, description, and sub-ministries (FR41)
**And** the operational label "Unites Ministerielles" is used

**Given** the user taps on a department (e.g., MIFEM)
**When** the department detail view loads
**Then** it shows: department info, sub-ministries list, and the activity pipeline — upcoming activities sorted chronologically (FR42)
**And** each activity in the pipeline shows: date, title, staffing status indicator (green/amber/red), special tag

**Given** a department with no upcoming activities
**When** the detail view renders
**Then** an encouraging empty state shows: "Pret a planifier. Creez votre premiere activite." (for ADMINs)
**Or** "Aucune activite planifiee" (for VIEWERs)

**Given** a VIEWER viewing a department
**When** the detail page renders
**Then** all data is read-only — no create/edit/delete controls visible

### Story 8.2: Department Activity & Meeting Management

As an **ADMIN**,
I want to manage activities and create meetings (Zoom or physical) for my assigned departments,
So that I can coordinate my department's full operational schedule.

**Acceptance Criteria:**

**Given** an ADMIN assigned to department MIFEM viewing the MIFEM detail page
**When** they click "Nouvelle activite"
**Then** the activity creation flow from Epic 4 opens with department pre-set to MIFEM (FR44)

**Given** an ADMIN on a department detail page
**When** they click "Nouvelle reunion"
**Then** a meeting creation form appears with: title, date, time, type (Zoom/Physical)

**Given** the meeting type is "Zoom"
**When** the ADMIN fills in the form
**Then** a Zoom link field appears (FR46)
**And** the meeting is saved with the Zoom URL

**Given** the meeting type is "Physical"
**When** the ADMIN fills in the form
**Then** location name and address fields appear (FR46)
**And** the meeting is saved with the physical location

**Given** existing activities and meetings in the department pipeline
**When** the ADMIN clicks edit or delete
**Then** they can modify or remove items within their scoped department (FR44)

**Given** an ADMIN scoped to JA only
**When** they attempt to manage activities in MIFEM's department page
**Then** no edit controls are visible, and API calls return 403

### Story 8.3: Sub-Ministry Management

As an **ADMIN**,
I want to manage sub-ministries within my assigned departments,
So that I can organize ministry teams and assign leads.

**Acceptance Criteria:**

**Given** an ADMIN on the MIFEM department detail page
**When** they navigate to the sub-ministries section
**Then** existing sub-ministries display (e.g., if any were created by OWNER in Epic 2)
**And** an "Ajouter un sous-ministere" button is visible

**Given** the ADMIN creates a new sub-ministry
**When** they enter name and optionally assign a lead (from department members)
**Then** the sub-ministry is created under the current department (FR45)
**And** it appears in the department's sub-ministry list

**Given** an existing sub-ministry
**When** the ADMIN edits its name or reassigns the lead
**Then** the changes are saved and reflected immediately

**Given** the sub-ministry list
**When** rendered
**Then** each sub-ministry shows: name, lead (with avatar), and member count if applicable

### Story 8.4: OWNER Full Department Access

As an **OWNER**,
I want to manage all departments regardless of my department assignments,
So that I have unrestricted administrative access across the entire organizational structure.

**Acceptance Criteria:**

**Given** an OWNER viewing any department detail page
**When** the page loads
**Then** all edit controls are visible (create/edit/delete activities, meetings, sub-ministries) regardless of department assignment (FR47)

**Given** an OWNER on the departments list
**When** they view the list
**Then** all departments are accessible with full management capability

**Given** the authorization service
**When** checking department-scoped operations for an OWNER
**Then** IAuthorizationService returns true for all departments (OWNER bypasses department scoping)

---

## Epic 9: Real-Time Updates

SignalR push-only (server→client) hub delivers real-time activity update broadcasts and "Modifie" badge indicators. Connection lifecycle handles auth/anon split, group scoping (public, authenticated, department-specific), and graceful reconnection. No client→server messages — all mutations go through REST API.

### Story 9.1: SignalR Hub & Connection Lifecycle

As a **user (any role)**,
I want a persistent real-time connection that automatically manages my group memberships based on my authentication status,
So that I receive live updates relevant to my role without any manual action.

**Acceptance Criteria:**

**Given** the backend
**When** the SignalR hub is configured
**Then** a single /hubs/activities endpoint exists using Microsoft.AspNetCore.SignalR
**And** the hub is push-only — no client-to-server methods are exposed (all mutations go through REST)

**Given** an anonymous visitor connects
**When** the connection is established
**Then** the user is added to the "public" group only
**And** they receive broadcasts for public-visibility activity changes

**Given** an authenticated user (VIEWER+) connects with a valid JWT cookie
**When** the connection is established
**Then** the user is added to "public" + "authenticated" groups
**And** if the user has department assignments, they are also added to "dept:{departmentId}" groups for each assigned department

**Given** an OWNER connects
**When** the connection is established
**Then** the OWNER is added to "public" + "authenticated" + ALL "dept:{departmentId}" groups

**Given** a connected client loses connection
**When** the SignalR transport detects disconnection
**Then** automatic reconnection attempts using exponential backoff (1s, 2s, 4s, 8s, max 30s)
**And** on successful reconnect, group memberships are re-established based on current auth state

**Given** the hub configuration
**When** reviewing transport settings
**Then** WebSocket is preferred, with SSE and long-polling as fallbacks
**And** connection timeout is set appropriately for the expected client base

### Story 9.2: Real-Time Activity Update Broadcasting

As a **user (any role)**,
I want to see activity changes reflected in real-time across my dashboard, calendar, and department views without refreshing,
So that I always see the latest schedule without manual page reloads.

**Acceptance Criteria:**

**Given** an ADMIN saves a new public activity via the REST API
**When** the save completes successfully
**Then** the server broadcasts an "ActivityCreated" event to the "public" group with: activityId, title, date, department
**And** all connected clients in the "public" group receive the event
**And** TanStack Query cache is invalidated for the relevant query keys (activities list, calendar, dashboard)

**Given** an ADMIN updates an authenticated-only activity
**When** the save completes
**Then** an "ActivityUpdated" event is broadcast to the "authenticated" group (not "public")
**And** the event payload includes: activityId, updatedFields summary, concurrency token

**Given** an ADMIN updates role assignments for a MIFEM activity
**When** the save completes
**Then** an "ActivityUpdated" event is broadcast to "dept:mifem" group
**And** users viewing that department's pipeline see the roster update in real-time

**Given** an activity is deleted
**When** the delete completes
**Then** an "ActivityDeleted" event is broadcast to the appropriate group(s)
**And** the activity is removed from all connected clients' views without refresh

**Given** the frontend receives any SignalR event
**When** the event handler fires
**Then** the appropriate TanStack Query keys are invalidated (triggering background refetch)
**And** no full page reload occurs — only affected components re-render

### Story 9.3: "Modifie" Badge for Recent Changes

As a **user (any role)**,
I want to see a "Modifie" badge on activities that were recently changed,
So that I can quickly identify what's been updated since I last looked.

**Acceptance Criteria:**

**Given** an activity is updated via SignalR broadcast
**When** the "ActivityUpdated" event is received by the frontend
**Then** the activity card/row displays a "Modifie" badge (indigo-600 background, white text, small pill shape)
**And** the badge appears on all views where the activity is visible (dashboard, calendar, department pipeline)

**Given** a "Modifie" badge is displayed
**When** the user taps/clicks on the activity to view its details
**Then** the badge is dismissed for that user (stored in Zustand local state, not persisted to server)

**Given** a "Modifie" badge is displayed
**When** 24 hours pass without the user viewing the activity
**Then** the badge auto-expires and is removed (client-side timer)

**Given** the user refreshes the page or reconnects
**When** the app reloads
**Then** badges are recalculated from Zustand persisted state (localStorage)
**And** expired badges (>24h) are cleaned up on load

**Given** a new activity is created (not updated)
**When** the "ActivityCreated" event is received
**Then** no "Modifie" badge is shown — the badge is only for updates to existing activities
