import assert from "node:assert/strict";
import test from "node:test";

import {
  assessDynamicText,
  findPageCenterKeyConflicts,
  isDynamicTextCandidate,
  toPageCenterKey,
  validateDynamicTextName,
} from "../scripts/dynamic-text-naming.mjs";

const verifiedContext = {
  evidenceSufficient: true,
  sectionBoundaryVerified: true,
  businessDomainVerified: true,
  semanticKeyVerified: true,
  conflictFree: true,
};

test("migrates an old two-part name", () => {
  assert.deepEqual(
    assessDynamicText({
      characters: "剩余 xx 次",
      currentName: "lottery/remaining-count",
      proposedName: "文案/lottery/remaining-count",
      ...verifiedContext,
    }),
    {
      result: "rename",
      name: "文案/lottery/remaining-count",
      reasonCodes: [],
    },
  );
});

test("keeps a correct three-part name after all context checks", () => {
  assert.deepEqual(
    assessDynamicText({
      characters: "剩余 xx 次",
      currentName: "文案/lottery/remaining-count",
      ...verifiedContext,
    }),
    {
      result: "keep",
      name: "文案/lottery/remaining-count",
      reasonCodes: [],
    },
  );
});

test("renames a three-word semantic key without mechanical truncation", () => {
  assert.deepEqual(
    assessDynamicText({
      characters: "剩余抽奖次数 xx 次",
      currentName: "文案/lottery/remaining-draw-count",
      proposedName: "文案/lottery/remaining-count",
      ...verifiedContext,
    }),
    {
      result: "rename",
      name: "文案/lottery/remaining-count",
      reasonCodes: [],
    },
  );
});

test("rejects tab1 and block as business domains", () => {
  assert.equal(validateDynamicTextName("文案/tab1/count").valid, false);
  assert.deepEqual(
    validateDynamicTextName("文案/block/count").errors,
    ["weak-business-domain-not-allowed"],
  );

  assert.equal(
    assessDynamicText({
      characters: "剩余 XX 次",
      currentName: "文案/tab1/count",
      evidenceSufficient: true,
      sectionBoundaryVerified: true,
      businessDomainVerified: false,
      semanticKeyVerified: true,
      conflictFree: true,
    }).result,
    "confirm",
  );
});

test("confirms pure xxx when evidence is insufficient", () => {
  assert.deepEqual(
    assessDynamicText({
      characters: "xxx",
      currentName: "Text 128",
      evidenceSufficient: false,
    }),
    { result: "confirm", reasonCodes: ["insufficient-evidence"] },
  );
});

test("reuses the same name for the same business field", () => {
  const sharedName = "文案/reward/name";
  for (const currentName of ["Text 1", "reward/name", "文案/reward/title"]) {
    assert.deepEqual(
      assessDynamicText({
        characters: "奖励 XX",
        currentName,
        sameBusinessFieldName: sharedName,
        ...verifiedContext,
      }),
      { result: "rename", name: sharedName, reasonCodes: [] },
    );
  }
});

test("reuses a PC key only when the generated HTML is identical", () => {
  assert.deepEqual(
    assessDynamicText({
      characters: "xxx ألماس",
      currentName: "Text 1",
      sameBusinessFieldName: "文案/reward/estimated-amount",
      pcUploadRequested: true,
      pcHtmlEquivalent: true,
      ...verifiedContext,
    }),
    {
      result: "rename",
      name: "文案/reward/estimated-amount",
      reasonCodes: [],
    },
  );
});

test("uses a stable context name when the same field has different PC HTML", () => {
  assert.deepEqual(
    assessDynamicText({
      characters: "xxx ألماس",
      currentName: "文案/reward/estimated-amount",
      sameBusinessFieldName: "文案/reward/estimated-amount",
      pcUploadRequested: true,
      pcHtmlEquivalent: false,
      presentationVariantName: "文案/voice-reward/estimated-amount",
      ...verifiedContext,
    }),
    {
      result: "rename",
      name: "文案/voice-reward/estimated-amount",
      reasonCodes: [],
    },
  );
});

test("confirms a PC style split without a stable context name", () => {
  assert.deepEqual(
    assessDynamicText({
      characters: "xxx ألماس",
      currentName: "文案/reward/estimated-amount",
      sameBusinessFieldName: "文案/reward/estimated-amount",
      pcUploadRequested: true,
      pcHtmlEquivalent: false,
      ...verifiedContext,
    }).reasonCodes,
    ["distinct-pc-html-requires-stable-context-name"],
  );
});

test("detects conflicting HTML before Page Center upload", () => {
  const regularName = "文案/ranking/jewel-count";
  const voiceName = "文案/voice-ranking/jewel-count";
  assert.equal(toPageCenterKey(voiceName), "voice-ranking/jewel-count");

  assert.deepEqual(
    findPageCenterKeyConflicts([
      { name: regularName, html: '<span style="font-size: 0.22rem">{{}}</span>' },
      { name: regularName, html: '<span style="font-size: 0.20rem">{{}}</span>' },
      { name: voiceName, html: '<span style="font-size: 0.20rem">{{}}</span>' },
    ]),
    ["ranking/jewel-count"],
  );

  assert.deepEqual(
    findPageCenterKeyConflicts([
      { name: regularName, html: '<span style="font-size: 0.22rem">{{}}</span>' },
      { name: regularName, html: '<span style="font-size: 0.22rem">{{}}</span>' },
      { name: voiceName, html: '<span style="font-size: 0.20rem">{{}}</span>' },
    ]),
    [],
  );
});

test("skips non-candidate English words", () => {
  for (const characters of ["box", "extra", "example", "1x", "x1"]) {
    assert.equal(isDynamicTextCandidate(characters), false);
    assert.deepEqual(assessDynamicText({ characters }), {
      result: "skip",
      reasonCodes: ["characters-not-candidate"],
    });
  }
});

test("uses the exact candidate boundary behavior", () => {
  for (const characters of ["xx", "XXX", "剩余 xx 次", "X/100"]) {
    assert.equal(isDynamicTextCandidate(characters), true);
  }
});

test("validator enforces prefix, slashes, word counts, case and numbers", () => {
  assert.equal(validateDynamicTextName("文案/reward/name").valid, true);
  assert.equal(
    validateDynamicTextName("文案/voice-ranking/jewel-count").valid,
    true,
  );

  const invalidNames = [
    "reward/name",
    "文案/reward",
    "文案/reward/name/extra",
    "文案/reward/reward-name-extra",
    "文案/reward/reward_name",
    "文案/coinPool/share-count",
    "文案/Reward/name",
    "文案/tab1/count",
    "文案/voice-room-ranking/jewel-count",
    "文案/voice-page/jewel-count",
  ];

  for (const name of invalidNames) {
    assert.equal(validateDynamicTextName(name).valid, false, name);
  }
});

test("a valid-looking current name cannot keep without semantic checks", () => {
  assert.equal(
    assessDynamicText({
      characters: "xx",
      currentName: "文案/reward/count",
      evidenceSufficient: true,
      sectionBoundaryVerified: true,
      businessDomainVerified: false,
      semanticKeyVerified: true,
      conflictFree: true,
    }).result,
    "confirm",
  );
});
