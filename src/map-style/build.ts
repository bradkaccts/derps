/**
 * Style build (spec MAP-150).
 *
 * Emits one validated style JSON per variant into `dist/`. Runs in plain Node
 * — this module graph never imports `maplibre-gl`, only the style spec
 * validator, so the same styles can be shipped to native clients later.
 *
 *   bun run build:map-style
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { validateStyleMin } from "@maplibre/maplibre-gl-style-spec";
import { buildStyle, VARIANTS } from "./variants";

const here = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(here, "dist");

const tileUrl = process.env.DERPS_TILE_URL || undefined;
const glyphs = process.env.DERPS_GLYPHS_URL || undefined;
const sprite = process.env.DERPS_SPRITE_URL || undefined;

mkdirSync(outDir, { recursive: true });

let failed = false;

for (const variant of VARIANTS) {
  const style = buildStyle({ variant, tileUrl, glyphs, sprite });
  const errors = validateStyleMin(style as never);

  if (errors.length > 0) {
    failed = true;
    console.error(`✗ ${variant}: ${errors.length} style-spec error(s)`);
    for (const error of errors) console.error(`   ${error.message}`);
    continue;
  }

  writeFileSync(resolve(outDir, `${variant}.style.json`), `${JSON.stringify(style, null, 2)}\n`);
  console.log(`✓ ${variant}.style.json — ${style.layers.length} layers`);
}

if (failed) process.exit(1);
