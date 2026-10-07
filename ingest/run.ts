// Ingest CLI: `npm run ingest -- news [--no-gdelt] [--seed]`
import { copyFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { runNews } from "./jobs/news";

const [job, ...flags] = process.argv.slice(2);

async function main() {
  switch (job) {
    case "news":
      await runNews({ gdelt: !flags.includes("--no-gdelt") });
      break;
    default:
      console.error(`Unknown job "${job ?? ""}". Jobs: news`);
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
