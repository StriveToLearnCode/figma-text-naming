import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  applyBatchSemanticAssessments,
  applyPlaceholderScan,
  assessLegacySliceEvidence,
  assessDynamicTextCandidate,
  auditDynamicTextCandidateCoverage,
  auditLegacySliceCandidateCoverage,
  findDuplicateTextGroups,
  findPageCenterKeyConflicts,
  freezeDynamicTextCandidates,
  hasDynamicPlaceholder,
  SEMANTIC_ASSESSMENT,
  SLICE_COMPARISON_STATUS,
  validateDynamicTextName,
} from "../scripts/dynamic-text-naming.mjs";

test("Case A: placeholder scan marks Arabic placeholder text dynamic", () => {
  const ledger = applyPlaceholderScan([
    { nodeId: "a", characters: "أزياء xxxxxx" },
    { nodeId: "plain", characters: "22500/550000" },
  ]);

  assert.equal(hasDynamicPlaceholder("أزياء xxxxxx"), true);
  assert.equal(ledger.length, 2, "placeholder scan must not filter the ledger");
  assert.equal(ledger[0].semanticAssessment, SEMANTIC_ASSESSMENT.DYNAMIC);
  assert.equal(ledger[0].semanticAssessmentSource, "placeholder");
  assert.equal("semanticAssessment" in ledger[1], false);
});

test("detects only supported placeholder boundaries", () => {
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

test("Case B: batch AI assessment marks 22500/550000 dynamic", () => {
  const ledger = applyBatchSemanticAssessments(
    applyPlaceholderScan([
      { nodeId: "progress-value", characters: "22500/550000" },
    ]),
    [{ nodeId: "progress-value", semanticAssessment: "dynamic" }],
  );

  assert.equal(ledger[0].semanticAssessment, "dynamic");
  assert.equal(ledger[0].semanticAssessmentSource, "ai");
  assert.equal(assessDynamicTextCandidate(ledger[0]).result, "candidate");
});

test("Case C: batch AI assessment keeps repeated fixed tiers static", () => {
  const values = ["700", "3200", "10000", "50000", "100000"];
  const source = values.map((characters, index) => ({
    nodeId: `tier-${index}`,
    characters,
  }));
  const assessments = source.map(({ nodeId }) => ({
    nodeId,
    semanticAssessment: "static",
  }));
  const ledger = applyBatchSemanticAssessments(
    applyPlaceholderScan(source),
    assessments,
  );

  assert.deepEqual(
    ledger.map(({ semanticAssessment }) => semanticAssessment),
    values.map(() => "static"),
  );
});

test("Case D: batch AI assessment marks fixed titles and instructions static", () => {
  const ledger = applyBatchSemanticAssessments(
    [
      { nodeId: "title", characters: "活动规则" },
      { nodeId: "instruction", characters: "完成任务可获得奖励" },
    ],
    [
      { nodeId: "title", semanticAssessment: "static" },
      { nodeId: "instruction", semanticAssessment: "static" },
    ],
  );

  assert.deepEqual(
    ledger.map((entry) => assessDynamicTextCandidate(entry).result),
    ["skip", "skip"],
  );
});

test("Case E: insufficient Figma context remains confirm", () => {
  const [entry] = applyBatchSemanticAssessments(
    [{ nodeId: "unknown", characters: "42" }],
    [{ nodeId: "unknown", semanticAssessment: "confirm" }],
  );

  assert.equal(assessDynamicTextCandidate(entry).result, "confirm");
});

test("Case F: coverage fails when any ledger Text lacks semanticAssessment", () => {
  const audit = auditDynamicTextCandidateCoverage(applyPlaceholderScan([
    { nodeId: "placeholder", characters: "剩余 XX 次" },
    { nodeId: "missing", characters: "22500/550000" },
  ]));

  assert.equal(audit.complete, false);
  assert.deepEqual(audit.uncoveredIndexes, [1]);
  assert.deepEqual(audit.uncoveredNodeIds, ["missing"]);
  assert.equal(audit.assessments[1].result, "unassessed");
  assert.throws(
    () => freezeDynamicTextCandidates([
      { nodeId: "missing", characters: "22500/550000" },
    ]),
    /semantic-coverage-incomplete/,
  );
  assert.equal(
    auditDynamicTextCandidateCoverage([
      { nodeId: "raw-placeholder", characters: "剩余 XX 次" },
    ]).complete,
    false,
    "coverage audits persisted assessments rather than inferring them",
  );
});

test("Case G: coverage passes when every Text has a three-state assessment", () => {
  const ledger = [
    { nodeId: "dynamic", characters: "22500/550000", semanticAssessment: "dynamic" },
    { nodeId: "static", characters: "活动规则", semanticAssessment: "static" },
    { nodeId: "confirm", characters: "42", semanticAssessment: "confirm" },
  ];
  const audit = auditDynamicTextCandidateCoverage(ledger);

  assert.equal(audit.complete, true);
  assert.deepEqual(audit.uncoveredIndexes, []);
  assert.deepEqual(audit.uncoveredNodeIds, []);
  assert.deepEqual(
    audit.assessments.map(({ result }) => result),
    ["candidate", "skip", "confirm"],
  );

  const frozen = freezeDynamicTextCandidates(ledger);
  assert.deepEqual(frozen.candidates.map(({ nodeId }) => nodeId), ["dynamic"]);
  assert.equal(Object.isFrozen(frozen), true);
});

test("placeholder nodes bypass AI and cannot be overwritten", () => {
  const ledger = applyPlaceholderScan([
    { nodeId: "placeholder", characters: "剩余 XX 次" },
  ]);

  assert.throws(
    () => applyBatchSemanticAssessments(ledger, [
      { nodeId: "placeholder", semanticAssessment: "static" },
    ]),
    /placeholder-node-must-not-be-ai-assessed/,
  );
});

test("main coverage does not require slice status", () => {
  const audit = auditDynamicTextCandidateCoverage([
    { nodeId: "value", characters: "22500/550000", semanticAssessment: "dynamic" },
  ]);

  assert.equal(audit.complete, true);
});

test("keeps legacy slice evidence as an optional baked-text counterexample", () => {
  assert.deepEqual(
    assessLegacySliceEvidence({
      characters: "活动规则",
      sliceComparisonStatus: SLICE_COMPARISON_STATUS.VERIFIED_BAKED,
    }),
    {
      assessed: true,
      result: "skip",
      sources: [],
      reasonCodes: ["text-baked-in-slice"],
    },
  );

  assert.equal(
    auditLegacySliceCandidateCoverage([
      {
        characters: "活动规则",
        sliceComparisonStatus: SLICE_COMPARISON_STATUS.VERIFIED_BAKED,
      },
      { characters: "无切图状态" },
    ]).complete,
    false,
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
