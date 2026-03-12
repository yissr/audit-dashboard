# WC Audit Dashboard — External Briefing

## Project Overview
Workers' Compensation Audit Dashboard built with Next.js 16, Drizzle ORM, Neon PostgreSQL, Tailwind CSS, and shadcn/ui components.

**Purpose:** Manage workers' comp audit batches received from insurance carriers. Each batch contains employee records grouped by facility. Operators classify each employee's status and mark facilities as done or incomplete.

## Architecture
- **Framework:** Next.js 16 (App Router, Server Components, Server Actions)
- **Database:** Neon PostgreSQL via Drizzle ORM
- **UI:** Tailwind CSS + shadcn/ui components
- **Deployment:** Not yet configured

## Schema (key tables)
- `carriers` — insurance carrier info
- `facilities` — employer facilities with contact info
- `auditBatches` — uploaded audit files, linked to a carrier
- `auditRecords` — individual employee records (name, SSN last 4, policy #, classification fields)
- `facilityOutreaches` — per-facility-per-batch tracking (status, incomplete reason, done timestamp)

## Phase Status
- **Phase 1 (Core CRUD + Batch Ingestion):** COMPLETE
- **Phase 2 (Email Pipeline — Microsoft Graph):** SKIPPED (Azure AD credentials not available)
- **Phase 3 (Classification Console):** COMPLETE

## Key Routes
- `/` — Dashboard with stats
- `/batches` — Batch list grouped by month
- `/batches/[id]` — Batch detail with facility table, status dropdowns, Classify links
- `/batches/[id]/facilities/[facilityId]` — Classification console (Phase 3)
- `/facilities` — Facility CRUD
- `/carriers` — Carrier CRUD

---

## Run Log

### Run: /build — 2026-03-12
**Task:** Phase 3 — Classification Console
**Outcome:** APPROVED
**Iterations:** 2 (parallel agents converged)
**Files created/modified:**
- `src/app/batches/[id]/facilities/[facilityId]/page.tsx` (new — classification page)
- `src/app/batches/[id]/facilities/[facilityId]/ClassifyRow.tsx` (new — per-employee classification buttons)
- `src/app/batches/[id]/facilities/[facilityId]/FacilityActions.tsx` (new — Mark Done / Mark Incomplete)
- `src/app/batches/[id]/facilities/actions.ts` (new — classifyEmployee, markFacilityDone, markFacilityIncomplete)
- `src/app/batches/[id]/page.tsx` (modified — added Classify link + Action column)
**Key decisions:** Route placed at `/facilities/[facilityId]` under batch (not `/classify/`). markFacilityDone validates all records classified server-side. classifiedBy hardcoded to "dashboard-user" until auth is added.
**Issues encountered:** Two parallel agents built at different route paths (`/classify/` vs `/facilities/`). Converged on `/facilities/` path. Fixed dead link in follow-up commit.
**Open items:** No auth system yet (classifiedBy is hardcoded). Phase 2 email pipeline still skipped.

### Run: /build — 2026-03-12 (2)
**Task:** Phase 4 — Snooze and Reminder Tracking
**Outcome:** APPROVED
**Iterations:** 1
**Files created/modified:**
- `src/app/batches/actions.ts` (modified — added snoozeFacility, wakeFacility, logReminder, checkAndWakeExpiredSnoozes)
- `src/app/batches/[id]/FacilityRowActions.tsx` (new — client component with snooze/wake/reminder buttons)
- `src/app/batches/[id]/page.tsx` (modified — fetch reminder fields, call checkAndWakeExpiredSnoozes on load)
**Key decisions:** Inline snooze duration picker (button list) instead of dialog+form for simplicity. Expired snoozes auto-wake on page load via server-side check. Reminder button just increments count (actual email sending deferred to Phase 2).
**Issues encountered:** None.
**Open items:** Send Reminder is UI-only (no email). Phase 2 email pipeline still skipped.

### Run: /build — 2026-03-12 (3)
**Task:** Filter dependents from parsers + add facility review step on upload
**Outcome:** APPROVED
**Iterations:** 1
**Files created/modified:**
- `src/lib/parsers/mo-census.ts` (modified — filter Type!="01" rows)
- `src/lib/parsers/group-by-field.ts` (modified — added memberFilterField/memberFilterValue config)
- `src/lib/parsers/auto-detect.ts` (modified — pass filter config for Avid/Momentous, added autoDetectAndPreview)
- `src/app/batches/actions.ts` (modified — added previewFile action, ingestBatch accepts facilityMappings)
- `src/app/batches/new/page.tsx` (rewritten — server component wrapper)
- `src/app/batches/new/new-batch-form.tsx` (new — client component with two-step upload flow)
- `test-data/test-parsers.mjs` (new — parser test script)
**Key decisions:** Generic memberFilterField/memberFilterValue in GroupByFieldConfig avoids per-carrier filter logic. File parsed twice (preview + ingest) to keep architecture simple. Server/client split for upload page.
**Issues encountered:** Mo Census sample file had all Type="01" (no dependents to filter). Test adjusted to accept this as valid.
**Open items:** No end-to-end UI test for the facility review flow. File parsed twice per upload (acceptable for <10MB files).

### Run: /build — 2026-03-12
**Task:** Schema migration v2 — status enum rename, new tables (inboundEmails, auditLogs), snooze column-modifier refactor, webhook handler
**Outcome:** APPROVED WITH RECOMMENDATIONS
**Iterations:** 3 (two build failures before passing)
**Files created/modified:**
- `src/db/schema.ts` — enum restructured, new tables, new columns
- `src/app/batches/actions.ts` — status rename, snooze/wake fix, transition guard integrated
- `src/lib/outreach-transitions.ts` (new) — OutreachStatus type + assertValidTransition()
- `src/app/batches/[id]/OutreachStatusSelect.tsx` — removed SNOOZED/IN_REVIEW
- `src/app/batches/[id]/FacilityRowActions.tsx` — snooze badge uses snoozeUntil column not status
- `src/app/batches/[id]/page.tsx` — status colors updated, snooze badge added
- `src/app/page.tsx` — dashboard queries updated (SENT replaces AWAITING_REPLY, snoozed uses column query)
- `src/app/batches/[id]/facilities/[facilityId]/page.tsx` — fallback status DRAFT
- `src/app/api/webhooks/inbox/route.ts` (new) — Power Automate webhook handler
**Key decisions:** assertValidTransition extracted to src/lib/ (non-"use server") because Next.js 16 Turbopack rejects sync exports from server action files. export type re-exports also rejected by Turbopack's server action bundler — types must be imported directly from lib module.
**Issues encountered:** Next.js 16 "Server Actions must be async functions" error for any non-async export from a "use server" file (including sync helpers and type re-exports). Resolved by moving type + guard to separate lib module. drizzle-kit push not runnable in CI (Neon WebSocket requires live DATABASE_URL).
**Open items:** User must run data migration SQL before drizzle-kit push to update existing rows with old enum values (SNOOZED→SENT, IN_REVIEW→REPLIED, PENDING_OUTREACH→DRAFT, AWAITING_REPLY→SENT). Webhook REPLIED transition bypasses assertValidTransition by design (automated path).
