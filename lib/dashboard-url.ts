export type DashboardTab = "files" | "meetings" | "translations";

interface BuildDashboardUrlOptions {
  folderId?: string | null;
  tab?: DashboardTab;
  meetingId?: string | null;
  /** Selected language code for the translations editor (tab=translations). */
  lang?: string | null;
}

export function buildDashboardUrl(groupId: string, options: BuildDashboardUrlOptions = {}): string {
  const params = new URLSearchParams();
  if (options.folderId) params.set("folderId", options.folderId);
  if (options.tab && options.tab !== "files") params.set("tab", options.tab);
  if (options.meetingId) params.set("meetingId", options.meetingId);
  if (options.lang) params.set("lang", options.lang);

  const query = params.toString();
  return query ? `/dashboard/${groupId}?${query}` : `/dashboard/${groupId}`;
}
