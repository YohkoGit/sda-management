# UI Validation — Visual Verification Workflow

<critical>The workflow execution engine is governed by: {project-root}/_bmad/core/tasks/workflow.xml</critical>
<critical>You MUST have already loaded and processed: {installed_path}/workflow.yaml</critical>
<critical>Communicate all responses in {communication_language}</critical>

<workflow>

<step n="1" goal="Load story and check if UI validation applies">
  <action>Use provided {{story_path}} or ask user which story file to validate</action>
  <action>Read COMPLETE story file</action>
  <action>Set {{story_key}} from filename (e.g., "5-1-public-dashboard-hero-section-and-next-activity")</action>
  <action>Extract {{epic_num}} from story key (first number before the dash)</action>

  <!-- Check screenshot manifest -->
  <action>Read {manifest_file}</action>
  <check if="{{story_key}} NOT found in manifest">
    <output>ℹ️ Story `{{story_key}}` has no entry in the screenshot manifest — no frontend screens to validate.
Marking story as **done** (no UI validation needed).</output>
    <action>Jump to Step 6 with {{new_status}} = "done" and {{skip_reason}} = "no-frontend"</action>
  </check>

  <action>Read manifest entry for {{story_key}}</action>
  <check if="manifest entry status == 'validated' AND compliance == 'pass'">
    <output>✅ Story `{{story_key}}` was already validated with a **pass**. No re-validation needed.</output>
    <ask>Re-validate anyway? (y/n)</ask>
    <check if="user says no">
      <action>Jump to Step 6 with {{new_status}} = "done"</action>
    </check>
  </check>
  <check if="manifest entry compliance == 'blocked'">
    <output>🚫 Story `{{story_key}}` is **blocked** from full UI validation.
**Blocker:** {{manifest_blocker_field}}
**Screens captured:** {{screen_count}} (some/all screens could not be captured)</output>
    <ask>Options:
1. **Re-attempt** — blocker has been resolved, try capturing missing screens
2. **Accept partial** — mark as done with current coverage
3. **Skip** — leave as blocked
Choice:</ask>
    <check if="user chooses 1"><action>Continue to Step 2 (re-attempt capture)</action></check>
    <check if="user chooses 2"><action>Jump to Step 6 with {{new_status}} = "done"</action></check>
    <check if="user chooses 3"><action>STOP — story remains in ui-review</action></check>
  </check>
</step>

<step n="2" goal="Ensure prerequisites for capture">
  <action>Check if the app is running:
    - Try `curl http://localhost:5173/` (frontend)
    - Try `curl http://localhost:5000/api/config` (backend)
  </action>
  <check if="app not running">
    <output>⚠️ The app must be running locally for screenshot capture.
Start it with:
```
# Terminal 1 — Backend
cd src/SdaManagement.Api && dotnet run

# Terminal 2 — Frontend
cd src/sdamanagement-web && npm run dev
```</output>
    <ask>Press Enter when the app is running, or type "skip" to validate existing screenshots only.</ask>
    <check if="user says skip AND manifest status == 'captured' or 'validated'">
      <action>Jump to Step 4 (validate existing screenshots)</action>
    </check>
  </check>

  <!-- Check/create capture plan -->
  <action>Look for capture plan at {capture_plans_dir}/epic-{{epic_num}}.yaml</action>
  <check if="capture plan not found">
    <output>📝 No capture plan exists for Epic {{epic_num}}. Generating one now...</output>
    <action>Read the story file's Tasks/Subtasks and Dev Notes for frontend components, routes, and UI states</action>
    <action>Read relevant UX spec sections (loaded via discover_inputs)</action>
    <action>Generate a capture plan YAML with:
      - story key, role needed (anonymous/viewer/admin/owner)
      - screens: id, url, viewport [width, height], desc, actions, ux_checks
      - Cover: mobile (375x812) + desktop (1280x800) for key views
      - Include: loaded state, empty state, error state, responsive variants
    </action>
    <action>Save capture plan to {capture_plans_dir}/epic-{{epic_num}}.yaml</action>
  </check>

  <action>Read the capture plan entry for {{story_key}}</action>
  <invoke-protocol name="discover_inputs" />
</step>

<step n="3" goal="Capture screenshots via Playwright">
  <action>Create screenshot directory: {screenshots_dir}/epic-{{epic_num}}/{{story_key}}/</action>

  <action>For EACH screen defined in the capture plan for {{story_key}}:</action>
  <action>
    1. Set viewport to the screen's defined dimensions (browser_resize)
    2. Navigate to the screen's URL (browser_navigate)
    3. Perform any defined actions (click, fill, login, mock_override)
    4. Wait for page to settle (network idle or explicit wait)
    5. Take screenshot (browser_take_screenshot) → save to {screenshots_dir}/epic-{{epic_num}}/{{story_key}}/{screen_id}.png
  </action>

  <!-- Track screens that could not be captured -->
  <action>For each screen that CANNOT be captured, record the reason in {{skipped_screens}}:
    - "mock-overrides" — requires API mock/intercept (e.g., 409 conflict, empty state, loading delay)
    - "alt-role-credentials" — requires logging in as a different role (admin, viewer)
    - "seed-data" — requires specific data state not present (uploaded avatars, specialType activities)
    - "mobile-interaction" — requires click/tap interactions during capture on mobile viewport
    - "interaction-capture" — requires multi-step user interaction that Playwright can't automate in this pass
  </action>

  <action>Update {manifest_file}: set story status to "captured", screen_count (only successfully captured), captured date</action>

  <check if="{{skipped_screens}} is not empty">
    <action>Set {{blocker_categories}} = unique blocker reasons from {{skipped_screens}}</action>
    <action>Determine if skipped screens cover CORE acceptance criteria of the story (not just edge cases)</action>
    <check if="skipped screens cover core ACs">
      <action>Update manifest: compliance = "blocked", blocker = summary of {{blocker_categories}}</action>
      <output>📸 Captured {{screen_count}} screenshots for `{{story_key}}`
🚫 **{{skipped_count}} screens blocked** — core ACs not visually verifiable:
{{#each skipped_screens}}
- Screen {{screen_id}}: {{reason}} — {{description}}
{{/each}}
Blocker(s): {{blocker_categories}}</output>
      <action>Continue to Step 4 to validate what WAS captured, then jump to Step 5 blocked path</action>
    </check>
    <check if="skipped screens are edge cases only (empty states, skeletons, rare states)">
      <output>📸 Captured {{screen_count}} screenshots for `{{story_key}}`
ℹ️ {{skipped_count}} edge-case screens skipped (not core ACs):
{{#each skipped_screens}}
- Screen {{screen_id}}: {{reason}}
{{/each}}</output>
      <action>Continue to Step 4 — these skips do NOT block validation</action>
    </check>
  </check>

  <check if="{{skipped_screens}} is empty">
    <output>📸 Captured {{screen_count}} screenshots for `{{story_key}}`</output>
  </check>
</step>

<step n="4" goal="Validate screenshots against UX spec">
  <critical>You are a UX compliance reviewer. Compare each screenshot against the UX design specification.</critical>

  <action>For EACH captured screenshot:
    1. Read the screenshot image file (Claude can view images via Read tool)
    2. Read the ux_checks list from the capture plan for this screen
    3. Read the relevant UX spec sections (color system, typography, responsive, component strategy)
    4. For each ux_check item, determine: PASS or FAIL
    5. For FAILs: note the specific deviation (expected vs actual)
  </action>

  <action>Generate compliance report at {compliance_dir}/{{story_key}}.md with:
    - UX spec sections referenced
    - Per-screen compliance table ([x] pass / [ ] fail per check)
    - Findings summary table (severity, screen, issue)
    - Overall assessment: PASS / PARTIAL / FAIL
    - Recommendations for fixes
  </action>

  <action>Update {manifest_file}:
    - status: "validated"
    - compliance: "pass" | "partial" | "fail" | "blocked"
    - findings: count of non-compliant items
    - blocker: (if blocked) summary of what prevents full validation
    - notes: any screens skipped and why
  </action>
</step>

<step n="5" goal="Present findings and decide outcome">
  <check if="compliance == 'pass'">
    <output>✅ **UI Validation PASSED** for `{{story_key}}`

All {{screen_count}} screens comply with the UX design specification.
Compliance report: {compliance_dir}/{{story_key}}.md</output>
    <action>Set {{new_status}} = "done"</action>
  </check>

  <check if="compliance == 'blocked'">
    <output>🚫 **UI Validation BLOCKED** for `{{story_key}}`

**Captured screens:** {{screen_count}} — all captured screens pass compliance checks.
**Blocked screens:** {{skipped_count}} — core ACs cannot be visually verified.
**Blocker(s):** {{blocker_categories}}

{{#each skipped_screens}}
- Screen {{screen_id}}: {{reason}} — {{description}}
{{/each}}

Compliance report: {compliance_dir}/{{story_key}}.md</output>

    <ask>How to proceed?
1. **Accept partial and mark done** — blocked screens are acceptable risk
2. **Keep as ui-review** — story stays blocked until blockers are resolved
3. **Show details** — view captured screenshots + blocker details
Choice:</ask>

    <check if="user chooses 1">
      <action>Set {{new_status}} = "done"</action>
      <action>Update manifest: compliance = "pass", add notes about accepted partial coverage</action>
    </check>
    <check if="user chooses 2">
      <action>Set {{new_status}} = "ui-review"</action>
    </check>
    <check if="user chooses 3">
      <action>For each blocker: explain what's needed to unblock, show captured screenshots</action>
      <action>Return to this decision point</action>
    </check>
  </check>

  <check if="compliance == 'partial' or 'fail'">
    <output>⚠️ **UI Validation: {{findings_count}} finding(s)** for `{{story_key}}`

{{#each findings}}
- **{{severity}}**: {{description}} (screen: {{screen_id}})
{{/each}}

Compliance report: {compliance_dir}/{{story_key}}.md</output>

    <ask>How to proceed?
1. **Accept and mark done** — findings are cosmetic / acceptable deviations
2. **Fix and re-validate** — send back to in-progress for fixes
3. **Show details** — view specific screenshots + findings side by side
Choice:</ask>

    <check if="user chooses 1">
      <action>Set {{new_status}} = "done"</action>
    </check>
    <check if="user chooses 2">
      <action>Set {{new_status}} = "in-progress"</action>
    </check>
    <check if="user chooses 3">
      <action>For each finding: Read the screenshot, display finding details, show UX spec reference</action>
      <action>Return to this decision point</action>
    </check>
  </check>
</step>

<step n="6" goal="Update story status and sync sprint tracking">
  <check if="{{skip_reason}} == 'no-frontend'">
    <action>Story has no frontend — skip screenshot work</action>
  </check>

  <!-- Update story file status -->
  <check if="{{new_status}} == 'done'">
    <action>Update story file Status field to "done"</action>
  </check>
  <check if="{{new_status}} == 'in-progress'">
    <action>Update story file Status field to "in-progress"</action>
  </check>
  <check if="{{new_status}} == 'ui-review'">
    <action>Update story file Status field to "ui-review"</action>
  </check>

  <!-- Sync sprint-status.yaml -->
  <check if="{sprint_status} file exists">
    <action>Load the FULL file: {sprint_status}</action>
    <action>Find development_status key matching {{story_key}}</action>
    <action>Update development_status[{{story_key}}] = "{{new_status}}"</action>
    <check if="{{new_status}} == 'ui-review'">
      <action>Append inline comment: "# BLOCKED: {{blocker_summary}}"</action>
    </check>
    <action>Save file, preserving ALL comments and structure</action>
    <output>📊 Sprint status synced: {{story_key}} → {{new_status}}</output>
  </check>

  <!-- Check if all stories in epic are done → mark epic done -->
  <check if="{{new_status}} == 'done'">
    <action>Check if ALL stories for epic-{{epic_num}} are now "done" in sprint-status</action>
    <check if="all stories done">
      <action>Update development_status[epic-{{epic_num}}] = "done"</action>
      <output>🎉 Epic {{epic_num}} is now fully complete!</output>
    </check>
    <check if="some stories are 'ui-review' (blocked)">
      <action>Ensure development_status[epic-{{epic_num}}] = "in-progress"</action>
      <output>⚠️ Epic {{epic_num}} has blocked stories — cannot mark as done.</output>
    </check>
  </check>

  <output>**UI Validation Complete!**

**Story:** {{story_key}}
**Status:** {{new_status}}
{{#if compliance}}**Compliance:** {{compliance}} ({{findings_count}} findings){{/if}}
{{#if skip_reason}}**Skipped:** {{skip_reason}}{{/if}}
{{#if blocker_categories}}**Blocker(s):** {{blocker_categories}}{{/if}}

{{#if new_status == "done"}}✅ Story complete! Run `/bmad-bmm-sprint-status` to see what's next.
{{else if new_status == "ui-review"}}🚫 Story blocked. Resolve blocker(s), then re-run `/bmad-bmm-ui-validation`.
{{else}}⚠️ Fix the UI findings, then re-run `/bmad-bmm-ui-validation`.{{/if}}</output>
</step>

</workflow>
