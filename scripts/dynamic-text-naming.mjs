export const CANONICAL_NAME_PATTERN =
  /^文案\/[a-z]+(?:-[a-z]+)?\/[a-z]+(?:-[a-z]+)?$/;

export const AUTOMATIC_NAMING_THRESHOLD = 0.9;
export const RECOMMEND_NAMING_THRESHOLD = 0.7;

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

export function assessNamingPlanItem(input) {
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

  const confidence = requireConfidence(input.confidence);
  const evidence = requireEvidence(input.evidence);
  const confidenceBand = classifyNamingConfidence(confidence);
  const base = {
    nodeId,
    text: input.text,
    isDynamic: input.isDynamic,
    confidence,
    evidence,
    confidenceBand,
  };

  if (typeof input.regionId === "string" && input.regionId.length > 0) {
    base.regionId = input.regionId;
  }

  if (!input.isDynamic) {
    return { ...base, result: "skip", reasonCodes: ["not-dynamic"] };
  }

  if (confidenceBand === "skip") {
    return {
      ...base,
      result: "skip",
      reasonCodes: ["confidence-below-recommend-threshold"],
    };
  }

  const nameValidation = validateDynamicTextName(input.suggestedName);
  if (!nameValidation.valid) {
    return {
      ...base,
      result: "confirm",
      reasonCodes: ["suggested-name-invalid", ...nameValidation.errors],
    };
  }

  const semanticId =
    typeof input.semanticId === "string" ? input.semanticId.trim() : "";
  if (semanticId.length === 0) {
    return {
      ...base,
      suggestedName: input.suggestedName,
      result: "confirm",
      reasonCodes: ["semantic-id-required-for-key-validation"],
    };
  }

  const withSuggestion = {
    ...base,
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

export function validateNamingPlan({ items, existingNames = [] }) {
  if (!Array.isArray(items)) {
    throw new TypeError("naming-plan-items-must-be-an-array");
  }
  if (!Array.isArray(existingNames)) {
    throw new TypeError("existing-names-must-be-an-array");
  }

  const seenNodeIds = new Set();
  let results = items.map((item) => {
    const result = assessNamingPlanItem(item);
    if (seenNodeIds.has(result.nodeId)) {
      throw new TypeError(`duplicate-node-id: ${result.nodeId}`);
    }
    seenNodeIds.add(result.nodeId);
    return result;
  });

  const claimsByName = new Map();
  for (const [index, item] of results.entries()) {
    const name = suggestedNameOf(item);
    if (typeof name !== "string" || !validateDynamicTextName(name).valid) {
      continue;
    }
    const claims = claimsByName.get(name) ?? [];
    claims.push({ kind: "plan", index, nodeId: item.nodeId, semanticId: item.semanticId });
    claimsByName.set(name, claims);
  }

  for (const entry of existingNames) {
    const nodeId = requireNonEmptyString(entry?.nodeId, "existing-node-id");
    const name = requireNonEmptyString(entry?.name, "existing-name");
    if (!validateDynamicTextName(name).valid || seenNodeIds.has(nodeId)) {
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
