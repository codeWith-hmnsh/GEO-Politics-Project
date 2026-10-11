// Bundle the real Statecraft engine for the HTML prototypes: window.Statecraft.
// Run: node scripts/build-proto-engine.mjs
import { build } from "esbuild";

await build({
  entryPoints: ["lib/game/browser.ts"],
  bundle: true,
  format: "iife",
  globalName: "Statecraft",
  platform: "browser",
  target: "es2020",
  minify: true,
  alias: { "@": "." },
  outfile: "all_refrence-ui/prototype-statecraft-4/assets/engine.js",
  banner: { js: "/* Statecraft engine 4.0 — generated from lib/game by scripts/build-proto-engine.mjs. Do not edit. */" },
});
console.log("built all_refrence-ui/prototype-statecraft-4/assets/engine.js");
