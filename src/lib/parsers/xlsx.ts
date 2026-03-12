import * as XLSX from "xlsx";
import type { ParsedEmployee } from "./csv";

export function parseXlsxBuffer(
  buffer: Buffer,
  columnMapping: Record<string, string>
): ParsedEmployee[] {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error("XLSX file has no sheets");

  const sheet = workbook.Sheets[sheetName];
  const records: Record<string, string>[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

  if (records.length === 0) throw new Error("XLSX file has no data rows");

  const mapping = Object.keys(columnMapping).length > 0 ? columnMapping : null;
  const seen = new Set<string>();
  const results: ParsedEmployee[] = [];

  for (const row of records) {
    const get = (internalField: string): string => {
      if (!mapping) return (row[internalField] ?? "").toString().trim();
      const sourceCol = Object.entries(mapping).find(([, v]) => v === internalField)?.[0];
      if (!sourceCol) throw new Error(`Column mapping missing for field: ${internalField}`);
      if (!(sourceCol in row)) throw new Error(`Column "${sourceCol}" not found in XLSX`);
      return (row[sourceCol] ?? "").toString().trim();
    };

    const employeeName = get("employeeName");
    const ssnLast4 = get("ssnLast4");
    const facilityName = get("facilityName");
    const policyNumber = get("policyNumber");

    const key = `${employeeName}|${ssnLast4}`;
    if (seen.has(key)) continue;
    seen.add(key);

    results.push({ employeeName, ssnLast4, facilityName, policyNumber });
  }

  return results;
}
