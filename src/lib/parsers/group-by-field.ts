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
