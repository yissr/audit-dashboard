import {
  pgTable, uuid, text, timestamp, integer, boolean, pgEnum, json, uniqueIndex
} from "drizzle-orm/pg-core";

export const fileTypeEnum = pgEnum("file_type", ["CSV", "XLSX", "PDF"]);
export const batchStatusEnum = pgEnum("batch_status", ["DRAFT", "IN_PROGRESS", "SUBMITTED", "CLOSED"]);
export const facilityStatusEnum = pgEnum("facility_status", [
  "PENDING_OUTREACH", "AWAITING_REPLY", "REPLIED", "IN_REVIEW", "INCOMPLETE", "SNOOZED", "DONE"
]);
export const classificationEnum = pgEnum("classification", [
  "STILL_EMPLOYED", "TERMINATED", "QUIT", "SICK_LEAVE", "FAMILY_LEAVE", "OTHER"
]);

export const carriers = pgTable("carriers", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  emailPattern: text("email_pattern"),
  columnMapping: json("column_mapping").$type<Record<string, string>>(),
  fileType: fileTypeEnum("file_type").default("CSV"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const facilities = pgTable("facilities", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  contactEmail: text("contact_email"),
  contactName: text("contact_name"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => [
  uniqueIndex("facilities_name_unique").on(t.name),
]);

export const auditBatches = pgTable("audit_batches", {
  id: uuid("id").primaryKey().defaultRandom(),
  carrierId: uuid("carrier_id").notNull().references(() => carriers.id),
  receivedAt: timestamp("received_at").defaultNow(),
  status: batchStatusEnum("status").default("DRAFT"),
  sourceFile: text("source_file"),
  submittedAt: timestamp("submitted_at"),
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
});

export const facilityOutreaches = pgTable("facility_outreaches", {
  id: uuid("id").primaryKey().defaultRandom(),
  batchId: uuid("batch_id").notNull().references(() => auditBatches.id),
  facilityId: uuid("facility_id").notNull().references(() => facilities.id),
  status: facilityStatusEnum("status").default("PENDING_OUTREACH"),
  emailBodyHtml: text("email_body_html"),
  reviewApproved: boolean("review_approved").default(false),
  sentAt: timestamp("sent_at"),
  trackingId: text("tracking_id"),
  replyRaw: text("reply_raw"),
  repliedAt: timestamp("replied_at"),
  incompleteReason: text("incomplete_reason"),
  snoozeUntil: timestamp("snooze_until"),
  lastReminderAt: timestamp("last_reminder_at"),
  reminderCount: integer("reminder_count").default(0),
  doneAt: timestamp("done_at"),
  createdAt: timestamp("created_at").defaultNow(),
});
