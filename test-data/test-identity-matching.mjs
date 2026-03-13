// test-data/test-identity-matching.mjs
function normalize(name) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, " ").trim().replace(/\s+/g, " ");
}

const tests = [
  // [name1, name2, shouldMatch]
  ["SMITH, JOHN", "SMITH, JOHN", true],
  ["SMITH, JOHN", "smith, john", true],
  ["SMITH, JOHN", "SMITH  JOHN", true],  // normalize collapses spaces
  ["SMITH, JOHN", "JONES, MARY", false],
  ["O'BRIEN, PAT", "o brien pat", true],
];

let passed = 0;
for (const [a, b, expected] of tests) {
  const result = normalize(a) === normalize(b);
  const ok = result === expected;
  console.log(`${ok ? "PASS" : "FAIL"}: normalize("${a}") ${expected ? "===" : "!=="} normalize("${b}")`);
  if (ok) passed++;
}
console.log(`\n${passed}/${tests.length} passed`);
if (passed !== tests.length) process.exit(1);
