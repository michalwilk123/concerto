/**
 * TEMPORARY styling-diagnosis helper. Logs only "outliers" — measurements whose
 * calculated (DOM) value deviates from the expected value beyond a tolerance.
 * Remove once the translations layout is dialed in.
 */
export interface Measure {
  label: string;
  expected: number | string | boolean | null;
  actual: number | string | boolean | null;
  /** Allowed absolute difference for numeric comparisons (default 1px). */
  tolerance?: number;
  /** Optional extra context printed with the outlier. */
  note?: string;
}

function isOutlier(m: Measure): boolean {
  if (typeof m.expected === "number" && typeof m.actual === "number") {
    return Math.abs(m.actual - m.expected) > (m.tolerance ?? 1);
  }
  return m.actual !== m.expected;
}

export function logOutliers(scope: string, measures: Measure[]): void {
  const outliers = measures.filter(isOutlier);
  if (outliers.length === 0) {
    console.log(`[${scope}] layout ok — ${measures.length} checks, 0 outliers`);
    return;
  }
  for (const m of outliers) {
    const delta =
      typeof m.expected === "number" && typeof m.actual === "number"
        ? `, delta=${Math.round((m.actual - m.expected) * 100) / 100}px`
        : "";
    console.log(
      `[${scope}] OUTLIER · ${m.label} — expected=${JSON.stringify(m.expected)}, calculated=${JSON.stringify(m.actual)}${delta}${m.note ? ` (${m.note})` : ""}`,
    );
  }
}
