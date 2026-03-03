# Story 1.6: Application Shell, Dual Navigation & i18n

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **user (any role)**,
I want a public navigation shell for anonymous access and an authenticated sidebar shell for signed-in users, with French as the default language and an English toggle,
So that I see role-appropriate navigation and can use the app in my preferred language.

## Acceptance Criteria

1. **Given** an anonymous visitor
   **When** they load the app
   **Then** they see the public top navigation bar with: church name, Accueil, Calendrier, Departements, En Direct, "Connexion" button
   **And** the UI is in French by default (no browser language detection)

2. **Given** an authenticated user
   **When** they sign in
   **Then** the layout transitions to the authenticated shell with 288px sidebar on desktop
   **And** the sidebar shows role-filtered navigation items (VIEWERs see fewer items than ADMINs)
   **And** sidebar collapses to hamburger menu on mobile

3. **Given** any user (anonymous or authenticated)
   **When** they toggle the language switcher
   **Then** all UI strings switch between French and English immediately
   **And** the preference is persisted in localStorage

4. **Given** the frontend bundle
   **When** the public routes are loaded
   **Then** authenticated route code is NOT included (layout-level code splitting, NFR5)

5. **Given** the i18n system
   **When** any component renders
   **Then** all user-facing strings come from translation files in `public/locales/{lang}/`
   **And** no hardcoded French or English strings exist in components

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
- **Story 1.2** — IntegrationTestBase with Testcontainers, pre-configured HttpClients per role
- **Story 1.3** — User entity with roles, OWNER seed, `ICurrentUserContext`, JWT pipeline
- **Story 1.4** — Google OAuth flow, `TokenService`, Axios 401->refresh->retry interceptor, `AuthContext`
- **Story 1.5** — Email/password login, `LoginPage.tsx` (three-state), i18n translation files initialized, shadcn/ui Button/Input/Label installed, `react-hook-form` + `zod` + `sonner` patterns established

## Tasks / Subtasks

- [x] **Task 1: Install shadcn/ui components & configure Zustand store** (AC: #2, #3)
  - [x] Run `npx shadcn@latest add sidebar sheet separator tooltip dropdown-menu`
  - [x] Create `src/stores/uiStore.ts` — Zustand store with `sidebarOpen` (boolean, default true), `toggleSidebar()`, `setLanguage(lang)`. Read initial language from `localStorage.getItem('language') || 'fr'`
  - [x] Wire `setLanguage()` to call both `i18n.changeLanguage(lang)` and `localStorage.setItem('language', lang)`

- [x] **Task 2: Initialize TanStack Query provider** (AC: foundation)
  - [x] Create `src/lib/queryClient.ts` — export a `QueryClient` instance with sensible defaults (`staleTime: 5 * 60 * 1000`, `retry: 1`)
  - [x] Wrap app in `QueryClientProvider` in `main.tsx` (outside `AuthProvider`)
  - [x] Add `ReactQueryDevtools` in development only (`import.meta.env.DEV` guard)

- [x] **Task 3: Create ProtectedRoute component** (AC: #2, #4)
  - [x] Create `src/components/ProtectedRoute.tsx` — checks `useAuth()`. If `isLoading`, render full-page spinner/skeleton. If `!isAuthenticated`, redirect to `/login`. If `requiredRole` prop is set, check `user.role` against allowed roles (ADMIN includes OWNER). Render `<Outlet />` on success
  - [x] Export `ProtectedRoute` as default
  - [x] Role hierarchy helper: `hasRole(userRole, requiredRole)` — OWNER > ADMIN > VIEWER

- [x] **Task 4: Create PublicLayout + TopNav** (AC: #1, #5)
  - [x] Create `src/layouts/PublicLayout.tsx` — renders `<TopNav />` + `<main><Outlet /></main>` + skip nav link
  - [x] Create `src/components/layout/TopNav.tsx` — sticky top bar with: church name/logo (left), nav links as `<NavLink>` (Accueil `/`, Calendrier `/calendar`, Departements `/departments`, En Direct `/live`), "Connexion" button (right, links to `/login`), `<LanguageSwitcher />` (right)
  - [x] Use `useTranslation()` for all nav labels — keys: `nav.public.home`, `nav.public.calendar`, `nav.public.departments`, `nav.public.live`, `nav.public.signIn`
  - [x] Active nav link styling: `indigo-600` underline/highlight via NavLink `className` callback
  - [x] Responsive: full nav links visible at `lg:` (1024px+), hamburger sheet at `< lg:`
  - [x] Add `<a>` skip link: "Aller au contenu principal" → `#main-content`, `sr-only focus:not-sr-only` styling

- [x] **Task 5: Create AuthenticatedLayout + Sidebar** (AC: #2, #5)
  - [x] Create `src/layouts/AuthenticatedLayout.tsx` — wraps content with `<SidebarProvider>`, renders `<AppSidebar />` + `<SidebarInset><header><SidebarTrigger /></header><main id="main-content"><Outlet /></main></SidebarInset>`
  - [x] Create `src/components/layout/AppSidebar.tsx` using shadcn `Sidebar` component:
    - **SidebarHeader**: church name (abbreviated) + user avatar/name
    - **SidebarContent**: role-filtered `SidebarGroup` with `SidebarMenuItem` + `SidebarMenuButton` items
    - **SidebarFooter**: language switcher + "Terminate Session" button
  - [x] Navigation items (all roles): Tableau de Bord (`/dashboard`), Calendrier (`/calendar`), Departements (`/departments`)
  - [x] Navigation items (ADMIN + OWNER only): Administration (`/admin`)
  - [x] Navigation items (OWNER only): Parametres (`/admin/settings`)
  - [x] Use `useAuth()` to read `user.role` for filtering
  - [x] Use `useTranslation()` for all labels — keys: `nav.auth.dashboard`, `nav.auth.calendar`, `nav.auth.departments`, `nav.auth.admin`, `nav.auth.settings`, `nav.auth.signOut`
  - [x] Active item styling via `NavLink` or `useLocation()` match
  - [x] Icons via `lucide-react`: `LayoutDashboard`, `Calendar`, `Building2`, `Shield`, `Settings`, `LogOut`
  - [x] Mobile: shadcn Sidebar auto-renders as Sheet (slide-out) on mobile via `useSidebar().isMobile`

- [x] **Task 6: Create LanguageSwitcher component** (AC: #3, #5)
  - [x] Create `src/components/layout/LanguageSwitcher.tsx` — compact toggle button showing current language code (FR/EN)
  - [x] On click: call `i18n.changeLanguage()` + `uiStore.setLanguage()` to switch and persist
  - [x] Use `useTranslation()` to get current `i18n.language`
  - [x] Accessible: `aria-label` with `t('nav.language.switchTo', { lang })`, `role="button"`
  - [x] Style: subtle outline button, fits in both TopNav and Sidebar footer

- [x] **Task 7: Restructure App.tsx routing with code splitting** (AC: #1, #2, #4)
  - [x] Refactor `src/App.tsx` to use nested route structure:
    ```
    <BrowserRouter>
      <QueryClientProvider>
        <AuthProvider>
          <Routes>
            {/* Auth pages — outside layouts */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />

            {/* Public route tree */}
            <Route element={<PublicLayout />}>
              <Route index element={<HomePage />} />
              <Route path="calendar" element={<PublicCalendarPage />} />
              <Route path="departments" element={<PublicDepartmentsPage />} />
              <Route path="live" element={<LivePage />} />
            </Route>

            {/* Authenticated route tree — lazy loaded */}
            <Route element={<ProtectedRoute />}>
              <Route element={<AuthenticatedLayout />}>
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="my-calendar" element={<AuthCalendarPage />} />
                <Route path="my-departments" element={<AuthDepartmentsPage />} />
              </Route>
            </Route>

            {/* Admin routes — role-gated */}
            <Route element={<ProtectedRoute requiredRole="ADMIN" />}>
              <Route element={<AuthenticatedLayout />}>
                <Route path="admin" element={<AdminPage />} />
                <Route path="admin/settings" element={<SettingsPage />} />
              </Route>
            </Route>

            {/* 404 */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
          <Toaster position="top-right" richColors />
        </AuthProvider>
      </QueryClientProvider>
    </BrowserRouter>
    ```
  - [x] Use `React.lazy()` for `AuthenticatedLayout` import to enable code splitting: `const AuthenticatedLayout = lazy(() => import('@/layouts/AuthenticatedLayout'))`
  - [x] Wrap lazy routes in `<Suspense fallback={<LoadingSpinner />}>`
  - [x] Move `QueryClientProvider` wrapping to `main.tsx` or `App.tsx` (above AuthProvider)

- [x] **Task 8: Create stub pages** (AC: #1, #2)
  - [x] Create `src/pages/HomePage.tsx` — public landing stub with `t('pages.home.title')` heading and placeholder content
  - [x] Create `src/pages/PublicCalendarPage.tsx` — stub
  - [x] Create `src/pages/PublicDepartmentsPage.tsx` — stub
  - [x] Create `src/pages/LivePage.tsx` — stub
  - [x] Create `src/pages/DashboardPage.tsx` — authenticated dashboard stub showing `t('pages.dashboard.title')` + user greeting
  - [x] Create `src/pages/AuthCalendarPage.tsx` — stub
  - [x] Create `src/pages/AuthDepartmentsPage.tsx` — stub
  - [x] Create `src/pages/AdminPage.tsx` — stub (ADMIN+ only)
  - [x] Create `src/pages/SettingsPage.tsx` — stub (OWNER only)
  - [x] Create `src/pages/NotFoundPage.tsx` — 404 page with link back to home
  - [x] All stubs use `useTranslation()` — no hardcoded strings

- [x] **Task 9: Expand i18n translation files** (AC: #3, #5)
  - [x] Update `public/locales/fr/common.json` — add keys for:
    - `nav.public.*` (home, calendar, departments, live, signIn)
    - `nav.auth.*` (dashboard, calendar, departments, admin, settings, signOut)
    - `nav.language.*` (switchTo, currentLang, fr, en)
    - `pages.*` (home.title, home.subtitle, dashboard.title, dashboard.welcome, calendar.title, departments.title, live.title, admin.title, settings.title, notFound.title, notFound.message, notFound.backHome)
    - `layout.*` (skipToContent, loading, churchName)
    - `roles.*` (owner, admin, viewer) — for sidebar role display
  - [x] Update `public/locales/en/common.json` — English equivalents for all above keys
  - [x] Church name: `app.churchName` = "Eglise Adventiste du 7e Jour de Saint-Hubert"

- [x] **Task 10: Component tests** (AC: all)
  - [x] `src/components/layout/TopNav.test.tsx` — renders nav links with French labels, "Connexion" button visible, language switcher present, active link highlighted
  - [x] `src/components/layout/AppSidebar.test.tsx` — VIEWER sees Dashboard/Calendar/Departments/SignOut only. ADMIN sees those + Administration. OWNER sees all + Settings. Uses MSW + AuthContext mock at different roles
  - [x] `src/components/layout/LanguageSwitcher.test.tsx` — renders current language, toggles to other language on click, persists to localStorage
  - [x] `src/components/ProtectedRoute.test.tsx` — unauthenticated redirects to /login, authenticated renders Outlet, wrong role shows forbidden or redirects

- [x] **Task 11: Integration / navigation tests** (AC: #1, #2, #4)
  - [x] `src/layouts/PublicLayout.test.tsx` — anonymous user sees TopNav + page content via Outlet
  - [x] `src/layouts/AuthenticatedLayout.test.tsx` — authenticated user sees Sidebar + content
  - [x] Route navigation test: verify `/` renders public home, `/dashboard` redirects to `/login` when unauthenticated, `/dashboard` renders dashboard when authenticated
  - [x] i18n integration: render app, switch language, verify nav labels change
  - [x] Accessibility: skip link present and functional, sidebar keyboard navigable

## Dev Notes

### Architecture Compliance

- **Dual route trees**: Public routes (`/`, `/calendar`, `/departments`, `/live`) wrapped by `PublicLayout`. Authenticated routes (`/dashboard`, `/my-calendar`, `/my-departments`, `/admin/*`) wrapped by `AuthenticatedLayout` inside `ProtectedRoute`. Auth pages (`/login`, `/forgot-password`, `/reset-password`) live outside both layouts
- **Layout-level code splitting (NFR5)**: `AuthenticatedLayout` imported via `React.lazy()` + `<Suspense>`. Anonymous visitors never download sidebar, admin components, or authenticated page code
- **State management stack** (Architecture Decision #6): `AuthContext` (React Context) for user identity. `TanStack Query` for server state (initialized here, used by future stories). `Zustand` for UI state (`useUiStore` — sidebar open/close, language preference)
- **i18n constraint** (Architecture Decision #5): All user-facing strings through `useTranslation()`. French is hardcoded default (`lng: 'fr'`). No `i18next-browser-languagedetector`. English available via explicit toggle only. Language preference persisted in localStorage
- **Frontend boundaries** (Architecture doc): Public route tree loads `PublicLayout` (no auth check, lighter bundle). Authenticated route tree loads `AuthLayout` with `ProtectedRoute` wrapper. Component ownership: layout components in `src/layouts/`, navigation components in `src/components/layout/`, shared UI in `src/components/ui/`
- **Anti-patterns to avoid**: No server data in Zustand. No hardcoded strings. No manual loading state booleans (use TanStack Query built-in states). No `any` type. No raw `fetch()` — use configured Axios instance from `src/lib/api.ts`

### Security Constraints

- **ProtectedRoute** checks `useAuth()` context (populated by `/api/auth/me` call on mount). If `isLoading`, show spinner (prevents flash of wrong layout). If `!isAuthenticated`, redirect to `/login` — never render protected content
- **Role-based navigation filtering**: Sidebar items filtered client-side for UX only. Backend enforces authorization on every API call. Frontend hiding nav items is convenience, not security
- **No authenticated data in public bundle**: Code splitting ensures admin components, service calls, and authenticated page logic are in separate chunks

### Frontend Patterns

- **React Router v7** (`react-router-dom ^7.13.1`): Using JSX `<Routes>` pattern (v7 supports this fully). `<Outlet />` for nested layouts. `<NavLink>` with `className` callback for active states. `<Navigate to="/login" replace />` for redirects in ProtectedRoute
- **shadcn/ui Sidebar**: Install via `npx shadcn@latest add sidebar`. Uses `SidebarProvider` → `Sidebar` → `SidebarHeader/Content/Footer` → `SidebarGroup` → `SidebarMenuItem` + `SidebarMenuButton`. Auto-handles mobile as Sheet via `useSidebar().isMobile`. Collapsible modes available: `"offcanvas"` (default), `"icon"`, `"none"`
- **Zustand v5**: `create<UIState>()((set) => ({ ... }))`. One store (`useUiStore`) for all UI state. Actions are verbs: `toggleSidebar()`, `setLanguage()`. Persist sidebar state to localStorage for cross-session consistency
- **TanStack Query v5**: `QueryClientProvider` wraps the app. `QueryClient` with `defaultOptions: { queries: { staleTime: 5 * 60 * 1000, retry: 1 } }`. DevTools conditionally rendered in dev. No queries in this story — provider initialization only
- **Toast notifications**: Continue using `sonner` — `<Toaster position="top-right" richColors />` remains in App.tsx
- **HTTP client**: Continue using configured Axios instance from `src/lib/api.ts` with `withCredentials: true` and 401->refresh->retry interceptor
- **Icons**: `lucide-react` (already installed) — use named imports: `LayoutDashboard`, `Calendar`, `Building2`, `Shield`, `Settings`, `LogOut`, `Menu`, `X`, `Globe`, `ChevronDown`

### UX Design Requirements

- **Public TopNav**: Full-width sticky header. Church name left-aligned, nav links center/right, "Connexion" button + language switcher far right. On mobile (`< lg:`), nav links collapse into a hamburger Sheet
- **Authenticated Sidebar**: 288px fixed left sidebar on desktop (`lg:` 1024px+). Icon-only collapsed mode on tablet (`sm:` 640-1023px). Sheet slide-out on mobile (`< sm:` 640px). SidebarTrigger (hamburger icon) visible in the authenticated header on mobile/tablet
- **Breakpoint mapping** (CRITICAL — from UX spec):
  - Mobile: base (no modifier) — `< 640px`
  - Tablet: `sm:` — `640-1023px`
  - Desktop: `lg:` — `>= 1024px`
  - **`md:` (768px) is intentionally UNUSED — do NOT apply styles at `md:`**
- **Navigation vocabulary**:
  - Public register (warm): "Accueil", "Calendrier", "Departements", "En Direct", "Connexion"
  - Operational register (auth): "Tableau de Bord", "Calendrier", "Departements", "Administration", "Parametres", "Terminate Session"
- **Typography**: Inter font (self-hosted WOFF2, `font-display: swap`). H1: `text-2xl font-black`. Nav labels: `text-sm font-medium`. Public layer minimum text size: 14px (`text-sm`)
- **Colors**: `indigo-600` primary accent for active states, buttons, focus rings. `slate-900` for dark hero/sidebar header. Semantic tokens only in components (`bg-primary`, `text-foreground`, `border-border`), never raw Tailwind colors
- **Skip navigation**: Hidden `<a>` link "Aller au contenu principal" — `sr-only focus:not-sr-only` on desktop. Jumps to `<main id="main-content">`
- **Focus management**: On route change, focus moves to `<main>` or page heading. Sidebar keyboard navigable with arrow keys
- **Motion**: Sidebar collapse/expand transition 300ms ease. Respect `prefers-reduced-motion` — disable transitions

### Library/Framework Requirements

| Package | Version | Purpose | Notes |
|---|---|---|---|
| `react-router-dom` | ^7.13.1 | Routing, nested layouts, NavLink | Already installed. Use JSX Routes pattern |
| `react-i18next` | ^16.5.4 | i18n React integration | Already installed + initialized in `src/i18n.ts` |
| `i18next` | ^25.8.13 | i18n core | Already installed. `useTranslation()` hook |
| `i18next-http-backend` | ^3.0.2 | Loads JSON translations | Already installed. Loads from `/locales/{lang}/common.json` |
| `zustand` | ^5.0.11 | UI state (sidebar, language) | Installed but unused. Create `useUiStore` |
| `@tanstack/react-query` | ^5.90.21 | Server state management | Installed but unused. Initialize provider |
| `@tanstack/react-query-devtools` | ^5.91.3 | Dev tools | Dev-only, conditional render |
| `lucide-react` | ^0.576.0 | Icons | Already installed |
| shadcn/ui `sidebar` | Latest | Sidebar component | **INSTALL**: `npx shadcn@latest add sidebar` |
| shadcn/ui `sheet` | Latest | Mobile drawer | **INSTALL**: `npx shadcn@latest add sheet` |
| shadcn/ui `separator` | Latest | Visual dividers | **INSTALL**: `npx shadcn@latest add separator` |
| shadcn/ui `tooltip` | Latest | Nav item tooltips (collapsed) | **INSTALL**: `npx shadcn@latest add tooltip` |
| shadcn/ui `dropdown-menu` | Latest | Overflow menus | **INSTALL**: `npx shadcn@latest add dropdown-menu` |

**No new npm packages to install** — all runtime dependencies already in `package.json`. Only shadcn/ui components need to be added via CLI.

### Project Structure Notes

**Files to CREATE:**
```
src/sdamanagement-web/src/
├── layouts/
│   ├── PublicLayout.tsx                    # Public shell: TopNav + Outlet
│   └── AuthenticatedLayout.tsx            # Auth shell: SidebarProvider + Sidebar + Outlet
├── components/
│   ├── layout/
│   │   ├── TopNav.tsx                     # Public top navigation bar
│   │   ├── AppSidebar.tsx                 # Authenticated sidebar (shadcn Sidebar)
│   │   └── LanguageSwitcher.tsx           # FR/EN toggle component
│   ├── ProtectedRoute.tsx                 # Auth + role guard, renders Outlet
│   └── LoadingSpinner.tsx                 # Full-page loading state for Suspense
├── stores/
│   └── uiStore.ts                         # Zustand: sidebarOpen, language
├── lib/
│   └── queryClient.ts                     # TanStack Query client config
├── pages/
│   ├── HomePage.tsx                       # Public landing stub
│   ├── PublicCalendarPage.tsx             # Public calendar stub
│   ├── PublicDepartmentsPage.tsx          # Public departments stub
│   ├── LivePage.tsx                       # YouTube live stub
│   ├── DashboardPage.tsx                  # Authenticated dashboard stub
│   ├── AuthCalendarPage.tsx               # Authenticated calendar stub
│   ├── AuthDepartmentsPage.tsx            # Authenticated departments stub
│   ├── AdminPage.tsx                      # Admin panel stub
│   ├── SettingsPage.tsx                   # Owner settings stub
│   └── NotFoundPage.tsx                   # 404 page
└── components/ui/
    ├── sidebar.tsx                         # shadcn (auto-generated)
    ├── sheet.tsx                           # shadcn (auto-generated)
    ├── separator.tsx                       # shadcn (auto-generated)
    ├── tooltip.tsx                         # shadcn (auto-generated)
    └── dropdown-menu.tsx                   # shadcn (auto-generated)
```

**Files to MODIFY:**
```
src/sdamanagement-web/src/
├── App.tsx                                # MODIFY: restructure routes, add lazy imports, Suspense
├── main.tsx                               # MODIFY: add QueryClientProvider wrapper
├── index.css                              # MODIFY: add Inter font import, register-aware CSS vars if needed
└── public/locales/
    ├── fr/common.json                     # MODIFY: add nav, pages, layout, roles keys
    └── en/common.json                     # MODIFY: add English equivalents
```

**Test files to CREATE:**
```
src/sdamanagement-web/src/
├── components/
│   ├── layout/
│   │   ├── TopNav.test.tsx
│   │   ├── AppSidebar.test.tsx
│   │   └── LanguageSwitcher.test.tsx
│   └── ProtectedRoute.test.tsx
└── layouts/
    ├── PublicLayout.test.tsx
    └── AuthenticatedLayout.test.tsx
```

### Testing Requirements

- **Component tests (Vitest + Testing Library)**:
  - `TopNav.test.tsx`: renders all nav links with French labels, "Connexion" button present, language switcher renders, active link gets correct styling
  - `AppSidebar.test.tsx`: test with 3 role contexts (VIEWER, ADMIN, OWNER) — verify correct nav items shown/hidden per role. Use AuthContext mock. Test "Terminate Session" calls logout
  - `LanguageSwitcher.test.tsx`: renders current language, clicking toggles language, `localStorage.setItem` called, `i18n.changeLanguage` called
  - `ProtectedRoute.test.tsx`: unauthenticated → renders Navigate to /login. Loading → renders spinner. Authenticated → renders Outlet. Wrong role → redirects
- **Layout integration tests**:
  - `PublicLayout.test.tsx`: renders TopNav + child route content via MemoryRouter
  - `AuthenticatedLayout.test.tsx`: renders Sidebar + child content, authenticated user context
- **i18n integration**: render a page, verify French labels. Toggle to English, verify labels change. Refresh (re-render), verify language persisted
- **Accessibility**: skip link present and receives focus. Sidebar items keyboard navigable. `aria-current="page"` on active nav items
- **Test utilities**: Use existing `src/test-utils.tsx` which wraps with `AuthProvider`. Extend if needed to include `QueryClientProvider`, `MemoryRouter`, and `I18nextProvider`
- **MSW**: Extend existing `src/mocks/handlers/auth.ts` if needed for different role responses on `/api/auth/me`

### Previous Story Intelligence (from Story 1.5)

- **App.tsx structure**: Currently `<BrowserRouter><AuthProvider><Routes>...<Toaster /></AuthProvider></BrowserRouter>`. The BrowserRouter and AuthProvider positions should be preserved. Add QueryClientProvider between BrowserRouter and AuthProvider
- **AuthContext** (`src/contexts/AuthContext.tsx`): Exposes `user` (with `userId`, `email`, `firstName`, `lastName`, `role`), `isAuthenticated`, `isLoading`, `login()` (Google redirect), `logout()`, `checkAuth()`. The `role` field is a string: `"OWNER"`, `"ADMIN"`, `"VIEWER"`. Use this directly for role checks
- **i18n setup** (`src/i18n.ts`): Already configured with `i18next-http-backend`, loads from `/locales/{lang}/common.json`, default `fr`, fallback `fr`, saved language from localStorage. DO NOT reconfigure — just use `useTranslation()` in new components
- **Translation files**: `public/locales/fr/common.json` and `en/common.json` exist with `app.title` and all `auth.*` keys. Extend, do not replace
- **Existing pages**: `LoginPage.tsx`, `ForgotPasswordPage.tsx`, `ResetPasswordPage.tsx` — these must remain accessible at their current routes (`/login`, `/forgot-password`, `/reset-password`), outside both PublicLayout and AuthenticatedLayout
- **shadcn/ui style**: `new-york` style, `neutral` base color, `lucide` icons, CSS variables enabled, Tailwind v4 with `@import` syntax (not `tailwind.config.js`)
- **Tailwind CSS v4**: Uses `@tailwindcss/vite` plugin. Configuration is in `index.css` via `@theme` directive, NOT in `tailwind.config.js`. Custom theme values go in `index.css`
- **Path alias**: `@` maps to `src/` — use `@/components/...`, `@/layouts/...`, `@/stores/...` imports
- **Test pattern**: Vitest + `@testing-library/react` + MSW. Test files co-located next to source. Use `src/test-utils.tsx` for provider wrapping. MSW handlers in `src/mocks/handlers/`
- **Code review from 1.5**: Keep controllers thin. Single SaveChangesAsync per operation. Avoid N+1 queries. Extract shared components (like PasswordStrengthIndicator was extracted)

### Git Intelligence

- **Commit pattern**: `feat(auth): Story 1.X — <description>`. This story should use: `feat(shell): Story 1.6 — <description>`
- **Recent commits**: Stories 1.1-1.5 all completed successfully. 5 commits on main, all `feat(...)` prefixed
- **Files established**: Controllers, Services, Dtos, Data/Entities (backend). Pages, components/auth, components/ui, contexts, schemas, mocks/handlers (frontend)
- **Frontend-only story**: Story 1.6 is entirely frontend. No backend changes needed. No migrations, no new endpoints, no new DTOs

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 1, Story 1.6]
- [Source: _bmad-output/planning-artifacts/architecture.md — Key Principles #4 (i18n), Decision #5 (i18n day-one), Decision #6 (state stack), Decision #11 (code splitting)]
- [Source: _bmad-output/planning-artifacts/architecture.md — i18n Configuration, Frontend File Structure, Zustand Store Conventions, Frontend Boundaries]
- [Source: _bmad-output/planning-artifacts/architecture.md — Agent Guidelines #4 (i18n strings), Anti-Patterns (hardcoded strings)]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Navigation Patterns, Responsive Strategy, Breakpoint Mapping, Vocabulary Mapping]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Skip Navigation, Keyboard Navigation, Design Tokens, Typography]
- [Source: _bmad-output/planning-artifacts/prd.md — FR61-FR64 (Navigation/i18n), NFR5 (code splitting)]
- [Source: _bmad-output/implementation-artifacts/1-5-email-password-sign-in-and-first-login-password-set.md — App.tsx structure, AuthContext, i18n.ts, shadcn/ui config, test patterns]
- [Source: Context7 — react-router v7 Outlet/lazy patterns, shadcn/ui Sidebar component API, react-i18next useTranslation hook]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (claude-opus-4-6)

### Debug Log References

- Fixed `window.matchMedia` not available in jsdom — added mock to `test-setup.ts`
- Fixed LanguageSwitcher test: `uiStore.setLanguage()` was importing `i18n` directly which is a different instance than test i18n. Refactored: store handles localStorage persistence only, component calls `i18n.changeLanguage()` via hook instance
- Fixed ProtectedRoute test inter-test interference: previous test's pending 401->refresh->auth:expired chain was leaking into next test. Fixed by using never-resolving handler for loading state test (preventing leaking side effects)
- Fixed test-utils: kept BrowserRouter as default wrapper (backward compatible with pre-existing tests using `window.history.pushState`), added `routerProps` option for MemoryRouter
- Updated MSW mock handler role strings from lowercase ("Viewer") to uppercase ("VIEWER") to match backend role enum convention
- Added `window.matchMedia` mock, `TooltipProvider`, and `QueryClientProvider` to test setup

### Completion Notes List

- All 11 tasks completed. 41/41 tests pass (9 test files) including 14 pre-existing tests with zero regressions
- Installed shadcn/ui components: sidebar, sheet, separator, tooltip, dropdown-menu (+ auto-generated skeleton, use-mobile)
- Created Zustand uiStore for sidebar state and language preference persistence
- Initialized TanStack Query provider with sensible defaults and dev-only devtools
- Created ProtectedRoute with role hierarchy (OWNER > ADMIN > VIEWER) and loading/redirect states
- Created PublicLayout with TopNav (responsive, hamburger sheet on mobile) and skip-to-content link
- Created AuthenticatedLayout with shadcn Sidebar, role-filtered navigation, and SidebarTrigger
- Created LanguageSwitcher (FR/EN toggle) with accessible aria-label and localStorage persistence
- Restructured App.tsx with dual route trees: public (PublicLayout) and authenticated (AuthenticatedLayout + ProtectedRoute)
- Implemented layout-level code splitting via React.lazy() for AuthenticatedLayout and all auth pages
- Created 10 stub pages with i18n translation keys, no hardcoded strings
- Expanded FR and EN translation files with nav, pages, layout, and roles keys
- QueryClientProvider placed in main.tsx (outside App), TooltipProvider in App.tsx
- All components use semantic shadcn/ui tokens, indigo-600 accent, lg: breakpoint for responsive

### File List

**New files:**
- src/sdamanagement-web/src/stores/uiStore.ts
- src/sdamanagement-web/src/lib/queryClient.ts
- src/sdamanagement-web/src/components/ProtectedRoute.tsx
- src/sdamanagement-web/src/components/LoadingSpinner.tsx
- src/sdamanagement-web/src/components/layout/TopNav.tsx
- src/sdamanagement-web/src/components/layout/AppSidebar.tsx
- src/sdamanagement-web/src/components/layout/LanguageSwitcher.tsx
- src/sdamanagement-web/src/layouts/PublicLayout.tsx
- src/sdamanagement-web/src/layouts/AuthenticatedLayout.tsx
- src/sdamanagement-web/src/pages/HomePage.tsx
- src/sdamanagement-web/src/pages/PublicCalendarPage.tsx
- src/sdamanagement-web/src/pages/PublicDepartmentsPage.tsx
- src/sdamanagement-web/src/pages/LivePage.tsx
- src/sdamanagement-web/src/pages/DashboardPage.tsx
- src/sdamanagement-web/src/pages/AuthCalendarPage.tsx
- src/sdamanagement-web/src/pages/AuthDepartmentsPage.tsx
- src/sdamanagement-web/src/pages/AdminPage.tsx
- src/sdamanagement-web/src/pages/SettingsPage.tsx
- src/sdamanagement-web/src/pages/NotFoundPage.tsx
- src/sdamanagement-web/src/components/ui/sidebar.tsx (shadcn auto-generated)
- src/sdamanagement-web/src/components/ui/sheet.tsx (shadcn auto-generated)
- src/sdamanagement-web/src/components/ui/separator.tsx (shadcn auto-generated)
- src/sdamanagement-web/src/components/ui/tooltip.tsx (shadcn auto-generated)
- src/sdamanagement-web/src/components/ui/dropdown-menu.tsx (shadcn auto-generated)
- src/sdamanagement-web/src/components/ui/skeleton.tsx (shadcn auto-generated)
- src/sdamanagement-web/src/hooks/use-mobile.ts (shadcn auto-generated)
- src/sdamanagement-web/src/components/layout/TopNav.test.tsx
- src/sdamanagement-web/src/components/layout/AppSidebar.test.tsx
- src/sdamanagement-web/src/components/layout/LanguageSwitcher.test.tsx
- src/sdamanagement-web/src/components/ProtectedRoute.test.tsx
- src/sdamanagement-web/src/layouts/PublicLayout.test.tsx
- src/sdamanagement-web/src/layouts/AuthenticatedLayout.test.tsx
- src/sdamanagement-web/src/App.test.tsx (route navigation + i18n integration tests)

**Modified files:**
- src/sdamanagement-web/src/App.tsx (restructured routing, lazy imports, Suspense, TooltipProvider)
- src/sdamanagement-web/src/main.tsx (added QueryClientProvider, ReactQueryDevtools, static spinner Suspense fallback)
- src/sdamanagement-web/src/test-utils.tsx (added translations, QueryClientProvider, TooltipProvider, MemoryRouter option)
- src/sdamanagement-web/src/test-setup.ts (added window.matchMedia mock)
- src/sdamanagement-web/src/mocks/handlers/auth.ts (added ADMIN/OWNER mock users, uppercase role strings)
- src/sdamanagement-web/package-lock.json (updated from shadcn component installs)
- src/sdamanagement-web/public/locales/fr/common.json (expanded with nav, pages, layout, roles keys + app.churchInitials)
- src/sdamanagement-web/public/locales/en/common.json (expanded with English equivalents + app.churchInitials)

### Change Log

- 2026-03-03: Story 1.6 implementation — Application shell with dual navigation (public TopNav + authenticated Sidebar), i18n translation expansion, code splitting, role-based routing, TanStack Query init, Zustand UI store, 10 stub pages, 6 test files (20 new tests)
- 2026-03-03: Code review fixes (Sonnet 4.6) — [H1] Added inner Suspense boundary in AuthenticatedLayout wrapping Outlet (sidebar stays visible during lazy page transitions). [H2] Replaced hardcoded "SD" in AppSidebar with `t("app.churchInitials")` translation key. [H3] Added missing tests: TopNav active link styling, i18n integration (language switch), route navigation integration (4 new tests in App.test.tsx + 1 in TopNav.test.tsx). [M2] Created `changeAppLanguage()` coordinating function in uiStore to prevent latent i18n/store desync. [M3] Replaced main.tsx Suspense `<div>...</div>` with static spinner (no i18n dependency). [M1] Fixed story File List: removed false index.css claim, added package-lock.json + App.test.tsx.
