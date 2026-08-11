export const DYNAMIC_PLACEHOLDER_PATTERN =
  /(^|[^A-Za-z0-9])(?:x{2,}|X+)(?=$|[^A-Za-z0-9])/;

export const CANONICAL_NAME_PATTERN =
  /^文案\/[a-z]+(?:-[a-z]+)?\/[a-z]+(?:-[a-z]+)?$/;

export const SEMANTIC_ASSESSMENT = Object.freeze({
  DYNAMIC: "dynamic",
  STATIC: "static",
  CONFIRM: "confirm",
});

const SEMANTIC_ASSESSMENTS = new Set(Object.values(SEMANTIC_ASSESSMENT));

export const SLICE_COMPARISON_STATUS = Object.freeze({
  NOT_AVAILABLE: "not-available",
  VERIFIED_DIFFERENCE: "verified-difference",
  VERIFIED_BAKED: "verified-baked",
  UNVERIFIED: "unverified",
});

const SLICE_COMPARISON_STATUSES = new Set(
  Object.values(SLICE_COMPARISON_STATUS),
);

/** 只判断占位符信号；调用方必须对完整扫描账本执行本函数。 */
export function hasDynamicPlaceholder(characters) {
  return (
    typeof characters === "string" &&
    DYNAMIC_PLACEHOLDER_PATTERN.test(characters)
  );
}

/**
 * 对完整扫描账本执行 placeholder scan，不裁剪非命中节点。
 * placeholder 是硬信号，命中节点无需进入 AI semantic assessment。
 */
export function applyPlaceholderScan(entries) {
  if (!Array.isArray(entries)) {
    throw new TypeError("text-entries-must-be-an-array");
  }

  return entries.map((entry, index) => {
    if (typeof entry?.characters !== "string") {
      throw new TypeError(`text-characters-must-be-a-string: ${index}`);
    }

    if (!hasDynamicPlaceholder(entry.characters)) {
      return { ...entry };
    }

    return {
      ...entry,
      semanticAssessment: SEMANTIC_ASSESSMENT.DYNAMIC,
      semanticAssessmentSource: "placeholder",
    };
  });
}

/**
 * 一次合并一批 AI semantic assessment。缺失项保持未判断，由 coverage audit 拦截。
 */
export function applyBatchSemanticAssessments(entries, assessments) {
  if (!Array.isArray(entries) || !Array.isArray(assessments)) {
    throw new TypeError("entries-and-assessments-must-be-arrays");
  }

  const assessmentByNodeId = new Map();
  for (const assessment of assessments) {
    const nodeId = assessment?.nodeId;
    const value = assessment?.semanticAssessment;

    if (typeof nodeId !== "string" || nodeId.length === 0) {
      throw new TypeError("assessment-node-id-required");
    }
    if (!SEMANTIC_ASSESSMENTS.has(value)) {
      throw new TypeError(`invalid-semantic-assessment: ${nodeId}`);
    }
    if (assessmentByNodeId.has(nodeId)) {
      throw new TypeError(`duplicate-semantic-assessment: ${nodeId}`);
    }

    assessmentByNodeId.set(nodeId, value);
  }

  const knownNodeIds = new Set(entries.map((entry) => entry?.nodeId));
  for (const nodeId of assessmentByNodeId.keys()) {
    if (!knownNodeIds.has(nodeId)) {
      throw new TypeError(`unknown-assessment-node-id: ${nodeId}`);
    }
  }

  return entries.map((entry, index) => {
    if (typeof entry?.nodeId !== "string" || entry.nodeId.length === 0) {
      throw new TypeError(`text-node-id-required: ${index}`);
    }
    if (typeof entry.characters !== "string") {
      throw new TypeError(`text-characters-must-be-a-string: ${index}`);
    }

    const value = assessmentByNodeId.get(entry.nodeId);
    if (hasDynamicPlaceholder(entry.characters)) {
      if (value !== undefined) {
        throw new TypeError(`placeholder-node-must-not-be-ai-assessed: ${entry.nodeId}`);
      }
      return {
        ...entry,
        semanticAssessment: SEMANTIC_ASSESSMENT.DYNAMIC,
        semanticAssessmentSource: "placeholder",
      };
    }

    if (value === undefined) {
      return { ...entry };
    }

    return {
      ...entry,
      semanticAssessment: value,
      semanticAssessmentSource: "ai",
    };
  });
}

/** 将账本三态映射为候选阶段结果；切图状态不是必填项或成立条件。 */
export function assessDynamicTextCandidate(input) {
  const validNodeId = typeof input?.nodeId === "string" && input.nodeId.length > 0;
  const validCharacters = typeof input?.characters === "string";
  const semanticAssessment = input?.semanticAssessment;

  if (!validNodeId || !validCharacters || !SEMANTIC_ASSESSMENTS.has(semanticAssessment)) {
    return {
      assessed: false,
      result: "unassessed",
      semanticAssessment: null,
      reasonCodes: ["semantic-assessment-required"],
    };
  }

  if (
    hasDynamicPlaceholder(input.characters) &&
    semanticAssessment !== SEMANTIC_ASSESSMENT.DYNAMIC
  ) {
    return {
      assessed: false,
      result: "unassessed",
      semanticAssessment: null,
      reasonCodes: ["placeholder-must-be-dynamic"],
    };
  }

  if (semanticAssessment === SEMANTIC_ASSESSMENT.DYNAMIC) {
    return {
      assessed: true,
      result: "candidate",
      semanticAssessment,
      reasonCodes: [],
    };
  }

  return {
    assessed: true,
    result:
      semanticAssessment === SEMANTIC_ASSESSMENT.STATIC ? "skip" : "confirm",
    semanticAssessment,
    reasonCodes: [],
  };
}

/**
 * Coverage 只检查完整账本是否都有 nodeId、characters 和三态语义判断。
 * 它不判断名称；不完整时不得冻结候选或 naming plan，也不得写入或上传。
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
    uncoveredNodeIds: uncoveredIndexes.map(
      (index) => entries[index]?.nodeId ?? null,
    ),
    assessments,
  };
}

/** Coverage 完成后一次冻结候选；后续只有 dynamic 节点进入命名。 */
export function freezeDynamicTextCandidates(entries) {
  const coverage = auditDynamicTextCandidateCoverage(entries);
  if (!coverage.complete) {
    throw new Error("semantic-coverage-incomplete");
  }

  const outcomes = coverage.assessments.map((assessment, index) =>
    Object.freeze({
      nodeId: entries[index].nodeId,
      characters: entries[index].characters,
      semanticAssessment: assessment.semanticAssessment,
      result: assessment.result,
    }),
  );

  return Object.freeze({
    outcomes: Object.freeze(outcomes),
    candidates: Object.freeze(
      outcomes.filter((outcome) => outcome.semanticAssessment === "dynamic"),
    ),
  });
}

/**
 * 旧切图实验的独立兼容 helper。主候选流程不默认调用，也不要求 slice status。
 * 仅当现成切图关系明确时，可消费其结果作为“文字已烘焙”的反证。
 */
export function assessLegacySliceEvidence(input) {
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

/** 旧切图 coverage 仅供显式 A/B；不得替代主流程的语义 Coverage Audit。 */
export function auditLegacySliceCandidateCoverage(entries) {
  if (!Array.isArray(entries)) {
    throw new TypeError("text-entries-must-be-an-array");
  }

  const assessments = entries.map(assessLegacySliceEvidence);
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
