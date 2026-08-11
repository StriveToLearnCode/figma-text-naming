import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  assessDynamicTextCandidate,
  auditDynamicTextCandidateCoverage,
  findDuplicateTextGroups,
  findPageCenterKeyConflicts,
  hasDynamicPlaceholder,
  SLICE_COMPARISON_STATUS,
  validateDynamicTextName,
} from "../scripts/dynamic-text-naming.mjs";

test("detects only supported placeholder signals", () => {
  for (const characters of [
    "xx时xx分",
    "xxxx/100",
    "XX",
    "X",
    "XXX",
    "剩余 xx 次",
  ]) {
    assert.equal(hasDynamicPlaceholder(characters), true, characters);
  }

  for (const characters of ["1x", "x1", "box", "extra", "example"]) {
    assert.equal(hasDynamicPlaceholder(characters), false, characters);
  }
});

test("includes fixed numbers through verified preview-slice differences", () => {
  assert.deepEqual(
    assessDynamicTextCandidate({
      characters: "22500/550000",
      sliceComparisonStatus: SLICE_COMPARISON_STATUS.VERIFIED_DIFFERENCE,
    }),
    {
      assessed: true,
      result: "candidate",
      sources: ["preview-slice-difference"],
      reasonCodes: [],
    },
  );
});

test("unions placeholder and preview-slice candidate signals", () => {
  assert.deepEqual(
    assessDynamicTextCandidate({
      characters: "剩余 XX 次",
      sliceComparisonStatus: SLICE_COMPARISON_STATUS.VERIFIED_DIFFERENCE,
    }).sources,
    ["placeholder", "preview-slice-difference"],
  );
});

test("skips only without either signal or with verified baked text", () => {
  assert.equal(
    assessDynamicTextCandidate({
      characters: "22500/550000",
      sliceComparisonStatus: SLICE_COMPARISON_STATUS.NOT_AVAILABLE,
    }).result,
    "skip",
  );
  assert.deepEqual(
    assessDynamicTextCandidate({
      characters: "剩余 XX 次",
      sliceComparisonStatus: SLICE_COMPARISON_STATUS.VERIFIED_BAKED,
    }),
    {
      assessed: true,
      result: "skip",
      sources: [],
      reasonCodes: ["text-baked-in-slice"],
    },
  );
});

test("keeps unverified slice evidence out of skip", () => {
  assert.equal(
    assessDynamicTextCandidate({
      characters: "22500/550000",
      sliceComparisonStatus: SLICE_COMPARISON_STATUS.UNVERIFIED,
    }).result,
    "confirm",
  );
});

test("fails coverage audit when any ledger entry omits slice status", () => {
  const audit = auditDynamicTextCandidateCoverage([
    {
      characters: "剩余 XX 次",
      sliceComparisonStatus: SLICE_COMPARISON_STATUS.NOT_AVAILABLE,
    },
    { characters: "22500/550000" },
  ]);

  assert.equal(audit.complete, false);
  assert.deepEqual(audit.uncoveredIndexes, [1]);
  assert.equal(audit.assessments[1].result, "unassessed");
});

test("passes coverage audit after every ledger entry is assessed", () => {
  const audit = auditDynamicTextCandidateCoverage([
    {
      characters: "22500/550000",
      sliceComparisonStatus: SLICE_COMPARISON_STATUS.VERIFIED_DIFFERENCE,
    },
    {
      characters: "静态标题",
      sliceComparisonStatus: SLICE_COMPARISON_STATUS.VERIFIED_BAKED,
    },
  ]);

  assert.equal(audit.complete, true);
  assert.deepEqual(audit.uncoveredIndexes, []);
  assert.deepEqual(
    audit.assessments.map(({ result }) => result),
    ["candidate", "skip"],
  );
});

test("validates structure without making business-semantic decisions", () => {
  assert.deepEqual(validateDynamicTextName("文案/voice-ranking/jewel-count"), {
    valid: true,
    errors: [],
    businessDomain: "voice-ranking",
    semanticKey: "jewel-count",
  });
  assert.equal(validateDynamicTextName("文案/tab/count").valid, true);

  for (const name of [
    "ranking/current-rank",
    "文案/voice-room-ranking/jewel-count",
    "文案/reward/reward_name",
  ]) {
    assert.equal(validateDynamicTextName(name).valid, false, name);
  }
});

test("groups duplicate text by exact characters", () => {
  assert.deepEqual(
    findDuplicateTextGroups([
      { characters: "XX" },
      { characters: "XX " },
      { characters: "XX" },
    ]),
    [{ characters: "XX", indexes: [0, 2] }],
  );
});

test("reports only Page Center keys mapped to different HTML", () => {
  assert.deepEqual(
    findPageCenterKeyConflicts([
      { name: "文案/reward/name", html: "<span>A</span>" },
      { name: "文案/reward/name", html: "<span>A</span>" },
      { name: "文案/ranking/name", html: "<span>B</span>" },
      { name: "文案/ranking/name", html: "<span>C</span>" },
    ]),
    ["ranking/name"],
  );
});

test("validates each unique CLI name once", () => {
  const script = fileURLToPath(
    new URL("../scripts/validate-dynamic-text-name.mjs", import.meta.url),
  );
  const result = spawnSync(
    process.execPath,
    [script, "文案/reward/name", "文案/reward/name"],
    { encoding: "utf8" },
  );

  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).length, 1);
});

test("returns all validation results when an old name needs migration", () => {
  const script = fileURLToPath(
    new URL("../scripts/validate-dynamic-text-name.mjs", import.meta.url),
  );
  const result = spawnSync(
    process.execPath,
    [script, "lottery/remaining-count", "文案/lottery/remaining-count"],
    { encoding: "utf8" },
  );
  const validations = JSON.parse(result.stdout);

  assert.equal(result.status, 1);
  assert.deepEqual(
    validations.map(({ name, valid }) => ({ name, valid })),
    [
      { name: "lottery/remaining-count", valid: false },
      { name: "文案/lottery/remaining-count", valid: true },
    ],
  );
});
