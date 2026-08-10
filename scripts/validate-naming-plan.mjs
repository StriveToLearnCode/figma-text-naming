#!/usr/bin/env node

import { readFile } from "node:fs/promises";

import {
  summarizeCandidateScan,
  summarizeNamingPlan,
  validateNamingPlan,
} from "./dynamic-text-naming.mjs";

const inputPath = process.argv[2];

async function readStandardInput() {
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  return chunks.join("");
}

try {
  const source = inputPath
    ? await readFile(inputPath, "utf8")
    : await readStandardInput();
  const payload = JSON.parse(source);
  const results = validateNamingPlan(payload);

  console.log(
    JSON.stringify(
      {
        results,
        candidateSummary: summarizeCandidateScan(results),
        summary: summarizeNamingPlan(results),
      },
      null,
      2,
    ),
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
