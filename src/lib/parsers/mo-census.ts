import * as XLSX from "xlsx";
import type { ParsedEmployee } from "./csv";

/**
 * Parses Mo-style census files where facilities are identified by section header rows.
 * Pattern per facility:
 *   Row A: [facilityName, "", "", "", "Client Id:", clientId, ...]
 *   Row B: [ID, Type, S/F, Name, DOB, Sex, Status, Eff Date, Term Date, Plan]
 *   Row C+: employee rows until next facility header or EOF
 *
 * Name format in file: "LAST, FIRST" — stored as-is.
 * Member ID stored as policyNumber (no SSN in this format).
 */
export function parseMoCensusBuffer(buffer: Buffer): ParsedEmployee[] {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error("Mo Census file has no sheets");

  const sheet = workbook.Sheets[sheetName];
  const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

  const results: ParsedEmployee[] = [];
  let currentFacility = "";

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i] as string[];

    // Facility header row: col[4] === "Client Id:"
    if (row[4] === "Client Id:") {
      currentFacility = (row[0] as string).trim();
      i++; // skip the column-header row that follows
      continue;
    }

    // Skip non-data rows (report title row, empty rows, column header rows)
    if (!currentFacility) continue;
    const memberId = (row[0] as string).trim();
    if (!memberId || memberId === "ID") continue;

    const name = (row[3] as string).trim();
    if (!name) continue;

    results.push({
      employeeName: name,
      ssnLast4: "",
      facilityName: currentFacility,
      policyNumber: memberId,
    });
  }

  if (results.length === 0) throw new Error("No employee records found in Mo Census file");
  return results;
}
