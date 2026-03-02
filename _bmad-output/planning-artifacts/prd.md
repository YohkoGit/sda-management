---
stepsCompleted: [step-01-init, step-02-discovery, step-02b-vision, step-02c-executive-summary, step-03-success, step-04-journeys, step-05-domain, step-06-innovation, step-07-project-type, step-08-scoping, step-09-functional, step-10-nonfunctional, step-11-polish, step-12-complete]
inputDocuments:
  - docs/product-brief-sdac-ops.md
documentCounts:
  briefs: 1
  research: 0
  brainstorming: 0
  projectDocs: 0
classification:
  projectType: web_app
  projectTypeNotes: "dual-experience SPA (public content layer + authenticated operations layer) with REST API"
  domain: general
  domainNotes: "domain-specific general — non-trivial SDA operational vocabulary (ancien rotation, diaconat service, Sabbath-centric scheduling, departmental taxonomy, nominating committee cycles, bilingual FR/EN context)"
  complexity: low
  complexityNotes: "no compliance frameworks; standard security. Technical nuance: scoped RBAC (role + department intersection), dual layout architecture, OAuth with no self-registration"
  projectContext: greenfield
workflowType: 'prd'
workflow: 'edit'
date: 2026-02-26
author: Elisha
lastEdited: 2026-02-28
editHistory:
  - date: 2026-02-28
    changes: "Added guest speaker handling (ghost users with isGuest flag, inline creation, operational-only visual distinction), avatar/photo display system (admin upload, initials fallback, cache-bust NFR), concurrent edit detection (last-write-wins with warning), updated MVP scope and Journey J3, added Growth item for guest merge/cleanup, aligned breakpoint strategy with UX spec"
---

# Product Requirements Document - sda-management

**Author:** Elisha
**Date:** 2026-02-26

## Executive Summary

SDAC ST-HUBERT Operations Command is an information accessibility platform for the Eglise Adventiste du 7e Jour de Saint-Hubert (Quebec, Canada). The church's operational data — who is preaching, which team is serving, what activities are happening — exists today in an Excel spreadsheet and informal WhatsApp channels. The problem isn't that this data doesn't exist; it's that it doesn't reach the people who need it. This app turns private planning data into a public-facing, role-aware information system designed to increase congregational awareness and engagement.

The app provides two distinct experiences. For the congregation and visitors, it is a **destination** — open the app, instantly see what's happening at church this week, find the live YouTube service, check upcoming activities. No login, no phone calls, no asking someone on WhatsApp. For church leadership, it is a **command center** — operational awareness and action across departments, schedules, meetings, and member assignments. Both experiences share a domain but serve fundamentally different needs.

The core scheduling engine uses a **flexible activity model**. Each church activity — whether Sabbath worship, a Sunday outing, or a Monday evening donation drive — has a dynamic roster of configurable service roles, each assignable to one or more people. Default activity templates handle the typical week; admins customize per activity as needed. Guest speakers from outside the congregation are supported as lightweight guest records — created inline during role assignment, visually indistinguishable from regular members on the public page. Church life happens beyond Saturday morning, and the system reflects that.

The app is anonymous-first: it loads into a public view without login. Officers sign in to see personal assignments, department details, and operational tools. Access is role-based — ANONYMOUS (public), VIEWER (officers), ADMIN (scoped to assigned departments), and OWNER (system administrator). The department-scoped ADMIN model means church leadership turnover — pastor transfers, new elder boards after nominating committee — doesn't require system reconfiguration. New leaders are assigned their departments; the system adapts.

Bilingual by design: French-primary UI matching the congregation's language, with English secondary. Single-congregation, single-deployment. Not a competitor to Adventist Cloud/ACMS — this fills the operational gap ACMS does not cover. Built to run the church week-to-week.

### What Makes This Special

1. **Public-first design.** Most church management tools are internal-only, locked behind login walls. This app gives the entire congregation — and visitors — instant self-service access to what's happening at church. Open the app, see the next activity or join the live stream. No account required.

2. **Self-service officer lookup.** Officers stop calling the pastor to ask "am I preaching this week?" Every assignment is visible in under 10 seconds from login. Committee meeting prep becomes 100% self-service.

3. **SDA-native, maximally flexible.** The app understands Sabbath-centric scheduling, department taxonomy (JA, MIFEM, MF, ME, MP, AE), special service types (Sainte-Cene, Week of Prayer, Camp Meeting), and the SDA calendar (Sunday-first, Saturday as day 7). Service roles, headcounts, and activity types are fully configurable — not locked into a rigid schema.

4. **Activity engine, not a Sabbath-only scheduler.** Church life happens beyond Saturday morning. Sunday outings, Monday donation drives, midweek prayer meetings — any activity, any day, with flexible role assignments.

5. **Built for how the church actually operates.** The system models real church operations — variable roles, variable headcounts, activities on any day — rather than inheriting the constraints of a spreadsheet's fixed columns. A fresh operational workflow, not a digital skin on the old process.

## Project Classification

- **Project Type:** Web application — dual-experience SPA (React + TypeScript + Tailwind) with REST API (ASP.NET Core + PostgreSQL)
- **Domain:** General (domain-specific) — church operations management with non-trivial SDA operational vocabulary; no regulatory compliance requirements
- **Complexity:** Low — standard security practices, well-understood patterns. Technical nuance in scoped RBAC (role + department intersection), dual layout architecture, and OAuth with no self-registration constraint
- **Project Context:** Greenfield — new build; existing mock app serves as design reference only

## Success Criteria

### User Success

- **Congregational awareness:** Members and visitors open the app and immediately see what's happening at church — this week's activities, the next scheduled event, or a live service link. No login, no asking anyone.
- **Officer self-service:** Officers check their own assignments without calling the pastor or digging through a spreadsheet. The question "am I preaching this week?" is answered by the app, not a person.
- **Admin efficiency:** Department directors and church leaders manage their activities, roles, and schedules directly in the app. No intermediary, no Excel handoff.
- **Adoption signal:** The church committee naturally defaults to the app as the source of truth instead of the Excel or WhatsApp. Eye test — when people stop asking "where do I check?" the app has won.

### Business Success

- **Replaces the Excel.** The annual planning spreadsheet is no longer the primary coordination tool. The app is.
- **Reduces communication overhead.** The pastor and elders field fewer "what's happening this Sabbath?" inquiries because the information is self-service — both publicly and for officers.
- **Survives leadership turnover.** When officers change at nominating committee, new leaders are assigned their departments in the app and are immediately operational. No retraining on spreadsheet conventions.

### Technical Success

- **Fast.** Pages load quickly on mobile. The app feels responsive, not sluggish.
- **Reliable.** The app is available when people need it — especially Sabbath morning and during the week when admins are planning.
- **Secure.** Public endpoints expose only curated public data. No zoom links, user emails, or internal details leak to anonymous users. Role and department scoping enforced server-side.

### Measurable Outcomes

Success is assessed qualitatively — eye test, not analytics dashboards. The key signals:

- Admins are consistently entering activities and assignments without being reminded — this is the leading indicator
- People use the app instead of asking on WhatsApp
- Officers check their assignments without calling anyone
- The Excel stops being updated because the app is the source of truth
- New officers after nominating committee are productive in the app within minutes, not days

**Critical path to success:** Admin adoption precedes congregational adoption. If the 3-5 admins (pastor, elders, department directors) aren't entering data, the public page is empty and the congregation reverts to WhatsApp. The admin experience of entering a week's schedule must be easy and fast.

## Product Scope & Phased Development

### MVP Strategy

**Approach:** Problem-solving MVP — solve the core information accessibility problem. If the public dashboard shows what's happening and officers can check their assignments, the product is useful. Everything else builds on that foundation.

**Resource:** Solo developer (Elisha). C#/.NET backend, React/TypeScript frontend. Single-congregation deployment eliminates multi-tenant complexity.

**Core Loop:** Admin enters activities → Officers check assignments → Congregation sees what's happening. Admin adoption is the prerequisite; congregational value follows automatically.

**Design Constraint:** Mobile-first responsive design across all features — the congregation accesses the app primarily on phones.

### MVP Feature Set

All 6 User Journeys are supported in MVP:

| Journey | Core Capability |
|---|---|
| J1 — Congregation member checks schedule | Public dashboard, YouTube live, calendar |
| J2 — Officer checks assignments | Google OAuth, "My Assignments" view |
| J3 — Dept director manages activities | Activity templates, flexible rosters, dept-scoped admin |
| J4 — Pastor sees the big picture | All-department visibility, cross-department calendar |
| J5 — First-time system setup | Church settings, departments, templates, bulk user creation |
| J6 — Last-minute change | Mobile admin editing, real-time updates |

**MVP Capabilities:**

1. **Authentication & Authorization** — Anonymous-first public access. Google OAuth (primary) + email/password (fallback). 4-tier RBAC (ANONYMOUS/VIEWER/ADMIN/OWNER). Department-scoped admin. No self-registration.
2. **Church Activity Scheduling Engine** — Flexible activity model (any day, any roles, variable headcount). Activity templates with defaults and overrides. Special activity tagging. Guest speaker support via inline ghost user creation during role assignment. Concurrent edit detection with overwrite warning. No data import from Excel — fresh start.
3. **Dashboard** — Public (next activity, YouTube live, upcoming activities, program times, dept overview) + Authenticated (personal assignments, ministry overview).
4. **Calendar** — Sunday-first (day 1) through Saturday (day 7). Day/Week/Month/Year views. Public vs authenticated visibility. Department filtering and color coding.
5. **Department Management** — Department list with sub-ministries. Activity pipeline per department. Meeting management (Zoom/physical). Department-scoped editing.
6. **Admin Panel** — User registry (bulk-friendly creation). Role assignment and department scoping. Program scheduling. Church settings. OWNER system health.

**Cross-Cutting MVP Requirements:**

- Real-time updates via SignalR (scoped to relevant views)
- Avatar display across all role assignment views (uploaded photo or initials fallback; admin-only upload)
- WCAG 2.1 AA accessibility
- French-primary, English-secondary i18n
- Sunday-first calendar convention

### Growth Features (Phase 2)

- SEO for public pages (server-rendering for search engine indexing)
- Link sharing with Open Graph tags (WhatsApp preview with church name + this week's program)
- Virtual Rooms (Zoom directory with status and one-click join)
- Transcripts / Archives with AI summary integration
- Push notifications / email reminders for upcoming assignments
- PWA shell (installable app with offline support)
- PDF export of weekly/monthly planning
- Attendance logging per Sabbath
- Multi-year archive and year-to-year comparison
- Membership management (baptisms, transfers, member records)
- Edit history / audit trail (planned vs actual assignments for year-end review)
- Guest user management — admin view to review, merge, or archive guest speaker records over time

### Vision (Phase 3)

- Template for other local SDA churches to adopt and customize
- Additional features in the pipeline (to be defined after MVP)

### Out of Scope (Hard Boundaries)

- Tithe and offering tracking — use ACMS
- Full public website CMS — use Adventist Cloud Web Engine
- Multi-church / conference-level features
- Live streaming control (start/stop OBS/YouTube)
- Financial budgeting

## User Journeys

### Journey 1: "What's Happening This Sabbath?" — The Congregation Member

**Persona:** Marie-Claire, 58, faithful member for 20 years. Not on the church committee. Attends every Sabbath with her family.

**Opening Scene:** It's Friday evening. Marie-Claire's daughter in Montreal calls and asks "Maman, who's preaching tomorrow? Is it a special program?" Marie-Claire doesn't know. She'd have to text Sister Koumi on WhatsApp and wait for a reply — if she even replies tonight. Last month she showed up for what she thought was regular service and it was Sainte-Cene; she wasn't prepared.

**Rising Action:** Marie-Claire opens the church app on her phone. No login needed. The public dashboard loads instantly — she sees tomorrow's program: Pasteur Vicuna is preaching, it's Journee de la Jeunesse, JA department is leading. She scrolls down and sees the YouTube live link is already there for her daughter to watch from Montreal. She taps the calendar and sees next week is Sainte-Cene — she makes a mental note to prepare.

**Climax:** Marie-Claire texts her daughter: "Vicuna preaches tomorrow, it's Youth Day. Here's the link to watch live." Done in 30 seconds. No WhatsApp chain, no waiting for a reply from anyone.

**Resolution:** Marie-Claire checks the app every Friday now. Her daughter watches from Montreal every Sabbath. Two cousins in Haiti found the app and follow along. The church feels closer even when you're far away.

**Requirements revealed:** Public dashboard with current/next activity, YouTube live embed, upcoming activities list, program times, mobile-optimized, zero-login access, French-primary UI.

---

### Journey 2: "Am I Preaching This Week?" — The Officer

**Persona:** Elisha Raharijaona, 30s, deacon and occasional speaker. Serves on the committee but has a busy work schedule.

**Opening Scene:** It's Wednesday. Elisha vaguely remembers being told he might be on deacon duty this Sabbath, or was it next Sabbath? He could dig through the WhatsApp group to find the message from 3 weeks ago, or call the head elder. He's done this dance before — sometimes he shows up and someone else is already covering, sometimes nobody shows up because everyone assumed someone else was assigned.

**Rising Action:** Elisha opens the app on his phone and signs in with Google. The dashboard loads and immediately shows "My Assignments" — he sees he's on deacon duty this Sabbath (foot washing team, Sainte-Cene) and preaching in 3 weeks. He taps into the Sabbath detail view and sees the full roster: 6 deacons assigned this week for holy communion, plus the predicateur, ancien de service, and annonces. Everyone's name is right there.

**Climax:** No phone calls made. No WhatsApp messages sent. Elisha knows exactly what he's doing, when, and who else is serving alongside him. He prepares accordingly.

**Resolution:** Elisha hasn't called the pastor about scheduling in months. He checks the app Sunday evening to see his upcoming week. The cognitive load of "am I supposed to be somewhere?" is gone. He shows up prepared, every time.

**Note:** As a VIEWER, if Elisha spots an error (wrong date, wrong person assigned), he cannot edit it himself. His path is to contact his department admin directly. For MVP, this is handled outside the app — the system enforces role boundaries.

**Requirements revealed:** Google OAuth login, personal "My Assignments" view, full activity roster view (all roles and assignees), activity detail with service role breakdown, mobile-friendly authenticated dashboard, clear role boundaries (VIEWER = read-only).

---

### Journey 3: "My Department This Week" — The Department Director

**Persona:** Soeur Ketsia, Director of MIFEM (Women's Ministry). Manages a team of 8 women across 3 sub-ministries. Technically savvy — uses her laptop for planning.

**Opening Scene:** It's Monday morning. Ketsia opens the app to check on her department — the most common interaction. She's not creating anything, just scanning.

**Rising Action (Monitoring):** Ketsia signs in and navigates to her department view. She sees MIFEM's upcoming week at a glance: this Saturday is MIFEM's assigned Sabbath (Women's Day special program) — all roles are staffed, green. Wednesday has a prayer group at Sister Legault's house — coordinator assigned, good. She scans next month: two activities flagged with unassigned roles. She makes a mental note to fill those later this week. Most weeks, this 30-second scan is the entire interaction.

**Rising Action (Creation):** But this week, she needs to set up the Women's Day program. She creates the Sabbath activity using the "Sabbath Worship" template — default roles auto-populate (predicateur x1, ancien x1, annonces x1, diacres x2, diaconesses x2). She customizes for Women's Day: adds "Special Music" (3 sisters), adds "Testimony" (2 speakers), bumps diaconesses to 4. Tags it "Journee de la Femme." Then she creates Wednesday's prayer group — simple activity with location, time, and coordinator role.

**Climax:** Both activities are live. The Sabbath program appears on the public dashboard. The prayer group appears on the authenticated calendar only. Every assigned person sees their role. No WhatsApp messages needed — the assignments speak for themselves.

**Resolution:** Ketsia manages MIFEM's full activity pipeline from the app. Most weeks she just monitors; occasionally she creates or edits. When the nominating committee replaces her next year, her successor inherits a department with history, structure, and an operational rhythm already in the system.

**Variant — Guest Speaker:** For Women's Day, Ketsia invited Pasteur Damien from the Montreal church to preach. He's not in the system — he's not a member. When Ketsia assigns the Predicateur role, she types "Damien" — no results. The app offers "Ajouter un invité" inline. She enters his name and taps confirm. A guest speaker record is created instantly and assigned to the role. On the public dashboard, Marie-Claire sees "Pasteur Damien" with initials — no indication he's a guest. In Ketsia's operational view, "(Invité)" appears beneath his name so she knows it's a one-time speaker, not a regular officer.

**Requirements revealed:** Department dashboard with upcoming activity scan, role staffing status indicators, activity creation with template selection, template auto-population with role defaults, per-activity role customization (add/remove roles, change headcount), special activity tagging, activity visibility control (public vs authenticated), department activity pipeline view, meeting creation with location details, inline guest speaker creation during role assignment, guest visual distinction in operational views only.

---

### Journey 4: "The Big Picture" — The Pastor

**Persona:** Pasteur L. Vicuna, senior pastor. Oversees all departments, preaches most Sabbaths, chairs the church board.

**Opening Scene:** It's Monday morning. Pasteur Vicuna needs to know what's happening across the church this week — not just Sabbath, but all department activities. He used to rely on phone calls to each department director and checking a WhatsApp group with 40 unread messages. Half the time he'd discover conflicts: two departments scheduled activities on the same evening, or nobody arranged deacons for a special program.

**Rising Action:** Pasteur Vicuna opens the app and sees the authenticated dashboard. As an ADMIN assigned to all departments, he has full visibility. The dashboard shows this week's Sabbath program (fully staffed — Soeur Ketsia's MIFEM Women's Day), plus 3 other activities across the week: JA youth outing on Sunday, MIFEM prayer group on Wednesday, and a church board meeting Thursday evening. He taps into the calendar for a month view — he spots that next week has no predicateur assigned yet. He assigns himself.

**Climax:** In 2 minutes, Pasteur Vicuna has a complete picture of church operations for the week. No phone calls, no WhatsApp scrolling. He spots the gap (no preacher next week) and fills it himself. Proactive, not reactive.

**Resolution:** Pasteur Vicuna checks the dashboard every Monday. Department directors manage their own activities; he monitors and intervenes only when needed. When the church board meets Thursday, he pulls up the calendar on the projector — everyone sees the same data. Board meetings are shorter because nobody is asking "who's doing what?"

**Requirements revealed:** All-department admin visibility, cross-department dashboard, calendar with multi-department view, ability to assign roles across any department, weekly overview of all activities (not just Sabbath), gap detection (unassigned roles visible).

---

### Journey 5: "First Time Setup" — The System Administrator

**Persona:** Elisha (OWNER). Developer. Building and deploying the system for the first time.

**Opening Scene:** The app is deployed. Database is empty. Elisha is the only user — auto-created as OWNER during deployment. The church has 12 departments, ~30 officers, and a pastor who needs to be operational by next Sabbath. The clock is ticking.

**Rising Action:** The app guides the setup through smart empty states — each section indicates what needs to be configured and in what order, since dependencies are linear:

**Step 1 — Church settings.** Elisha configures the basics: church name ("Eglise Adventiste du 7e Jour de Saint-Hubert"), address, YouTube channel URL, default locale (French). The public page now shows the church identity even though there's no content yet.

**Step 2 — Departments.** He creates the 12 departments: JA, MIFEM, MF, ME, MP, AE, Diaconat, Anciens, Secretariat, Communication, Ecole du Sabbat, Musique. Each gets a name, abbreviation, color, and description. He adds sub-ministries where needed (JA has Eclaireurs, Ambassadeurs, Compagnons).

**Step 3 — Activity templates.** He defines the default templates. "Sabbath Worship" gets the standard roles: Predicateur (1), Ancien de Service (1), Annonces (1), Diacres (2), Diaconesses (2). "Sainte-Cene" gets an expanded template: same base plus Lavement des Pieds (4), Distribution Pain et Vin (4), Offrandes (2). He creates a few more: "Reunion de Departement," "Sortie," "Soiree de Priere."

**Step 4 — Users.** He creates accounts for the ~30 officers using a bulk-friendly entry form — name, email, role, department assignments in rapid succession, not 30 individual form submissions. Pasteur Vicuna gets ADMIN with all departments. Department directors get ADMIN scoped to their department. Officers get VIEWER. No passwords needed for Google users — they'll sign in with their Gmail.

**Step 5 — First activities.** He creates this coming Sabbath's worship activity from the template, assigns roles, and publishes. The public dashboard now shows "This Saturday: Culte Divin" with the predicateur and activity details.

**Climax:** Elisha texts the WhatsApp group: "The church app is live. Check your assignments: [link]." Officers sign in with Google, see their names on the roster. Marie-Claire visits the public page and sees this week's program. The system is alive.

**Resolution:** Setup took one evening. The bulk user entry made account creation manageable. Everything else — departments, templates, first activity — flowed naturally through guided empty states. Next week, Soeur Ketsia will enter her own department's activities. Elisha steps back to OWNER maintenance mode.

**Variant — New Term Setup:** Every 2 years at nominating committee, officers change. Elisha doesn't rebuild from scratch — departments and templates persist. He reassigns users to new departments, promotes new directors to ADMIN, demotes outgoing officers. The system supports leadership turnover as a routine operation, not a crisis.

**Requirements revealed:** Church settings configuration (singleton), department CRUD with sub-ministries, activity template definition with default roles and headcounts, bulk-friendly user creation (multi-entry form), user-department reassignment for term transitions, guided first-time experience (smart empty states showing setup sequence), OWNER-first setup flow.

---

### Journey 6: "Something Changed" — The Edge Case

**Persona:** Frere Jean, head elder. It's Saturday morning, 30 minutes before service.

**Opening Scene:** The predicateur for today — Frere Augustin — just called. He's sick and can't preach. Frere Jean needs to find a replacement and update the schedule immediately, before the congregation arrives and sees outdated information on the public page.

**Rising Action:** Frere Jean opens the app on his phone (he's already at church). He navigates to today's Sabbath activity, taps the Predicateur role, and reassigns it from Frere Augustin to himself. He saves. The public dashboard updates immediately — anyone checking "who's preaching today?" sees Frere Jean's name.

**Climax:** A last-minute change that would have required a chain of WhatsApp messages and confusion at the door is handled in 15 seconds on a phone. The congregation sees accurate information. No one shows up expecting Frere Augustin.

**Resolution:** The system handles real-time changes gracefully. For MVP, the current state is what's recorded — the system shows who actually served, not who was originally planned. Edit history and audit trail (tracking original vs actual assignments) is a Growth feature for year-end nominating committee reviews.

**Requirements revealed:** Mobile-friendly admin editing, real-time updates to public dashboard after edits (cache invalidation on activity changes), role reassignment on existing activities, admin access fully functional on mobile devices.

---

### Journey Requirements Summary

| Capability Area | Journeys |
|---|---|
| **Public dashboard (anonymous)** | J1, J5 |
| **YouTube live embed** | J1 |
| **Personal assignments view ("My Assignments")** | J2 |
| **Activity roster view (all roles + assignees)** | J2, J3, J4 |
| **Department dashboard with upcoming scan** | J3, J4 |
| **Activity creation with templates** | J3, J5 |
| **Flexible role roster (add/remove/recount)** | J3, J5 |
| **Special activity tagging** | J3 |
| **Activity visibility control (public/authenticated)** | J3 |
| **Department-scoped admin** | J3 |
| **All-department admin visibility** | J4 |
| **Cross-department calendar** | J4 |
| **Gap detection (unassigned roles)** | J4 |
| **Church settings configuration** | J5 |
| **Department & sub-ministry CRUD** | J5 |
| **Activity template definition** | J5 |
| **Bulk-friendly user creation** | J5 |
| **User-department reassignment (term transitions)** | J5 |
| **Guided first-time experience (smart empty states)** | J5 |
| **Inline guest speaker creation during role assignment** | J3 |
| **Guest visual distinction (operational views only)** | J3 |
| **Avatar display (photo or initials fallback)** | J1, J2, J3, J4 |
| **Real-time edit & publish (cache invalidation)** | J6 |
| **Concurrent edit detection (overwrite warning)** | J6 |
| **Mobile admin editing** | J6 |
| **Google OAuth login** | J2, J3, J4 |
| **Role boundaries (VIEWER = read-only)** | J2 |
| **French-primary UI** | All |
| **Mobile-first responsive** | All |
| **Edit history / audit trail** | Growth (revealed by J6) |
| **Guest user merge/cleanup** | Growth (revealed by J3) |

## Web Application Specific Requirements

### Project-Type Overview

Single-page application (SPA) with dual-experience architecture: a public content layer and an authenticated operations layer, served from the same React application with role-based route guards. REST API backend (ASP.NET Core) with PostgreSQL. Real-time updates via WebSockets for live data changes across connected clients.

### Browser Support

| Browser | Support Level |
|---|---|
| Chrome (latest 2 versions) | Full support |
| Safari (latest 2 versions) | Full support (critical — primary mobile browser on iOS) |
| Firefox (latest 2 versions) | Full support |
| Edge (latest 2 versions) | Full support |
| IE11 / Legacy browsers | Not supported |

### Responsive Design

Mobile-first responsive design across all pages. The congregation accesses the public layer primarily on phones; admins may use laptops or tablets.

- **Public view:** Full-width layout, top navigation bar, no sidebar. Optimized for phone-first consumption. Content stacks vertically on small screens.
- **Authenticated view:** Sidebar layout on desktop (288px fixed left). Sidebar collapses to hamburger menu on mobile/tablet. All admin functions must be usable on mobile (Journey 6 — last-minute edits on phone at church).
- **Breakpoint strategy:** Tailwind CSS responsive breakpoints. Effective mapping: mobile (default), tablet (`sm:` 640px), desktop (`lg:` 1024px). `md:` intentionally unused per UX design spec.

### Performance Targets

- **Initial page load:** < 2 seconds on typical mobile connection (4G/LTE)
- **Subsequent navigation:** Instant (SPA client-side routing)
- **API response time:** < 200ms for read operations (schedule, dashboard, calendar)
- **Real-time update latency:** < 1 second from edit to reflected on all connected clients viewing the affected content
- **Bundle size:** Optimized with code splitting — public routes and authenticated routes in separate chunks. Anonymous visitors don't download admin code.

### Real-Time Updates

Activity edits (role reassignments, new activities, schedule changes) must propagate to connected clients viewing affected content in real-time.

- **Technology:** SignalR on ASP.NET Core backend (native .NET WebSocket support, automatic fallback to long-polling)
- **Scoped delivery:** Updates are scoped to relevant views, not global broadcast. SignalR groups map to content context:
  - Public group — anonymous users watching the public dashboard/calendar
  - Per-department groups — admins monitoring their department
  - Activity-specific groups — users viewing a specific activity detail
- **Acceptance criteria:** When Admin A edits an activity, Client B viewing that activity sees the update within 1 second without manual page refresh.
- **Cache strategy:** WebSocket push is the cache invalidation signal. Clients receive the push and update in-place or refetch. No time-based cache expiry needed — the real-time channel handles freshness.
- **Offline tolerance:** If WebSocket disconnects, the app falls back to standard HTTP requests. No offline-first requirement for MVP.

### SEO Strategy (Growth)

Deferred to Growth phase. The public layer must eventually be indexable by search engines. Key requirements for when this is implemented:

- Public pages must be server-rendered or pre-rendered for search engine crawling. Implementation approach is an architecture decision.
- Public pages requiring SEO: landing/dashboard, calendar (public events), department overview, program times.
- Dynamic `<title>` and `<meta description>` per public page.
- Basic `Church` schema.org markup for Google Knowledge Panel.

### Link Sharing & Social Previews (Growth)

Deferred to Growth phase. When implemented, shared links in WhatsApp must show meaningful content — not a blank SPA shell. This is the primary distribution channel for the app.

- Dynamic Open Graph tags on public pages (church name, this week's program summary, church branding).
- WhatsApp preview: church name, current week's predicateur and activity, church image.
- Standard OG tags for any social platform that renders link previews.

### Accessibility

WCAG 2.1 AA compliance as baseline:

- **Keyboard navigation:** All interactive elements reachable and operable via keyboard
- **Screen readers:** Semantic HTML, ARIA labels where needed, meaningful alt text
- **Color contrast:** Minimum 4.5:1 for normal text, 3:1 for large text. Note: the design system's `indigo-600` (#4f46e5) on white barely passes AA (4.56:1) — `indigo-700` (#4338ca) may be needed for text-on-light-background to comfortably clear AA. Backgrounds and buttons with indigo-600 are fine.
- **Minimum text size:** 12px floor for any text that conveys information. The design system's 10px micro-labels should be used only for decorative/supplementary labels, not primary information.
- **Focus indicators:** Visible focus styles on all interactive elements
- **Motion:** Respect `prefers-reduced-motion` for entry animations


### Risk Mitigation

**Technical Risks:**

| Risk | Impact | Mitigation |
|---|---|---|
| Flexible activity model complexity | Data model more complex than fixed-column approach | More upfront design effort, but pays off in long-term flexibility. Architecture phase will define entity relationships precisely. |
| Real-time at scale | SignalR performance with many concurrent connections | Single-congregation (~100-200 users). Concurrent connections will be low. Not a real risk at this scale. |

**Resource Risks:**

| Risk | Impact | Mitigation |
|---|---|---|
| Solo developer | Slow progress, bus factor = 1 | BMAD documentation ensures continuity. Clean architecture. No external deadline pressure. |
| Scope creep | MVP grows beyond manageable size | Hard MVP boundaries defined. Growth features explicitly deferred. |

**Adoption Risks:**

| Risk | Impact | Mitigation |
|---|---|---|
| Admins don't enter data | Public page empty, congregation ignores app | Admin UX must be fast and easy. Activity templates reduce friction. Setup journey (J5) designed for one-evening completion. |
| Low adoption by older members | System unused by part of congregation | Public page is simple — just reading, no interaction required. Training at board meeting. |
| Hosting costs | Ongoing expense for volunteer project | Azure free tier or Docker. PostgreSQL is free. Minimal ongoing cost. |

## Functional Requirements

### 1. Public Access & Information Display

- **FR1:** Anonymous visitors can view the public dashboard showing the next scheduled church activity and its key details (predicateur, department, activity type)
- **FR2:** Anonymous visitors can view an embedded YouTube live stream link with current service status on the public dashboard
- **FR3:** Anonymous visitors can view upcoming church activities for the next 4 weeks
- **FR4:** Anonymous visitors can view recurring program times (Sabbath School, Divine Service, AY)
- **FR5:** Anonymous visitors can view a department overview showing all departments with their next scheduled activity
- **FR6:** Anonymous visitors can view the public calendar showing church-wide activities and special events
- **FR7:** Anonymous visitors can see church identity information (name, address, welcome message)

### 2. Authentication & Session Management

- **FR8:** Users can sign in using Google OAuth 2.0 with their existing Google account
- **FR9:** Users can sign in using email and password as a fallback authentication method
- **FR10:** The system matches login credentials to a pre-existing user record by email — unrecognized emails receive a "contact your admin" message
- **FR11:** The system enforces role-based access with four tiers: ANONYMOUS (no login), VIEWER (read-only + personal data), ADMIN (department-scoped management), OWNER (full system control)
- **FR12:** The system prevents self-registration — only ADMINs and OWNERs can create user accounts
- **FR13:** Authenticated users can sign out and end their session
- **FR14:** Users with email/password accounts can set their password on first login
- **FR15:** Users can reset a forgotten password

### 3. Personal Assignment Management

- **FR16:** Authenticated users (VIEWER+) can view their personal upcoming assignments across all activities ("My Assignments")
- **FR17:** Authenticated users can view the full roster of any activity — all service roles and assigned people
- **FR18:** Authenticated users can view the authenticated dashboard with personal assignments, full activity details, and ministry overview

### 4. Church Activity Scheduling

- **FR19:** ADMINs can create church activities on any day of the week (not limited to Sabbath)
- **FR20:** ADMINs can create activities from pre-defined activity templates that auto-populate with default service roles and headcounts
- **FR21:** ADMINs can customize any activity's role roster — add roles, remove roles, change the number of people per role
- **FR22:** ADMINs can assign one or more specific users to each service role on an activity
- **FR23:** ADMINs can tag activities with special types (Sainte-Cene, Week of Prayer, Camp Meeting, Youth Day, Family Day, Women's Day, Evangelism)
- **FR24:** ADMINs can set activity visibility as public (visible to anonymous) or authenticated-only
- **FR25:** ADMINs can edit existing activities — reassign roles, change details, modify roster
- **FR26:** The system updates all connected clients in real-time when an activity is edited, scoped to relevant views
- **FR27:** When an admin saves an activity that was modified by another admin since it was loaded, the system displays a warning indicating the activity has changed, allowing the admin to reload current data or overwrite
- **FR28:** OWNERs can define and manage activity templates with default service roles and default headcounts per role

### 5. Guest Speaker Handling

- **FR29:** During role assignment, when no matching user is found in the system, ADMINs are offered inline guest creation — name required, phone optional — without leaving the assignment flow
- **FR30:** Guest speakers are created as lightweight user records with a guest flag — no email required, no authentication credentials, identified by name only
- **FR31:** Guest users are excluded from frequently assigned suggestions, activity template defaults, and department membership
- **FR32:** Guest speakers display an "(Invité)" label in authenticated/operational views only; on public-facing views, guest speakers appear identical to regular members (no visual distinction)

### 6. Avatar & Photo Display

- **FR33:** The system displays user avatars alongside role assignments across dashboard, calendar, and roster views — uploaded photo when available, initials-based fallback otherwise
- **FR34:** ADMINs can upload a profile photo for any user (admin-only upload for MVP; users cannot upload their own)

### 7. Calendar

- **FR35:** All users can view a calendar with Sunday as the first day and Saturday as the seventh day
- **FR36:** All users can switch between Day, Week, Month, and Year calendar views
- **FR37:** Anonymous users see only public activities on the calendar; authenticated users see all activities including authenticated-only events
- **FR38:** Authenticated users can filter the calendar by department
- **FR39:** Activities display with department color coding on the calendar
- **FR40:** ADMINs can create activities directly from the calendar view

### 8. Department Management

- **FR41:** All authenticated users can view the list of all departments with their sub-ministries
- **FR42:** All authenticated users can view a department's activity pipeline and upcoming schedule
- **FR43:** ADMINs assigned to multiple departments can view a unified schedule across all their assigned departments
- **FR44:** ADMINs can manage (create, edit, delete) activities and meetings for departments they are assigned to
- **FR45:** ADMINs can manage sub-ministries within their assigned departments (create, edit, assign leads)
- **FR46:** ADMINs can create meetings with either a Zoom link or a physical location (name and address)
- **FR47:** OWNERs can manage all departments regardless of assignment
- **FR48:** The system indicates which upcoming activities have unassigned service roles

### 9. User & Role Administration

- **FR49:** ADMINs can create new user accounts with name, email, role, and department assignments
- **FR50:** ADMINs can create multiple user accounts efficiently in a single workflow
- **FR51:** ADMINs can promote VIEWERs to ADMIN and assign them to specific departments
- **FR52:** ADMINs can reassign users to different departments (supporting nominating committee term transitions)
- **FR53:** OWNERs can create other OWNER accounts
- **FR54:** OWNERs can delete user accounts
- **FR55:** OWNERs can edit any user's role and department assignments

### 10. Church Configuration & System Administration

- **FR56:** OWNERs can configure church identity settings (church name, address, YouTube channel URL, phone number, welcome message, default locale)
- **FR57:** OWNERs can create and manage departments (name, abbreviation, color, description)
- **FR58:** OWNERs can configure recurring program schedules (program title, start/end times, day of week, host, associated department)
- **FR59:** OWNERs can view system health and infrastructure status
- **FR60:** The system guides first-time administrators through the initial setup sequence (church settings → departments → activity templates → users → first activity)

### 11. Navigation, Internationalization & Accessibility

- **FR61:** The system provides a simplified public navigation for anonymous users and a full operational navigation for authenticated users
- **FR62:** The system displays all UI elements in French as the primary language
- **FR63:** The system supports English as a secondary language
- **FR64:** All users (anonymous and authenticated) can switch between French and English interface language
- **FR65:** All system capabilities are accessible and usable on mobile devices

## Non-Functional Requirements

### Performance

- **NFR1:** Initial page load (first contentful paint) completes within 2 seconds on a 4G/LTE connection
- **NFR2:** Subsequent SPA route transitions complete within 300 milliseconds
- **NFR3:** API responses for standard CRUD operations return within 500 milliseconds under normal load
- **NFR4:** Real-time updates via WebSocket arrive within 1 second of the triggering event
- **NFR5:** Application bundle uses code splitting so that the initial JavaScript payload does not exceed 200KB gzipped

### Security

- **NFR6:** All client-server communication uses HTTPS with TLS 1.2 or higher
- **NFR7:** Passwords are hashed using bcrypt (or equivalent adaptive hashing) with a minimum cost factor of 12
- **NFR8:** Authentication tokens (JWT) expire after a configured maximum session duration and support refresh rotation
- **NFR9:** Anonymous users can only access data explicitly marked as public; no authenticated-only data leaks through API responses
- **NFR10:** ADMIN operations are restricted to the departments the user is assigned to; the system enforces department-scoped authorization at the API layer
- **NFR11:** OAuth client secrets and signing keys are stored in environment variables or a secrets manager, never in source code or client bundles
- **NFR12:** All user-submitted input is sanitized to prevent XSS, SQL injection, and other injection attacks

### Accessibility

- **NFR13:** The application conforms to WCAG 2.1 Level AA success criteria
- **NFR14:** All interactive elements are keyboard-navigable with visible focus indicators
- **NFR15:** Text elements maintain a minimum contrast ratio of 4.5:1 against their background (indigo-700 for branded text)
- **NFR16:** No text element renders below 12px font size
- **NFR17:** Motion and animations respect the user's prefers-reduced-motion system setting
- **NFR18:** All non-decorative images and interactive controls have accessible labels compatible with screen readers

### Reliability

- **NFR19:** The system maintains 99.5% uptime measured monthly (excludes scheduled maintenance windows)
- **NFR20:** If the WebSocket connection drops, the client automatically reconnects and falls back to polling until the connection is restored
- **NFR21:** Database backups run daily with a 7-day retention period and documented restore procedure
- **NFR22:** The application displays user-friendly error messages for all failure states and never exposes stack traces or internal error details to end users

### Media & Storage

- **NFR23:** Profile images are stored as optimized files not exceeding 500KB per image, served with cache headers keyed to the user's last-modified timestamp for cache-busting on update
