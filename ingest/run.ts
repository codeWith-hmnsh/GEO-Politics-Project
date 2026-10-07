// Ingest CLI: `npm run ingest -- <news|indicators|profiles|trade|creditors|energy|crude|unvotes> [--no-gdelt] [--seed]`
import { copyFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { runCreditors, runCrude, runProfiles, runTrade } from "./jobs/country";
import { runEnergy } from "./jobs/energy";
import { runIndicators } from "./jobs/indicators";
import { runUnVotes } from "./jobs/unvotes";
import { runNews } from "./jobs/news";

const [job, ...flags] = process.argv.slice(2);

async function main() {
  switch (job) {
    case "news":
      await runNews({ gdelt: !flags.includes("--no-gdelt") });
      break;
    case "indicators":
      await runIndicators();
      break;
    case "profiles":
      await runProfiles();
      break;
    case "trade":
      await runTrade();
      break;
    case "creditors":
      await runCreditors();
      break;
    case "energy":
      await runEnergy();
      break;
    case "crude":
      await runCrude();
      break;
    case "unvotes":
      await runUnVotes();
      break;
    default:
      console.error(`Unknown job "${job ?? ""}". Jobs: news, indicators, profiles, trade, creditors, energy, crude, unvotes`);
      process.exit(1);
  }
  // Refresh the committed fallback snapshot from the local run.
  if (flags.includes("--seed")) {
    await mkdir(join("data", "seed"), { recursive: true });
    await copyFile(join("data", "live", `${job}.json`), join("data", "seed", `${job}.json`));
    console.log(`seed updated: data/seed/${job}.json`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
