import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  applyBatchKeySignals,
  applyBatchStructuralAssessments,
  applyBatchTextKeyDecisions,
  applyGroupStructuralAssessments,
  applyLightIndexSignals,
  applyStrongEvidenceDecisions,
  applyStructureReuseDecisions,
  assessTextKeyTarget,
  auditTextKeyCoverage,
  buildStructureReuseGroups,
  buildPreviewTextLedger,
  findDuplicateTextGroups,
  findPageCenterKeyConflicts,
  findPreviewScopeCandidates,
  freezeNamingPlan,
  freezeTextKeyDecisions,
  hasTextPlaceholder,
  planDeferredRichTextReads,
  planPreviewScopeDiscovery,
  planPreviewTextIndexReads,
  planTargetedContextReads,
  DEFERRED_RICH_TEXT_FIELDS,
  KEY_SIGNAL_TYPE,
  PREVIEW_SCOPE_DISCOVERY_FIELDS,
  PREVIEW_TEXT_INDEX_FIELDS,
  STRUCTURAL_ASSESSMENT,
  TEXT_KEY_DECISION,
  validateDynamicTextName,
} from "../scripts/dynamic-text-naming.mjs";

const semanticFixtures = [
  {
    url: new URL("../evals/semantic-regression-fixture.json", import.meta.url),
    counts: { name: 4, skip: 17, confirm: 2 },
  },
  {
    url: new URL("../evals/candidate-golden-cases.json", import.meta.url),
    counts: { name: 9, skip: 14, confirm: 5 },
  },
  {
    url: new URL(
      "../evals/candidate-golden-cases-2026-summer-solstice-zh.json",
      import.meta.url,
    ),
    counts: { name: 3, skip: 16, confirm: 7 },
  },
];

function markEligible(entries) {
  return applyBatchStructuralAssessments(
    entries,
    entries.map(({ nodeId }) => ({
      nodeId,
      structuralAssessment: STRUCTURAL_ASSESSMENT.ELIGIBLE,
    })),
  );
}

function lightText(id, characters, overrides = {}) {
  return {
    id,
    type: "TEXT",
    characters,
    name: "Text",
    ancestorPath: [],
    componentPath: [],
    variableBinding: null,
    ...overrides,
  };
}

test("whole-page discovery is shallow and cannot enumerate Text", () => {
  const plan = planPreviewScopeDiscovery({
    id: "0:1",
    name: "活动设计整页",
    type: "PAGE",
  });

  assert.equal(plan.phase, "locate-preview-scopes");
  assert.equal(plan.traversal, "shallow");
  assert.deepEqual(plan.requestedFields, PREVIEW_SCOPE_DISCOVERY_FIELDS);
  assert.deepEqual(plan.requestedFields, ["id", "name", "type"]);
  assert.equal(plan.allowTextEnumeration, false);
  assert.equal(plan.requestedFields.includes("characters"), false);
});

test("Chinese selector fallback uses local startsWith semantics", () => {
  assert.deepEqual(
    findPreviewScopeCandidates([
      { id: "1:1", name: "切图/首页", type: "SECTION" },
      { id: "1:2", name: "预览页面/相似但不匹配", type: "FRAME" },
      { id: "1:3", name: "预览页/主活动", type: "SECTION" },
      { id: "1:4", name: "预览图/弹窗", type: "FRAME" },
      { id: "1:5", name: "母组件/奖励", type: "COMPONENT" },
    ]),
    [
      { id: "1:3", name: "预览页/主活动", type: "SECTION" },
      { id: "1:4", name: "预览图/弹窗", type: "FRAME" },
    ],
  );
});

test("light index planning uses one request per preview scope without Text slicing", () => {
  const scopes = [
    { id: "1:3", name: "预览页/主活动", type: "SECTION" },
    { id: "1:4", name: "预览图/弹窗", type: "FRAME" },
  ];
  const plan = planPreviewTextIndexReads(scopes);

  assert.equal(plan.maxFigmaCalls, 2);
  assert.equal(plan.fixedTextChunkSize, null);
  assert.equal(plan.allowFixedTextChunking, false);
  assert.deepEqual(plan.requests[0].requestedFields, PREVIEW_TEXT_INDEX_FIELDS);
  assert.deepEqual(plan.forbiddenFields, DEFERRED_RICH_TEXT_FIELDS);
  assert.equal(plan.requests[0].requestedFields.includes("styledTextSegments"), false);
  assert.equal(plan.requests[0].requestedFields.includes("html"), false);
});

test("Scan Ledger accepts only located preview scopes and deduplicates Text", () => {
  assert.throws(
    () =>
      buildPreviewTextLedger([
        {
          scope: { id: "0:1", name: "活动设计整页", type: "PAGE" },
          texts: [lightText("outside", "标注文字")],
        },
      ]),
    /whole-page-cannot-build-ledger/,
  );
  assert.throws(
    () =>
      buildPreviewTextLedger([
        {
          scope: { id: "2:1", name: "切图/首页", type: "FRAME" },
          texts: [lightText("outside", "导出尺寸 XX")],
        },
      ]),
    /non-preview-scope-cannot-build-ledger/,
  );

  const ledger = buildPreviewTextLedger([
    {
      scope: { id: "1:3", name: "预览页/主活动", type: "SECTION" },
      texts: [
        lightText("inside-a", "当前轮次：xx", {
          styledTextSegments: [{ characters: "不得进入账本" }],
          html: "<span>不得进入账本</span>",
          screenshot: "heavy-data",
        }),
      ],
    },
    {
      scope: { id: "1:4", name: "预览图/弹窗", type: "FRAME" },
      texts: [
        lightText("inside-b", "确认"),
        lightText("inside-a", "当前轮次：xx"),
      ],
    },
  ]);

  assert.deepEqual(
    ledger.map(({ nodeId, previewScopeNodeId }) => ({ nodeId, previewScopeNodeId })),
    [
      { nodeId: "inside-a", previewScopeNodeId: "1:3" },
      { nodeId: "inside-b", previewScopeNodeId: "1:4" },
    ],
  );
  assert.equal("styledTextSegments" in ledger[0], false);
  assert.equal("html" in ledger[0], false);
  assert.equal("screenshot" in ledger[0], false);
});

test("placeholder and variable binding become name candidates without AI", () => {
  const signaled = applyLightIndexSignals(
    markEligible([
      { nodeId: "template", characters: "当前轮次：xx", variableBinding: null },
      {
        nodeId: "bound",
        characters: "$0.99",
        variableBinding: { characters: "VariableID:price" },
      },
      { nodeId: "progress", characters: "22500/550000", variableBinding: null },
    ]),
  );
  const ledger = applyStrongEvidenceDecisions(signaled);

  assert.equal(hasTextPlaceholder("当前轮次：xx"), true);
  assert.equal(hasTextPlaceholder("أزياء xxxxxx"), true);
  assert.equal(hasTextPlaceholder("1x"), false);
  assert.equal(hasTextPlaceholder("box"), false);
  assert.deepEqual(ledger[0].keySignals, [
    { type: KEY_SIGNAL_TYPE.PLACEHOLDER, nodeId: "template" },
  ]);
  assert.equal(ledger[0].keyDecision, TEXT_KEY_DECISION.NAME);
  assert.equal(ledger[0].keyDecisionSource, "strong-evidence");
  assert.equal(ledger[1].keySignals[0].type, KEY_SIGNAL_TYPE.FIGMA_BINDING);
  assert.equal(ledger[1].keyDecision, TEXT_KEY_DECISION.NAME);
  assert.equal("keySignals" in ledger[2], false);
  assert.equal("keyDecision" in ledger[2], false);
});

test("repeated entity fields are structurally skipped as one group", () => {
  const source = [
    { nodeId: "rank-name", characters: "用户昵称" },
    { nodeId: "rank-score", characters: "9999999" },
    { nodeId: "reward-name", characters: "道具名称" },
    { nodeId: "reward-count", characters: "1x" },
  ];
  const ledger = applyGroupStructuralAssessments(source, [
    {
      groupId: "ranking-items",
      memberNodeIds: ["rank-name", "rank-score"],
      structuralAssessment: STRUCTURAL_ASSESSMENT.REPEATED_ENTITY_FIELD,
    },
    {
      groupId: "reward-items",
      memberNodeIds: ["reward-name", "reward-count"],
      structuralAssessment: STRUCTURAL_ASSESSMENT.REPEATED_ENTITY_FIELD,
    },
  ]);

  assert.equal(auditTextKeyCoverage(ledger).complete, true);
  assert.deepEqual(
    freezeTextKeyDecisions(ledger).outcomes.map(({ result }) => result),
    source.map(() => TEXT_KEY_DECISION.SKIP),
  );
  assert.throws(
    () =>
      applyBatchTextKeyDecisions(ledger, [
        { nodeId: "rank-name", keyDecision: TEXT_KEY_DECISION.NAME },
      ]),
    /structurally-resolved-node-must-not-be-ai-decided/,
  );
});

test("countdown character fragments are terminal skip", () => {
  const source = ["2", "0", ":", "0", "9", ":", "0", "9"].map(
    (characters, index) => ({ nodeId: `fragment-${index}`, characters }),
  );
  const ledger = applyGroupStructuralAssessments(source, [
    {
      groupId: "countdown-fragments",
      memberNodeIds: source.map(({ nodeId }) => nodeId),
      structuralAssessment: STRUCTURAL_ASSESSMENT.VISUAL_FRAGMENT,
    },
  ]);

  assert.deepEqual(
    freezeTextKeyDecisions(ledger).outcomes.map(({ result }) => result),
    source.map(() => TEXT_KEY_DECISION.SKIP),
  );
});

test("name does not require proof that characters change at runtime", () => {
  const [entry] = applyBatchTextKeyDecisions(
    markEligible([{ nodeId: "progress", characters: "22500/550000" }]),
    [
      {
        nodeId: "progress",
        keyDecision: TEXT_KEY_DECISION.NAME,
        reason: "Ancestor, labels, component role and screenshot identify one complete progress copy slot.",
      },
    ],
  );

  assert.equal(assessTextKeyTarget(entry).result, TEXT_KEY_DECISION.NAME);
  assert.equal("dynamicAssessment" in entry, false);
  assert.equal("dynamicEvidence" in entry, false);
});

test("field-looking values can remain confirm or skip", () => {
  const entries = applyBatchTextKeyDecisions(
    markEligible([
      { nodeId: "price", characters: "$ 0.99" },
      { nodeId: "number", characters: "131420" },
      { nodeId: "tier", characters: "10000" },
    ]),
    [
      { nodeId: "price", keyDecision: TEXT_KEY_DECISION.CONFIRM },
      { nodeId: "number", keyDecision: TEXT_KEY_DECISION.CONFIRM },
      { nodeId: "tier", keyDecision: TEXT_KEY_DECISION.SKIP },
    ],
  );

  assert.deepEqual(
    entries.map((entry) => assessTextKeyTarget(entry).result),
    [TEXT_KEY_DECISION.CONFIRM, TEXT_KEY_DECISION.CONFIRM, TEXT_KEY_DECISION.SKIP],
  );
});

test("Figma binding and same-slot copy are validated before strong resolution", () => {
  const eligible = markEligible([
    { nodeId: "price", characters: "$0.99" },
    { nodeId: "label", characters: "未领取" },
  ]);
  const withSignals = applyBatchKeySignals(eligible, [
    {
      nodeId: "price",
      keySignals: [
        {
          type: KEY_SIGNAL_TYPE.FIGMA_BINDING,
          nodeId: "price",
          bindingPath: "boundVariables.characters",
          bindingValue: "VariableID:price",
        },
      ],
    },
    {
      nodeId: "label",
      keySignals: [
        {
          type: KEY_SIGNAL_TYPE.SAME_SLOT_DIFFERENT_COPY,
          slotIdentity: "reward/status-label",
          occurrences: [
            { nodeId: "label", contextNodeId: "state-a", characters: "未领取" },
            { nodeId: "label-b", contextNodeId: "state-b", characters: "已领取" },
          ],
        },
      ],
    },
  ]);

  assert.equal("keyDecision" in withSignals[0], false);
  assert.equal("keyDecision" in withSignals[1], false);
  assert.throws(
    () =>
      applyBatchKeySignals(eligible, [
        {
          nodeId: "price",
          keySignals: [
            {
              type: KEY_SIGNAL_TYPE.FIGMA_BINDING,
              nodeId: "price",
              bindingPath: "name",
              bindingValue: "文案/shop/price",
            },
          ],
        },
      ]),
    /invalid-key-signal/,
  );
});

test("same Component Text slot is analyzed once and reused for every instance", () => {
  const componentPath = [
    { id: "component-definition", name: "RewardItem", type: "COMPONENT" },
  ];
  const entries = markEligible([
    {
      nodeId: "copy-a",
      characters: "领取 XX",
      name: "Status",
      ancestorPath: [{ id: "instance-a", name: "RewardItem", type: "INSTANCE" }],
      componentPath,
    },
    {
      nodeId: "copy-b",
      characters: "领取 XX",
      name: "Status",
      ancestorPath: [{ id: "instance-b", name: "RewardItem", type: "INSTANCE" }],
      componentPath,
    },
  ]);
  const [group] = buildStructureReuseGroups(entries);

  assert.deepEqual(group.memberNodeIds, ["copy-a", "copy-b"]);
  const decided = applyStructureReuseDecisions(entries, [
    { ...group, keyDecision: TEXT_KEY_DECISION.NAME, reason: "one slot" },
  ]);
  assert.deepEqual(
    decided.map(({ keyDecision }) => keyDecision),
    [TEXT_KEY_DECISION.NAME, TEXT_KEY_DECISION.NAME],
  );
  assert.equal(decided[0].keyDecisionSource, "targeted-analysis");
  assert.equal(decided[1].keyDecisionSource, "component-structure-reuse");
});

test("targeted context plan contains only unresolved representatives", () => {
  const componentPath = [
    { id: "component-definition", name: "RewardItem", type: "COMPONENT" },
  ];
  const entries = applyStrongEvidenceDecisions(
    applyLightIndexSignals(
      markEligible([
        {
          nodeId: "resolved-placeholder",
          characters: "剩余 XX 次",
          name: "Remaining",
          ancestorPath: [],
          componentPath: [],
          variableBinding: null,
        },
        {
          nodeId: "copy-a",
          characters: "领取",
          name: "Status",
          ancestorPath: [{ id: "a", name: "RewardItem", type: "INSTANCE" }],
          componentPath,
          variableBinding: null,
        },
        {
          nodeId: "copy-b",
          characters: "领取",
          name: "Status",
          ancestorPath: [{ id: "b", name: "RewardItem", type: "INSTANCE" }],
          componentPath,
          variableBinding: null,
        },
        {
          nodeId: "unknown",
          characters: "42",
          name: "Value",
          ancestorPath: [],
          componentPath: [],
          variableBinding: null,
        },
      ]),
    ),
  );
  const plan = planTargetedContextReads(entries);

  assert.deepEqual(plan.unresolvedNodeIds, ["copy-a", "copy-b", "unknown"]);
  assert.deepEqual(plan.aiInputNodeIds, ["copy-a", "unknown"]);
  assert.equal(plan.requests.length, 2);
  assert.equal(plan.allowWholeLedgerAi, false);
  assert.equal(plan.allowFixedTextChunking, false);
  assert.ok(
    plan.requests.every(({ forbiddenFields }) =>
      forbiddenFields.includes("styledTextSegments"),
    ),
  );
});

test("a 515-Text ledger converges locally instead of creating 25-Text calls", () => {
  const repeated = Array.from({ length: 500 }, (_, index) => ({
    nodeId: `entity-${index}`,
    characters: `user-${index}`,
  }));
  const placeholders = Array.from({ length: 10 }, (_, index) => ({
    nodeId: `placeholder-${index}`,
    characters: `剩余 XX 次 ${index}`,
    variableBinding: null,
  }));
  const componentPath = [
    { id: "component-definition", name: "StatusPanel", type: "COMPONENT" },
  ];
  const unresolved = Array.from({ length: 5 }, (_, index) => ({
    nodeId: `unknown-${index}`,
    characters: `${index + 1}`,
    name: "Value",
    ancestorPath: [
      { id: `instance-${index}`, name: "StatusPanel", type: "INSTANCE" },
    ],
    componentPath,
    variableBinding: null,
  }));
  let entries = applyGroupStructuralAssessments(
    [...repeated, ...placeholders, ...unresolved],
    [
      {
        groupId: "repeated-entities",
        memberNodeIds: repeated.map(({ nodeId }) => nodeId),
        structuralAssessment: STRUCTURAL_ASSESSMENT.REPEATED_ENTITY_FIELD,
      },
    ],
  );
  entries = applyBatchStructuralAssessments(
    entries,
    [...placeholders, ...unresolved].map(({ nodeId }) => ({
      nodeId,
      structuralAssessment: STRUCTURAL_ASSESSMENT.ELIGIBLE,
    })),
  );
  entries = applyStrongEvidenceDecisions(applyLightIndexSignals(entries));
  const targeted = planTargetedContextReads(entries);

  assert.equal(entries.length, 515);
  assert.equal(targeted.unresolvedNodeIds.length, 5);
  assert.deepEqual(targeted.aiInputNodeIds, ["unknown-0"]);
  assert.equal(targeted.requests.length, 1);
  assert.equal(targeted.allowFixedTextChunking, false);
});

test("Coverage requires a decision only for structurally eligible Text", () => {
  const ledger = applyBatchStructuralAssessments(
    [
      { nodeId: "template", characters: "当前轮次：xx" },
      { nodeId: "missing", characters: "22500/550000" },
      { nodeId: "fragment", characters: ":" },
    ],
    [
      { nodeId: "template", structuralAssessment: "eligible" },
      { nodeId: "missing", structuralAssessment: "eligible" },
      { nodeId: "fragment", structuralAssessment: "visual-fragment" },
    ],
  );
  const decided = applyBatchTextKeyDecisions(ledger, [
    { nodeId: "template", keyDecision: "name" },
  ]);
  const audit = auditTextKeyCoverage(decided);

  assert.equal(audit.complete, false);
  assert.deepEqual(audit.uncoveredNodeIds, ["missing"]);
  assert.equal(audit.assessments[2].result, "skip");
  assert.throws(() => freezeTextKeyDecisions(decided), /text-key-coverage-incomplete/);
});

test("Coverage does not require screenshots, HTML or styled segments", () => {
  const entries = [
    {
      nodeId: "strong",
      characters: "剩余 XX 次",
      structuralAssessment: STRUCTURAL_ASSESSMENT.ELIGIBLE,
      keyDecision: TEXT_KEY_DECISION.NAME,
    },
    {
      nodeId: "group-skip",
      characters: "用户昵称",
      structuralAssessment: STRUCTURAL_ASSESSMENT.REPEATED_ENTITY_FIELD,
    },
    {
      nodeId: "confirm",
      characters: "42",
      structuralAssessment: STRUCTURAL_ASSESSMENT.CONFIRM,
    },
  ];

  assert.equal(auditTextKeyCoverage(entries).complete, true);
  assert.ok(
    entries.every(
      (entry) =>
        !("screenshot" in entry) &&
        !("html" in entry) &&
        !("styledTextSegments" in entry),
    ),
  );
});

test("offline semantic regression fixture uses only name, skip and confirm", () => {
  for (const { url, counts } of semanticFixtures) {
    const entries = JSON.parse(readFileSync(url, "utf8"));
    const audit = auditTextKeyCoverage(entries);

    assert.equal(
      audit.complete,
      true,
      `${url}: uncovered ${audit.uncoveredNodeIds.join(", ")}`,
    );
    const frozen = freezeTextKeyDecisions(entries);
    assert.deepEqual(
      frozen.outcomes.map(({ result }) => result),
      entries.map(({ expected }) => expected),
      `${url}: expected decisions`,
    );
    assert.deepEqual(
      Object.fromEntries(
        ["name", "skip", "confirm"].map((result) => [
          result,
          frozen.outcomes.filter((outcome) => outcome.result === result).length,
        ]),
      ),
      counts,
      `${url}: decision distribution`,
    );
    assert.ok(
      entries.every(
        (entry) =>
          !Object.hasOwn(entry, "dynamicAssessment") &&
          !Object.hasOwn(entry, "semanticAssessment"),
      ),
      `${url}: legacy decision fields`,
    );
  }

  const entries = JSON.parse(readFileSync(semanticFixtures[0].url, "utf8"));
  assert.equal(
    entries.find(({ characters }) => characters === "22500/550000").expected,
    "name",
  );
  assert.deepEqual(
    entries
      .filter(({ characters }) => ["700", "3200", "10000"].includes(characters))
      .map(({ expected }) => expected),
    ["skip", "skip", "skip"],
  );
});

test("Naming Plan Freeze requires every name target before any write", () => {
  const entries = applyBatchTextKeyDecisions(
    markEligible([
      { nodeId: "rename", name: "Text 1", characters: "当前轮次：xx" },
      { nodeId: "keep", name: "文案/reward/name", characters: "奖励 XX" },
      { nodeId: "skip", name: "Text 3", characters: "活动规则" },
    ]),
    [
      { nodeId: "rename", keyDecision: "name" },
      { nodeId: "keep", keyDecision: "name" },
      { nodeId: "skip", keyDecision: "skip" },
    ],
  );

  assert.throws(
    () =>
      freezeNamingPlan(entries, [
        { nodeId: "rename", action: "rename", finalName: "文案/round/current-name" },
      ]),
    /naming-result-required: keep/,
  );

  const plan = freezeNamingPlan(entries, [
    { nodeId: "rename", action: "rename", finalName: "文案/round/current-name" },
    { nodeId: "keep", action: "keep", finalName: "文案/reward/name" },
  ]);

  assert.deepEqual(plan.items.map(({ action }) => action), ["rename", "keep", "skip"]);
  assert.deepEqual(plan.writes.map(({ nodeId }) => nodeId), ["rename"]);
  assert.equal(Object.isFrozen(plan), true);
});

test("groups duplicate copy by exact characters", () => {
  assert.deepEqual(
    findDuplicateTextGroups([
      { characters: "XX" },
      { characters: "XX " },
      { characters: "XX" },
    ]),
    [{ characters: "XX", indexes: [0, 2] }],
  );
});

test("rich text reads are deferred to duplicate name candidates or Page Center", () => {
  const entries = applyBatchTextKeyDecisions(
    markEligible([
      { nodeId: "a", characters: "奖励 XX" },
      { nodeId: "b", characters: "奖励 XX" },
      { nodeId: "c", characters: "剩余 XX 次" },
      { nodeId: "skip", characters: "规则" },
    ]),
    [
      { nodeId: "a", keyDecision: "name" },
      { nodeId: "b", keyDecision: "name" },
      { nodeId: "c", keyDecision: "name" },
      { nodeId: "skip", keyDecision: "skip" },
    ],
  );

  assert.deepEqual(planDeferredRichTextReads(entries).nodeIds, ["a", "b"]);
  assert.deepEqual(
    planDeferredRichTextReads(entries, { pageCenterUpload: true }).nodeIds,
    ["a", "b", "c"],
  );
});

test("canonical naming and Page Center conflict contracts are unchanged", () => {
  assert.deepEqual(validateDynamicTextName("文案/voice-ranking/jewel-count"), {
    valid: true,
    errors: [],
    businessDomain: "voice-ranking",
    semanticKey: "jewel-count",
  });
  assert.equal(validateDynamicTextName("ranking/current-rank").valid, false);
  assert.equal(validateDynamicTextName("文案/reward/reward_name").valid, false);

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

test("CLI validates each unique name once and preserves migration behavior", () => {
  const script = fileURLToPath(
    new URL("../scripts/validate-dynamic-text-name.mjs", import.meta.url),
  );
  const duplicates = spawnSync(
    process.execPath,
    [script, "文案/reward/name", "文案/reward/name"],
    { encoding: "utf8" },
  );
  assert.equal(duplicates.status, 0, duplicates.stderr);
  assert.equal(JSON.parse(duplicates.stdout).length, 1);

  const migration = spawnSync(
    process.execPath,
    [script, "lottery/remaining-count", "文案/lottery/remaining-count"],
    { encoding: "utf8" },
  );
  assert.equal(migration.status, 1);
  assert.deepEqual(
    JSON.parse(migration.stdout).map(({ name, valid }) => ({ name, valid })),
    [
      { name: "lottery/remaining-count", valid: false },
      { name: "文案/lottery/remaining-count", valid: true },
    ],
  );

  const stdinBatch = spawnSync(process.execPath, [script, "--stdin"], {
    encoding: "utf8",
    input: JSON.stringify({
      names: ["文案/reward/name", "文案/ranking/current-rank"],
    }),
  });
  assert.equal(stdinBatch.status, 0, stdinBatch.stderr);
  assert.equal(JSON.parse(stdinBatch.stdout).length, 2);

  const oversizedArgv = spawnSync(
    process.execPath,
    [script, ...Array.from({ length: 21 }, () => "文案/reward/name")],
    { encoding: "utf8" },
  );
  assert.equal(oversizedArgv.status, 2);
  assert.match(oversizedArgv.stderr, /large-batches-must-use-input-file-or-stdin/);
});
