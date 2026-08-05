export const DYNAMIC_PLACEHOLDER_PATTERN =
  /(^|[^A-Za-z0-9])(?:x{2,}|X+)(?=$|[^A-Za-z0-9])/;

export const CANONICAL_NAME_PATTERN =
  /^文案\/[a-z]+(?:-[a-z]+)?\/[a-z]+(?:-[a-z]+)?$/;

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

function addError(errors, code) {
  if (!errors.includes(code)) {
    errors.push(code);
  }
}

export function isDynamicTextCandidate(characters) {
  return (
    typeof characters === "string" &&
    DYNAMIC_PLACEHOLDER_PATTERN.test(characters)
  );
}

export function validateDynamicTextName(name) {
  const errors = [];

  if (typeof name !== "string") {
    return { valid: false, errors: ["name-must-be-string"] };
  }

  if (!name.startsWith("文案/")) {
    addError(errors, "missing-fixed-prefix");
  }

  if ((name.match(/\//g) ?? []).length !== 2) {
    addError(errors, "slash-count-must-be-two");
  }

  if (name.includes("_")) {
    addError(errors, "underscore-not-allowed");
  }

  if (/[a-z][A-Z]/.test(name)) {
    addError(errors, "camel-case-not-allowed");
  }

  if (/[A-Z]/.test(name)) {
    addError(errors, "uppercase-not-allowed");
  }

  if (/\d/.test(name)) {
    addError(errors, "meaningless-number-not-allowed");
  }

  const [prefix, businessDomain, semanticKey, ...extraParts] = name.split("/");

  if (prefix !== "文案") {
    addError(errors, "missing-fixed-prefix");
  }

  if (!/^[a-z]+(?:-[a-z]+)?$/.test(businessDomain ?? "")) {
    addError(errors, "business-domain-must-be-one-or-two-lowercase-words");
  } else if (
    businessDomain
      .split("-")
      .some((word) => WEAK_BUSINESS_DOMAINS.has(word))
  ) {
    addError(errors, "weak-business-domain-not-allowed");
  }

  if (
    extraParts.length > 0 ||
    !/^[a-z]+(?:-[a-z]+)?$/.test(semanticKey ?? "")
  ) {
    addError(errors, "semantic-key-must-be-one-or-two-lowercase-words");
  } else if (
    semanticKey.split("-").some((word) => WEAK_SEMANTIC_WORDS.has(word))
  ) {
    addError(errors, "weak-semantic-key-not-allowed");
  }

  if (!CANONICAL_NAME_PATTERN.test(name)) {
    addError(errors, "canonical-format-mismatch");
  }

  return {
    valid: errors.length === 0,
    errors,
    ...(errors.length === 0
      ? { businessDomain, semanticKey }
      : {}),
  };
}

export function toPageCenterKey(name) {
  const validation = validateDynamicTextName(name);
  if (!validation.valid) {
    throw new TypeError(`invalid-dynamic-text-name: ${name}`);
  }

  return name.slice("文案/".length);
}

export function findPageCenterKeyConflicts(entries) {
  if (!Array.isArray(entries)) {
    throw new TypeError("pc-entries-must-be-an-array");
  }

  const htmlByKey = new Map();
  const conflictKeys = new Set();

  for (const entry of entries) {
    const key = toPageCenterKey(entry?.name);
    if (typeof entry?.html !== "string") {
      throw new TypeError(`pc-html-must-be-a-string: ${key}`);
    }

    const existingHtml = htmlByKey.get(key);
    if (existingHtml !== undefined && existingHtml !== entry.html) {
      conflictKeys.add(key);
    } else if (existingHtml === undefined) {
      htmlByKey.set(key, entry.html);
    }
  }

  return [...conflictKeys].sort();
}

function contextChecks(input) {
  const checks = {
    sectionBoundary: input.sectionBoundaryVerified === true,
    businessDomain: input.businessDomainVerified === true,
    semanticKey: input.semanticKeyVerified === true,
    conflict: input.conflictFree === true,
  };

  return {
    checks,
    complete: Object.values(checks).every(Boolean),
  };
}

export function assessDynamicText(input) {
  if (!isDynamicTextCandidate(input.characters)) {
    return { result: "skip", reasonCodes: ["characters-not-candidate"] };
  }

  if (input.evidenceSufficient !== true) {
    return { result: "confirm", reasonCodes: ["insufficient-evidence"] };
  }

  const { checks, complete } = contextChecks(input);
  if (!complete) {
    const failedChecks = Object.entries(checks)
      .filter(([, passed]) => !passed)
      .map(([check]) => `${check}-not-verified`);
    return { result: "confirm", reasonCodes: failedChecks };
  }

  const currentValidation = validateDynamicTextName(input.currentName ?? "");
  const sharedName = input.sameBusinessFieldName;

  if (sharedName !== undefined) {
    const sharedValidation = validateDynamicTextName(sharedName);
    if (!sharedValidation.valid) {
      return {
        result: "confirm",
        reasonCodes: ["shared-field-name-invalid", ...sharedValidation.errors],
      };
    }

    if (input.pcUploadRequested === true) {
      if (typeof input.pcHtmlEquivalent !== "boolean") {
        return {
          result: "confirm",
          reasonCodes: ["pc-html-equivalence-not-verified"],
        };
      }

      if (input.pcHtmlEquivalent === false) {
        const variantName = input.presentationVariantName;
        if (typeof variantName !== "string" || variantName === sharedName) {
          return {
            result: "confirm",
            reasonCodes: ["distinct-pc-html-requires-stable-context-name"],
          };
        }

        const variantValidation = validateDynamicTextName(variantName ?? "");
        if (!variantValidation.valid) {
          return {
            result: "confirm",
            reasonCodes: [
              "distinct-pc-html-requires-stable-context-name",
              ...variantValidation.errors,
            ],
          };
        }

        if (currentValidation.valid && input.currentName === variantName) {
          return { result: "keep", name: variantName, reasonCodes: [] };
        }

        return { result: "rename", name: variantName, reasonCodes: [] };
      }
    }

    if (currentValidation.valid && input.currentName === sharedName) {
      return { result: "keep", name: sharedName, reasonCodes: [] };
    }

    return { result: "rename", name: sharedName, reasonCodes: [] };
  }

  if (currentValidation.valid) {
    return { result: "keep", name: input.currentName, reasonCodes: [] };
  }

  const proposedValidation = validateDynamicTextName(input.proposedName ?? "");
  if (proposedValidation.valid) {
    return { result: "rename", name: input.proposedName, reasonCodes: [] };
  }

  return {
    result: "confirm",
    reasonCodes: ["no-valid-proposed-name", ...proposedValidation.errors],
  };
}
