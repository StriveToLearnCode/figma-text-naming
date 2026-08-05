#!/usr/bin/env node

import { validateDynamicTextName } from "./dynamic-text-naming.mjs";

const names = process.argv.slice(2);

if (names.length === 0) {
  console.error(
    "Usage: node scripts/validate-dynamic-text-name.mjs <name> [name ...]",
  );
  process.exitCode = 2;
} else {
  const results = names.map((name) => ({
    name,
    ...validateDynamicTextName(name),
  }));

  console.log(JSON.stringify(results, null, 2));
  if (results.some((result) => !result.valid)) {
    process.exitCode = 1;
  }
}
