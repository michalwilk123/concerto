// Shared layout for the manage tables (users + groups) so both tabs render at
// an identical width regardless of which one is active.
//
// The DataTableShell debug check expects `minWidth === sum(fixed columns) + 40`
// (20px horizontal padding on each side), so each table's column track widths
// must add up to MANAGE_TABLE_MIN_WIDTH - 40.
export const MANAGE_TABLE_MIN_WIDTH = 960;
export const MANAGE_TABLE_MAX_WIDTH = 1040;
