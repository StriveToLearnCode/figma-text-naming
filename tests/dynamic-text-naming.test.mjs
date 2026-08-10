import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test, { describe } from "node:test";

import {
  assessNamingPlanItem,
  classifyNamingConfidence,
  summarizeNamingPlan,
  validateDynamicTextName,
  validateNamingPlan,
} from "../scripts/dynamic-text-naming.mjs";

function planItem(overrides = {}) {
  return {
    nodeId: "123:456",
    text: "22500/550000",
    regionId: "region-b",
    semanticId: "recharge:current-target",
    isDynamic: true,
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
      planItem({ isDynamic: false, confidence: 0.99 }),
    );

    assert.equal(result.result, "skip");
    assert.deepEqual(result.reasonCodes, ["not-dynamic"]);
    assert.equal("name" in result, false);
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
        planItem({ nodeId: "1:4", isDynamic: false, confidence: 0.99 }),
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
