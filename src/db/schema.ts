import {
  pgTable, uuid, text, timestamp, integer, boolean, pgEnum, json, uniqueIndex, bigserial, jsonb, type AnyPgColumn
} from "drizzle-orm/pg-core";

export const fileTypeEnum = pgEnum("file_type", ["CSV", "XLSX", "PDF"]);
export const batchStatusEnum = pgEnum("batch_status", ["DRAFT", "IN_PROGRESS", "SUBMITTED", "CLOSED"]);
export const facilityStatusEnum = pgEnum("facility_status", [
  "DRAFT", "SENT", "REPLIED", "INCOMPLETE", "DONE"
]);
export const classificationEnum = pgEnum("classification", [
  "STILL_EMPLOYED", "TERMINATED", "TRANSFERRED", "FMLA", "LOA", "WORKERS_COMP", "NOT_ON_PAYROLL"
]);
export const inboundEmailStatusEnum = pgEnum("inbound_email_status", [
  "PENDING", "MATCHED", "FAILED", "IGNORED"
]);

export const outreachEventTypeEnum = pgEnum("outreach_event_type", [
  "SENT", "REMINDER", "REPLIED", "INCOMPLETE_NOTICE", "DONE", "NOTE"
]);

export const carriers = pgTable("carriers", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  emailPattern: text("email_pattern"),
  columnMapping: json("column_mapping").$type<Record<string, string>>(),
  fileType: fileTypeEnum("file_type").default("CSV"),
  logoUrl: text("logo_url"),
  ccEmails: json("cc_emails").$type<string[]>().default([]),
  createdAt: timestamp("created_at").defaultNow(),
});

export const carrierReps = pgTable("carrier_reps", {
  id: uuid("id").primaryKey().defaultRandom(),
  carrierId: uuid("carrier_id").notNull().references(() => carriers.id),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const facilities = pgTable("facilities", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  contactEmail: text("contact_email"),
  contactName: text("contact_name"),
  notes: text("notes"),
  ccEmails: json("cc_emails").$type<string[]>().default([]),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => [
  uniqueIndex("facilities_name_unique").on(t.name),
]);

export const auditPeriods = pgTable("audit_periods", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  createdAt: timestamp("created_at").defaultNow(),
  linkedPeriodId: uuid("linked_period_id").references((): AnyPgColumn => auditPeriods.id),
});

export const auditBatches = pgTable("audit_batches", {
  id: uuid("id").primaryKey().defaultRandom(),
  carrierId: uuid("carrier_id").notNull().references(() => carriers.id),
  receivedAt: timestamp("received_at").defaultNow(),
  status: batchStatusEnum("status").default("DRAFT"),
  sourceFile: text("source_file"),
  submittedAt: timestamp("submitted_at"),
  createdAt: timestamp("created_at").defaultNow(),
  repId: uuid("rep_id").references(() => carrierReps.id),
  periodId: uuid("period_id").references(() => auditPeriods.id),
});

export const employeeIdentities = pgTable("employee_identities", {
  id: uuid("id").primaryKey().defaultRandom(),
  periodId: uuid("period_id").notNull().references(() => auditPeriods.id),
  facilityId: uuid("facility_id").notNull().references(() => facilities.id),
  canonicalName: text("canonical_name").notNull(),
  ssnLast4: text("ssn_last4"),
  policyNumber: text("policy_number"),
  coverageTypes: json("coverage_types").$type<string[]>().default([]),
  classification: classificationEnum("classification").default("STILL_EMPLOYED"),
  classificationNotes: text("classification_notes"),
  effectiveDate: timestamp("effective_date"),
  classifiedBy: text("classified_by"),
  classifiedAt: timestamp("classified_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const auditRecords = pgTable("audit_records", {
  id: uuid("id").primaryKey().defaultRandom(),
  batchId: uuid("batch_id").notNull().references(() => auditBatches.id),
  facilityId: uuid("facility_id").notNull().references(() => facilities.id),
  employeeName: text("employee_name").notNull(),
  // TODO: PHASE 2 — encrypt at rest before populating with real employee data
  ssnLast4: text("ssn_last4"),
  policyNumber: text("policy_number"),
  classification: classificationEnum("classification"),
  classificationNotes: text("classification_notes"),
  effectiveDate: timestamp("effective_date"),
  classifiedBy: text("classified_by"),
  classifiedAt: timestamp("classified_at"),
  createdAt: timestamp("created_at").defaultNow(),
  version: integer("version").default(1),
  identityId: uuid("identity_id").references(() => employeeIdentities.id),
});

export const facilityOutreaches = pgTable("facility_outreaches", {
  id: uuid("id").primaryKey().defaultRandom(),
  batchId: uuid("batch_id").notNull().references(() => auditBatches.id),
  facilityId: uuid("facility_id").notNull().references(() => facilities.id),
  status: facilityStatusEnum("status").default("DRAFT"),
  emailBodyHtml: text("email_body_html"),
  reviewApproved: boolean("review_approved").default(false),
  sentAt: timestamp("sent_at"),
  trackingId: text("tracking_id"),
  trackingCode: text("tracking_code"),
  graphMessageId: text("graph_message_id"),
  graphConversationId: text("graph_conversation_id"),
  replyRaw: text("reply_raw"),
  repliedAt: timestamp("replied_at"),
  incompleteReason: text("incomplete_reason"),
  snoozeUntil: timestamp("snooze_until"),
  lastReminderAt: timestamp("last_reminder_at"),
  reminderCount: integer("reminder_count").default(0),
  doneAt: timestamp("done_at"),
  createdAt: timestamp("created_at").defaultNow(),
  version: integer("version").default(1),
  periodId: uuid("period_id").references(() => auditPeriods.id),
});

export const inboundEmails = pgTable("inbound_emails", {
  id: uuid("id").primaryKey().defaultRandom(),
  graphMessageId: text("graph_message_id").unique().notNull(),
  graphConversationId: text("graph_conversation_id").notNull(),
  fromAddress: text("from_address").notNull(),
  subject: text("subject").notNull(),
  bodyText: text("body_text"),
  bodyHtml: text("body_html"),
  receivedAt: timestamp("received_at").notNull(),
  processingStatus: inboundEmailStatusEnum("processing_status").default("PENDING"),
  matchedOutreachId: uuid("matched_outreach_id").references(() => facilityOutreaches.id),
  failureReason: text("failure_reason"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const auditLogs = pgTable("audit_logs", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: uuid("entity_id").notNull(),
  beforeState: jsonb("before_state"),
  afterState: jsonb("after_state"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

export const outreachEvents = pgTable("outreach_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  outreachId: uuid("outreach_id").notNull().references(() => facilityOutreaches.id),
  eventType: outreachEventTypeEnum("event_type").notNull(),
  note: text("note"),
  emailSent: boolean("email_sent").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const simOutbox = pgTable("sim_outbox", {
  id: uuid("id").primaryKey().defaultRandom(),
  outreachId: uuid("outreach_id").references(() => facilityOutreaches.id),
  batchId: uuid("batch_id").references(() => auditBatches.id),
  entryType: text("entry_type").notNull().default("outreach"), // "outreach" | "carrier_submission"
  facilityName: text("facility_name").notNull(),
  toAddress: text("to_address").notNull(),
  subject: text("subject").notNull(),
  htmlBody: text("html_body").notNull(),
  conversationId: text("conversation_id").notNull(),
  repliedAt: timestamp("replied_at"),
  replyReadAt: timestamp("reply_read_at"),
  createdAt: timestamp("created_at").defaultNow(),
});
