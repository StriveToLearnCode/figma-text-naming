import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test, { describe } from "node:test";

import {
  assessNamingPlanItem,
  classifyNamingConfidence,
  summarizeCandidateScan,
  summarizeNamingPlan,
  validateDynamicTextName,
  validateNamingPlan,
  validateReferenceTextKey,
} from "../scripts/dynamic-text-naming.mjs";

function planItem(overrides = {}) {
  return {
    nodeId: "123:456",
    text: "22500/550000",
    regionId: "region-b",
    semanticId: "recharge:current-target",
    isDynamic: true,
    dynamicEvidence: [
      "独立显示 current/target 数值",
      "同一位置会随运行时充值进度变化",
    ],
    needsLayerName: true,
    suggestedName: "文案/recharge/current-target",
    confidence: 0.96,
    evidence: [
      "位于充值进度区域",
      "数值位于进度条上方",
      "附近存在累计充值和阶段奖励文案",
    ],
    ...overrides,
  };
}

function previewSliceComparison(overrides = {}) {
  return {
    previewNodeId: "123:400",
    sliceNodeId: "123:500",
    status: "preview-only",
    pairingEvidence: ["共用同一背景实例", "进度条结构一致"],
    comparisonEvidence: ["切图的对应位置不含该文字"],
    ...overrides,
  };
}

describe("single naming confidence", () => {
  test("uses exact 0.70 and 0.90 boundaries", () => {
    assert.equal(classifyNamingConfidence(0.9), "automatic");
    assert.equal(classifyNamingConfidence(0.8999), "recommend");
    assert.equal(classifyNamingConfidence(0.7), "recommend");
    assert.equal(classifyNamingConfidence(0.6999), "skip");
  });

  test("requires one confidence and supporting evidence", () => {
    assert.throws(
      () => assessNamingPlanItem(planItem({ confidence: undefined })),
      /confidence-must-be-between-zero-and-one/,
    );
    assert.throws(
      () => assessNamingPlanItem(planItem({ evidence: [] })),
      /evidence-must-be-a-non-empty-string-array/,
    );
    assert.throws(
      () => assessNamingPlanItem(planItem({ needsLayerName: undefined })),
      /needs-layer-name-must-be-a-boolean/,
    );
  });

  test("skips low-confidence guesses without exposing a name", () => {
    const result = assessNamingPlanItem(planItem({ confidence: 0.69 }));

    assert.equal(result.result, "skip");
    assert.deepEqual(result.reasonCodes, [
      "confidence-below-recommend-threshold",
    ]);
    assert.equal("name" in result, false);
    assert.equal("suggestedName" in result, false);
  });

  test("keeps a recommendation but never writes it", () => {
    const result = assessNamingPlanItem(planItem({ confidence: 0.82 }));

    assert.equal(result.result, "confirm");
    assert.equal(result.suggestedName, "文案/recharge/current-target");
    assert.equal("name" in result, false);
  });

  test("never names a node that AI classified as static", () => {
    const result = assessNamingPlanItem(
      planItem({
        isDynamic: false,
        dynamicEvidence: undefined,
        needsLayerName: undefined,
        confidence: undefined,
      }),
    );

    assert.equal(result.result, "skip");
    assert.deepEqual(result.reasonCodes, ["not-dynamic"]);
    assert.equal("name" in result, false);
    assert.equal("suggestedName" in result, false);
    assert.equal("confidence" in result, false);
    assert.equal("needsLayerName" in result, false);
  });

  test("keeps preview-to-slice comparison separate from dynamic classification", () => {
    const staticOverlay = assessNamingPlanItem(
      planItem({
        text: "ملاحظة",
        isDynamic: false,
        dynamicEvidence: undefined,
        needsLayerName: undefined,
        confidence: undefined,
        renderingComparison: previewSliceComparison(),
      }),
    );
    const dynamicOverlay = assessNamingPlanItem(
      planItem({ renderingComparison: previewSliceComparison() }),
    );

    assert.equal(staticOverlay.result, "skip");
    assert.equal(staticOverlay.renderingComparison.status, "preview-only");
    assert.equal(dynamicOverlay.result, "rename");
    assert.equal(dynamicOverlay.renderingComparison.status, "preview-only");
  });

  test("validates preview-to-slice comparison records without inferring dynamics", () => {
    for (const renderingComparison of [
      previewSliceComparison({ status: "unknown" }),
      previewSliceComparison({ pairingEvidence: [] }),
      previewSliceComparison({ comparisonEvidence: [] }),
      previewSliceComparison({ sliceNodeId: "" }),
    ]) {
      assert.throws(
        () => assessNamingPlanItem(planItem({ renderingComparison })),
        /rendering-comparison|evidence-must-be-a-non-empty-string-array/,
      );
    }
  });

  test("blocks key generation without independent runtime-change evidence", () => {
    const result = assessNamingPlanItem(
      planItem({
        text: "العرض الأول",
        dynamicEvidence: undefined,
        evidence: ["明确表示第一档优惠", "业务域可理解"],
        suggestedName: "文案/first-offer/title",
        confidence: 0.99,
      }),
    );

    assert.equal(result.result, "confirm");
    assert.deepEqual(result.reasonCodes, ["runtime-change-evidence-required"]);
    assert.equal("name" in result, false);
    assert.equal("suggestedName" in result, false);
    assert.equal("confidence" in result, false);
  });

  test("never names dynamic data owned by a component", () => {
    for (const item of [
      { text: "道具名称", semanticId: "reward:item-name" },
      { text: "1x", semanticId: "reward:item-amount" },
    ]) {
      const result = assessNamingPlanItem(
        planItem({
          ...item,
          suggestedName: undefined,
          needsLayerName: false,
          confidence: 0.99,
        }),
      );

      assert.equal(result.result, "skip");
      assert.deepEqual(result.reasonCodes, ["layer-name-not-required"]);
      assert.equal("name" in result, false);
      assert.equal("suggestedName" in result, false);
    }
  });
});

describe("high-confidence decisions", () => {
  test("renames a valid high-confidence item", () => {
    const result = assessNamingPlanItem(
      planItem({ currentName: "Text 12", confidence: 0.9 }),
    );

    assert.equal(result.result, "rename");
    assert.equal(result.name, "文案/recharge/current-target");
    assert.equal(result.confidence, 0.9);
    assert.ok(result.evidence.length >= 3);
  });

  test("keeps an already correct high-confidence name", () => {
    const result = assessNamingPlanItem(
      planItem({ currentName: "文案/recharge/current-target" }),
    );

    assert.equal(result.result, "keep");
    assert.equal(result.name, "文案/recharge/current-target");
  });

  test("sends invalid or unverifiable names to confirmation", () => {
    const invalid = assessNamingPlanItem(
      planItem({ suggestedName: "文案/recharge/current_target" }),
    );
    const missingSemanticId = assessNamingPlanItem(
      planItem({ semanticId: undefined }),
    );

    assert.equal(invalid.result, "confirm");
    assert.ok(invalid.reasonCodes.includes("suggested-name-invalid"));
    assert.equal(missingSemanticId.result, "confirm");
    assert.deepEqual(missingSemanticId.reasonCodes, [
      "semantic-id-required-for-key-validation",
    ]);
  });
});

describe("whole-plan validation", () => {
  test("rejects duplicate node records", () => {
    assert.throws(
      () => validateNamingPlan({ items: [planItem(), planItem()] }),
      /duplicate-node-id: 123:456/,
    );
  });

  test("allows the same key for the same verified business field", () => {
    const results = validateNamingPlan({
      items: [
        planItem({ nodeId: "1:1" }),
        planItem({ nodeId: "1:2", text: "550000" }),
      ],
    });

    assert.deepEqual(
      results.map((item) => item.result),
      ["rename", "rename"],
    );
  });

  test("confirms duplicate keys that claim different fields", () => {
    const results = validateNamingPlan({
      items: [
        planItem({ nodeId: "1:1" }),
        planItem({
          nodeId: "1:2",
          semanticId: "task:current-target",
          text: "0/20",
        }),
      ],
    });

    for (const result of results) {
      assert.equal(result.result, "confirm");
      assert.ok(result.reasonCodes.includes("key-conflict"));
      assert.equal("name" in result, false);
    }
  });

  test("checks proposed keys against names already outside the plan", () => {
    const [result] = validateNamingPlan({
      items: [planItem()],
      existingNames: [
        {
          nodeId: "9:9",
          name: "文案/recharge/current-target",
          semanticId: "task:current-target",
        },
      ],
    });

    assert.equal(result.result, "confirm");
    assert.ok(result.reasonCodes.includes("key-conflict"));
  });

  test("summarizes the complete plan", () => {
    const results = [
      assessNamingPlanItem(planItem({ nodeId: "1:1" })),
      assessNamingPlanItem(
        planItem({
          nodeId: "1:2",
          currentName: "文案/recharge/current-target",
        }),
      ),
      assessNamingPlanItem(planItem({ nodeId: "1:3", confidence: 0.8 })),
      assessNamingPlanItem(
        planItem({
          nodeId: "1:4",
          isDynamic: false,
          dynamicEvidence: undefined,
          needsLayerName: undefined,
          confidence: undefined,
        }),
      ),
    ];

    assert.deepEqual(summarizeNamingPlan(results), {
      scanned: 4,
      automatic: 1,
      kept: 1,
      needsConfirmation: 1,
      skipped: 1,
    });
  });

  test("summarizes dynamic candidates separately from static skips", () => {
    const results = [
      assessNamingPlanItem(
        planItem({
          nodeId: "1:1",
          text: "0/20",
          renderingComparison: previewSliceComparison(),
        }),
      ),
      assessNamingPlanItem(
        planItem({
          nodeId: "1:2",
          text: "22500/550000",
          renderingComparison: previewSliceComparison(),
        }),
      ),
      assessNamingPlanItem(
        planItem({
          nodeId: "1:3",
          text: "فرص الخصم:",
          isDynamic: false,
          dynamicEvidence: undefined,
          needsLayerName: undefined,
          confidence: undefined,
        }),
      ),
    ];

    assert.deepEqual(summarizeCandidateScan(results), {
      scanned: 3,
      comparisonPairs: 1,
      previewOnly: 2,
      dynamicCandidates: 2,
      staticSkipped: 1,
    });
  });

  test("validates a complete plan through the CLI", () => {
    const cliPath = fileURLToPath(
      new URL("../scripts/validate-naming-plan.mjs", import.meta.url),
    );
    const execution = spawnSync(process.execPath, [cliPath], {
      input: JSON.stringify({ items: [planItem()] }),
      encoding: "utf8",
    });

    assert.equal(execution.status, 0, execution.stderr);
    const output = JSON.parse(execution.stdout);
    assert.equal(output.results[0].result, "rename");
    assert.deepEqual(output.summary, {
      scanned: 1,
      automatic: 1,
      kept: 0,
      needsConfirmation: 0,
      skipped: 0,
    });
  });

  test("uses an exact supplied key even when it violates generated-name rules", () => {
    const [result] = validateNamingPlan({
      referenceEntries: [
        {
          key: "member/vip-open-chances",
          value: "عدد الفرص الفتح: {{}}",
        },
      ],
      items: [
        planItem({
          text: "عدد الفرص الفتح: xx",
          currentName: "文案/member/open-chance",
          semanticId: undefined,
          sourceKey: "member/vip-open-chances",
          suggestedName: "文案/member/vip-open-chances",
        }),
      ],
    });

    assert.equal(result.result, "rename");
    assert.equal(result.name, "文案/member/vip-open-chances");
    assert.equal(result.semanticId, "member/vip-open-chances");
  });

  test("treats a supplied reference catalog as the automatic naming allowlist", () => {
    const [result] = validateNamingPlan({
      referenceEntries: [
        { key: "recharge/consume-progress", value: "{{}}/{{}}" },
      ],
      items: [
        planItem({
          text: "عروض الشحن",
          suggestedName: "文案/recharge/offers-title",
          sourceKey: undefined,
        }),
      ],
    });

    assert.equal(result.result, "skip");
    assert.deepEqual(result.reasonCodes, ["no-reference-key-match"]);
    assert.equal("name" in result, false);
  });

  test("keeps distinct supplied recharge keys for identical placeholder HTML", () => {
    const referenceEntries = [
      { key: "recharge/discount-times", value: "{{}}/{{}}" },
      { key: "recharge/consume-progress", value: "{{}}/{{}}" },
    ];
    const results = validateNamingPlan({
      referenceEntries,
      items: [
        planItem({
          nodeId: "126:16009",
          text: "0/20",
          sourceKey: "recharge/discount-times",
          suggestedName: "文案/recharge/discount-times",
          evidence: ["位于“折扣机会”标签旁", "源清单 key 精确匹配"],
        }),
        planItem({
          nodeId: "126:16007",
          text: "22500/550000",
          sourceKey: "recharge/consume-progress",
          suggestedName: "文案/recharge/consume-progress",
          evidence: ["位于“金币消耗”标签旁", "源清单 key 精确匹配"],
        }),
      ],
    });

    assert.deepEqual(
      results.map((result) => result.name),
      ["文案/recharge/discount-times", "文案/recharge/consume-progress"],
    );
    assert.deepEqual(
      results.map((result) => result.result),
      ["rename", "rename"],
    );
  });

  test("rejects invented or mismatched reference keys", () => {
    const referenceEntries = [
      { key: "recharge/consume-progress", value: "{{}}/{{}}" },
    ];
    const [unknown, mismatched] = validateNamingPlan({
      referenceEntries,
      items: [
        planItem({
          nodeId: "1:1",
          sourceKey: "recharge/current-target",
        }),
        planItem({
          nodeId: "1:2",
          sourceKey: "recharge/consume-progress",
          suggestedName: "文案/recharge/current-target",
        }),
      ],
    });

    assert.deepEqual(unknown.reasonCodes, ["reference-key-not-found"]);
    assert.deepEqual(mismatched.reasonCodes, ["reference-key-name-mismatch"]);
    assert.equal(unknown.result, "confirm");
    assert.equal(mismatched.result, "confirm");
  });

  test("requires the catalog whenever a plan claims a source key", () => {
    const [result] = validateNamingPlan({
      items: [planItem({ sourceKey: "recharge/consume-progress" })],
    });

    assert.equal(result.result, "confirm");
    assert.deepEqual(result.reasonCodes, ["reference-catalog-required"]);
  });

  test("rejects conflicting values for one supplied key", () => {
    assert.throws(
      () =>
        validateNamingPlan({
          referenceEntries: [
            { key: "recharge/consume-progress", value: "{{}}/{{}}" },
            { key: "recharge/consume-progress", value: "other" },
          ],
          items: [],
        }),
      /conflicting-reference-key: recharge\/consume-progress/,
    );
  });
});

describe("deterministic scope", () => {
  test("enforces canonical names", () => {
    assert.equal(validateDynamicTextName("文案/reward/name").valid, true);
    assert.equal(
      validateDynamicTextName("文案/voice-ranking/jewel-count").valid,
      true,
    );

    for (const name of [
      "reward/name",
      "文案/reward/reward-name-extra",
      "文案/reward/reward_name",
      "文案/coinPool/share-count",
      "文案/tab1/count",
      "文案/block/count",
    ]) {
      assert.equal(validateDynamicTextName(name).valid, false, name);
    }
  });

  test("accepts exact legacy-shaped keys only as reference keys", () => {
    for (const key of [
      "member/vip-open-chances",
      "ring/open-count-01",
      "txt/lottery",
    ]) {
      assert.equal(validateReferenceTextKey(key).valid, true, key);
      assert.equal(validateDynamicTextName(`文案/${key}`).valid, false, key);
    }

    for (const key of [
      "文案/recharge/progress",
      "/recharge/progress",
      "recharge//progress",
      "recharge/progress ",
      "bad",
    ])
      assert.equal(validateReferenceTextKey(key).valid, false, key);
  });

  test("contains no text-shape or scenario classifier", async () => {
    const source = await import("node:fs/promises").then(({ readFile }) =>
      readFile(
        new URL("../scripts/dynamic-text-naming.mjs", import.meta.url),
        "utf8",
      ),
    );

    assert.doesNotMatch(
      source,
      /isDynamicTextCandidate|classifyDynamicTextCandidate|looksLike[A-Z]|DYNAMIC_PLACEHOLDER/i,
    );
  });
});
