---
stepsCompleted: [1, 2, 3, 4, 5]
inputDocuments:
  - planning-general-final-pour-comite.xlsx
  - st-hubert-operations-command-mock-app (full codebase)
  - adventist-cloud-acms-research
date: 2026-02-25
author: Elisha
---

# Product Brief: SDAC ST-HUBERT Operations Command

## Executive Summary

SDAC ST-HUBERT Operations Command is a church operations management web application for the Eglise Adventiste du 7e Jour de Saint-Hubert (Quebec, Canada). It has two faces: a **public layer** that anyone can visit without logging in (church schedule, upcoming events, YouTube live services, department overview) and an **authenticated operations layer** where church leadership manages weekly Sabbath planning, department activities, meetings, member roles, and event calendars.

It replaces manual Excel-based planning, fragmented Zoom links, and informal department coordination with a unified digital platform — while also giving the general congregation and visitors a place to see what's happening at the church.

This is a **personal-use, single-congregation tool** — not a competitor to Adventist Cloud/ACMS. Where ACMS handles denominational-level membership records, global transfers, and tithe remittance to conferences, this app focuses on the **operational layer** that ACMS does not cover: who preaches this Sabbath, which deacon pair is assigned, what special activity runs this week, and which department owns it.

---

## Core Vision

### Problem Statement

The Saint-Hubert SDA church committee currently manages its annual operations through:

1. **A master Excel spreadsheet** ("PLANNING GENERAL FINAL POUR COMITE") that tracks 52 weeks of assignments across 7+ columns (predicateur, ancien de service, annonces, diaconat M/F, departement responsable, activites, conference generale).
2. **Scattered Zoom links** shared informally for department meetings.
3. **No centralized system** for tracking department projects, sub-ministry agendas, meeting minutes, or progress on church activities.
4. **Manual communication** — committee members must be told their assignments; there is no self-service lookup.
5. **No public information hub** — regular members and visitors have no way to check the church schedule, see what's happening this Sabbath, or find the YouTube live link without asking someone on WhatsApp.

This creates friction: assignments are missed, the Excel is hard to update collaboratively, new members don't know where to find information, there's no visibility into department activity, and the general congregation is left out of the information loop entirely.

### Problem Impact

- Committee members show up unprepared because they didn't check the Excel
- Department directors operate in silos with no shared pipeline
- The head elder has no dashboard view of congregational operations
- Onboarding new officers each nominating committee cycle requires manual training on where things are
- Historical data (who served when, what events happened) is lost across years
- Regular members and visitors cannot check church schedule, service times, or YouTube live links without contacting someone directly

### Why Existing Solutions Fall Short

| Solution | Gap |
|---|---|
| **ACMS (Adventist Cloud)** | Denominational membership management (baptisms, transfers, tithe tracking, statistical reports to conference). Does NOT handle weekly Sabbath service planning, department operational pipelines, or local event coordination. |
| **eAdventist (NAD)** | Membership clerk tool for North American Division. Census-level data, not operational scheduling. |
| **Adventist Cloud Web Engine** | Website builder for church public presence. No internal operations management. |
| **Google Sheets / Excel** | Current solution. No role-based access, no notifications, no dashboard, no meeting/room management, poor mobile experience. |
| **Generic church management (Planning Center, Breeze)** | Not designed for SDA-specific structure (Sabbath-centric schedule, ancienat/diaconat rotation, departmental org chart with sub-ministries, SDA event calendar with camp meetings, weeks of prayer, etc.). |

### Proposed Solution

A purpose-built web application with:

- **C# / ASP.NET Core backend** (API) — leveraging the developer's existing expertise
- **React + TypeScript + Tailwind CSS frontend** — matching the design language already prototyped in the mock app
- **PostgreSQL database** — relational, free, production-grade
- **Google OAuth + email/password fallback** for authentication
- A **role-based multi-view system** that gives each officer exactly the interface they need

The system absorbs the Excel planning data as its core scheduling engine and wraps it with dashboards, department management, calendar views, meeting coordination, and member administration.

### Key Differentiators

1. **SDA-native data model**: The schema understands Sabbaths, ancienat rotation, diaconat pairs, SDA department taxonomy (JA, MIFEM, MF, ME, MP, AE), camp meeting seasons, weeks of prayer, and quarterly Sainte-Cene dates.
2. **Operational focus**: Not membership/tithe (that's ACMS's job) — this is about *running the church week-to-week*.
3. **Bilingual by default**: French primary (matching the congregation), English secondary.
4. **Single-congregation simplicity**: One church, one deployment, zero overhead.
5. **Design language continuity**: The premium dark/light UI with the bold typographic system, rounded cards, and indigo accent palette from the prototype carries forward unchanged.

---

## Target Users

### Role Architecture

```
ANONYMOUS (No login required — public access)
  ├── View church schedule: this week's Sabbath program, upcoming events
  ├── View YouTube live embed / live service status
  ├── View calendar (public events only)
  ├── View department list with descriptions (overview level)
  ├── View program times (Sabbath School, Divine Service, AY)
  └── CANNOT see: user registry, transcripts, meeting details, zoom links,
      project pipelines, admin panel, personal assignments

VIEWER (Officers, committee members — requires login)
  ├── Everything ANONYMOUS can see, plus:
  ├── Personal "My Assignments" view
  ├── Full Sabbath assignment details (who is doing what)
  ├── Department detail views (projects, sub-ministries)
  ├── Transcripts (read-only)
  ├── Virtual room access (join meetings)
  └── Attendance/engagement data

ADMIN (Church Leaders — pastors, elders, department directors)
  ├── Everything VIEWER can see, plus:
  ├── Manage departments they are assigned to (projects, meetings, sub-units)
  ├── Create/edit Sabbath assignments for their departments
  ├── Add and promote other users to ADMIN
  ├── Upload transcripts, trigger AI summaries
  ├── Manage virtual rooms and programs
  └── Pastor(s) are ADMINs assigned to ALL departments (de facto full operational access)

OWNER (System Administrator)
  ├── Everything ADMIN can see, plus:
  ├── Full system control: infrastructure, all data, all departments
  ├── Create other OWNERs
  ├── Delete users
  ├── System health & diagnostics
  └── One or very few people. Technical sysadmin. NOT a church office.
```

Key clarifications:
- **ANONYMOUS is the default**. The app loads into a public view without requiring login. A "Sign In" button in the header provides access to authenticated features.
- **The OWNER role is a sysadmin role** — the person who deploys, maintains, and has unrestricted technical access to the system.
- The pastor and head elder are **ADMINs** assigned to all departments, which gives them full operational visibility.
- This separation means church leadership turnover (pastor transfers, new elder board) doesn't require sysadmin handover.

### Persona 0: Visitor / Regular Member (ANONYMOUS — no login)

- **Archetype**: A church member who attends Sabbath services, a visitor exploring the church, a member's family following from abroad
- **Needs**: Know what's happening this Sabbath (who preaches, what's the activity), find the YouTube live stream link, check upcoming events, see service times
- **Pain points**: Currently has to ask on WhatsApp or wait for a bulletin; no self-service information for non-officers
- **Key interactions**: Public dashboard (this week's schedule, live service embed, upcoming events), public calendar, department overview, program times
- **Access level**: No account needed. Sees curated public information only. No operational details, no zoom links, no transcripts, no user registry.

### Persona 1: System Administrator (OWNER)

- **Archetype**: Elisha (developer/technical lead)
- **Responsibilities**: Deploys and maintains the system, manages infrastructure, handles data imports, creates initial user accounts, troubleshoots
- **Key interactions**: Full admin panel, system health monitoring, user registry, data import tools, all department access
- **Access level**: OWNER — unrestricted. Can see and modify everything including system configuration

### Persona 2: Pastor (ADMIN — all departments)

- **Archetype**: Pasteur L. Vicuna
- **Responsibilities**: Preaches most Sabbaths, chairs church board, oversees all ministries
- **Pain points**: No single view of what's happening across all departments; relies on phone calls and WhatsApp to coordinate
- **Key interactions**: Dashboard overview, full calendar, all department visibility, Sabbath schedule management, can add/edit assignments
- **Access level**: ADMIN assigned to every department — full operational access without needing sysadmin privileges

### Persona 3: Department Director (ADMIN — scoped)

- **Archetype**: K. Beke (Ancien), Director MIFEM, Director JA
- **Responsibilities**: Manages a specific ministry (e.g., Youth/JA, Women's Ministry/MIFEM, Family/MF, Evangelism/ME)
- **Pain points**: Can't see their department's upcoming responsibilities without checking the Excel; no project tracking for multi-week initiatives
- **Key interactions**: Department detail view with project pipeline, sub-ministry management, meeting scheduling, calendar filtered by their department, can add other users as admins
- **Access level**: ADMIN scoped to their assigned department(s). Can see all departments read-only, manage only their own

### Persona 4: Church Secretary (ADMIN — scoped)

- **Archetype**: Sis. Elena
- **Responsibilities**: Maintains records, meeting minutes, board documentation, user onboarding
- **Pain points**: Meeting minutes scattered across email/docs; no centralized transcript archive
- **Key interactions**: Transcripts/archives module, user registry management, can add new users
- **Access level**: ADMIN scoped to Secretary department + user management privileges

### Persona 5: Officer / Committee Member (VIEWER)

- **Archetype**: Elisha Raharijaona (Diacre), Carole Koumi (Annonces), Jacinthe Legault
- **Responsibilities**: Assigned periodic duties (preaching, announcements, deacon service)
- **Pain points**: Has to ask someone or dig through Excel to know when they're scheduled
- **Key interactions**: Dashboard with personal upcoming assignments, calendar with their schedule highlighted, virtual room access
- **Access level**: VIEWER — read-only with personal schedule emphasis

---

## Authentication & Identity

### Access Flow

```
Anyone visits app
    │
    ├─→ PUBLIC VIEW (no login required)
    │       └─→ Church schedule, calendar, YouTube live, dept overview, program times
    │           └─→ "Sign In" button visible in header for authenticated access
    │
    └─→ User clicks "Sign In"
            │
            ├─→ [Sign in with Google] (primary)
            │       └─→ OAuth 2.0 → match Google email to user record → session
            │           └─→ If email not in system → "Contact your admin" message
            │
            └─→ [Email + Password] (fallback)
                    └─→ Traditional login → match email to user record → session
```

### Key Rules

- **Anonymous-first design**. The app loads into a public view by default. No login barrier to see the church schedule, events, or live service. This is the experience for the majority of the congregation.
- **Email is the unique identifier**. A user's account is their email address, regardless of login method.
- **No self-registration**. An ADMIN or OWNER must first create the user record with their email. Only then can that person log in (via Google or password). If someone tries to sign in with Google and their email is not in the system, they get a clear message to contact their admin — they are not auto-created.
- **Google OAuth is primary**. Most church members have Gmail; this eliminates password management friction.
- **Email/password is fallback**. For users without Google accounts or who prefer traditional login. Password is set during first login or via admin invitation.
- **ADMINs can invite users**. An admin creates a user entry (name, email, role, departments), and the system sends an invitation or the user simply logs in with that email via Google.
- **ADMINs can promote to ADMIN**. Any existing admin can elevate a viewer to admin and assign them departments. Only OWNER can create other OWNERs.

---

## Success Metrics

### User Success

| Metric | Target |
|---|---|
| Assignment lookup time | < 10 seconds from login to seeing next duty |
| Committee meeting prep | 100% self-service — no one needs to call to check assignments |
| Department visibility | All 12+ departments with pipeline, projects, and meetings tracked |
| Adoption rate | 80% of active officers using the platform weekly within 3 months |
| Public info access | Any member/visitor can check this week's schedule without login in < 5 seconds |
| YouTube discoverability | Live service link findable on landing page without scrolling |

### Technical Success

| Metric | Target |
|---|---|
| Page load time | < 2 seconds on mobile |
| API response time | < 200ms for schedule queries |
| Uptime | 99.5% |
| Data integrity | Zero scheduling conflicts or missed assignments |

### Operational Objectives

- Eliminate the Excel spreadsheet as single source of truth by launch
- Reduce "who is doing what this Sabbath" inquiries to pastor by 90%
- Enable year-over-year continuity: when officers change at nominating committee, historical data persists
- Serve as a template other local SDA churches could adapt (future, not MVP)

---

## MVP Scope (v1.0)

### Epic 1: Authentication & Authorization

- **Anonymous public access by default** — app loads into public view without login
- Google OAuth 2.0 login (primary) via "Sign In" button
- Email + password login (fallback)
- Email as unique user identifier — no self-registration; unrecognized Google emails get a "contact admin" message
- Role-based access: ANONYMOUS (public), VIEWER, ADMIN (scoped to departments), OWNER
- ADMINs can create users and promote to ADMIN
- Only OWNER can create other OWNERs
- JWT session tokens for SPA; public endpoints require no token
- French-first UI

### Epic 2: Sabbath Planning Engine (Core)

- Import and display the annual planning grid (the Excel data structure)
- Weekly view: for any given Sabbath show predicateur, ancien de service, annonces, diaconat (M+F), departement responsable, activite, conference generale
- "This Week" and "Next Week" quick-view on dashboard
- "My Assignments" personal view for logged-in user (all roles)
- CRUD for schedule entries (ADMIN for their departments, OWNER for all)
- Special Sabbath tagging: Sainte-Cene, Week of Prayer, Camp Meeting, Youth Day, etc.

### Epic 3: Dashboard

**Public dashboard (anonymous):**
- This week's Sabbath info: predicateur, service time, special activity
- YouTube live embed / link with live status indicator
- Upcoming events list (next 4 weeks)
- Program times (Sabbath School, Divine Service, AY)
- Department overview cards (names + next scheduled event)
- "Sign In" call-to-action for officers

**Authenticated dashboard (VIEWER+):**
- Everything from public dashboard, plus:
- Personal assignment summary ("My next duties")
- Full ministry units overview with next program per department
- Mini calendar with all events
- Engagement/attendance charts (placeholder for future data input)

### Epic 4: Calendar

- Day / Week / Month / Year views (as in mock)
- **Public**: shows church-wide events, special Sabbaths, activities (no internal project details)
- **Authenticated**: adds department projects, meetings, full assignment details
- Filter by department
- Add milestone/event (ADMIN/OWNER)
- Visual department color coding

### Epic 5: Department Management

- List all departments with sub-ministries
- Department detail: project pipeline (NOT_STARTED → IN_PROGRESS → ON_HOLD → FINISHED / CANCELLED)
- Sub-ministry units with leads
- Meeting management: create meetings with Zoom link or physical location
- Meeting agenda per sub-unit
- ADMINs can only edit departments assigned to them; OWNER can edit all

### Epic 6: Transcripts / Archives

- Upload and store meeting minutes and sermon transcripts
- Filter by status (PENDING, PROCESSED), department, priority
- Detail view with full content
- AI summary integration (Gemini or Claude API)

### Epic 7: Virtual Rooms

- Directory of persistent Zoom rooms with meeting IDs
- Room status display (active, idle, scheduled)
- One-click join button

### Epic 8: Admin Panel

- User registry: create, edit, delete users (ADMIN + OWNER)
- Photo upload for user avatars
- Role assignment and department scoping
- ADMINs can promote VIEWERs to ADMIN, assign departments
- OWNER-only: system health overview, infrastructure stats
- Program scheduling (Sabbath School, Divine Service, AY start/end times)

### v1.1 — Nice to Have (Post-MVP)

- Push notifications / email reminders for upcoming assignments
- Mobile-responsive PWA shell
- PDF export of weekly/monthly planning
- Attendance logging per Sabbath
- Multi-year archive and year-to-year comparison
- Excel import wizard (guided upload of planning spreadsheet)

### Out of Scope (Not for this project)

- Membership management (baptisms, transfers) — use ACMS
- Tithe and offering tracking — use ACMS
- Full public website CMS (blog, articles, media gallery) — use Adventist Cloud Web Engine for that; this app's public layer is limited to schedule/live/events
- Multi-church / conference-level features
- Live streaming control (starting/stopping YouTube/OBS streams) — the app only embeds/links to existing streams
- Financial budgeting

---

## Recommended Tech Stack

### Backend

| Layer | Technology | Rationale |
|---|---|---|
| **Runtime** | .NET 8 LTS / ASP.NET Core | Developer's primary language; enterprise-grade; excellent tooling |
| **API style** | REST with controllers | Clear, standard; matches the CRUD-heavy nature of the app |
| **ORM** | Entity Framework Core 8 | First-class .NET ORM; migrations, LINQ |
| **Database** | PostgreSQL 16 | Free, powerful, JSON support for flexible fields |
| **Auth** | ASP.NET Core Identity + Google OAuth 2.0 + JWT | Identity handles user/password; Google external provider built-in; JWT for SPA |
| **AI service** | HTTP client to Gemini/Claude API | Transcript summarization; simple REST call from backend |

### Frontend

| Layer | Technology | Rationale |
|---|---|---|
| **Framework** | React 18 + TypeScript | Already prototyped in mock app; component reuse possible |
| **Styling** | Tailwind CSS 3 | Already used in mock; utility-first matches the design system |
| **Charts** | Recharts | Already used in mock dashboard |
| **Build** | Vite 5 | Already used in mock; fast HMR |
| **State** | Zustand (or React Context + useReducer) | Lightweight for this scale |
| **HTTP** | Axios | Interceptors for JWT refresh |
| **Routing** | React Router v6 | SPA navigation with role-based route guards |

### Infrastructure

| Layer | Technology | Rationale |
|---|---|---|
| **Hosting** | Azure App Service free/basic tier OR Docker on VPS | .NET native on Azure; Docker for portability |
| **CI/CD** | GitHub Actions | Free for personal repos; deploy on push to main |
| **File storage** | Azure Blob (or local disk for MVP) | User avatars, transcript uploads |
| **Containers** | Docker Compose | Backend + DB + Frontend in one stack |

### Project Structure

```
sda-management/
├── src/
│   ├── SdaManagement.Api/              # ASP.NET Core Web API
│   │   ├── Controllers/
│   │   │   ├── PublicController.cs       # Anonymous endpoints (schedule, live, events)
│   │   │   ├── AuthController.cs
│   │   │   ├── UsersController.cs
│   │   │   ├── SabbathPlanController.cs
│   │   │   ├── DepartmentsController.cs
│   │   │   ├── ProjectsController.cs
│   │   │   ├── MeetingsController.cs
│   │   │   ├── TranscriptsController.cs
│   │   │   ├── RoomsController.cs
│   │   │   └── ProgramsController.cs
│   │   ├── Models/                      # EF Core entities
│   │   ├── DTOs/                        # Request/response shapes
│   │   ├── Services/                    # Business logic
│   │   ├── Data/                        # DbContext + migrations
│   │   ├── Auth/                        # Google OAuth + JWT config
│   │   └── Program.cs
│   │
│   └── sdamanagement-web/              # React + Vite frontend
│       ├── src/
│       │   ├── components/
│       │   │   └── Layout.tsx
│       │   ├── pages/
│       │   │   ├── Dashboard.tsx
│       │   │   ├── Calendar.tsx
│       │   │   ├── Departments.tsx
│       │   │   ├── Transcripts.tsx
│       │   │   ├── Rooms.tsx
│       │   │   └── Admin.tsx
│       │   ├── services/                # API client + auth
│       │   ├── types/
│       │   ├── hooks/
│       │   ├── context/                 # Auth context, app state
│       │   └── App.tsx
│       ├── public/
│       └── vite.config.ts
│
├── docker-compose.yml
├── docs/                                # BMAD planning artifacts
│   └── product-brief-sdac-ops.md
└── README.md
```

---

## Data Model Overview

### Core Entities

```
User
├── Id (GUID)
├── Email (unique identifier — used for login matching)
├── Name
├── Role: OWNER | ADMIN | VIEWER
├── AvatarUrl
├── PasswordHash (nullable — not needed for Google-only users)
├── GoogleId (nullable — set on first Google login)
├── Locale: fr | en
├── StartedDate
├── ExpirationDate (nullable)
├── IsActive
└── UserDepartments[] → many-to-many with Department

Department
├── Id
├── Name (e.g., "Jeunesse Adventiste")
├── Abbreviation: AE | JA | MIFEM | MF | ME | MP | (custom)
├── Description
├── Color (hex for calendar/UI)
└── SubMinistries[]

SubMinistry
├── Id
├── DepartmentId → Department
├── Name
└── LeadId → User

SabbathAssignment (one row per Sabbath date)
├── Id
├── Date (the Sabbath date)
├── PredicateurId → User
├── AncienServiceId → User
├── AnnoncesId → User
├── DiaconId → User
├── DiaconesseId → User
├── DepartmentId → Department (responsible dept for the day)
├── ActivityTitle (nullable)
├── ActivityDescription (nullable)
├── ConferenceNote (nullable — e.g., "Semaine de priere JA 15-21 mars")
├── SpecialType: REGULAR | SAINTE_CENE | WEEK_OF_PRAYER
│                | CAMP_MEETING | EVANGELISM | YOUTH_DAY
│                | FAMILY_DAY | WOMENS_DAY
└── Month (derived, for grouping)

MinistryProject
├── Id
├── DepartmentId → Department
├── SubMinistryId → SubMinistry (nullable)
├── Title
├── Date
├── Time (nullable)
├── Status: NOT_STARTED | IN_PROGRESS | ON_HOLD | FINISHED | CANCELLED
└── Progress: 0..100

MinistryMeeting
├── Id
├── DepartmentId → Department
├── SubMinistryId → SubMinistry (nullable)
├── Name
├── Description
├── StartDateTime
├── EndDateTime
├── Type: VIDEO | LOCAL
├── ZoomLink (nullable)
├── ZoomId (nullable)
├── LocationName (nullable)
└── Address (nullable)

Transcript
├── Id
├── Title
├── Date
├── Content (text)
├── Summary (nullable — AI-generated)
├── DepartmentId → Department
├── Status: PENDING | PROCESSED
├── Priority: LOW | MEDIUM | HIGH
└── UploadedById → User

VirtualRoom
├── Id
├── Name
├── Description
├── ZoomMeetingId
└── Status: ACTIVE | IDLE | SCHEDULED

SDACProgram (recurring weekly programs)
├── Id
├── Title (e.g., "Ecole du Sabbat", "Culte Divin", "JA")
├── StartTime
├── EndTime
├── DepartmentId → Department
├── HostId → User
├── Status: SCHEDULED | LIVE | COMPLETED
├── DayOfWeek
├── YouTubeUrl (nullable — embed link for live stream)
└── IsPublic (bool — visible to anonymous users)

ChurchSettings (singleton — public church info)
├── ChurchName
├── Address
├── YouTubeChannelUrl
├── DefaultYouTubeLiveUrl (nullable — auto-populated or manual)
├── PhoneNumber (nullable)
├── WelcomeMessage (nullable — shown on public dashboard)
└── Locale: fr | en
```

### Permission Model

```
Action                              OWNER  ADMIN(scoped) VIEWER  ANON
──────────────────────────────────────────────────────────────────────
View public dashboard                 Y        Y           Y       Y
View this week's Sabbath (public)     Y        Y           Y       Y
View YouTube live / service status    Y        Y           Y       Y
View public calendar events           Y        Y           Y       Y
View program times                    Y        Y           Y       Y
View department list (overview)       Y        Y           Y       Y
View department detail + projects     Y        Y           Y       -
View full Sabbath assignments         Y        Y           Y       -
View "My Assignments"                 Y        Y           Y       -
View transcripts                      Y        Y           Y       -
Join virtual rooms                    Y        Y           Y       -
View attendance/engagement data       Y        Y           Y       -
Edit own department(s)                Y        Y           -       -
Edit any department                   Y        -           -       -
Create/edit Sabbath assignments       Y        Y(own dept) -       -
Manage projects (own dept)            Y        Y           -       -
Manage meetings (own dept)            Y        Y           -       -
Upload transcripts                    Y        Y           -       -
Trigger AI summary                    Y        Y           -       -
Manage virtual rooms                  Y        Y           -       -
Edit programs (times, hosts)          Y        Y           -       -
Create users                          Y        Y           -       -
Promote user to ADMIN                 Y        Y           -       -
Create OWNER                          Y        -           -       -
Delete users                          Y        -           -       -
System health / infrastructure        Y        -           -       -
```

---

## Design Language Reference

The mock app established a clear design system to preserve:

### Visual Identity
- **Primary accent**: Indigo-600 (`#4f46e5`) — active states, CTAs, sidebar selection
- **Dark sections**: Slate-900 (`#0f172a`) — hero areas, modal headers, sidebar user card
- **Background**: Slate-50 (`#f8fafc`) — main content area
- **Cards**: White with `border-slate-100`, large radius (`rounded-[2rem]` to `rounded-[3rem]`)
- **Shadows**: `shadow-sm` default, `shadow-xl` on hover

### Typography
- **Font weight**: Heavy use of `font-black` (900) for headings and labels
- **Micro-labels**: `text-[10px] font-black uppercase tracking-widest` — the signature metadata style
- **Headings**: `tracking-tighter` for large text
- **Color cascade**: `text-slate-900` → `text-slate-400/500` → `text-indigo-400/500`

### Interaction
- **Card hover**: lift + border color shift + shadow deepening
- **Buttons**: `rounded-2xl`, generous padding, uppercase tracking-widest labels
- **Active nav**: indigo bg, white text, indigo shadow glow
- **Modals**: backdrop blur (`bg-slate-900/60 backdrop-blur-md`), `rounded-[2.5rem]`
- **Entry animations**: `fade-in duration-700`, `slide-in-from-bottom-4`

### Layout
- **Public view**: Simplified layout — no sidebar. Top nav bar with church name, nav links (Schedule, Calendar, Departments, Live), and "Sign In" button. Content fills full width.
- **Authenticated view**: Full sidebar layout (288px, white, fixed left, role-filtered nav items) + header (112px, breadcrumb + date)
- **Content**: scrollable, `p-12` padding
- **Responsive grid**: `grid-cols-1 md:2 lg:3 xl:4`
- **Mobile**: Public view optimized for phone; sidebar collapses to hamburger menu on authenticated view

### Language & Tone
- UI labels in **French** (button text, section titles, form labels, admin forms)
- Technical/system terms in **English** (status enums, API fields)
- Aesthetic tone is **operational-military**: "Command Center", "Protocol Node", "Registre Personnel", "Terminate Session"

---

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Low adoption by older members | System unused | Mobile-friendly; training at board meeting; keep Excel export as fallback |
| Single developer | Slow progress, bus factor=1 | BMAD documentation ensures continuity; clean architecture |
| Hosting costs | Ongoing expense for volunteer project | Azure free tier or Docker on home server; PostgreSQL is free |
| Excel data migration | Initial data entry effort | Build import tool in Epic 2; parse existing spreadsheet programmatically |
| Scope creep toward ACMS | Dilutes focus | Hard boundary: no membership/tithe. Redirect to ACMS. |
| Google OAuth dependency | Users without Google blocked | Email/password fallback ensures universal access |
| Public data over-exposure | Sensitive info visible to anonymous users | Clear public/private boundary in API; public endpoints return only curated data (no zoom links, no user emails, no transcript content) |

---

## Relationship to Adventist Cloud Ecosystem

```
┌──────────────────────────────────────────────────────────────┐
│                  ADVENTIST CLOUD ECOSYSTEM                    │
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐ │
│  │    ACMS       │  │  eAdventist  │  │  Cloud Web Engine  │ │
│  │  Membership   │  │  NAD clerk   │  │  Public website    │ │
│  │  Tithe        │  │  portal      │  │  builder           │ │
│  │  Transfers    │  │              │  │                    │ │
│  └──────┬────────┘  └──────────────┘  └────────────────────┘ │
│         │           Official denominational tools             │
└─────────┼────────────────────────────────────────────────────┘
          │
          │  Does NOT cover
          ▼
┌──────────────────────────────────────────────────────────────┐
│          SDAC ST-HUBERT OPS COMMAND (This Project)           │
│                                                               │
│  ┌─ PUBLIC LAYER (anonymous) ─────────────────────────────┐  │
│  │  Church schedule   │  YouTube live  │  Event calendar  │  │
│  │  Program times     │  Dept overview │  This week info  │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌─ OPERATIONS LAYER (authenticated) ─────────────────────┐  │
│  │  Sabbath planning & role assignments                   │  │
│  │  Department pipelines & projects                       │  │
│  │  Meeting coordination & virtual rooms                  │  │
│  │  Transcript/minutes archive with AI summary            │  │
│  │  Officer registry & role-scoped admin                  │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                               │
│  Fills the "operational gap" between ACMS and day-to-day     │
│  church committee work — with a public face for the          │
│  congregation.                                                │
└──────────────────────────────────────────────────────────────┘
```

No integration with ACMS is planned for MVP. They operate independently.

---

## BMAD Next Steps

This product brief is the **Phase 1 (Analysis) output**. Recommended continuation:

| Phase | Agent | Output | Description |
|---|---|---|---|
| **2 — Planning** | PM | `prd.md` + `ux-spec.md` | Full PRD with detailed epics, user stories, acceptance criteria; UX wireframes per page |
| **3 — Solutioning** | Architect | `architecture.md` + stories | API contracts, DB schema DDL, component tree, deployment diagram; stories broken from epics |
| **4 — Implementation** | Developer | Working code | One story at a time, test-driven |

The mock app codebase (`st-hubert_-operations-command/`) serves as both **functional prototype** and **design reference** — the React frontend can be substantially reused with real API calls replacing the mock constants.
