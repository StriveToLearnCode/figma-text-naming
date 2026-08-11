export const DYNAMIC_PLACEHOLDER_PATTERN =
  /(^|[^A-Za-z0-9])(?:x{2,}|X+)(?=$|[^A-Za-z0-9])/;

export const CANONICAL_NAME_PATTERN =
  /^文案\/[a-z]+(?:-[a-z]+)?\/[a-z]+(?:-[a-z]+)?$/;

export const SLICE_COMPARISON_STATUS = Object.freeze({
  NOT_AVAILABLE: "not-available",
  VERIFIED_DIFFERENCE: "verified-difference",
  VERIFIED_BAKED: "verified-baked",
  UNVERIFIED: "unverified",
});

const SLICE_COMPARISON_STATUSES = new Set(
  Object.values(SLICE_COMPARISON_STATUS),
);

/** 只判断占位符信号，不能单独用作完整候选池过滤器。 */
export function hasDynamicPlaceholder(characters) {
  return (
    typeof characters === "string" &&
    DYNAMIC_PLACEHOLDER_PATTERN.test(characters)
  );
}

/**
 * 合并占位符和预览图/切图差异两类候选信号。
 * 切图比较由 Figma 流程按区域完成，本函数只消费已经核实的比较状态。
 */
export function assessDynamicTextCandidate(input) {
  if (typeof input?.characters !== "string") {
    return {
      assessed: false,
      result: "unassessed",
      sources: [],
      reasonCodes: ["text-characters-must-be-a-string"],
    };
  }

  const status = input.sliceComparisonStatus;
  if (!SLICE_COMPARISON_STATUSES.has(status)) {
    return {
      assessed: false,
      result: "unassessed",
      sources: [],
      reasonCodes: ["slice-comparison-status-required"],
    };
  }

  const placeholderMatched = hasDynamicPlaceholder(input.characters);

  if (status === SLICE_COMPARISON_STATUS.UNVERIFIED) {
    return {
      assessed: true,
      result: "confirm",
      sources: placeholderMatched ? ["placeholder"] : [],
      reasonCodes: ["slice-comparison-not-verified"],
    };
  }

  if (status === SLICE_COMPARISON_STATUS.VERIFIED_BAKED) {
    return {
      assessed: true,
      result: "skip",
      sources: [],
      reasonCodes: ["text-baked-in-slice"],
    };
  }

  const sources = [];
  if (placeholderMatched) {
    sources.push("placeholder");
  }
  if (status === SLICE_COMPARISON_STATUS.VERIFIED_DIFFERENCE) {
    sources.push("preview-slice-difference");
  }

  if (sources.length > 0) {
    return { assessed: true, result: "candidate", sources, reasonCodes: [] };
  }

  return {
    assessed: true,
    result: "skip",
    sources: [],
    reasonCodes: ["no-dynamic-text-evidence"],
  };
}

/**
 * 审计扫描账本是否逐项完成候选评估。
 * 写入回读不能替代本审计；存在 unassessed 时不得冻结 naming plan。
 */
export function auditDynamicTextCandidateCoverage(entries) {
  if (!Array.isArray(entries)) {
    throw new TypeError("text-entries-must-be-an-array");
  }

  const assessments = entries.map(assessDynamicTextCandidate);
  const uncoveredIndexes = assessments.flatMap((assessment, index) =>
    assessment.assessed ? [] : [index],
  );

  return {
    complete: uncoveredIndexes.length === 0,
    uncoveredIndexes,
    assessments,
  };
}

/**
 * 按逐字相同的 characters 聚合重复文本。
 * 返回原数组索引，避免复制 Figma 节点数据并保留调用方的节点映射。
 */
export function findDuplicateTextGroups(entries) {
  const groups = new Map();

  entries.forEach((entry, index) => {
    if (typeof entry?.characters !== "string") {
      throw new TypeError(`text-characters-must-be-a-string: ${index}`);
    }

    const indexes = groups.get(entry.characters) ?? [];
    indexes.push(index);
    groups.set(entry.characters, indexes);
  });

  return [...groups.entries()]
    .filter(([, indexes]) => indexes.length > 1)
    .map(([characters, indexes]) => ({ characters, indexes }));
}

/** 只校验名称结构；业务域和字段语义由命名规则结合 Figma 上下文复核。 */
export function validateDynamicTextName(name) {
  if (typeof name !== "string") {
    return { valid: false, errors: ["name-must-be-string"] };
  }

  if (!CANONICAL_NAME_PATTERN.test(name)) {
    return { valid: false, errors: ["canonical-format-mismatch"] };
  }

  const [, businessDomain, semanticKey] = name.split("/");

  return {
    valid: true,
    errors: [],
    businessDomain,
    semanticKey,
  };
}

/**
 * 找出映射到多个 HTML 的 Page Center Key。
 * 同一 Key 重复出现是合法的，前提是每次对应的 HTML 完全相同。
 */
export function findPageCenterKeyConflicts(entries) {
  const htmlByKey = new Map();
  const conflicts = new Set();

  for (const entry of entries) {
    if (typeof entry?.name !== "string") {
      throw new TypeError("pc-name-must-be-a-string");
    }

    // 名称来自已冻结且已完成唯一值校验的 naming plan。
    const key = entry.name.slice("文案/".length);

    if (typeof entry.html !== "string") {
      throw new TypeError(`pc-html-must-be-a-string: ${key}`);
    }

    const previous = htmlByKey.get(key);

    if (previous === undefined) {
      htmlByKey.set(key, entry.html);
    } else if (previous !== entry.html) {
      conflicts.add(key);
    }
  }

  return [...conflicts].sort();
}
