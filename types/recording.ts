export interface Recording {
  id: string;
  name: string;
  meetingName: string;
  meetingId?: string;
  size: number;
  lastModified: string;
  url: string;
  duration: number;
}
