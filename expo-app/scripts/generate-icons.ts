/**
 * Generates the Concerto mobile app icons from the brand mark in app/icon.svg.
 *
 * The brand mark is three concentric arc "rings" (a stylized "C") authored in a
 * 32x32 viewBox. For the app icon we place white rings on the brand purple
 * gradient background (#a78bfa -> #7c3aed).
 *
 * iOS App Store icons must be square and fully opaque (no alpha), so the icon is
 * flattened onto a solid purple fallback. Android adaptive foreground stays
 * transparent and gets extra safe-zone padding.
 *
 * Run from the repo root so `sharp` resolves from the root node_modules:
 *   bun run expo-app/scripts/generate-icons.ts
 */
import sharp from "sharp";
import { join } from "path";

// `import.meta.dir` is a Bun API; cast keeps `tsc --noEmit` happy.
const ASSETS = join((import.meta as unknown as { dir: string }).dir, "..", "assets");

const PURPLE_TOP = "#a78bfa";
const PURPLE_BOTTOM = "#7c3aed";

// Purple brand gradient for backgrounds (objectBoundingBox units -> auto-scales).
const BG_DEFS = `
  <defs>
    <linearGradient id="bgpurple" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${PURPLE_TOP}"/>
      <stop offset="100%" stop-color="${PURPLE_BOTTOM}"/>
    </linearGradient>
  </defs>`;

// The three arc paths from app/icon.svg (32x32 user space), stroked in white.
function rings() {
  return `
  <path d="M 16 10 A 6 6 0 0 0 16 22" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" fill="none" opacity="0.98"/>
  <path d="M 16 6.5 A 9.5 9.5 0 0 0 16 25.5" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" fill="none" opacity="0.6"/>
  <path d="M 16 3 A 13 13 0 0 0 16 29" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" fill="none" opacity="0.35"/>`;
}

// Tight bounding box of the rings within the 32x32 user space (the arcs open
// rightward, so the mark fills the full height but only the left portion
// horizontally). Includes stroke half-widths / round caps.
const BBOX = { x: 1.5, y: 1.5, w: 15.5, h: 29 };

/**
 * Build a square SVG of `size` px with the mark scaled so its bounding box
 * occupies `logoFrac` of the canvas (by its larger dimension) and is centered
 * on both axes. `purpleBg` paints the brand gradient background; otherwise the
 * background is transparent.
 */
function buildSvg({
  size,
  logoFrac,
  purpleBg,
}: {
  size: number;
  logoFrac: number;
  purpleBg: boolean;
}) {
  const scale = (size * logoFrac) / Math.max(BBOX.w, BBOX.h);
  const tx = size / 2 - scale * (BBOX.x + BBOX.w / 2);
  const ty = size / 2 - scale * (BBOX.y + BBOX.h / 2);
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  ${purpleBg ? BG_DEFS : ""}
  ${purpleBg ? `<rect width="${size}" height="${size}" fill="url(#bgpurple)"/>` : ""}
  <g transform="translate(${tx} ${ty}) scale(${scale})">${rings()}</g>
</svg>`;
}

async function render(svg: string, size: number, file: string, opaqueBg?: string) {
  let img = sharp(Buffer.from(svg), { density: 384 }).resize(size, size);
  if (opaqueBg) img = img.flatten({ background: opaqueBg });
  await img.png().toFile(join(ASSETS, file));
  console.log("wrote", file, `${size}x${size}`, opaqueBg ? "(opaque)" : "");
}

await render(buildSvg({ size: 1024, logoFrac: 0.84, purpleBg: true }), 1024, "icon.png", PURPLE_BOTTOM);
await render(buildSvg({ size: 1024, logoFrac: 0.7, purpleBg: false }), 1024, "splash-icon.png");
await render(buildSvg({ size: 48, logoFrac: 0.86, purpleBg: true }), 48, "favicon.png", PURPLE_BOTTOM);
// Android adaptive foreground must stay within the inner ~66% safe zone (the OS masks the rest).
await render(buildSvg({ size: 512, logoFrac: 0.6, purpleBg: false }), 512, "android-icon-foreground.png");
// Adaptive background is the brand gradient; the rings live in the foreground layer.
await render(
  `<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">${BG_DEFS}<rect width="512" height="512" fill="url(#bgpurple)"/></svg>`,
  512,
  "android-icon-background.png",
  PURPLE_BOTTOM
);
// Monochrome adaptive layer: white silhouette on transparent.
await render(buildSvg({ size: 432, logoFrac: 0.6, purpleBg: false }), 432, "android-icon-monochrome.png");

console.log("done");
