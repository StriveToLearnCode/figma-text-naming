export const CANONICAL_NAME_PATTERN =
  /^文案\/[a-z]+(?:-[a-z]+)?\/[a-z]+(?:-[a-z]+)?$/;

export const REFERENCE_TEXT_KEY_PATTERN =
  /^(?!文案\/)(?!\/)(?!.*\/\/)(?!.*\/$)(?=.*\/)[^\u0000-\u001f\u007f]+$/;

export const AUTOMATIC_NAMING_THRESHOLD = 0.9;
export const RECOMMEND_NAMING_THRESHOLD = 0.7;

export const RENDERING_COMPARISON_STATUSES = new Set([
  "preview-only",
  "included-in-slice",
  "unresolved",
]);

const WEAK_BUSINESS_DOMAINS = new Set([
  "txt",
  "text",
  "value",
  "info",
  "block",
  "section",
  "panel",
  "tab",
  "page",
  "bottom",
]);

const WEAK_SEMANTIC_WORDS = new Set([
  "txt",
  "text",
  "value",
  "info",
  "block",
  "section",
  "panel",
]);

function addUnique(items, value) {
  if (!items.includes(value)) {
    items.push(value);
  }
}

export function validateDynamicTextName(name) {
  const errors = [];

  if (typeof name !== "string") {
    return { valid: false, errors: ["name-must-be-string"] };
  }

  if (!name.startsWith("文案/")) {
    addUnique(errors, "missing-fixed-prefix");
  }
  if ((name.match(/\//g) ?? []).length !== 2) {
    addUnique(errors, "slash-count-must-be-two");
  }
  if (name.includes("_")) {
    addUnique(errors, "underscore-not-allowed");
  }
  if (/[a-z][A-Z]/.test(name)) {
    addUnique(errors, "camel-case-not-allowed");
  }
  if (/[A-Z]/.test(name)) {
    addUnique(errors, "uppercase-not-allowed");
  }
  if (/\d/.test(name)) {
    addUnique(errors, "meaningless-number-not-allowed");
  }

  const [prefix, businessDomain, semanticKey, ...extraParts] = name.split("/");
  if (prefix !== "文案") {
    addUnique(errors, "missing-fixed-prefix");
  }

  if (!/^[a-z]+(?:-[a-z]+)?$/.test(businessDomain ?? "")) {
    addUnique(errors, "business-domain-must-be-one-or-two-lowercase-words");
  } else if (
    businessDomain
      .split("-")
      .some((word) => WEAK_BUSINESS_DOMAINS.has(word))
  ) {
    addUnique(errors, "weak-business-domain-not-allowed");
  }

  if (
    extraParts.length > 0 ||
    !/^[a-z]+(?:-[a-z]+)?$/.test(semanticKey ?? "")
  ) {
    addUnique(errors, "semantic-key-must-be-one-or-two-lowercase-words");
  } else if (
    semanticKey.split("-").some((word) => WEAK_SEMANTIC_WORDS.has(word))
  ) {
    addUnique(errors, "weak-semantic-key-not-allowed");
  }

  if (!CANONICAL_NAME_PATTERN.test(name)) {
    addUnique(errors, "canonical-format-mismatch");
  }

  return {
    valid: errors.length === 0,
    errors,
    ...(errors.length === 0 ? { businessDomain, semanticKey } : {}),
  };
}

export function validateReferenceTextKey(key) {
  if (typeof key !== "string") {
    return { valid: false, errors: ["reference-key-must-be-string"] };
  }

  if (key.trim() !== key || !REFERENCE_TEXT_KEY_PATTERN.test(key)) {
    return { valid: false, errors: ["reference-key-format-invalid"] };
  }

  return { valid: true, errors: [] };
}

export function toReferenceLayerName(key) {
  const validation = validateReferenceTextKey(key);
  if (!validation.valid) {
    throw new TypeError(`invalid-reference-key: ${key}`);
  }
  return `文案/${key}`;
}

function requireNonEmptyString(value, field) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(`${field}-must-be-a-non-empty-string`);
  }
  return value;
}

function requireConfidence(value) {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < 0 ||
    value > 1
  ) {
    throw new TypeError("confidence-must-be-between-zero-and-one");
  }
  return value;
}

function requireEvidence(value) {
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    value.some((item) => typeof item !== "string" || item.trim().length === 0)
  ) {
    throw new TypeError("evidence-must-be-a-non-empty-string-array");
  }
  return [...value];
}

function normalizeRenderingComparison(value) {
  if (value === undefined) return undefined;
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("rendering-comparison-must-be-an-object");
  }

  const previewNodeId = requireNonEmptyString(
    value.previewNodeId,
    "rendering-comparison-preview-node-id",
  );
  const sliceNodeId = requireNonEmptyString(
    value.sliceNodeId,
    "rendering-comparison-slice-node-id",
  );
  if (!RENDERING_COMPARISON_STATUSES.has(value.status)) {
    throw new TypeError("rendering-comparison-status-invalid");
  }

  return {
    previewNodeId,
    sliceNodeId,
    status: value.status,
    pairingEvidence: requireEvidence(value.pairingEvidence),
    comparisonEvidence: requireEvidence(value.comparisonEvidence),
  };
}

export function classifyNamingConfidence(confidence) {
  requireConfidence(confidence);

  if (confidence >= AUTOMATIC_NAMING_THRESHOLD) {
    return "automatic";
  }
  if (confidence >= RECOMMEND_NAMING_THRESHOLD) {
    return "recommend";
  }
  return "skip";
}

export function assessNamingPlanItem(input, context = {}) {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    throw new TypeError("naming-plan-item-must-be-an-object");
  }

  const nodeId = requireNonEmptyString(input.nodeId, "node-id");
  if (typeof input.text !== "string") {
    throw new TypeError("text-must-be-a-string");
  }
  if (typeof input.isDynamic !== "boolean") {
    throw new TypeError("is-dynamic-must-be-a-boolean");
  }
  const evidence = requireEvidence(input.evidence);
  const renderingComparison = normalizeRenderingComparison(
    input.renderingComparison,
  );
  const base = {
    nodeId,
    text: input.text,
    isDynamic: input.isDynamic,
    evidence,
    classification: input.isDynamic ? "dynamic" : "static",
    ...(renderingComparison === undefined ? {} : { renderingComparison }),
  };

  if (typeof input.regionId === "string" && input.regionId.length > 0) {
    base.regionId = input.regionId;
  }
  if (!input.isDynamic) {
    return { ...base, result: "skip", reasonCodes: ["not-dynamic"] };
  }

  const dynamicEvidence = input.dynamicEvidence;
  if (
    !Array.isArray(dynamicEvidence) ||
    dynamicEvidence.length === 0 ||
    dynamicEvidence.some(
      (item) => typeof item !== "string" || item.trim().length === 0,
    )
  ) {
    return {
      ...base,
      result: "confirm",
      reasonCodes: ["runtime-change-evidence-required"],
    };
  }

  const dynamicBase = { ...base, dynamicEvidence: [...dynamicEvidence] };
  if (typeof input.needsLayerName !== "boolean") {
    throw new TypeError("needs-layer-name-must-be-a-boolean");
  }
  if (!input.needsLayerName) {
    return {
      ...dynamicBase,
      needsLayerName: false,
      result: "skip",
      reasonCodes: ["layer-name-not-required"],
    };
  }

  const confidence = requireConfidence(input.confidence);
  const confidenceBand = classifyNamingConfidence(confidence);
  const namingBase = {
    ...dynamicBase,
    needsLayerName: true,
    confidence,
    confidenceBand,
  };
  if (confidenceBand === "skip") {
    return {
      ...namingBase,
      result: "skip",
      reasonCodes: ["confidence-below-recommend-threshold"],
    };
  }

  const sourceKey = typeof input.sourceKey === "string" ? input.sourceKey : "";
  if (context.referenceCatalogProvided === true) {
    if (sourceKey.length === 0) {
      return {
        ...namingBase,
        result: "skip",
        reasonCodes: ["no-reference-key-match"],
      };
    }

    const sourceValidation = validateReferenceTextKey(sourceKey);
    if (!sourceValidation.valid) {
      return {
        ...namingBase,
        sourceKey,
        result: "confirm",
        reasonCodes: sourceValidation.errors,
      };
    }

    if (!context.referenceKeys?.has(sourceKey)) {
      return {
        ...namingBase,
        sourceKey,
        result: "confirm",
        reasonCodes: ["reference-key-not-found"],
      };
    }

    const expectedName = toReferenceLayerName(sourceKey);
    if (input.suggestedName !== expectedName) {
      return {
        ...namingBase,
        sourceKey,
        result: "confirm",
        reasonCodes: ["reference-key-name-mismatch"],
      };
    }

    const sourceBacked = {
      ...namingBase,
      semanticId: sourceKey,
      sourceKey,
      suggestedName: expectedName,
    };
    if (confidenceBand === "recommend") {
      return {
        ...sourceBacked,
        result: "confirm",
        reasonCodes: ["confidence-needs-confirmation"],
      };
    }
    if (input.currentName === expectedName) {
      return {
        ...sourceBacked,
        result: "keep",
        name: expectedName,
        reasonCodes: [],
      };
    }
    return {
      ...sourceBacked,
      result: "rename",
      name: expectedName,
      reasonCodes: [],
    };
  }

  if (sourceKey.length > 0) {
    return {
      ...namingBase,
      sourceKey,
      result: "confirm",
      reasonCodes: ["reference-catalog-required"],
    };
  }

  const nameValidation = validateDynamicTextName(input.suggestedName);
  if (!nameValidation.valid) {
    return {
      ...namingBase,
      result: "confirm",
      reasonCodes: ["suggested-name-invalid", ...nameValidation.errors],
    };
  }

  const semanticId =
    typeof input.semanticId === "string" ? input.semanticId.trim() : "";
  if (semanticId.length === 0) {
    return {
      ...namingBase,
      suggestedName: input.suggestedName,
      result: "confirm",
      reasonCodes: ["semantic-id-required-for-key-validation"],
    };
  }

  const withSuggestion = {
    ...namingBase,
    semanticId,
    suggestedName: input.suggestedName,
  };

  if (confidenceBand === "recommend") {
    return {
      ...withSuggestion,
      result: "confirm",
      reasonCodes: ["confidence-needs-confirmation"],
    };
  }

  if (input.currentName === input.suggestedName) {
    return {
      ...withSuggestion,
      result: "keep",
      name: input.suggestedName,
      reasonCodes: [],
    };
  }

  return {
    ...withSuggestion,
    result: "rename",
    name: input.suggestedName,
    reasonCodes: [],
  };
}

function suggestedNameOf(item) {
  return item.suggestedName ?? item.name;
}

function markKeyConflict(item) {
  const { name: _name, ...rest } = item;
  return {
    ...rest,
    result: "confirm",
    reasonCodes: [...new Set([...item.reasonCodes, "key-conflict"])],
  };
}

function buildReferenceCatalog(referenceEntries) {
  if (referenceEntries === undefined) {
    return { provided: false, keys: new Set() };
  }
  if (!Array.isArray(referenceEntries)) {
    throw new TypeError("reference-entries-must-be-an-array");
  }

  const valuesByKey = new Map();
  for (const entry of referenceEntries) {
    const key = requireNonEmptyString(entry?.key, "reference-key");
    const validation = validateReferenceTextKey(key);
    if (!validation.valid) {
      throw new TypeError(`invalid-reference-key: ${key}`);
    }
    if (typeof entry?.value !== "string") {
      throw new TypeError(`reference-value-must-be-a-string: ${key}`);
    }

    const existingValue = valuesByKey.get(key);
    if (existingValue !== undefined && existingValue !== entry.value) {
      throw new TypeError(`conflicting-reference-key: ${key}`);
    }
    valuesByKey.set(key, entry.value);
  }

  return { provided: true, keys: new Set(valuesByKey.keys()) };
}

function hasClaimableName(item, name) {
  if (typeof name !== "string") return false;
  if (typeof item.sourceKey === "string") {
    const validation = validateReferenceTextKey(item.sourceKey);
    return validation.valid && name === `文案/${item.sourceKey}`;
  }
  return validateDynamicTextName(name).valid;
}

export function validateNamingPlan({
  items,
  existingNames = [],
  referenceEntries,
}) {
  if (!Array.isArray(items)) {
    throw new TypeError("naming-plan-items-must-be-an-array");
  }
  if (!Array.isArray(existingNames)) {
    throw new TypeError("existing-names-must-be-an-array");
  }

  const referenceCatalog = buildReferenceCatalog(referenceEntries);
  const assessmentContext = {
    referenceCatalogProvided: referenceCatalog.provided,
    referenceKeys: referenceCatalog.keys,
  };
  const seenNodeIds = new Set();
  let results = items.map((item) => {
    const result = assessNamingPlanItem(item, assessmentContext);
    if (seenNodeIds.has(result.nodeId)) {
      throw new TypeError(`duplicate-node-id: ${result.nodeId}`);
    }
    seenNodeIds.add(result.nodeId);
    return result;
  });

  const claimsByName = new Map();
  for (const [index, item] of results.entries()) {
    const name = suggestedNameOf(item);
    if (!hasClaimableName(item, name)) {
      continue;
    }
    const claims = claimsByName.get(name) ?? [];
    claims.push({ kind: "plan", index, nodeId: item.nodeId, semanticId: item.semanticId });
    claimsByName.set(name, claims);
  }

  for (const entry of existingNames) {
    const nodeId = requireNonEmptyString(entry?.nodeId, "existing-node-id");
    const name = requireNonEmptyString(entry?.name, "existing-name");
    if (!hasClaimableName(entry, name) || seenNodeIds.has(nodeId)) {
      continue;
    }
    const claims = claimsByName.get(name) ?? [];
    claims.push({
      kind: "existing",
      nodeId,
      semanticId:
        typeof entry.semanticId === "string" ? entry.semanticId.trim() : "",
    });
    claimsByName.set(name, claims);
  }

  const conflictingIndexes = new Set();
  for (const claims of claimsByName.values()) {
    if (claims.length < 2) {
      continue;
    }
    const semanticIds = new Set(claims.map((claim) => claim.semanticId));
    if (semanticIds.has("") || semanticIds.size > 1) {
      for (const claim of claims) {
        if (claim.kind === "plan") {
          conflictingIndexes.add(claim.index);
        }
      }
    }
  }

  results = results.map((item, index) =>
    conflictingIndexes.has(index) ? markKeyConflict(item) : item,
  );

  return results;
}

export function summarizeNamingPlan(results) {
  if (!Array.isArray(results)) {
    throw new TypeError("naming-plan-results-must-be-an-array");
  }

  return results.reduce(
    (summary, item) => {
      summary.scanned += 1;
      if (item.result === "rename") summary.automatic += 1;
      if (item.result === "keep") summary.kept += 1;
      if (item.result === "confirm") summary.needsConfirmation += 1;
      if (item.result === "skip") summary.skipped += 1;
      return summary;
    },
    { scanned: 0, automatic: 0, kept: 0, needsConfirmation: 0, skipped: 0 },
  );
}

export function summarizeCandidateScan(results) {
  if (!Array.isArray(results)) {
    throw new TypeError("naming-plan-results-must-be-an-array");
  }

  const comparisonPairs = new Set();
  const summary = {
    scanned: 0,
    comparisonPairs: 0,
    previewOnly: 0,
    dynamicCandidates: 0,
    staticSkipped: 0,
  };

  for (const item of results) {
    summary.scanned += 1;
    if (item.isDynamic === true) summary.dynamicCandidates += 1;
    if (item.isDynamic === false) summary.staticSkipped += 1;

    const comparison = item.renderingComparison;
    if (comparison !== undefined) {
      comparisonPairs.add(
        `${comparison.previewNodeId}\u0000${comparison.sliceNodeId}`,
      );
      if (comparison.status === "preview-only") summary.previewOnly += 1;
    }
  }

  summary.comparisonPairs = comparisonPairs.size;
  return summary;
}
