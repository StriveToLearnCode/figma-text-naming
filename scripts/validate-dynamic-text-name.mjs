#!/usr/bin/env node

import { validateDynamicTextName } from "./dynamic-text-naming.mjs";

const names = [...new Set(process.argv.slice(2))];

// 退出码 2 表示 CLI 用法错误；退出码 1 表示至少一个名称校验失败。
if (names.length === 0) {
  console.error(
    "Usage: node scripts/validate-dynamic-text-name.mjs <name> [name ...]",
  );
  process.exitCode = 2;
} else {
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
