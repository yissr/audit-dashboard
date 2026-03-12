import * as XLSX from "xlsx";
import { parseMoCensusBuffer } from "./mo-census";
import { parseGroupByFieldBuffer } from "./group-by-field";
import { parseCsvBuffer } from "./csv";
import { parseXlsxBuffer } from "./xlsx";
import type { ParsedEmployee } from "./csv";

/**
 * Auto-detects the carrier file format and parses it.
 *
 * Detection order:
 * 1. Mo Census   — any row has "Client Id:" in column index 4
 * 2. Momentous   — headers contain "GroupLocationNumber"
 * 3. Avid        — headers contain "Division" + "Last Name"
 * 4. Standard    — falls through to column-mapping parser
 */
export function autoDetectAndParse(
  buffer: Buffer,
  fileName: string,
  columnMapping: Record<string, string> = {}
): { employees: ParsedEmployee[]; detectedFormat: string } {
  const lowerName = fileName.toLowerCase();
  const isXlsx = lowerName.endsWith(".xlsx") || lowerName.endsWith(".xls");
  const isCsv = lowerName.endsWith(".csv");

  if (!isXlsx && !isCsv) {
    throw new Error("Unsupported file type. Upload a CSV or XLSX file.");
  }

  // Read raw rows for detection
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error("File has no sheets");
  const sheet = workbook.Sheets[sheetName];
  const rawRows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" });

  // --- Mo Census detection: look for "Client Id:" marker ---
  const isMoCensus = rawRows.some((row) => (row as string[])[4] === "Client Id:");
  if (isMoCensus) {
    return { employees: parseMoCensusBuffer(buffer), detectedFormat: "Mo Census" };
  }

  // Get headers from first row
  const headers = (rawRows[0] as string[]).map((h) => (h ?? "").toString().trim());

  // --- Momentous detection ---
  if (headers.includes("GroupLocationNumber")) {
    return {
      detectedFormat: "Momentous",
      employees: parseGroupByFieldBuffer(buffer, {
        facilityField: "GroupLocationNumber",
        facilityPrefix: "Location ",
        firstNameField: "MemberFirstName",
        lastNameField: "MemberLastName",
        memberIdField: "SubscriberNumber",
        ssnField: "SocialSecurityNumber",
      }),
    };
  }

  // --- Avid detection ---
  if (headers.includes("Division") && headers.includes("Last Name")) {
    return {
      detectedFormat: "Avid",
      employees: parseGroupByFieldBuffer(buffer, {
        facilityField: "Division",
        facilityPrefix: "Division ",
        firstNameField: "First Name",
        lastNameField: "Last Name",
        memberIdField: "Member ID",
        ssnField: "",
      }),
    };
  }

  // --- Standard fallback ---
  const employees = isCsv
    ? parseCsvBuffer(buffer, columnMapping)
    : parseXlsxBuffer(buffer, columnMapping);

  return { employees, detectedFormat: "Standard" };
}
