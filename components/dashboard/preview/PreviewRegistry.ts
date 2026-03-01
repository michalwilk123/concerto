import { AudioPreviewer } from "./AudioPreviewer";
import { ImagePreviewer } from "./ImagePreviewer";
import { PdfPreviewer } from "./PdfPreviewer";
import { TextPreviewer } from "./TextPreviewer";
import type { PreviewerComponent } from "./types";
import { UnsupportedPreviewer } from "./UnsupportedPreviewer";
import { VideoPreviewer } from "./VideoPreviewer";

interface PreviewerRegistryEntry {
  pattern: RegExp | string;
  component: PreviewerComponent;
}

const registry: PreviewerRegistryEntry[] = [
  { pattern: /^image\//, component: ImagePreviewer },
  { pattern: /^audio\//, component: AudioPreviewer },
  { pattern: /^video\//, component: VideoPreviewer },
  { pattern: /^text\//, component: TextPreviewer },
  { pattern: "application/pdf", component: PdfPreviewer },
  { pattern: "application/json", component: TextPreviewer },
  { pattern: "application/javascript", component: TextPreviewer },
  { pattern: "application/typescript", component: TextPreviewer },
];

export function getPreviewerForMimeType(mimeType: string): PreviewerComponent {
  for (const entry of registry) {
    if (typeof entry.pattern === "string") {
      if (mimeType === entry.pattern) return entry.component;
    } else if (entry.pattern.test(mimeType)) {
      return entry.component;
    }
  }
  return UnsupportedPreviewer;
}

export function canPreview(mimeType: string): boolean {
  for (const entry of registry) {
    if (typeof entry.pattern === "string") {
      if (mimeType === entry.pattern) return true;
    } else if (entry.pattern.test(mimeType)) {
      return true;
    }
  }
  return false;
}
