import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  applyBatchKeySignals,
  applyBatchStructuralAssessments,
  applyBatchTextKeyDecisions,
  assignCanonicalHtmlSuffixNames,
  applyConfirmEvidenceDecisions,
  applyGroupStructuralAssessments,
  applyLightIndexSignals,
  applyStrongEvidenceDecisions,
  applyStructureReuseDecisions,
  assessTextKeyTarget,
  auditCachedTextKeyCoverage,
  auditTextKeyCoverage,
  buildStructureReuseGroups,
  buildPreviewTextLedger,
  buildPreviewTextLedgerFromCache,
  createTaskReadCache,
  findDuplicateTextGroups,
  findPageCenterKeyConflicts,
  findPreviewIndexBlocks,
  findPreviewScopeCandidates,
  freezeNamingPlan,
  freezeTextKeyDecisions,
  hasTextPlaceholder,
  lookupFrozenNodeResult,
  planConfirmScreenshotReads,
  planDeferredRichTextReads,
  planOverflowTextIndexReads,
  planPreviewScopeDiscovery,
  planPreviewTextIndexReads,
  planTargetedContextReads,
  planUncachedTaskReads,
  restoreFrozenNamingPlan,
  recordPreviewTextIndexBlock,
  runPreviewTextIndexCoverage,
  serializeFrozenNamingPlan,
  CONFIRM_SCREENSHOT_FIELDS,
  DEFERRED_RICH_TEXT_FIELDS,
  FULL_COVERAGE_FORBIDDEN_FIELDS,
  KEY_SIGNAL_TYPE,
  PREVIEW_SCOPE_DISCOVERY_FIELDS,
  PREVIEW_TEXT_INDEX_DICTIONARIES,
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
    characters,
    name: "Text",
    ancestorPath: [],
    component: null,
    ...overrides,
  };
}

function completeIndexResult(texts = []) {
  return {
    status: "complete",
    dictionaries: { ancestorPaths: { empty: [] }, components: {} },
    texts: texts.map(({ id, characters = id, name = "Text" }) => ({
      id,
      characters,
      name,
      ancestorPathRef: "empty",
      componentRef: null,
    })),
  };
}

function findSinglePreviewBlock(children, type = "SECTION") {
  const scope = { id: "scope", name: "预览图/活动", type: "FRAME" };
  return findPreviewIndexBlocks([scope], [
    {
      ...scope,
      children: [{ id: "root", name: "板块", type, children }],
    },
  ])[0];
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
  assert.equal(plan.retainParentChildHierarchy, true);
  assert.equal(plan.discoverPreviewBlockChildren, true);
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
      { id: "1:4", name: "预览图/弹窗", type: "FRAME" },
    ],
  );
});

test("light index starts with first-level stable blocks, never the preview root", () => {
  const scopes = [
    { id: "1:4", name: "预览图/弹窗", type: "FRAME" },
  ];
  const blocks = findPreviewIndexBlocks(scopes, [
    {
      ...scopes[0],
      children: [
        { id: "2:1", name: "板块1", type: "FRAME" },
        { id: "2:2", name: "板块2", type: "SECTION" },
      ],
    },
  ]);
  const plan = planPreviewTextIndexReads(blocks);

  assert.deepEqual(blocks.map(({ id }) => id), ["2:1", "2:2"]);
  assert.equal(plan.maxFigmaCalls, 2);
  assert.equal(plan.fixedTextChunkSize, null);
  assert.equal(plan.allowFixedTextChunking, false);
  assert.equal(plan.allowPreviewRootRead, false);
  assert.equal(plan.retrySameRangeOnTruncation, false);
  assert.ok(plan.requests.every(({ blockNodeId }) => blockNodeId !== "1:4"));
  assert.deepEqual(plan.requests[0].requestedFields, PREVIEW_TEXT_INDEX_FIELDS);
  assert.deepEqual(plan.requests[0].requestedFields, [
    "id",
    "characters",
    "name",
    "ancestorPathRef",
    "componentRef",
  ]);
  assert.deepEqual(plan.requests[0].dictionaryFields, PREVIEW_TEXT_INDEX_DICTIONARIES);
  assert.deepEqual(plan.forbiddenFields, FULL_COVERAGE_FORBIDDEN_FIELDS);
  assert.ok(DEFERRED_RICH_TEXT_FIELDS.every((field) => plan.forbiddenFields.includes(field)));
  assert.equal(plan.requests[0].requestedFields.includes("styledTextSegments"), false);
  assert.equal(plan.requests[0].requestedFields.includes("html"), false);
});

test("each dictionary-compressed block is archived once and Coverage merges the cache", () => {
  const cache = createTaskReadCache();
  const [request] = planPreviewTextIndexReads(
    [
      {
        id: "2:1",
        name: "板块1",
        type: "FRAME",
        previewScopeNodeId: "1:4",
        parentBlockNodeId: null,
      },
    ],
    { cache },
  ).requests;
  assert.throws(
    () =>
      recordPreviewTextIndexBlock(cache, request, {
        status: "complete",
        dictionaries: { ancestorPaths: { path: [] }, components: {} },
        texts: [
          {
            id: "invalid:text",
            characters: "重复结构",
            name: "Text",
            ancestorPath: [],
            ancestorPathRef: "path",
            componentRef: null,
          },
        ],
      }),
    /index-text-must-use-dictionary-references/,
  );
  const summary = recordPreviewTextIndexBlock(cache, request, {
    status: "complete",
    dictionaries: {
      ancestorPaths: {
        "path:reward": [
          { id: "2:1", name: "板块1", type: "FRAME" },
          { id: "3:1", name: "RewardItem", type: "INSTANCE" },
        ],
      },
      components: {
        "component:reward": [
          { id: "c:1", name: "RewardItem", type: "COMPONENT" },
        ],
      },
    },
    texts: [
      {
        id: "text:1",
        characters: "领取 XX",
        name: "Status",
        ancestorPathRef: "path:reward",
        componentRef: "component:reward",
      },
      {
        id: "text:2",
        characters: "已领取",
        name: "Status",
        ancestorPathRef: "path:reward",
        componentRef: "component:reward",
      },
    ],
  });

  assert.deepEqual(summary, {
    blockNodeId: "2:1",
    status: "complete",
    textCount: 2,
    splitRequired: false,
  });
  assert.equal(
    planPreviewTextIndexReads(
      [
        {
          id: "2:1",
          name: "板块1",
          type: "FRAME",
          previewScopeNodeId: "1:4",
        },
      ],
      { cache },
    ).requests.length,
    0,
  );
  const ledger = buildPreviewTextLedgerFromCache(cache);
  assert.equal(ledger.length, 2);
  assert.deepEqual(ledger[0].ancestorPath, ledger[1].ancestorPath);
  assert.equal(ledger[0].primarySectionNodeId, "2:1");
  const assessed = applyBatchTextKeyDecisions(markEligible(ledger), [
    { nodeId: "text:1", keyDecision: TEXT_KEY_DECISION.NAME },
    { nodeId: "text:2", keyDecision: TEXT_KEY_DECISION.SKIP },
  ]);
  const coverage = auditCachedTextKeyCoverage(cache, assessed);
  assert.equal(coverage.complete, true);
  assert.equal(coverage.source, "task-cache-index-block-archives");
  assert.equal(coverage.scannedTextCount, 2);
});

test("overflow splits into direct child Frames without rereading the parent", () => {
  const cache = createTaskReadCache();
  const block = findSinglePreviewBlock([
    { id: "frame:a", name: "Frame A", type: "FRAME" },
    { id: "frame:b", name: "Frame B", type: "FRAME" },
  ]);
  const [request] = planPreviewTextIndexReads([block], { cache }).requests;
  recordPreviewTextIndexBlock(cache, request, { truncated: true });

  assert.equal(planPreviewTextIndexReads([block], { cache }).requests.length, 0);
  assert.throws(
    () => buildPreviewTextLedgerFromCache(cache),
    /overflow-block-split-candidates-not-archived/,
  );
  const split = planOverflowTextIndexReads(cache, block.id);
  assert.deepEqual(split.requests.map(({ blockNodeId }) => blockNodeId), [
    "frame:a",
    "frame:b",
  ]);
  assert.equal(split.fixedTextChunkSize, null);
  for (const childRequest of split.requests) {
    recordPreviewTextIndexBlock(cache, childRequest, completeIndexResult());
  }
  assert.equal(buildPreviewTextLedgerFromCache(cache).length, 0);
  assert.throws(
    () => recordPreviewTextIndexBlock(cache, request, { status: "complete" }),
    /index-block-texts-must-be-an-array|index-block-range-already-archived/,
  );
});

test("overflow penetrates GROUP wrappers to the nearest stable Frame", () => {
  const block = findSinglePreviewBlock([
    {
      id: "group",
      name: "包装",
      type: "GROUP",
      children: [{ id: "frame", name: "内容", type: "FRAME" }],
    },
  ]);

  assert.deepEqual(block.splitCandidates.map(({ id }) => id), ["frame"]);
  assert.equal(block.splitCandidates[0].parentBlockNodeId, "root");
});

test("overflow recursively penetrates nested GROUP wrappers", () => {
  const block = findSinglePreviewBlock([
    {
      id: "group:1",
      name: "包装 1",
      type: "GROUP",
      children: [
        {
          id: "group:2",
          name: "包装 2",
          type: "GROUP",
          children: [
            { id: "frame:a", name: "A", type: "FRAME" },
            { id: "frame:b", name: "B", type: "FRAME" },
          ],
        },
      ],
    },
  ]);

  assert.deepEqual(block.splitCandidates.map(({ id }) => id), [
    "frame:a",
    "frame:b",
  ]);
});

test("COMPONENT and INSTANCE are stable overflow ranges", () => {
  const block = findSinglePreviewBlock([
    { id: "component", name: "组件", type: "COMPONENT" },
    { id: "instance", name: "实例", type: "INSTANCE" },
  ]);

  assert.deepEqual(
    block.splitCandidates.map(({ id, type }) => [id, type]),
    [
      ["component", "COMPONENT"],
      ["instance", "INSTANCE"],
    ],
  );
});

test("branches without stable descendants recurse through structural subtree boundaries", () => {
  const block = findSinglePreviewBlock([
    {
      id: "group",
      name: "包装",
      type: "GROUP",
      children: [
        { id: "text:a", name: "A", type: "TEXT" },
        {
          id: "nested",
          name: "深层包装",
          type: "GROUP",
          children: [{ id: "text:b", name: "B", type: "TEXT" }],
        },
      ],
    },
  ]);

  assert.deepEqual(block.splitCandidates.map(({ id, type }) => [id, type]), [
    ["group", "GROUP"],
  ]);
  assert.deepEqual(
    block.splitCandidates[0].splitCandidates.map(({ id, type }) => [id, type]),
    [
      ["text:a", "TEXT"],
      ["nested", "GROUP"],
    ],
  );
  assert.deepEqual(
    block.splitCandidates[0].splitCandidates[1].splitCandidates.map(({ id }) => id),
    ["text:b"],
  );
});

test("Runner keeps drilling wrapper subtree boundaries only when they overflow", async () => {
  const block = findSinglePreviewBlock([
    {
      id: "group",
      name: "包装",
      type: "GROUP",
      children: [
        { id: "text:a", name: "A", type: "TEXT" },
        {
          id: "nested",
          name: "深层包装",
          type: "GROUP",
          children: [{ id: "text:b", name: "B", type: "TEXT" }],
        },
      ],
    },
  ]);
  const calls = [];
  const result = await runPreviewTextIndexCoverage([block], {
    readIndexBlock(request) {
      calls.push(request.blockNodeId);
      return ["root", "group", "nested"].includes(request.blockNodeId)
        ? { truncated: true }
        : completeIndexResult([{ id: request.blockNodeId }]);
    },
  });

  assert.deepEqual(calls, ["root", "group", "text:a", "nested", "text:b"]);
  assert.deepEqual(result.ledger.map(({ nodeId }) => nodeId), ["text:a", "text:b"]);
});

test("Runner recursively splits a child that overflows again", async () => {
  const scope = { id: "scope", name: "预览图/活动", type: "FRAME" };
  const shallowNodes = [
    {
      ...scope,
      children: [
        {
          id: "root",
          name: "板块",
          type: "SECTION",
          children: [
            {
              id: "frame:a",
              name: "A",
              type: "FRAME",
              children: [
                { id: "frame:a1", name: "A1", type: "FRAME" },
                { id: "instance:a2", name: "A2", type: "INSTANCE" },
              ],
            },
            { id: "component:b", name: "B", type: "COMPONENT" },
          ],
        },
      ],
    },
  ];
  const calls = [];
  const result = await runPreviewTextIndexCoverage([scope], {
    shallowNodes,
    readIndexBlock(request) {
      calls.push(request);
      assert.equal(Object.hasOwn(request, "splitCandidates"), false);
      assert.equal(Object.hasOwn(request, "parentBlockNodeId"), false);
      if (["root", "frame:a"].includes(request.blockNodeId)) {
        return { status: "overflow" };
      }
      const textId = `text:${request.blockNodeId}`;
      return completeIndexResult([{ id: textId }]);
    },
  });

  assert.equal(result.message, "已完整扫描 3 个 Text");
  assert.deepEqual(calls.map(({ blockNodeId }) => blockNodeId), [
    "root",
    "frame:a",
    "component:b",
    "frame:a1",
    "instance:a2",
  ]);
  assert.equal(new Set(calls.map(({ blockNodeId }) => blockNodeId)).size, calls.length);
  assert.ok(result.ledger.every((entry) => !("indexBlockNodeId" in entry)));
  assert.deepEqual(
    result.ledger.map(({ nodeId }) => nodeId).sort(),
    ["text:component:b", "text:frame:a1", "text:instance:a2"],
  );
});

test("split ledger rejects overlap instead of silently deduplicating Text", async () => {
  const block = findSinglePreviewBlock([
    { id: "frame:a", name: "A", type: "FRAME" },
    { id: "frame:b", name: "B", type: "FRAME" },
  ]);

  await assert.rejects(
    () =>
      runPreviewTextIndexCoverage([block], {
        readIndexBlock(request) {
          return request.blockNodeId === "root"
            ? { truncated: true }
            : completeIndexResult([{ id: "same-text" }]);
        },
      }),
    /text-indexed-by-multiple-blocks: same-text/,
  );
});

test("cached Coverage must be complete before Naming Plan Freeze", () => {
  const cache = createTaskReadCache();
  const block = findSinglePreviewBlock([
    { id: "frame", name: "内容", type: "FRAME" },
  ]);
  const [request] = planPreviewTextIndexReads([block], { cache }).requests;
  recordPreviewTextIndexBlock(cache, request, { truncated: true });

  assert.throws(
    () => freezeNamingPlan([], [], { cache }),
    /overflow-block-split-candidates-not-archived/,
  );
  const [childRequest] = planOverflowTextIndexReads(cache, block.id).requests;
  recordPreviewTextIndexBlock(
    cache,
    childRequest,
    completeIndexResult([{ id: "text", characters: "静态文案" }]),
  );
  const entries = [
    {
      ...buildPreviewTextLedgerFromCache(cache)[0],
      structuralAssessment: STRUCTURAL_ASSESSMENT.ELIGIBLE,
      keyDecision: TEXT_KEY_DECISION.SKIP,
    },
  ];
  const frozen = freezeNamingPlan(entries, [], { cache });

  assert.equal(frozen.items.length, 1);
  assert.equal(frozen.writes.length, 0);
});

test("only a truly unsplittable range returns the technical Coverage error", () => {
  const cache = createTaskReadCache();
  const block = {
    id: "2:unsplittable",
    name: "无法拆分的读取范围",
    type: "FRAME",
    previewScopeNodeId: "1:4",
    parentBlockNodeId: null,
    splitCandidates: [],
  };
  const [request] = planPreviewTextIndexReads([block], { cache }).requests;
  const summary = recordPreviewTextIndexBlock(cache, request, { truncated: true });

  assert.equal(summary.status, "overflow");
  assert.equal(planPreviewTextIndexReads([block], { cache }).requests.length, 0);
  assert.throws(
    () => planOverflowTextIndexReads(cache, block.id),
    /当前读取接口无法进一步安全拆分该节点/,
  );
  assert.throws(
    () => buildPreviewTextLedgerFromCache(cache),
    /当前读取接口无法进一步安全拆分该节点/,
  );
});

test("structural overflow never enables fixed Text chunking", () => {
  const block = findSinglePreviewBlock([
    { id: "frame", name: "内容", type: "FRAME" },
  ]);
  const plan = planPreviewTextIndexReads([block]);

  assert.equal(plan.fixedTextChunkSize, null);
  assert.equal(plan.allowFixedTextChunking, false);
  assert.equal(plan.overflowStrategy, "recursive-structural-descendants");
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
      scope: { id: "1:3", name: "预览图/主活动", type: "SECTION" },
      texts: [
        lightText("inside-a", "当前轮次：xx", {
          styledTextSegments: [{ characters: "不得进入账本" }],
          html: "<span>不得进入账本</span>",
          screenshot: "heavy-data",
          variableBinding: { characters: "不得进入账本" },
          fullHtml: "<div>不得进入账本</div>",
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
  assert.equal("variableBinding" in ledger[0], false);
  assert.equal("type" in ledger[0], false);
});

test("light ledger resolves placeholders while binding is added only by targeted context", () => {
  const signaled = applyLightIndexSignals(
    markEligible([
      { nodeId: "template", characters: "当前轮次：xx" },
      { nodeId: "bound", characters: "$0.99" },
      { nodeId: "progress", characters: "22500/550000" },
    ]),
  );
  const withTargetedBinding = applyBatchKeySignals(signaled, [
    {
      nodeId: "bound",
      keySignals: [
        {
          type: KEY_SIGNAL_TYPE.FIGMA_BINDING,
          nodeId: "bound",
          bindingPath: "boundVariables.characters",
          bindingValue: "VariableID:price",
        },
      ],
    },
  ]);
  const ledger = applyStrongEvidenceDecisions(withTargetedBinding);

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
  assert.equal(plan.allowScreenshots, false);
  assert.ok(
    plan.requests.every(({ forbiddenFields }) =>
      forbiddenFields.includes("styledTextSegments") &&
      forbiddenFields.includes("regionScreenshot"),
    ),
  );
  assert.ok(
    plan.requests.every(({ requestedFields }) =>
      requestedFields.every((field) => !CONFIRM_SCREENSHOT_FIELDS.includes(field)),
    ),
  );
});

test("task cache reads each node, ancestor, Component and screenshot region once", () => {
  const cache = createTaskReadCache();
  const first = planUncachedTaskReads(cache, [
    { kind: "node", resourceId: "text-1" },
    { kind: "node", resourceId: "text-1" },
    { kind: "ancestor", resourceId: "section-1" },
    { kind: "component", resourceId: "component-1" },
    { kind: "regionScreenshot", resourceId: "section-1" },
  ]);

  assert.equal(first.requests.length, 4);
  first.requests.forEach((request) =>
    cache.record({ ...request, value: { loaded: request.resourceId } }),
  );
  const second = planUncachedTaskReads(cache, first.requests);
  assert.equal(second.requests.length, 0);
  assert.equal(second.cacheHits.length, 4);

  cache.record({
    kind: "ancestor",
    resourceId: "section-2",
    requestedFields: ["siblings"],
    value: { siblings: ["a"] },
  });
  const supplemental = planUncachedTaskReads(cache, [
    {
      kind: "ancestor",
      resourceId: "section-2",
      requestedFields: ["siblings", "nearbyTexts"],
    },
    {
      kind: "ancestor",
      resourceId: "section-2",
      requestedFields: ["componentResponsibility"],
    },
  ]);
  assert.equal(supplemental.requests.length, 1);
  assert.deepEqual(supplemental.requests[0].requestedFields, [
    "nearbyTexts",
    "componentResponsibility",
  ]);
});

test("ancestor-based repeated slots are analyzed once without a Component", () => {
  const entries = markEligible([
    {
      nodeId: "slot-a",
      characters: "领取",
      name: "Status",
      ancestorPath: [
        { id: "list-a", name: "RewardList", type: "FRAME" },
        { id: "item-a", name: "RewardItem", type: "FRAME" },
      ],
      component: null,
    },
    {
      nodeId: "slot-b",
      characters: "领取",
      name: "Status",
      ancestorPath: [
        { id: "list-b", name: "RewardList", type: "FRAME" },
        { id: "item-b", name: "RewardItem", type: "FRAME" },
      ],
      component: null,
    },
  ]);

  const [group] = buildStructureReuseGroups(entries);
  assert.equal(group.groupingBasis, "ancestor-structure");
  assert.deepEqual(group.memberNodeIds, ["slot-a", "slot-b"]);
  assert.deepEqual(planTargetedContextReads(entries).aiInputNodeIds, ["slot-a"]);
});

test("screenshots are opt-in for confirm only, grouped by region and cached", () => {
  const cache = createTaskReadCache();
  const entries = applyBatchTextKeyDecisions(
    markEligible([
      {
        nodeId: "confirm-a",
        characters: "$0.99",
        primarySectionNodeId: "shop-region",
      },
      {
        nodeId: "confirm-b",
        characters: "$1.99",
        primarySectionNodeId: "shop-region",
      },
      { nodeId: "name", characters: "剩余 XX 次" },
    ]),
    [
      { nodeId: "confirm-a", keyDecision: TEXT_KEY_DECISION.CONFIRM },
      { nodeId: "confirm-b", keyDecision: TEXT_KEY_DECISION.CONFIRM },
      { nodeId: "name", keyDecision: TEXT_KEY_DECISION.NAME },
    ],
  );

  assert.equal(planConfirmScreenshotReads(entries, { cache }).requests.length, 0);
  const first = planConfirmScreenshotReads(entries, {
    cache,
    requiredNodeIds: ["confirm-a", "confirm-b"],
  });
  assert.equal(first.requests.length, 1);
  assert.deepEqual(first.requests[0].memberNodeIds, ["confirm-a", "confirm-b"]);
  cache.record({ ...first.requests[0], value: "screenshot-ref" });
  assert.equal(
    planConfirmScreenshotReads(entries, {
      cache,
      requiredNodeIds: ["confirm-a"],
    }).requests.length,
    0,
  );
  assert.throws(
    () =>
      planConfirmScreenshotReads(entries, {
        cache,
        requiredNodeIds: ["name"],
      }),
    /screenshot-only-allowed-for-confirm/,
  );

  const resolved = applyConfirmEvidenceDecisions(entries, [
    {
      groupId: "shop-price",
      memberNodeIds: ["confirm-a", "confirm-b"],
      keyDecision: TEXT_KEY_DECISION.NAME,
      reason: "one cached region screenshot resolved both members",
    },
  ]);
  assert.deepEqual(
    resolved.map((entry) => assessTextKeyTarget(entry).result),
    [TEXT_KEY_DECISION.NAME, TEXT_KEY_DECISION.NAME, TEXT_KEY_DECISION.NAME],
  );
  assert.throws(
    () =>
      applyConfirmEvidenceDecisions(resolved, [
        {
          groupId: "already-resolved",
          memberNodeIds: ["confirm-a"],
          keyDecision: TEXT_KEY_DECISION.SKIP,
        },
      ]),
    /confirm-group-member-not-confirm/,
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
    component: componentPath,
    primarySectionNodeId: "status-region",
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

  entries = applyStructureReuseDecisions(entries, [
    {
      ...targeted.analysisGroups[0],
      keyDecision: TEXT_KEY_DECISION.CONFIRM,
      reason: "one representative remains visually ambiguous",
    },
  ]);
  const rich = planDeferredRichTextReads(entries, { pageCenterUpload: true });
  const screenshots = planConfirmScreenshotReads(entries, {
    requiredNodeIds: unresolved.map(({ nodeId }) => nodeId),
  });
  const targetedDeepReads =
    targeted.requests.length + rich.requests.length + screenshots.requests.length;

  assert.equal(rich.requests.length, 10);
  assert.equal(screenshots.requests.length, 1);
  assert.ok(targetedDeepReads <= 10 + 5);
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

test("frozen node follow-ups restore decisions without a ledger or Coverage rerun", () => {
  const entries = applyBatchTextKeyDecisions(
    markEligible([
      {
        nodeId: "rename",
        name: "Text 1",
        characters: "当前轮次：xx",
        ancestorPath: [{ id: "round", name: "轮次", type: "FRAME" }],
        component: null,
      },
      { nodeId: "skip", name: "规则", characters: "活动规则" },
    ]),
    [
      { nodeId: "rename", keyDecision: TEXT_KEY_DECISION.NAME, reason: "template" },
      { nodeId: "skip", keyDecision: TEXT_KEY_DECISION.SKIP, reason: "fixed copy" },
    ],
  );
  const plan = freezeNamingPlan(entries, [
    { nodeId: "rename", action: "rename", finalName: "文案/round/current-name" },
  ]);
  const restored = restoreFrozenNamingPlan(serializeFrozenNamingPlan(plan));
  const hit = lookupFrozenNodeResult(restored, "rename");
  const miss = lookupFrozenNodeResult(restored, "not-in-plan");

  assert.equal(hit.source, "frozen-plan");
  assert.equal(hit.allowFigmaLookup, false);
  assert.equal(hit.item.finalName, "文案/round/current-name");
  assert.equal(miss.source, "cache-miss");
  assert.equal(miss.allowFigmaLookup, true);
  assert.equal(Object.isFrozen(restored), true);
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

test("rich text plan never reads skip or confirm and reuses node cache", () => {
  const cache = createTaskReadCache();
  const entries = applyBatchTextKeyDecisions(
    markEligible([
      { nodeId: "name-a", characters: "奖励 XX" },
      { nodeId: "name-b", characters: "奖励 XX" },
      { nodeId: "skip", characters: "规则" },
      { nodeId: "confirm", characters: "$0.99" },
    ]),
    [
      { nodeId: "name-a", keyDecision: TEXT_KEY_DECISION.NAME },
      { nodeId: "name-b", keyDecision: TEXT_KEY_DECISION.NAME },
      { nodeId: "skip", keyDecision: TEXT_KEY_DECISION.SKIP },
      { nodeId: "confirm", keyDecision: TEXT_KEY_DECISION.CONFIRM },
    ],
  );
  const first = planDeferredRichTextReads(entries, { cache });
  assert.deepEqual(first.nodeIds, ["name-a", "name-b"]);
  first.requests.forEach((request) =>
    cache.record({ ...request, value: { html: `<span>${request.resourceId}</span>` } }),
  );
  assert.deepEqual(planDeferredRichTextReads(entries, { cache }).nodeIds, []);
});

test("canonical naming accepts a positive numeric suffix on semantic-key", () => {
  assert.deepEqual(validateDynamicTextName("文案/voice-ranking/jewel-count"), {
    valid: true,
    errors: [],
    businessDomain: "voice-ranking",
    semanticKey: "jewel-count",
  });
  assert.deepEqual(validateDynamicTextName("文案/leaf/balance-2"), {
    valid: true,
    errors: [],
    businessDomain: "leaf",
    semanticKey: "balance-2",
  });
  assert.equal(validateDynamicTextName("文案/leaf/balance-0").valid, false);
  assert.equal(validateDynamicTextName("文案/leaf/balance-01").valid, false);
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

test("different canonical HTML gets stable numeric suffixes without confirm", () => {
  const baseName = "文案/leaf/balance";
  const results = assignCanonicalHtmlSuffixNames([
    {
      nodeId: "node-9000",
      characters: "Balance XX",
      businessField: "leaf-balance",
      canonicalHtml: '<span class="large">Balance XX</span>',
      baseName,
      currentName: `${baseName}-4`,
    },
    {
      nodeId: "node-1",
      characters: "Balance XX",
      businessField: "leaf-balance",
      canonicalHtml: '<span class="small">Balance XX</span>',
      baseName,
      currentName: `${baseName}-2`,
    },
    {
      nodeId: "random-looking-id-77",
      characters: "Balance XX",
      businessField: "leaf-balance",
      canonicalHtml: '<span class="large">Balance XX</span>',
      baseName,
      currentName: "Text 77",
    },
    {
      nodeId: "node-2",
      characters: "Balance XX",
      businessField: "leaf-balance",
      canonicalHtml: '<strong>Balance XX</strong>',
      baseName,
      currentName: "Text 2",
    },
  ]);

  assert.deepEqual(results.map(({ finalName }) => finalName), [
    `${baseName}-4`,
    `${baseName}-2`,
    `${baseName}-4`,
    `${baseName}-1`,
  ]);
  assert.deepEqual(results.map(({ suffix }) => suffix), ["4", "2", "4", "1"]);
  assert.ok(results.every(({ action }) => action === "keep" || action === "rename"));
  assert.ok(results.every((result) => !("confirm" in result)));
  assert.deepEqual(
    findPageCenterKeyConflicts(
      results.map(({ finalName, canonicalHtml }) => ({
        name: finalName,
        html: canonicalHtml,
      })),
    ),
    [],
  );
});

test("first generation follows frozen order and does not derive suffixes from nodeId", () => {
  const baseName = "文案/leaf/balance";
  const input = [
    {
      nodeId: "999:999",
      characters: "XX",
      businessField: "balance",
      canonicalHtml: "<b>XX</b>",
      baseName,
      currentName: "Text",
    },
    {
      nodeId: "1:1",
      characters: "XX",
      businessField: "balance",
      canonicalHtml: "<i>XX</i>",
      baseName,
      currentName: "Text",
    },
    {
      nodeId: "500:500",
      characters: "XX",
      businessField: "balance",
      canonicalHtml: "<b>XX</b>",
      baseName,
      currentName: "Text",
    },
  ];

  assert.deepEqual(
    assignCanonicalHtmlSuffixNames(input).map(({ finalName }) => finalName),
    [`${baseName}-1`, `${baseName}-2`, `${baseName}-1`],
  );
  assert.deepEqual(
    assignCanonicalHtmlSuffixNames(
      input.map((entry, index) => ({ ...entry, nodeId: `changed-${index}` })),
    ).map(({ finalName }) => finalName),
    [`${baseName}-1`, `${baseName}-2`, `${baseName}-1`],
  );

  const firstRun = assignCanonicalHtmlSuffixNames(input);
  const secondRun = assignCanonicalHtmlSuffixNames([
    { ...input[1], currentName: firstRun[1].finalName },
    { ...input[2], currentName: firstRun[2].finalName },
    { ...input[0], currentName: firstRun[0].finalName },
  ]);
  assert.deepEqual(secondRun.map(({ finalName }) => finalName), [
    `${baseName}-2`,
    `${baseName}-1`,
    `${baseName}-1`,
  ]);
});

test("different characters never share one canonical HTML suffix sequence", () => {
  const baseName = "文案/guarantee/remaining-count";
  const results = assignCanonicalHtmlSuffixNames([
    {
      characters: "距离保底：xxx个",
      businessField: "guarantee-distance",
      canonicalHtml: "<span>距离保底：xxx个</span>",
      baseName,
      currentName: "Text",
    },
    {
      characters: "距離保底：xxx個",
      businessField: "guarantee-distance",
      canonicalHtml: "<strong>距離保底：xxx個</strong>",
      baseName,
      currentName: "Text",
    },
  ]);

  assert.deepEqual(results.map(({ finalName }) => finalName), [baseName, baseName]);
  assert.deepEqual(results.map(({ suffix }) => suffix), [null, null]);
});

test("existing suffix matching preserves as many HTML groups as possible", () => {
  const baseName = "文案/leaf/balance";
  const results = assignCanonicalHtmlSuffixNames([
    {
      characters: "XX",
      businessField: "balance",
      canonicalHtml: "A",
      baseName,
      currentName: `${baseName}-1`,
    },
    {
      characters: "XX",
      businessField: "balance",
      canonicalHtml: "A",
      baseName,
      currentName: `${baseName}-2`,
    },
    {
      characters: "XX",
      businessField: "balance",
      canonicalHtml: "B",
      baseName,
      currentName: `${baseName}-1`,
    },
  ]);

  assert.deepEqual(results.map(({ finalName }) => finalName), [
    `${baseName}-2`,
    `${baseName}-2`,
    `${baseName}-1`,
  ]);
});

test("one canonical HTML keeps the unsuffixed base name", () => {
  const results = assignCanonicalHtmlSuffixNames([
    {
      characters: "XX",
      businessField: "balance",
      canonicalHtml: "<span>XX</span>",
      baseName: "文案/leaf/balance",
      currentName: "文案/leaf/balance-3",
    },
    {
      characters: "XX",
      businessField: "balance",
      canonicalHtml: "<span>XX</span>",
      baseName: "文案/leaf/balance",
      currentName: "Text",
    },
  ]);

  assert.deepEqual(results.map(({ finalName }) => finalName), [
    "文案/leaf/balance",
    "文案/leaf/balance",
  ]);
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
