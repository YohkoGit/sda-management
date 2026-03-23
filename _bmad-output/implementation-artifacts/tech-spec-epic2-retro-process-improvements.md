---
title: 'Epic 2 Retro Process Improvements'
slug: 'epic2-retro-process-improvements'
created: '2026-03-23'
status: 'done'
stepsCompleted: [1, 2, 3, 4]
tech_stack: [markdown, yaml, xml]
files_to_modify:
  - '_bmad-output/planning-artifacts/assertion-checklist.md'
  - '_bmad/bmm/workflows/4-implementation/create-story/template.md'
  - '_bmad/bmm/workflows/4-implementation/create-story/instructions.xml'
  - '_bmad/bmm/workflows/4-implementation/code-review/checklist.md'
  - '_bmad/bmm/workflows/4-implementation/dev-story/checklist.md'
code_patterns:
  - 'create-story instructions.xml: step-based XML workflow with <step>, <action>, <check>, <template-output> tags'
  - 'create-story instructions.xml step 2: already loads previous story for PSI — extend to extract review findings as patterns'
  - 'create-story instructions.xml step 5: template-output tags generate story sections — add assertion + review learnings sections'
  - 'code-review checklist: flat markdown checklist with - [ ] items'
  - 'dev-story checklist: sectioned markdown with emoji headers and - [ ] items under categories'
  - 'story template: markdown with ## sections and {{variable}} placeholders'
test_patterns:
  - 'Manual validation: read each modified file and verify changes are present'
  - 'End-to-end validation: create Epic 3 Story 3.1 and verify generated output'
---

# Tech-Spec: Epic 2 Retro Process Improvements

**Created:** 2026-03-23

## Overview

### Problem Statement

Code review findings repeat across stories because: (a) there is no standardized assertion checklist for implementations — missing auth tests (viewer 403, anonymous 401) were flagged in 4/6 Epic 2 stories; (b) review learnings don't feed into the next story's dev notes — the getById-from-card fix was applied in Story 2.3 review then repeated in Story 2.4; (c) cross-model review (different AI for implementation vs review) isn't enforced or documented in the story template; and (d) the story template lacks key fields for reviewer model and file list maintenance reminders.

**Root cause (5 Whys):** The create-story workflow (`instructions.xml`) lacks a step that incorporates (a) a project-wide assertion checklist and (b) previous story review findings into the new story's Dev Notes. Without structural integration, lessons learned exist only in review notes that are never loaded again.

### Solution

A two-layer enforcement approach:

1. **Layer 1 — Story creation (proactive):** The SM loads the assertion checklist and previous story's review findings during create-story, inlining relevant assertions into the new story's Dev Notes.
2. **Layer 2 — Implementation verification (reactive):** The dev-story Definition of Done checklist includes a step to verify against the full assertion checklist before marking a story as done.

Plus: cross-model review enforcement with verification at code review time.

### Scope

**In Scope:**
1. New file: automated test assertion checklist — project-specific mandatory assertions per endpoint type, with concrete patterns (not abstract guidance)
2. Update: story template — add `Review Model Used` field, `### Review Learnings from Previous Story` section, file list update reminder
3. Update: create-story instructions.xml — add step to load assertion checklist + previous story review findings
4. Update: code review checklist — add assertion checklist cross-reference + cross-model verification
5. Update: dev-story checklist — add assertion checklist verification step

**Out of Scope:**
- Manual QA checklist (tracked separately in sprint-status.yaml + memory)
- Rate limiter flaky test fix (separate code change)
- Cursor-based pagination spike (separate research)
- Modifications to BMAD core workflow engine (only project-level artifacts)

## Context for Development

### Codebase Patterns

- BMAD workflow files live in `_bmad/bmm/workflows/4-implementation/`
- Story template: `_bmad/bmm/workflows/4-implementation/create-story/template.md` — markdown with `{{variable}}` placeholders, `##` section headers
- Create-story instructions: `_bmad/bmm/workflows/4-implementation/create-story/instructions.xml` — XML workflow with `<step>`, `<action>`, `<check>`, `<template-output>` tags. 6 steps: determine target → load artifacts → architecture analysis → web research → create story file → update sprint status
- Code review checklist: `_bmad/bmm/workflows/4-implementation/code-review/checklist.md` — flat markdown `- [ ]` items validated during review
- Dev-story checklist: `_bmad/bmm/workflows/4-implementation/dev-story/checklist.md` — sectioned markdown with emoji category headers and `- [ ]` items
- Story files output to: `_bmad-output/implementation-artifacts/`
- These are BMAD module files (not core) — safe to modify for project-specific needs
- The assertion checklist is a project-level planning artifact, not a BMAD core artifact

### Key Investigation Findings

**create-story/instructions.xml (step 2):**
- Already loads previous story for "PREVIOUS STORY INTELLIGENCE" — extracts dev notes, review feedback, files, testing approaches, problems
- **Gap:** Does NOT explicitly extract code review findings as reusable patterns/rules. The PSI section captures what was built, not what was caught in review.
- **Gap:** Does NOT load any project-wide assertion checklist.
- **Integration point:** Add sub-actions after the existing PSI extraction to: (1) load assertion checklist from `_bmad-output/planning-artifacts/assertion-checklist.md`, (2) extract review findings from previous story's Change Log as patterns

**create-story/instructions.xml (step 5):**
- Generates story sections via `<template-output>` tags: header, requirements, developer context, technical requirements, architecture compliance, library/framework, file structure, testing requirements, PSI, git intelligence, latest tech, project context, status
- **Integration point:** Add `<template-output>` for `mandatory_assertions` section (after testing_requirements) and `review_learnings` section (after previous_story_intelligence)

**create-story/template.md:**
- Dev Agent Record has `Agent Model Used` field and `{{agent_model_name_version}}` placeholder
- **Gap:** No `Review Model Used` field
- **Gap:** No `### Review Learnings from Previous Story` section
- **Gap:** No `### Mandatory Assertions` section
- File List section exists but has no reminder about incremental updates

**code-review/checklist.md:**
- 20 checklist items covering story loading, AC cross-check, file list validation, test mapping, code quality, security, outcome
- **Gap:** No assertion checklist cross-reference
- **Gap:** No cross-model verification step

**dev-story/checklist.md:**
- 5 categories: Context & Requirements, Implementation, Testing & QA, Documentation, Final Status
- Has `File List Complete` item but no assertion checklist verification
- **Gap:** No item requiring verification against mandatory assertions from Dev Notes

### Files to Modify

| File | Action | Purpose |
| ---- | ------ | ------- |
| `_bmad-output/planning-artifacts/assertion-checklist.md` | CREATE | Project-wide assertion checklist with checkbox items grouped by backend/frontend/cross-cutting |
| `_bmad/bmm/workflows/4-implementation/create-story/template.md` | MODIFY | Add Review Model Used, Review Learnings section, Mandatory Assertions section, file list reminder |
| `_bmad/bmm/workflows/4-implementation/create-story/instructions.xml` | MODIFY | Add assertion checklist loading + review pattern extraction in step 2; add template-output sections in step 5 |
| `_bmad/bmm/workflows/4-implementation/code-review/checklist.md` | MODIFY | Add assertion verification + cross-model verification items |
| `_bmad/bmm/workflows/4-implementation/dev-story/checklist.md` | MODIFY | Add mandatory assertion verification item under Testing & QA |

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `_bmad-output/implementation-artifacts/epic-2-retro-2026-03-23.md` | Source of all recurring review patterns to codify |
| `_bmad-output/implementation-artifacts/epic-1-retro-2026-03-23.md` | Source of Epic 1 recurring review patterns |
| `_bmad-output/implementation-artifacts/2-1-church-identity-settings.md` | Example: review findings in Change Log section |
| `_bmad-output/implementation-artifacts/2-3-activity-template-management.md` | Example: repeated findings (getById, fieldset, error toast) |

### Technical Decisions

- **Two-layer enforcement (not convention-only):** The assertion checklist is structurally integrated into both create-story (SM inlines relevant items) and dev-story (dev agent verifies full checklist). This prevents the "checklist exists but nobody reads it" failure mode.
- **Concrete checkbox-format assertions:** The checklist contains tick-off-able checkbox items grouped into three sections: **backend integration tests** (HTTP status codes per role), **frontend component tests** (fieldset disabled, error toast, access denied rendering), and **cross-cutting concerns** (file list, i18n, sanitization). Grouped by endpoint/component type within each section. The SM copies the relevant checkbox blocks directly into the story's Dev Notes.
- **Review feedback loop is structural:** A dedicated template section (`### Review Learnings from Previous Story`) that the SM must fill. The create-story instructions.xml loads the previous story file to extract review findings. Review learnings are written as **patterns/rules** (e.g., "All OWNER-only endpoints require viewer 403 tests"), not incident logs (e.g., "Story 3.1 missed a test").
- **Cross-model verification at review time:** The code review checklist includes a step: "Verify that the model performing this review is different from the model listed under 'Agent Model Used' in the Dev Agent Record. Document yourself under 'Review Model Used'."
- **Living document:** The assertion checklist is updated after each epic's retrospective with new patterns discovered.
- **Minimal workflow surgery:** The create-story instructions.xml gets new actions and template-output fragments inserted into existing steps 2 and 5. No new steps added, no restructuring of existing workflow logic.

### Design Rationale (from Advanced Elicitation + Party Mode)

**Pre-mortem insights:** A standalone checklist file that isn't referenced by workflows will be ignored. All process changes must be structural (workflow steps), not conventional (hoping agents remember).

**Code Review Gauntlet consensus:** SM inlines relevant assertions during creation (contextual), dev agent verifies against full checklist before done (comprehensive). Belt and suspenders.

**First Principles:** The minimum effective change is: one reference file + workflow updates that load it + template slots + verification steps. Four touch points, all structural.

**Party Mode consensus (Bob, Amelia, Quinn, Winston):**
- **Checklist format must be checkboxes** — the dev agent ticks them off during implementation, the reviewer verifies them during code review. Dual-use artifact.
- **Three sections in the checklist:** backend integration tests (by endpoint auth type), frontend component tests (by component pattern), cross-cutting concerns (always apply).
- **SM inlines the actual checkbox items** into Dev Notes — don't reference a file, paste the relevant blocks.
- **Review learnings are patterns, not incidents** — "All OWNER-only endpoints require viewer 403 tests" not "Story 3.1 missed a viewer test."
- **Minimal workflow surgery** — 3 new `<action>` elements in existing step 2 and 2 new `<template-output>` fragments in existing step 5 of create-story instructions.xml. Zero new steps added, no existing elements modified or removed.

## Implementation Plan

### Tasks

- [x] **Task 1: Create assertion checklist document**
  - File: `_bmad-output/planning-artifacts/assertion-checklist.md` (NEW)
  - Action: Create the project-wide assertion checklist with three content sections plus an SM Selection Guidance section:
    1. **Backend Integration Tests** — grouped by endpoint auth type:
       - OWNER-only endpoints: Owner 200/201, Admin 403, Viewer 403, Anonymous 401, validation 400 ProblemDetails, conflict 409, HTML sanitization verified
       - ADMIN-scoped endpoints: Owner 200, Admin (in-scope dept) 200, Admin (out-of-scope dept) 403, Viewer 403, Anonymous 401
       - Authenticated endpoints (VIEWER+): Viewer 200, Anonymous 401
       - Public endpoints: Anonymous 200 (no auth tests needed)
    2. **Frontend Component Tests** — grouped by component pattern:
       - Admin page with form dialog: empty state renders, list renders, form fieldset disabled during mutation, generic error toast on mutation failure, non-authorized role sees access denied/redirect, delete confirmation dialog
       - Admin page with detail view: loading state, error state, not-found handling
    3. **Cross-Cutting Concerns** — always apply:
       - File list updated per task (not retroactively)
       - HTML sanitization integration tests for all text inputs
       - i18n keys added to both FR and EN locales + test-utils.tsx
       - ListItem DTO carries all fields needed by card components (avoid per-card getById queries)
       - DRY shared validation rules when create/update validators share logic
       - Resource disposal: verify no `BuildServiceProvider()` leaks, HttpClient instances disposed, IDisposable services properly scoped (Epic 1 pattern: 2/7 stories)
       - Anti-enumeration: auth endpoints return consistent error shapes — don't reveal whether a user/resource exists via different 404 vs 403 responses (Epic 1 pattern: 1/7 stories)
       - Shared test helpers: when a test helper is used in 2+ test files, extract to shared base class in the same story (Epic 1 pattern: 2/7 stories)
    4. **SM Selection Guidance** — how the SM picks relevant sections:
       - If the story creates or modifies endpoints: include the matching backend auth-type block
       - If the story creates or modifies frontend pages/components: include the matching frontend component block
       - If the story has any backend or frontend work: include the full cross-cutting block
       - If no backend/frontend section matches (e.g., infrastructure, docs-only, real-time): write `### Mandatory Assertions: N/A — [rationale]` in the story Dev Notes explaining why no checklist section applies
       - When in doubt, include the section — over-testing is cheaper than under-testing
  - The document must include a **How to Update** section at the top:
    ```markdown
    ## How to Update This Document
    After each epic retrospective, review the retro's "Recurring Review Feedback Patterns" table.
    For each new pattern: add a checkbox item to the appropriate section (backend, frontend, or cross-cutting).
    For patterns no longer relevant: remove the item with a brief comment in the git commit message.
    For patterns that need refinement: update the wording based on new understanding.
    ```
  - Notes: All items in checkbox format (`- [ ]`). Include a header noting this is a living document. Source patterns from Epic 1 and Epic 2 retro documents.

- [x] **Task 2: Update story template with new sections** (must complete before Tasks 3-4)
  - File: `_bmad/bmm/workflows/4-implementation/create-story/template.md` (MODIFY)
  - Action: Add the following sections/fields:
    1. Add `### Mandatory Assertions` section after `## Dev Notes` — placeholder for SM to inline relevant checkbox items from assertion checklist. Include comment: `<!-- SM: Copy relevant checkbox blocks from _bmad-output/planning-artifacts/assertion-checklist.md. If no section applies, write "N/A — [rationale]" -->`
    2. Add `### Review Learnings from Previous Story` section after `### Mandatory Assertions` — placeholder for SM to fill with pattern-based learnings. Include comment: `<!-- SM: Extract patterns/rules from previous story's code review. Write rules, not incidents. If first story in epic or no review findings, write "N/A — first story in epic" -->`
    3. In `## Dev Agent Record`, add `### Review Model Used` field below `### Agent Model Used` with placeholder `{{review_model_name_version}}`
    4. In `### File List`, add comment: `<!-- Update this list after EACH task, not retroactively at story end -->`

- [x] **Task 3: Update create-story instructions.xml** (depends on Task 1 + Task 2)
  - File: `_bmad/bmm/workflows/4-implementation/create-story/instructions.xml` (MODIFY)
  - **Pre-flight:** Before editing, `git stash` or commit current state so the original can be restored if changes break the workflow.
  - **Part A — Step 2 changes (artifact loading):**
    - **This part has TWO distinct insertion points — do not confuse them:**
    - **Insertion point A1 (INSIDE the `<check if="story_num > 1">` block):**
      - Locate `<check if="story_num > 1">` inside `<step n="2">`. Inside this block, find the last `<action>` tag containing "Extract all learnings that could impact current story implementation".
      - ADD immediately after that `<action>` (still inside the `<check>` block):
        ```xml
        <action>Extract code review findings from previous story's Change Log and any "Code Review Fixes Applied" sections. Rewrite each finding as a reusable PATTERN or RULE (e.g., "All OWNER-only endpoints require viewer 403 tests"), not an incident description (e.g., "Story 2.3 missed a viewer test"). If the previous story has no Change Log or no review findings, set review_learnings to "N/A — no review findings in previous story".</action>
        ```
      - This action only runs when a previous story exists (story_num > 1), which is correct — there are no review learnings for the first story in an epic.
    - **Insertion point A2 (AFTER the closing `</check>` of the `<check if="story_num > 1">` block, still inside `<step n="2">`):**
      - Locate the closing `</check>` tag that ends the `story_num > 1` block.
      - ADD immediately after it (these run for ALL stories, including the first in an epic):
        ```xml
        <!-- Assertion checklist loading (added by tech-spec-epic2-retro-process-improvements) -->
        <action>Load assertion checklist from {planning_artifacts}/assertion-checklist.md if it exists. If the file does not exist, note "No assertion checklist found" and continue — do not error.</action>
        <action>From the assertion checklist, identify which sections apply to this story based on its endpoint types (OWNER-only, ADMIN-scoped, authenticated, public) and frontend component patterns (form dialog, detail view). Use the SM Selection Guidance section in the checklist. If no section applies, prepare "N/A — [rationale]" for the Mandatory Assertions section.</action>
        ```
      - These actions are outside the `story_num > 1` check because the assertion checklist applies to every story, even the first in an epic.
  - **Part B — Step 5 changes (story generation):**
    - **Insertion point B1:** Locate `<template-output file="{default_output_file}">testing_requirements</template-output>` inside `<step n="5">`.
    - ADD immediately after that line:
      ```xml
      <!-- Mandatory assertions from project checklist (added by tech-spec-epic2-retro-process-improvements) -->
      <template-output file="{default_output_file}">mandatory_assertions</template-output>
      ```
      The SM generates the `### Mandatory Assertions` section content by copying the relevant checkbox blocks identified in Part A. If no sections apply, writes "N/A — [rationale]".
    - **Insertion point B2:** Locate `<template-output file="{default_output_file}">previous_story_intelligence</template-output>` inside `<step n="5">`.
    - ADD immediately after that line:
      ```xml
      <!-- Review learnings from previous story (added by tech-spec-epic2-retro-process-improvements) -->
      <check if="story_num > 1">
        <template-output file="{default_output_file}">review_learnings_from_previous_story</template-output>
      </check>
      ```
      The guard uses `story_num > 1` (not "findings available") because: (a) for the first story in an epic, there is no previous story — the template default "N/A — first story in epic" applies; (b) for subsequent stories, Part A always sets `review_learnings` (either real patterns or "N/A — no review findings in previous story"), so the template-output will always have content to emit.
  - Notes: 5 new XML elements total — 3 `<action>` elements in step 2 (Part A), 2 `<template-output>` fragments in step 5 (Part B). All insertions, no existing elements modified or removed. Rollback: `git checkout -- _bmad/bmm/workflows/4-implementation/create-story/instructions.xml`.

- [x] **Task 4: Update code review checklist** (can run in parallel with Task 5)
  - File: `_bmad/bmm/workflows/4-implementation/code-review/checklist.md` (MODIFY)
  - Action: Add three new checklist items:
    1. After the line `- [ ] Tests identified and mapped to ACs; gaps noted`, add:
       ```markdown
       - [ ] Mandatory Assertions from Dev Notes verified: all checkbox items in ### Mandatory Assertions section are implemented (if section shows "N/A", verify the rationale is sound)
       ```
    2. After the line `- [ ] Outcome decided (Approve/Changes Requested/Blocked)`, add:
       ```markdown
       - [ ] Cross-model review verified: model performing this review differs from model listed under "Agent Model Used" in Dev Agent Record. If cross-model review is not possible (only one model available), document the reason and flag for user awareness.
       - [ ] Review Model Used documented in Dev Agent Record under ### Review Model Used
       ```
       Rationale: cross-model verification is a process/meta concern, placed after outcome decision alongside other review-completion items rather than mixed into the code quality section.

- [x] **Task 5: Update dev-story Definition of Done checklist** (can run in parallel with Task 4)
  - File: `_bmad/bmm/workflows/4-implementation/dev-story/checklist.md` (MODIFY)
  - Action: Add two new checklist items:
    1. Under `## 🧪 Testing & Quality Assurance`, after the `**Test Coverage:**` item, add:
       ```markdown
       - [ ] **Mandatory Assertions:** All checkbox items in ### Mandatory Assertions section of Dev Notes are implemented and verified (if section shows "N/A", no action needed)
       ```
    2. Under `## 📝 Documentation & Tracking`, add a new item immediately after the existing `**File List Complete:**` item:
       ```markdown
       - [ ] **File List Incremental Updates:** File List was updated after each task/subtask during implementation, not retroactively at story end
       ```
       Note: This is an insertion (new item), not a modification of the existing File List Complete item. The existing item validates completeness; the new item validates the incremental update process.

### Acceptance Criteria

- [ ] **AC 1:** Given a new assertion checklist file at `_bmad-output/planning-artifacts/assertion-checklist.md`, when a developer reads it, then they find checkbox-format items grouped into Backend Integration Tests (by auth type), Frontend Component Tests (by component pattern), and Cross-Cutting Concerns sections, with all patterns from Epic 1 and Epic 2 retros codified.

- [ ] **AC 2:** Given the updated story template, when the SM creates a new story using `create-story`, then the generated story file contains: (a) `### Mandatory Assertions` section with SM guidance comment, (b) `### Review Learnings from Previous Story` section with fallback guidance comment, (c) `### Review Model Used` field with `{{review_model_name_version}}` placeholder in Dev Agent Record, and (d) file list reminder comment `<!-- Update this list after EACH task... -->` in the File List section.

- [ ] **AC 3:** Given the updated create-story instructions.xml, when the SM creates a story with OWNER-only endpoints and an admin form dialog, then step 2 loads the assertion checklist and identifies the OWNER-only backend block + admin form dialog frontend block + cross-cutting block, and step 5 inlines those checkbox items into the story's Mandatory Assertions section.

- [ ] **AC 3b:** Given the updated create-story instructions.xml, when the SM creates a non-CRUD story (e.g., infrastructure, real-time, docs-only) where no checklist section applies, then the Mandatory Assertions section contains "N/A — [rationale]" explaining why no assertions apply.

- [ ] **AC 4:** Given the updated create-story instructions.xml, when a previous story exists with code review findings in its Change Log, then the SM extracts those findings as patterns/rules and populates the `### Review Learnings from Previous Story` section in the new story.

- [ ] **AC 4b:** Given the updated create-story instructions.xml, when a previous story has no Change Log or no code review findings, then the Review Learnings section contains "N/A — no review findings in previous story" (not an error, not empty).

- [ ] **AC 5:** Given the updated code review checklist, when a reviewer performs a code review, then they must verify (a) all mandatory assertions from Dev Notes are implemented (or "N/A" rationale is sound), (b) the reviewing model differs from the implementing model (or documents why cross-model review was not possible), and (c) the Review Model Used field is documented.

- [ ] **AC 6:** Given the updated dev-story checklist, when the dev agent runs the Definition of Done check, then it verifies all mandatory assertion checkboxes from Dev Notes are implemented before marking the story as review-ready.

## Additional Context

### Dependencies

- Epic 2 retrospective document (completed): `_bmad-output/implementation-artifacts/epic-2-retro-2026-03-23.md`
- Epic 1 retrospective document (completed): `_bmad-output/implementation-artifacts/epic-1-retro-2026-03-23.md`
- No code dependencies — these are process/documentation artifacts
- No external library dependencies

### Testing Strategy

- No automated tests needed — these are markdown/YAML/XML process documents
- **Validation approach:**
  1. After Task 1: Read the assertion checklist and verify it covers every recurring pattern from both retro documents
  2. After Tasks 2-4: Dry-run `create-story` workflow mentally — trace through instructions.xml steps 2 and 5 to confirm the assertion checklist and review learnings would be loaded and inlined
  3. After Task 5: Read the code review checklist and verify cross-model verification and assertion verification steps are present
  4. After Task 5: Read the dev-story checklist and verify mandatory assertions item exists under Testing & QA
  5. End-to-end validation: When Epic 3 Story 3.1 is created, verify the generated story file contains Mandatory Assertions with relevant checkbox items and Review Learnings section

### Notes

- This spec was generated as a direct output of the Epic 2 retrospective
- The assertion checklist is a living document — updated after each epic's retro with new patterns discovered
- **Priority: must be completed before Epic 3 Story 3.1 creation**
- **Task ordering (strict):** Task 1 → Task 2 → Task 3 → Tasks 4 & 5 (parallelizable). Task 3 depends on both Task 1 (checklist must exist) and Task 2 (template sections must exist before template-output references them). Tasks 4 and 5 are independent verification updates that can run in parallel after Task 3.
- **Rollback plan for XML changes:** Before modifying `instructions.xml`, commit or `git stash` the current state. If the workflow breaks after Task 3, restore with `git checkout -- _bmad/bmm/workflows/4-implementation/create-story/instructions.xml`. All XML changes are additive (insertions only) — no existing elements are modified or removed.
- **Smoke test after XML changes:** After Task 3, manually trace through `instructions.xml` steps 2 and 5 with a hypothetical CRUD story to verify: (a) the assertion checklist would be loaded, (b) the correct sections would be identified, (c) the template-output tags would generate content into the correct template sections, (d) the review learnings extraction would handle both "findings exist" and "no findings" cases.
- **Assertion checklist maintenance (epic-to-epic loop):** The retrospective workflow (`_bmad/bmm/workflows/4-implementation/retrospective/instructions.md`) should prompt for assertion checklist updates in its action items step. Until that workflow is updated, the retro facilitator must manually check if new patterns were discovered and update the checklist. This is a known convention-based gap — acceptable as a v1 trade-off since retros are human-facilitated.
- **Concurrent story creation:** The review learnings extraction assumes linear story ordering within an epic. If two stories are created in parallel, both would extract from the same previous story. This is acceptable — parallel stories getting the same review learnings is not harmful, just redundant.
- **Cross-model review when only one model is available:** The code review checklist includes a fallback: document the reason and flag for user awareness. This is a soft control, not a hard gate. The user (Elisha) makes the final call on whether to proceed with same-model review in exceptional cases.
