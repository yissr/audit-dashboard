import * as XLSX from "xlsx";
import type { ParsedEmployee } from "./csv";

export interface GroupByFieldConfig {
  /** Column whose value becomes the facility name (e.g. "Division", "GroupLocationNumber") */
  facilityField: string;
  /** Column for first name, or combined full name if lastNameField is omitted */
  firstNameField: string;
  /** Column for last name (optional — leave blank if file has a single name column) */
  lastNameField?: string;
  /** Column for member/subscriber ID → stored as policyNumber */
  memberIdField?: string;
  /** Column for SSN → last 4 digits stored as ssnLast4 */
  ssnField?: string;
  /** Prefix prepended to facility field value, e.g. "Division " or "Location " */
  facilityPrefix?: string;
  /** Column to check for member/subscriber filtering (e.g. "Relationship", "RelationshipCode") */
  memberFilterField?: string;
  /** Value that identifies a primary member (e.g. "Member", "1") */
  memberFilterValue?: string;
  /**
   * If set, skip rows where ALL of these columns have values matching the given value.
   * Example: skip rows where both "Dental Elected" and "Vision Elected" are "No".
   * Applied only when these columns exist in the file.
   */
  skipIfAllColumnsMatch?: { fields: string[]; value: string };
  /**
   * If set, skip rows where this column has any non-empty value.
   * Example: skip rows where "MedicalTerminationDate" is populated.
   * Applied only when this column exists in the file.
   */
  skipIfColumnNotEmpty?: string;
}

export function parseGroupByFieldBuffer(
  buffer: Buffer,
  config: GroupByFieldConfig
): ParsedEmployee[] {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error("File has no sheets");

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: "" });

  if (rows.length === 0) throw new Error("File has no data rows");

  const seen = new Set<string>();
  const results: ParsedEmployee[] = [];

  for (const row of rows) {
    const facilityCode = (row[config.facilityField] ?? "").toString().trim();
    if (!facilityCode) continue;

    // Filter: only keep primary members if filter is configured
    if (config.memberFilterField) {
      const filterVal = (row[config.memberFilterField] ?? "").toString().trim();
      if (filterVal !== config.memberFilterValue) continue;
    }

    // Skip rows where all specified columns match a given value (e.g. both vision & dental = "No")
    if (config.skipIfAllColumnsMatch) {
      const { fields, value } = config.skipIfAllColumnsMatch;
      const presentFields = fields.filter((f) => f in row);
      if (presentFields.length > 0) {
        const allMatch = presentFields.every(
          (f) => (row[f] ?? "").toString().trim().toLowerCase() === value.toLowerCase()
        );
        if (allMatch) continue;
      }
    }

    // Skip rows where a termination-date column is non-empty
    if (config.skipIfColumnNotEmpty && config.skipIfColumnNotEmpty in row) {
      const val = (row[config.skipIfColumnNotEmpty] ?? "").toString().trim();
      if (val) continue;
    }

    const facilityName = `${config.facilityPrefix ?? ""}${facilityCode}`;

    let employeeName: string;
    if (config.lastNameField) {
      const last = (row[config.lastNameField] ?? "").toString().trim();
      const first = (row[config.firstNameField] ?? "").toString().trim();
      employeeName = `${last}, ${first}`.trim().replace(/^,\s*/, "").replace(/,\s*$/, "");
    } else {
      employeeName = (row[config.firstNameField] ?? "").toString().trim();
    }
    if (!employeeName) continue;

    const policyNumber = config.memberIdField
      ? (row[config.memberIdField] ?? "").toString().trim()
      : "";

    let ssnLast4 = "";
    if (config.ssnField) {
      const ssn = (row[config.ssnField] ?? "").toString().replace(/\D/g, "");
      ssnLast4 = ssn.length >= 4 ? ssn.slice(-4) : ssn;
    }

    const key = `${employeeName}|${facilityName}|${policyNumber}`;
    if (seen.has(key)) continue;
    seen.add(key);

    results.push({ employeeName, ssnLast4, facilityName, policyNumber });
  }

  if (results.length === 0) throw new Error("No employee records found in file");
  return results;
}
