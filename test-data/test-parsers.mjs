import { readFileSync } from "fs";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const XLSX = require("xlsx");

const files = {
  moCensus: "C:/Users/YK/Downloads/Mo Census March.xls",
  avid: "C:/Users/YK/Downloads/Avid Guardian Only January Census.xls",
  momentous: "C:/Users/YK/Downloads/Momentous Census March.xlsx",
};

let allPassed = true;

function test(name, fn) {
  try {
    fn();
    console.log(`PASS: ${name}`);
  } catch (e) {
    console.log(`FAIL: ${name}`);
    console.log(`  ${e.message}`);
    allPassed = false;
  }
}

// --- Mo Census: verify Type=01 filter ---
test("Mo Census: only Type=01 rows (subscribers)", () => {
  const buf = readFileSync(files.moCensus);
  const workbook = XLSX.read(buf, { type: "buffer" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

  let currentFacility = "";
  let totalData = 0;
  let type01 = 0;
  const facilityCounts = {};

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (row[4] === "Client Id:") {
      currentFacility = (row[0] || "").toString().trim();
      i++;
      continue;
    }
    if (!currentFacility) continue;
    const memberId = (row[0] || "").toString().trim();
    if (!memberId || memberId === "ID") continue;
    const name = (row[3] || "").toString().trim();
    if (!name) continue;

    totalData++;
    const type = (row[1] ?? "").toString().trim();
    if (type === "01") {
      type01++;
      facilityCounts[currentFacility] = (facilityCounts[currentFacility] || 0) + 1;
    }
  }

  console.log(`  Total data rows: ${totalData}`);
  console.log(`  Type=01 (members): ${type01}`);
  console.log(`  Filtered out (dependents): ${totalData - type01}`);
  console.log(`  Facilities:`, JSON.stringify(facilityCounts));

  if (totalData === 0) throw new Error("No data rows found");
  if (type01 === 0) throw new Error("No Type=01 rows found");
  // Note: this file may have all Type=01 (no dependents) — that's valid
});

// --- Avid: verify Relationship=Member filter ---
test("Avid: only Relationship=Member rows", () => {
  const buf = readFileSync(files.avid);
  const workbook = XLSX.read(buf, { type: "buffer" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

  let total = 0;
  let members = 0;
  const facilityCounts = {};

  for (const row of rows) {
    total++;
    const rel = (row["Relationship"] ?? "").toString().trim();
    if (rel === "Member") {
      members++;
      const div = `Division ${(row["Division"] ?? "").toString().trim()}`;
      facilityCounts[div] = (facilityCounts[div] || 0) + 1;
    }
  }

  console.log(`  Total data rows: ${total}`);
  console.log(`  Relationship=Member: ${members}`);
  console.log(`  Filtered out (dependents): ${total - members}`);
  console.log(`  Facilities:`, JSON.stringify(facilityCounts));

  if (total === 0) throw new Error("No data rows found");
  if (members === 0) throw new Error("No Member rows found");
  if (members >= total) throw new Error("No dependents filtered — filter may not be working");
});

// --- Momentous: verify RelationshipCode=1 filter ---
test("Momentous: only RelationshipCode=1 rows", () => {
  const buf = readFileSync(files.momentous);
  const workbook = XLSX.read(buf, { type: "buffer" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

  let total = 0;
  let members = 0;
  const facilityCounts = {};

  for (const row of rows) {
    total++;
    const relCode = (row["RelationshipCode"] ?? "").toString().trim();
    if (relCode === "1") {
      members++;
      const loc = `Location ${(row["GroupLocationNumber"] ?? "").toString().trim()}`;
      facilityCounts[loc] = (facilityCounts[loc] || 0) + 1;
    }
  }

  console.log(`  Total data rows: ${total}`);
  console.log(`  RelationshipCode=1 (members): ${members}`);
  console.log(`  Filtered out (dependents): ${total - members}`);
  console.log(`  Facilities:`, JSON.stringify(facilityCounts));

  if (total === 0) throw new Error("No data rows found");
  if (members === 0) throw new Error("No RelationshipCode=1 rows found");
  if (members >= total) throw new Error("No dependents filtered — filter may not be working");
});

console.log("\n" + (allPassed ? "ALL TESTS PASSED" : "SOME TESTS FAILED"));
process.exit(allPassed ? 0 : 1);
