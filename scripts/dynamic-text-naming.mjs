export const TEXT_PLACEHOLDER_PATTERN =
  /(^|[^A-Za-z0-9])(?:x{2,}|X+)(?=$|[^A-Za-z0-9])/;

export const CANONICAL_NAME_PATTERN =
  /^文案\/[a-z]+(?:-[a-z]+)?\/[a-z]+(?:-[a-z]+)?$/;

export const PREVIEW_SCOPE_PREFIXES = Object.freeze([
  "预览页/",
  "预览图/",
]);

export const PREVIEW_SCOPE_DISCOVERY_FIELDS = Object.freeze([
  "id",
  "name",
  "type",
]);

export const PREVIEW_TEXT_INDEX_FIELDS = Object.freeze([
  "id",
  "type",
  "characters",
  "name",
  "ancestorPath",
  "componentPath",
  "variableBinding",
]);

export const TARGETED_CONTEXT_FIELDS = Object.freeze([
  "siblings",
  "nearbyTexts",
  "regionScreenshot",
]);

export const DEFERRED_RICH_TEXT_FIELDS = Object.freeze([
  "styledTextSegments",
  "html",
]);

export const STRUCTURAL_ASSESSMENT = Object.freeze({
  ELIGIBLE: "eligible",
  VISUAL_FRAGMENT: "visual-fragment",
  REPEATED_ENTITY_FIELD: "repeated-entity-field",
  CONFIRM: "confirm",
});

export const TEXT_KEY_DECISION = Object.freeze({
  NAME: "name",
  SKIP: "skip",
  CONFIRM: "confirm",
});

export const KEY_SIGNAL_TYPE = Object.freeze({
  PLACEHOLDER: "placeholder",
  SAME_SLOT_DIFFERENT_COPY: "same-slot-different-copy",
  FIGMA_BINDING: "figma-binding",
});

const STRUCTURAL_ASSESSMENTS = new Set(Object.values(STRUCTURAL_ASSESSMENT));
const STRUCTURALLY_SKIPPED = new Set([
  STRUCTURAL_ASSESSMENT.VISUAL_FRAGMENT,
  STRUCTURAL_ASSESSMENT.REPEATED_ENTITY_FIELD,
]);
const TEXT_KEY_DECISIONS = new Set(Object.values(TEXT_KEY_DECISION));
const NON_LEDGER_SCOPE_TYPES = new Set(["DOCUMENT", "PAGE"]);
const FIGMA_BINDING_PATH_PATTERN =
  /^(?:variableBinding|boundVariables(?:\.characters)?|componentProperties\.[^\n]+)$/;

function assertPath(path, label) {
  if (!Array.isArray(path)) {
    throw new TypeError(`${label}-must-be-an-array`);
  }
  path.forEach((node, index) => assertStructuralNode(node, `${label}-${index}`));
}

function hasVariableBinding(binding) {
  if (binding === null || binding === undefined) {
    return false;
  }
  if (typeof binding === "string") {
    return binding.length > 0;
  }
  return typeof binding === "object" && Object.keys(binding).length > 0;
}

function pathSignature(path, stableComponentIds = false) {
  return path.map((node) => [
    node.type,
    node.name,
    node.componentId ??
      node.mainComponentId ??
      (stableComponentIds && node.type === "COMPONENT" ? node.id : null),
  ]);
}

function copyPathNode(node) {
  return {
    id: node.id,
    name: node.name,
    type: node.type,
    ...(typeof node.componentId === "string" ? { componentId: node.componentId } : {}),
    ...(typeof node.mainComponentId === "string"
      ? { mainComponentId: node.mainComponentId }
      : {}),
  };
}

function textStructureSignature(entry) {
  if (!Array.isArray(entry.componentPath) || entry.componentPath.length === 0) {
    return null;
  }
  const ancestorPath = entry.ancestorPath ?? [];
  const componentRootIndex = ancestorPath.findLastIndex((node) =>
    ["COMPONENT", "INSTANCE"].includes(node.type),
  );
  const relativeAncestorPath =
    componentRootIndex === -1
      ? ancestorPath
      : ancestorPath.slice(componentRootIndex);
  return JSON.stringify([
    pathSignature(entry.componentPath, true),
    pathSignature(relativeAncestorPath),
    entry.name,
  ]);
}

function assertStructuralNode(node, label) {
  if (typeof node?.id !== "string" || node.id.length === 0) {
    throw new TypeError(`${label}-id-required`);
  }
  if (typeof node.name !== "string") {
    throw new TypeError(`${label}-name-must-be-a-string: ${node.id}`);
  }
  if (typeof node.type !== "string" || node.type.length === 0) {
    throw new TypeError(`${label}-type-required: ${node.id}`);
  }
}

function indexEntries(entries) {
  if (!Array.isArray(entries)) {
    throw new TypeError("text-entries-must-be-an-array");
  }

  const entryByNodeId = new Map();
  entries.forEach((entry, index) => {
    if (typeof entry?.nodeId !== "string" || entry.nodeId.length === 0) {
      throw new TypeError(`text-node-id-required: ${index}`);
    }
    if (typeof entry.characters !== "string") {
      throw new TypeError(`text-characters-must-be-a-string: ${index}`);
    }
    if (entryByNodeId.has(entry.nodeId)) {
      throw new TypeError(`duplicate-text-node-id: ${entry.nodeId}`);
    }
    entryByNodeId.set(entry.nodeId, entry);
  });
  return entryByNodeId;
}

export function isPreviewScopeName(name) {
  return (
    typeof name === "string" &&
    PREVIEW_SCOPE_PREFIXES.some((prefix) => name.startsWith(prefix))
  );
}

/** The first pass only locates preview scopes from shallow structure metadata. */
export function planPreviewScopeDiscovery(inputNode) {
  assertStructuralNode(inputNode, "input-node");

  return Object.freeze({
    phase: "locate-preview-scopes",
    rootNodeId: inputNode.id,
    traversal: "shallow",
    requestedFields: PREVIEW_SCOPE_DISCOVERY_FIELDS,
    localNamePrefixes: PREVIEW_SCOPE_PREFIXES,
    allowTextEnumeration: false,
  });
}

/** Local fallback for Figma selectors that cannot match Chinese prefixes. */
export function findPreviewScopeCandidates(shallowNodes) {
  if (!Array.isArray(shallowNodes)) {
    throw new TypeError("shallow-nodes-must-be-an-array");
  }

  const seenNodeIds = new Set();
  return shallowNodes.flatMap((node, index) => {
    assertStructuralNode(node, `shallow-node-${index}`);
    if (!isPreviewScopeName(node.name) || seenNodeIds.has(node.id)) {
      return [];
    }
    seenNodeIds.add(node.id);
    return [{ id: node.id, name: node.name, type: node.type }];
  });
}

/** One lightweight recursive Text read per frozen preview scope, never fixed-size slices. */
export function planPreviewTextIndexReads(previewScopes) {
  if (!Array.isArray(previewScopes) || previewScopes.length === 0) {
    throw new TypeError("preview-scopes-must-be-a-non-empty-array");
  }
  const seenNodeIds = new Set();
  const requests = previewScopes.map((scope, index) => {
    assertStructuralNode(scope, `preview-scope-${index}`);
    if (!isPreviewScopeName(scope.name)) {
      throw new TypeError(`non-preview-scope-cannot-read-index: ${scope.id}`);
    }
    if (seenNodeIds.has(scope.id)) {
      throw new TypeError(`duplicate-preview-scope: ${scope.id}`);
    }
    seenNodeIds.add(scope.id);
    return Object.freeze({
      scopeNodeId: scope.id,
      selector: "TEXT",
      traversal: "recursive",
      requestedFields: PREVIEW_TEXT_INDEX_FIELDS,
    });
  });

  return Object.freeze({
    phase: "read-light-text-index",
    requests: Object.freeze(requests),
    maxFigmaCalls: requests.length,
    fixedTextChunkSize: null,
    allowFixedTextChunking: false,
    forbiddenFields: DEFERRED_RICH_TEXT_FIELDS,
    transport: "tool-result-or-json-file-or-stdin",
  });
}

/** Build a ledger from a strict light-index whitelist; heavy fields are never retained. */
export function buildPreviewTextLedger(scopeBatches) {
  if (!Array.isArray(scopeBatches)) {
    throw new TypeError("preview-scope-batches-must-be-an-array");
  }

  const ledger = [];
  const seenTextNodeIds = new Set();

  scopeBatches.forEach((batch, batchIndex) => {
    assertStructuralNode(batch?.scope, `preview-scope-${batchIndex}`);
    if (NON_LEDGER_SCOPE_TYPES.has(batch.scope.type)) {
      throw new TypeError(`whole-page-cannot-build-ledger: ${batch.scope.id}`);
    }
    if (!isPreviewScopeName(batch.scope.name)) {
      throw new TypeError(`non-preview-scope-cannot-build-ledger: ${batch.scope.id}`);
    }
    if (!Array.isArray(batch.texts)) {
      throw new TypeError(`preview-scope-texts-must-be-an-array: ${batch.scope.id}`);
    }

    batch.texts.forEach((node, textIndex) => {
      if (node?.type !== "TEXT") {
        throw new TypeError(
          `preview-ledger-node-must-be-text: ${batch.scope.id}:${textIndex}`,
        );
      }
      if (typeof node.id !== "string" || node.id.length === 0) {
        throw new TypeError(`text-node-id-required: ${batch.scope.id}:${textIndex}`);
      }
      if (typeof node.characters !== "string") {
        throw new TypeError(
          `text-characters-must-be-a-string: ${batch.scope.id}:${textIndex}`,
        );
      }
      if (typeof node.name !== "string") {
        throw new TypeError(
          `text-name-must-be-a-string: ${batch.scope.id}:${textIndex}`,
        );
      }
      assertPath(node.ancestorPath, `text-ancestor-path-${node.id}`);
      assertPath(node.componentPath, `text-component-path-${node.id}`);
      if (seenTextNodeIds.has(node.id)) {
        return;
      }

      seenTextNodeIds.add(node.id);
      ledger.push({
        nodeId: node.id,
        id: node.id,
        type: node.type,
        characters: node.characters,
        name: node.name,
        ancestorPath: node.ancestorPath.map(copyPathNode),
        componentPath: node.componentPath.map(copyPathNode),
        variableBinding:
          node.variableBinding === undefined || node.variableBinding === null
            ? null
            : structuredClone(node.variableBinding),
        previewScopeNodeId: batch.scope.id,
      });
    });
  });

  return ledger;
}

export function hasTextPlaceholder(characters) {
  return (
    typeof characters === "string" &&
    TEXT_PLACEHOLDER_PATTERN.test(characters)
  );
}

/** Apply one structural assessment per Text without making copy-key decisions. */
export function applyBatchStructuralAssessments(entries, assessments) {
  if (!Array.isArray(assessments)) {
    throw new TypeError("structural-assessments-must-be-an-array");
  }
  const entryByNodeId = indexEntries(entries);
  const assessmentByNodeId = new Map();

  for (const assessment of assessments) {
    const nodeId = assessment?.nodeId;
    const value = assessment?.structuralAssessment;
    if (typeof nodeId !== "string" || nodeId.length === 0) {
      throw new TypeError("assessment-node-id-required");
    }
    if (!STRUCTURAL_ASSESSMENTS.has(value)) {
      throw new TypeError(`invalid-structural-assessment: ${nodeId}`);
    }
    if (!entryByNodeId.has(nodeId)) {
      throw new TypeError(`unknown-assessment-node-id: ${nodeId}`);
    }
    if (assessmentByNodeId.has(nodeId)) {
      throw new TypeError(`duplicate-structural-assessment: ${nodeId}`);
    }
    assessmentByNodeId.set(nodeId, value);
  }

  return entries.map((entry) => {
    const value = assessmentByNodeId.get(entry.nodeId);
    return value === undefined
      ? { ...entry }
      : {
          ...entry,
          structuralAssessment: value,
          structuralAssessmentSource: "batch-structure",
        };
  });
}

/** Apply one structural skip to every matching field in an isomorphic item group. */
export function applyGroupStructuralAssessments(entries, groupAssessments) {
  if (!Array.isArray(groupAssessments)) {
    throw new TypeError("group-assessments-must-be-an-array");
  }
  const entryByNodeId = indexEntries(entries);
  const groupByNodeId = new Map();

  for (const group of groupAssessments) {
    if (typeof group?.groupId !== "string" || group.groupId.length === 0) {
      throw new TypeError("structural-group-id-required");
    }
    if (!STRUCTURALLY_SKIPPED.has(group.structuralAssessment)) {
      throw new TypeError(`invalid-group-structural-assessment: ${group.groupId}`);
    }
    if (!Array.isArray(group.memberNodeIds) || group.memberNodeIds.length === 0) {
      throw new TypeError(`structural-group-members-required: ${group.groupId}`);
    }

    for (const nodeId of group.memberNodeIds) {
      if (!entryByNodeId.has(nodeId)) {
        throw new TypeError(`unknown-group-member-node-id: ${nodeId}`);
      }
      if (groupByNodeId.has(nodeId)) {
        throw new TypeError(`duplicate-group-member-node-id: ${nodeId}`);
      }
      groupByNodeId.set(nodeId, group);
    }
  }

  return entries.map((entry) => {
    const group = groupByNodeId.get(entry.nodeId);
    return group === undefined
      ? { ...entry }
      : {
          ...entry,
          structuralAssessment: group.structuralAssessment,
          structuralAssessmentSource: "group-structure",
          structuralGroupId: group.groupId,
        };
  });
}

/** Group identical Text slots from the same Component structure for one-time analysis. */
export function buildStructureReuseGroups(entries) {
  indexEntries(entries);
  const membersBySignature = new Map();
  for (const entry of entries) {
    if (
      entry.structuralAssessment !== STRUCTURAL_ASSESSMENT.ELIGIBLE ||
      TEXT_KEY_DECISIONS.has(entry.keyDecision)
    ) {
      continue;
    }
    const signature = textStructureSignature(entry);
    if (signature === null) {
      continue;
    }
    const members = membersBySignature.get(signature) ?? [];
    members.push(entry.nodeId);
    membersBySignature.set(signature, members);
  }

  let groupIndex = 0;
  return [...membersBySignature.entries()].flatMap(([structureKey, memberNodeIds]) => {
    if (memberNodeIds.length < 2) {
      return [];
    }
    groupIndex += 1;
    return [
      Object.freeze({
        groupId: `component-structure-${groupIndex}`,
        structureKey,
        representativeNodeId: memberNodeIds[0],
        memberNodeIds: Object.freeze([...memberNodeIds]),
      }),
    ];
  });
}

/** Annotate placeholder evidence after structural exclusion. */
export function applyPlaceholderSignals(entries) {
  indexEntries(entries);
  return entries.map((entry, index) => {
    if (!STRUCTURAL_ASSESSMENTS.has(entry.structuralAssessment)) {
      throw new TypeError(`structural-assessment-required: ${index}`);
    }
    if (
      entry.structuralAssessment !== STRUCTURAL_ASSESSMENT.ELIGIBLE ||
      !hasTextPlaceholder(entry.characters)
    ) {
      return { ...entry };
    }

    return {
      ...entry,
      keySignals: [
        ...(entry.keySignals ?? []),
        { type: KEY_SIGNAL_TYPE.PLACEHOLDER, nodeId: entry.nodeId },
      ],
    };
  });
}

/** Derive strong signals available directly in the lightweight Text index. */
export function applyLightIndexSignals(entries) {
  const withPlaceholders = applyPlaceholderSignals(entries);
  return withPlaceholders.map((entry) => {
    if (
      entry.structuralAssessment !== STRUCTURAL_ASSESSMENT.ELIGIBLE ||
      !hasVariableBinding(entry.variableBinding)
    ) {
      return { ...entry };
    }
    const signal = {
      type: KEY_SIGNAL_TYPE.FIGMA_BINDING,
      nodeId: entry.nodeId,
      bindingPath: "variableBinding",
      bindingValue: entry.variableBinding,
    };
    return {
      ...entry,
      keySignals: [...(entry.keySignals ?? []), signal],
    };
  });
}

function validSameSlotSignal(signal, targetNodeId, targetCharacters) {
  if (
    typeof signal?.slotIdentity !== "string" ||
    signal.slotIdentity.length === 0 ||
    !Array.isArray(signal.occurrences) ||
    signal.occurrences.length < 2
  ) {
    return false;
  }

  const contexts = new Set();
  const copies = new Set();
  let includesTarget = false;
  for (const occurrence of signal.occurrences) {
    if (
      typeof occurrence?.nodeId !== "string" ||
      typeof occurrence.contextNodeId !== "string" ||
      typeof occurrence.characters !== "string"
    ) {
      return false;
    }
    contexts.add(occurrence.contextNodeId);
    copies.add(occurrence.characters);
    includesTarget ||=
      occurrence.nodeId === targetNodeId &&
      occurrence.characters === targetCharacters;
  }
  return includesTarget && contexts.size >= 2 && copies.size >= 2;
}

function validKeySignal(signal, entry) {
  if (signal?.type === KEY_SIGNAL_TYPE.PLACEHOLDER) {
    return signal.nodeId === entry.nodeId && hasTextPlaceholder(entry.characters);
  }
  if (signal?.type === KEY_SIGNAL_TYPE.SAME_SLOT_DIFFERENT_COPY) {
    return validSameSlotSignal(signal, entry.nodeId, entry.characters);
  }
  if (signal?.type === KEY_SIGNAL_TYPE.FIGMA_BINDING) {
    return (
      signal.nodeId === entry.nodeId &&
      typeof signal.bindingPath === "string" &&
      FIGMA_BINDING_PATH_PATTERN.test(signal.bindingPath) &&
      hasVariableBinding(signal.bindingValue)
    );
  }
  return false;
}

/** Merge validated Figma signals for a batch. */
export function applyBatchKeySignals(entries, signalAssessments) {
  if (!Array.isArray(signalAssessments)) {
    throw new TypeError("signal-assessments-must-be-an-array");
  }
  const entryByNodeId = indexEntries(entries);
  const signalsByNodeId = new Map();

  for (const assessment of signalAssessments) {
    const nodeId = assessment?.nodeId;
    const entry = entryByNodeId.get(nodeId);
    if (entry === undefined) {
      throw new TypeError(`unknown-signal-node-id: ${nodeId}`);
    }
    if (entry.structuralAssessment !== STRUCTURAL_ASSESSMENT.ELIGIBLE) {
      throw new TypeError(`structurally-skipped-node-must-not-receive-signals: ${nodeId}`);
    }
    if (!Array.isArray(assessment.keySignals) || assessment.keySignals.length === 0) {
      throw new TypeError(`key-signals-required: ${nodeId}`);
    }
    if (!assessment.keySignals.every((signal) => validKeySignal(signal, entry))) {
      throw new TypeError(`invalid-key-signal: ${nodeId}`);
    }
    if (signalsByNodeId.has(nodeId)) {
      throw new TypeError(`duplicate-signal-assessment: ${nodeId}`);
    }
    signalsByNodeId.set(nodeId, assessment.keySignals);
  }

  return entries.map((entry) => {
    const signals = signalsByNodeId.get(entry.nodeId);
    return signals === undefined
      ? { ...entry }
      : { ...entry, keySignals: [...(entry.keySignals ?? []), ...signals] };
  });
}

/** Strong placeholder, binding or same-slot evidence enters the name candidate set without AI. */
export function applyStrongEvidenceDecisions(entries) {
  indexEntries(entries);
  return entries.map((entry) => {
    if (
      entry.structuralAssessment !== STRUCTURAL_ASSESSMENT.ELIGIBLE ||
      TEXT_KEY_DECISIONS.has(entry.keyDecision) ||
      !Array.isArray(entry.keySignals) ||
      entry.keySignals.length === 0
    ) {
      return { ...entry };
    }
    if (!entry.keySignals.every((signal) => validKeySignal(signal, entry))) {
      throw new TypeError(`invalid-key-signal: ${entry.nodeId}`);
    }
    return {
      ...entry,
      keyDecision: TEXT_KEY_DECISION.NAME,
      keyDecisionReason: "strong-light-index-evidence",
      keyDecisionSource: "strong-evidence",
    };
  });
}

/** Merge targeted decisions only for still-unresolved eligible Text. */
export function applyBatchTextKeyDecisions(entries, decisions) {
  if (!Array.isArray(decisions)) {
    throw new TypeError("text-key-decisions-must-be-an-array");
  }
  const entryByNodeId = indexEntries(entries);
  const decisionByNodeId = new Map();

  for (const decision of decisions) {
    const nodeId = decision?.nodeId;
    const entry = entryByNodeId.get(nodeId);
    if (entry === undefined) {
      throw new TypeError(`unknown-decision-node-id: ${nodeId}`);
    }
    if (entry.structuralAssessment !== STRUCTURAL_ASSESSMENT.ELIGIBLE) {
      throw new TypeError(`structurally-resolved-node-must-not-be-ai-decided: ${nodeId}`);
    }
    if (TEXT_KEY_DECISIONS.has(entry.keyDecision)) {
      throw new TypeError(`text-key-decision-already-resolved: ${nodeId}`);
    }
    if (!TEXT_KEY_DECISIONS.has(decision.keyDecision)) {
      throw new TypeError(`invalid-text-key-decision: ${nodeId}`);
    }
    if (decisionByNodeId.has(nodeId)) {
      throw new TypeError(`duplicate-text-key-decision: ${nodeId}`);
    }
    decisionByNodeId.set(nodeId, decision);
  }

  return entries.map((entry) => {
    const decision = decisionByNodeId.get(entry.nodeId);
    return decision === undefined
      ? { ...entry }
      : {
          ...entry,
          keyDecision: decision.keyDecision,
          keyDecisionReason: decision.reason,
          keyDecisionSource: "targeted-ai",
        };
  });
}

/** Apply one representative decision to every member of an identical Component Text slot. */
export function applyStructureReuseDecisions(entries, groupDecisions) {
  if (!Array.isArray(groupDecisions)) {
    throw new TypeError("structure-group-decisions-must-be-an-array");
  }
  const entryByNodeId = indexEntries(entries);
  const decisionByNodeId = new Map();

  for (const group of groupDecisions) {
    if (typeof group?.groupId !== "string" || group.groupId.length === 0) {
      throw new TypeError("structure-group-id-required");
    }
    if (!TEXT_KEY_DECISIONS.has(group.keyDecision)) {
      throw new TypeError(`invalid-structure-group-decision: ${group.groupId}`);
    }
    if (!Array.isArray(group.memberNodeIds) || group.memberNodeIds.length < 2) {
      throw new TypeError(`structure-group-members-required: ${group.groupId}`);
    }
    if (!group.memberNodeIds.includes(group.representativeNodeId)) {
      throw new TypeError(`structure-group-representative-required: ${group.groupId}`);
    }

    for (const nodeId of group.memberNodeIds) {
      const entry = entryByNodeId.get(nodeId);
      if (entry === undefined) {
        throw new TypeError(`unknown-structure-group-member: ${nodeId}`);
      }
      if (
        entry.structuralAssessment !== STRUCTURAL_ASSESSMENT.ELIGIBLE ||
        TEXT_KEY_DECISIONS.has(entry.keyDecision)
      ) {
        throw new TypeError(`structure-group-member-not-unresolved: ${nodeId}`);
      }
      if (textStructureSignature(entry) !== group.structureKey) {
        throw new TypeError(`structure-group-signature-mismatch: ${nodeId}`);
      }
      if (decisionByNodeId.has(nodeId)) {
        throw new TypeError(`duplicate-structure-group-member: ${nodeId}`);
      }
      decisionByNodeId.set(nodeId, group);
    }
  }

  return entries.map((entry) => {
    const group = decisionByNodeId.get(entry.nodeId);
    if (group === undefined) {
      return { ...entry };
    }
    return {
      ...entry,
      keyDecision: group.keyDecision,
      keyDecisionReason: group.reason,
      keyDecisionSource:
        entry.nodeId === group.representativeNodeId
          ? "targeted-analysis"
          : "component-structure-reuse",
      analysisGroupId: group.groupId,
      analysisRepresentativeNodeId: group.representativeNodeId,
    };
  });
}

/** Plan supplemental reads only for unresolved nodes, once per reusable structure group. */
export function planTargetedContextReads(entries) {
  const entryByNodeId = indexEntries(entries);
  const unresolved = entries.filter(
    (entry) =>
      entry.structuralAssessment === STRUCTURAL_ASSESSMENT.ELIGIBLE &&
      !TEXT_KEY_DECISIONS.has(entry.keyDecision),
  );
  const reuseGroups = buildStructureReuseGroups(entries);
  const groupedNodeIds = new Set(reuseGroups.flatMap((group) => group.memberNodeIds));
  const requests = [
    ...reuseGroups.map((group) => ({
      groupId: group.groupId,
      structureKey: group.structureKey,
      representativeNodeId: group.representativeNodeId,
      memberNodeIds: group.memberNodeIds,
    })),
    ...unresolved
      .filter((entry) => !groupedNodeIds.has(entry.nodeId))
      .map((entry, index) => ({
        groupId: `unresolved-single-${index + 1}`,
        structureKey: textStructureSignature(entry),
        representativeNodeId: entry.nodeId,
        memberNodeIds: Object.freeze([entry.nodeId]),
      })),
  ].map((request) =>
    Object.freeze({
      ...request,
      requestedFields: TARGETED_CONTEXT_FIELDS,
      forbiddenFields: DEFERRED_RICH_TEXT_FIELDS,
    }),
  );

  for (const request of requests) {
    if (!entryByNodeId.has(request.representativeNodeId)) {
      throw new TypeError(`unknown-context-representative: ${request.representativeNodeId}`);
    }
  }

  return Object.freeze({
    phase: "targeted-context-for-unresolved-only",
    unresolvedNodeIds: Object.freeze(unresolved.map(({ nodeId }) => nodeId)),
    aiInputNodeIds: Object.freeze(
      requests.map(({ representativeNodeId }) => representativeNodeId),
    ),
    requests: Object.freeze(requests),
    allowWholeLedgerAi: false,
    allowFixedTextChunking: false,
  });
}

export function assessTextKeyTarget(input) {
  const validBase =
    typeof input?.nodeId === "string" &&
    input.nodeId.length > 0 &&
    typeof input.characters === "string" &&
    STRUCTURAL_ASSESSMENTS.has(input.structuralAssessment);

  if (!validBase) {
    return {
      assessed: false,
      result: "unassessed",
      reasonCodes: ["structural-assessment-required"],
    };
  }
  if (STRUCTURALLY_SKIPPED.has(input.structuralAssessment)) {
    return { assessed: true, result: TEXT_KEY_DECISION.SKIP, reasonCodes: [] };
  }
  if (input.structuralAssessment === STRUCTURAL_ASSESSMENT.CONFIRM) {
    return { assessed: true, result: TEXT_KEY_DECISION.CONFIRM, reasonCodes: [] };
  }
  if (!TEXT_KEY_DECISIONS.has(input.keyDecision)) {
    return {
      assessed: false,
      result: "unassessed",
      reasonCodes: ["text-key-decision-required"],
    };
  }
  if (
    Array.isArray(input.keySignals) &&
    !input.keySignals.every((signal) => validKeySignal(signal, input))
  ) {
    return {
      assessed: false,
      result: "unassessed",
      reasonCodes: ["invalid-key-signal"],
    };
  }
  return { assessed: true, result: input.keyDecision, reasonCodes: [] };
}

/** Audit only ledger coverage; grouped structural skips remain terminal. */
export function auditTextKeyCoverage(entries) {
  if (!Array.isArray(entries)) {
    throw new TypeError("text-entries-must-be-an-array");
  }
  const assessments = entries.map(assessTextKeyTarget);
  const uncoveredIndexes = assessments.flatMap((assessment, index) =>
    assessment.assessed ? [] : [index],
  );
  return {
    complete: uncoveredIndexes.length === 0,
    uncoveredIndexes,
    uncoveredNodeIds: uncoveredIndexes.map((index) => entries[index]?.nodeId ?? null),
    assessments,
  };
}

/** Freeze name/skip/confirm before applying the existing naming rules. */
export function freezeTextKeyDecisions(entries) {
  const coverage = auditTextKeyCoverage(entries);
  if (!coverage.complete) {
    throw new Error("text-key-coverage-incomplete");
  }

  const outcomes = coverage.assessments.map((assessment, index) =>
    Object.freeze({
      nodeId: entries[index].nodeId,
      characters: entries[index].characters,
      structuralAssessment: entries[index].structuralAssessment,
      structuralGroupId: entries[index].structuralGroupId,
      keySignals: Object.freeze(
        (entries[index].keySignals ?? []).map((signal) => Object.freeze({ ...signal })),
      ),
      result: assessment.result,
    }),
  );

  return Object.freeze({
    outcomes: Object.freeze(outcomes),
    nameTargets: Object.freeze(
      outcomes.filter((outcome) => outcome.result === TEXT_KEY_DECISION.NAME),
    ),
  });
}

/** Freeze every ledger action before the first node.name write. */
export function freezeNamingPlan(entries, namingResults) {
  if (!Array.isArray(namingResults)) {
    throw new TypeError("naming-results-must-be-an-array");
  }
  const frozenDecisions = freezeTextKeyDecisions(entries);
  const entryByNodeId = new Map(entries.map((entry) => [entry.nodeId, entry]));
  const resultByNodeId = new Map();

  for (const result of namingResults) {
    const entry = entryByNodeId.get(result?.nodeId);
    if (entry === undefined) {
      throw new TypeError(`unknown-naming-result-node-id: ${result?.nodeId}`);
    }
    const frozen = frozenDecisions.outcomes.find(({ nodeId }) => nodeId === result.nodeId);
    if (frozen.result !== TEXT_KEY_DECISION.NAME) {
      throw new TypeError(`non-name-node-must-not-have-naming-result: ${result.nodeId}`);
    }
    if (!["rename", "keep", "confirm"].includes(result.action)) {
      throw new TypeError(`invalid-naming-action: ${result.nodeId}`);
    }
    if (resultByNodeId.has(result.nodeId)) {
      throw new TypeError(`duplicate-naming-result: ${result.nodeId}`);
    }
    if (result.action !== "confirm") {
      if (!validateDynamicTextName(result.finalName).valid) {
        throw new TypeError(`invalid-final-name: ${result.nodeId}`);
      }
      if (result.action === "keep" && entry.name !== result.finalName) {
        throw new TypeError(`keep-name-must-match-current-name: ${result.nodeId}`);
      }
    }
    resultByNodeId.set(result.nodeId, result);
  }

  const items = frozenDecisions.outcomes.map((outcome) => {
    if (outcome.result === TEXT_KEY_DECISION.SKIP) {
      return Object.freeze({ ...outcome, action: "skip" });
    }
    if (outcome.result === TEXT_KEY_DECISION.CONFIRM) {
      return Object.freeze({ ...outcome, action: "confirm" });
    }
    const naming = resultByNodeId.get(outcome.nodeId);
    if (naming === undefined) {
      throw new Error(`naming-result-required: ${outcome.nodeId}`);
    }
    return Object.freeze({ ...outcome, ...naming });
  });

  return Object.freeze({
    items: Object.freeze(items),
    writes: Object.freeze(items.filter(({ action }) => action === "rename")),
  });
}

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

/** Styled segments/HTML are deferred until final name targets actually need them. */
export function planDeferredRichTextReads(entries, options = {}) {
  const { pageCenterUpload = false } = options;
  if (typeof pageCenterUpload !== "boolean") {
    throw new TypeError("page-center-upload-must-be-a-boolean");
  }
  const frozen = freezeTextKeyDecisions(entries);
  const duplicateIndexes = new Set(
    findDuplicateTextGroups(frozen.nameTargets).flatMap(({ indexes }) => indexes),
  );
  const nodeIds = frozen.nameTargets.flatMap((target, index) =>
    pageCenterUpload || duplicateIndexes.has(index) ? [target.nodeId] : [],
  );

  return Object.freeze({
    phase: "deferred-rich-text",
    reason: pageCenterUpload
      ? "page-center-output"
      : "duplicate-copy-comparison",
    nodeIds: Object.freeze(nodeIds),
    requestedFields: DEFERRED_RICH_TEXT_FIELDS,
    allowNonCandidateReads: false,
  });
}

/** Validate syntax only; business meaning still comes from the naming rules. */
export function validateDynamicTextName(name) {
  if (typeof name !== "string") {
    return { valid: false, errors: ["name-must-be-string"] };
  }
  if (!CANONICAL_NAME_PATTERN.test(name)) {
    return { valid: false, errors: ["canonical-format-mismatch"] };
  }
  const [, businessDomain, semanticKey] = name.split("/");
  return { valid: true, errors: [], businessDomain, semanticKey };
}

export function findPageCenterKeyConflicts(entries) {
  const htmlByKey = new Map();
  const conflicts = new Set();
  for (const entry of entries) {
    if (typeof entry?.name !== "string") {
      throw new TypeError("pc-name-must-be-a-string");
    }
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
