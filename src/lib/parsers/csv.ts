import { parse } from "csv-parse/sync";

export interface ParsedEmployee {
  employeeName: string;
  ssnLast4: string;
  facilityName: string;
  policyNumber: string;
}

export function parseCsvBuffer(
  buffer: Buffer,
  columnMapping: Record<string, string>
): ParsedEmployee[] {
  let content = buffer.toString("utf-8");
  if (content.charCodeAt(0) === 0xfeff) content = content.slice(1);

  if (!content.trim()) throw new Error("CSV file is empty");

  const records = parse(content, { columns: true, skip_empty_lines: true, trim: true }) as Record<string, unknown>[];
  if (records.length === 0) throw new Error("CSV file has no data rows");

  const mapping = Object.keys(columnMapping).length > 0 ? columnMapping : null;
  const seen = new Set<string>();
  const results: ParsedEmployee[] = [];

  for (const row of records) {
    const get = (internalField: string): string => {
      if (!mapping) return ((row[internalField] ?? "") as string | number).toString().trim();
      const sourceCol = Object.entries(mapping).find(([, v]) => v === internalField)?.[0];
      if (!sourceCol) throw new Error(`Column mapping missing for field: ${internalField}`);
      if (!(sourceCol in row)) throw new Error(`Column "${sourceCol}" not found in CSV`);
      return ((row[sourceCol] ?? "") as string | number).toString().trim();
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
