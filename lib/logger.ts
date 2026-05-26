type LogArgs = unknown[];

// Single logging chokepoint. Swap the implementation here (structured logging,
// transport, etc.) without touching call sites.
export const logger = {
  info: (...args: LogArgs) => console.info(...args),
  warn: (...args: LogArgs) => console.warn(...args),
  error: (...args: LogArgs) => console.error(...args),
};
