#!/usr/bin/env node

import { parseFlags, printHelp, flagsToConfig } from "./flags.js";
import { runCommand, compareCommand } from "./commands/run.js";
import { error } from "./printer.js";
import { VERSION, EXIT_CODES } from "../constants.js";

/**
 * Main CLI entry point
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const flags = parseFlags(args);

  if (flags.help) {
    printHelp();
    process.exit(EXIT_CODES.SUCCESS);
  }

  if (flags.version) {
    process.stdout.write(`swiftbench v${VERSION}\n`);
    process.exit(EXIT_CODES.SUCCESS);
  }

  if (flags.urls.length === 0) {
    error("No URL provided");
    printHelp();
    process.exit(EXIT_CODES.ERROR);
  }

  const config = flagsToConfig(flags);

  if (config === null) {
    error("Invalid configuration");
    process.exit(EXIT_CODES.ERROR);
  }

  let exitCode: number;

  if (flags.compare && flags.urls.length > 1) {
    exitCode = await compareCommand(flags.urls, config);
  } else {
    exitCode = await runCommand(config);
  }

  process.exit(exitCode);
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : "Unknown error";
  error(message);
  process.exit(EXIT_CODES.ERROR);
});
