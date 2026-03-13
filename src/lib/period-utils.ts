const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];

// 0-indexed months that are the last month of a quarter: March=2, June=5, Sep=8, Dec=11
export function isOverlapMonth(month0: number): boolean {
  return month0 === 2 || month0 === 5 || month0 === 8 || month0 === 11;
}

export function quarterForMonth(month0: number): number {
  return Math.floor(month0 / 3) + 1;
}

// Returns 0-indexed last month of the given quarter (1-4)
export function lastMonthOfQuarter(quarter: number): number {
  return quarter * 3 - 1; // Q1→2, Q2→5, Q3→8, Q4→11
}

export function monthDates(year: number, month0: number): { name: string; startDate: string; endDate: string } {
  const start = new Date(year, month0, 1);
  const end = new Date(year, month0 + 1, 0);
  return {
    name: `${MONTHS[month0]} ${year}`,
    startDate: start.toISOString().split("T")[0],
    endDate: end.toISOString().split("T")[0],
  };
}

export function quarterDates(year: number, q: number): { name: string; startDate: string; endDate: string } {
  const startMonth = (q - 1) * 3;
  const endMonth = startMonth + 2;
  const start = new Date(year, startMonth, 1);
  const end = new Date(year, endMonth + 1, 0);
  return {
    name: `Q${q} ${year}`,
    startDate: start.toISOString().split("T")[0],
    endDate: end.toISOString().split("T")[0],
  };
}

/**
 * Returns the linked period's info if this period type/month-or-quarter needs cross-period dedup.
 * Monthly months 3,6,9,12 (0-indexed 2,5,8,11) link to their quarter.
 * Quarterly quarters link to their last month.
 * Returns null if no link is needed.
 */
export function getLinkedPeriodInfo(
  type: "monthly" | "quarterly",
  year: number,
  monthOrQuarter: number  // 0-indexed month for monthly; 1-indexed quarter for quarterly
): { name: string; startDate: string; endDate: string } | null {
  if (type === "monthly") {
    if (!isOverlapMonth(monthOrQuarter)) return null;
    const q = quarterForMonth(monthOrQuarter);
    return quarterDates(year, q);
  } else {
    // quarterly — always links to its last month
    const lastMonth = lastMonthOfQuarter(monthOrQuarter);
    return monthDates(year, lastMonth);
  }
}
