import { File, FileAudio, FileImage, FileText, FileVideo, Folder } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export function getFileIcon(mimeType: string): LucideIcon {
  if (mimeType.startsWith("image/")) return FileImage;
  if (mimeType.startsWith("video/")) return FileVideo;
  if (mimeType.startsWith("audio/")) return FileAudio;
  if (mimeType.startsWith("text/")) return FileText;
  if (mimeType === "application/pdf") return FileText;
  if (mimeType === "application/json") return FileText;
  return File;
}

export { Folder as FolderIcon };
