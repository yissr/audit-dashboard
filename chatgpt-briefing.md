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
