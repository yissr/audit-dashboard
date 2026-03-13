// test-data/test-period-linking.mjs

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function isOverlapMonth(m) { return m === 2 || m === 5 || m === 8 || m === 11; }
function quarterForMonth(m) { return Math.floor(m / 3) + 1; }
function lastMonthOfQuarter(q) { return q * 3 - 1; }
function monthDates(year, m) {
  const start = new Date(year, m, 1);
  const end = new Date(year, m + 1, 0);
  return { name: `${MONTHS[m]} ${year}`, startDate: start.toISOString().split("T")[0], endDate: end.toISOString().split("T")[0] };
}
function quarterDates(year, q) {
  const sm = (q-1)*3, em = sm+2;
  const start = new Date(year, sm, 1), end = new Date(year, em+1, 0);
  return { name: `Q${q} ${year}`, startDate: start.toISOString().split("T")[0], endDate: end.toISOString().split("T")[0] };
}
function getLinkedPeriodInfo(type, year, monthOrQuarter) {
  if (type === "monthly") {
    if (!isOverlapMonth(monthOrQuarter)) return null;
    return quarterDates(year, quarterForMonth(monthOrQuarter));
  } else {
    return monthDates(year, lastMonthOfQuarter(monthOrQuarter));
  }
}

const tests = [
  // [description, type, year, monthOrQuarter, expectedName or null]
  ["March monthly links to Q1",    "monthly",   2026, 2,  "Q1 2026"],
  ["June monthly links to Q2",     "monthly",   2026, 5,  "Q2 2026"],
  ["Sep monthly links to Q3",      "monthly",   2026, 8,  "Q3 2026"],
  ["Dec monthly links to Q4",      "monthly",   2026, 11, "Q4 2026"],
  ["January monthly — no link",    "monthly",   2026, 0,  null],
  ["February monthly — no link",   "monthly",   2026, 1,  null],
  ["April monthly — no link",      "monthly",   2026, 3,  null],
  ["Q1 quarterly links to March",  "quarterly", 2026, 1,  "March 2026"],
  ["Q2 quarterly links to June",   "quarterly", 2026, 2,  "June 2026"],
  ["Q3 quarterly links to Sep",    "quarterly", 2026, 3,  "September 2026"],
  ["Q4 quarterly links to Dec",    "quarterly", 2026, 4,  "December 2026"],
];

let passed = 0;
for (const [desc, type, year, moq, expected] of tests) {
  const result = getLinkedPeriodInfo(type, year, moq);
  const actual = result ? result.name : null;
  const ok = actual === expected;
  console.log(`${ok ? "PASS" : "FAIL"}: ${desc} → ${actual ?? "null"}`);
  if (ok) passed++;
}
console.log(`\n${passed}/${tests.length} passed`);
if (passed !== tests.length) process.exit(1);
