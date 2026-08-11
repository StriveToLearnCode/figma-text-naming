#!/usr/bin/env node

import { readFileSync } from "node:fs";

import { validateDynamicTextName } from "./dynamic-text-naming.mjs";

const argv = process.argv.slice(2);
const usage =
  "Usage: node scripts/validate-dynamic-text-name.mjs [--input names.json | --stdin | <name> ...]";

function parseNames(value) {
  const parsed = JSON.parse(value);
  const names = Array.isArray(parsed) ? parsed : parsed?.names;
  if (!Array.isArray(names) || !names.every((name) => typeof name === "string")) {
    throw new TypeError("input-json-must-be-a-string-array-or-names-object");
  }
  return names;
}

function readNames() {
  if (argv[0] === "--input") {
    if (argv.length !== 2) {
      throw new TypeError("input-file-path-required");
    }
    return parseNames(readFileSync(argv[1], "utf8"));
  }
  if (argv[0] === "--stdin") {
    if (argv.length !== 1) {
      throw new TypeError("stdin-does-not-accept-extra-arguments");
    }
    return parseNames(readFileSync(0, "utf8"));
  }
  if (argv.length > 20) {
    throw new TypeError("large-batches-must-use-input-file-or-stdin");
  }
  return argv;
}

let names = [];
try {
  names = [...new Set(readNames())];
} catch (error) {
  console.error(`${usage}\n${error.message}`);
  process.exitCode = 2;
}

// 退出码 2 表示 CLI 用法错误；退出码 1 表示至少一个名称校验失败。
if (process.exitCode !== 2 && names.length === 0) {
  console.error(usage);
  process.exitCode = 2;
} else if (process.exitCode !== 2) {
  // 一次输出完整 JSON 数组，让 naming plan 在单个进程中批量校验全部唯一名称。
  const results = names.map((name) => ({
    name,
    ...validateDynamicTextName(name),
  }));

  console.log(JSON.stringify(results, null, 2));
  if (results.some((result) => !result.valid)) {
    process.exitCode = 1;
  }
}
