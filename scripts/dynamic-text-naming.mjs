export const TEXT_PLACEHOLDER_PATTERN =
  /(^|[^A-Za-z0-9])(?:x{2,}|X+)(?=$|[^A-Za-z0-9])/;

export const CANONICAL_NAME_PATTERN =
  /^文案\/[a-z]+(?:-[a-z]+)?\/[a-z]+(?:-[a-z]+)?(?:-[1-9]\d*)?$/;

export const PREVIEW_SCOPE_PREFIXES = Object.freeze(["预览图/"]);

export const PREVIEW_SCOPE_DISCOVERY_FIELDS = Object.freeze([
  "id",
  "name",
  "type",
]);

export const PREVIEW_TEXT_INDEX_FIELDS = Object.freeze([
  "id",
  "characters",
  "name",
  "ancestorPathRef",
  "componentRef",
]);

export const PREVIEW_TEXT_INDEX_DICTIONARIES = Object.freeze([
  "ancestorPaths",
  "components",
]);

export const TARGETED_CONTEXT_FIELDS = Object.freeze([
  "siblings",
  "nearbyTexts",
  "componentResponsibility",
  "textBinding",
]);

export const CONFIRM_SCREENSHOT_FIELDS = Object.freeze(["regionScreenshot"]);

export const DEFERRED_RICH_TEXT_FIELDS = Object.freeze([
  "styledTextSegments",
  "html",
]);

export const FULL_COVERAGE_FORBIDDEN_FIELDS = Object.freeze([
  "type",
  "variableBinding",
  "boundVariables",
  "screenshot",
  "regionScreenshot",
  "styledTextSegments",
  "html",
  "fullHtml",
  "fullNode",
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
const TASK_READ_CACHE_KINDS = new Set([
  "indexBlock",
  "node",
  "ancestor",
  "component",
  "regionScreenshot",
]);
const INDEX_BLOCK_TYPES = new Set(["FRAME", "SECTION", "COMPONENT", "INSTANCE"]);

function assertPath(path, label) {
  if (!Array.isArray(path)) {
    throw new TypeError(`${label}-must-be-an-array`);
  }
  path.forEach((node, index) =>
    assertStructuralNode(node, `${label}-${index}`),
  );
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
    ...(typeof node.componentId === "string"
      ? { componentId: node.componentId }
      : {}),
    ...(typeof node.mainComponentId === "string"
      ? { mainComponentId: node.mainComponentId }
      : {}),
  };
}

function componentNodes(entry) {
  const component = entry.component ?? entry.componentPath;
  if (component === null || component === undefined) {
    return [];
  }
  return Array.isArray(component) ? component : [component];
}

function copyComponent(component) {
  if (component === null || component === undefined) {
    return null;
  }
  if (Array.isArray(component)) {
    component.forEach((node, index) =>
      assertStructuralNode(node, `text-component-${index}`),
    );
    return component.map(copyPathNode);
  }
  assertStructuralNode(component, "text-component");
  return copyPathNode(component);
}

function textStructureSignature(entry) {
  const components = componentNodes(entry);
  const ancestorPath = entry.ancestorPath ?? [];
  if (components.length === 0 && ancestorPath.length < 2) {
    return null;
  }
  const componentRootIndex = ancestorPath.findLastIndex((node) =>
    ["COMPONENT", "INSTANCE"].includes(node.type),
  );
  const relativeAncestorPath =
    componentRootIndex === -1
      ? ancestorPath
      : ancestorPath.slice(componentRootIndex);
  return JSON.stringify([
    components.length > 0 ? "component-slot" : "ancestor-slot",
    pathSignature(components, true),
    pathSignature(relativeAncestorPath),
    entry.name,
  ]);
}

function assertTaskReadCache(cache) {
  if (
    cache === null ||
    typeof cache !== "object" ||
    typeof cache.has !== "function" ||
    typeof cache.claim !== "function" ||
    typeof cache.record !== "function"
  ) {
    throw new TypeError("task-read-cache-required");
  }
}

function assertCacheRecord(record) {
  if (!TASK_READ_CACHE_KINDS.has(record?.kind)) {
    throw new TypeError(`invalid-task-cache-kind: ${record?.kind}`);
  }
  if (typeof record.resourceId !== "string" || record.resourceId.length === 0) {
    throw new TypeError("task-cache-resource-id-required");
  }
}

/** Task-local read cache, including one-shot archived light-index blocks. */
export function createTaskReadCache(seedRecords = []) {
  if (!Array.isArray(seedRecords)) {
    throw new TypeError("task-cache-seed-must-be-an-array");
  }
  const values = new Map();
  const claims = new Set();
  const keyFor = (kind, resourceId) => `${kind}:${resourceId}`;
  const cache = Object.freeze({
    has(kind, resourceId, requestedFields = []) {
      const cached = values.get(keyFor(kind, resourceId));
      return (
        cached !== undefined &&
        requestedFields.every((field) => cached.requestedFields.has(field))
      );
    },
    get(kind, resourceId) {
      return values.get(keyFor(kind, resourceId))?.value;
    },
    claim(kind, resourceId) {
      assertCacheRecord({ kind, resourceId });
      const key = keyFor(kind, resourceId);
      if (claims.has(key) || values.has(key)) {
        return false;
      }
      claims.add(key);
      return true;
    },
    isClaimed(kind, resourceId) {
      return claims.has(keyFor(kind, resourceId));
    },
    record(record) {
      assertCacheRecord(record);
      const key = keyFor(record.kind, record.resourceId);
      const previous = values.get(key);
      if (record.kind === "indexBlock" && previous !== undefined) {
        throw new Error(`index-block-range-already-archived: ${record.resourceId}`);
      }
      const nextValue = structuredClone(record.value);
      const value =
        previous?.value !== null &&
        typeof previous?.value === "object" &&
        nextValue !== null &&
        typeof nextValue === "object"
          ? { ...nextValue, ...previous.value }
          : previous?.value ?? nextValue;
      values.set(key, {
        value,
        requestedFields: new Set([
          ...(previous?.requestedFields ?? []),
          ...(record.requestedFields ?? []),
        ]),
      });
      claims.add(key);
      return value;
    },
    snapshot() {
      return Object.freeze(
        [...values.entries()].map(([key, cached]) =>
          Object.freeze({
            key,
            requestedFields: Object.freeze([...cached.requestedFields]),
            value: structuredClone(cached.value),
          }),
        ),
      );
    },
    snapshotClaims() {
      return Object.freeze([...claims]);
    },
  });
  seedRecords.forEach((record) => cache.record(record));
  return cache;
}

/** Remove cache hits and duplicate resource reads before any Figma call is made. */
export function planUncachedTaskReads(cache, requests) {
  assertTaskReadCache(cache);
  if (!Array.isArray(requests)) {
    throw new TypeError("task-read-requests-must-be-an-array");
  }
  const planned = [];
  const cacheHits = [];
  const plannedIndexByKey = new Map();
  for (const request of requests) {
    assertCacheRecord(request);
    const key = `${request.kind}:${request.resourceId}`;
    const requestedFields = request.requestedFields ?? [];
    if (cache.has(request.kind, request.resourceId, requestedFields)) {
      cacheHits.push(key);
      continue;
    }
    const missingFields = requestedFields.filter(
      (field) => !cache.has(request.kind, request.resourceId, [field]),
    );
    const plannedIndex = plannedIndexByKey.get(key);
    if (plannedIndex !== undefined) {
      const previous = planned[plannedIndex];
      planned[plannedIndex] = {
        ...previous,
        requestedFields: Object.freeze([
          ...new Set([...(previous.requestedFields ?? []), ...missingFields]),
        ]),
        ...(previous.groupIds || request.groupIds
          ? {
              groupIds: Object.freeze([
                ...new Set([...(previous.groupIds ?? []), ...(request.groupIds ?? [])]),
              ]),
            }
          : {}),
        ...(previous.memberNodeIds || request.memberNodeIds
          ? {
              memberNodeIds: Object.freeze([
                ...new Set([
                  ...(previous.memberNodeIds ?? []),
                  ...(request.memberNodeIds ?? []),
                ]),
              ]),
            }
          : {}),
      };
      cacheHits.push(key);
      continue;
    }
    plannedIndexByKey.set(key, planned.length);
    planned.push({
      ...request,
      ...(requestedFields.length > 0
        ? { requestedFields: Object.freeze(missingFields) }
        : {}),
    });
  }
  return Object.freeze({
    requests: Object.freeze(planned.map((request) => Object.freeze(request))),
    cacheHits: Object.freeze(cacheHits),
  });
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
    retainParentChildHierarchy: true,
    discoverPreviewBlockChildren: true,
    allowTextEnumeration: false,
  });
}

/** Local fallback for Figma selectors that cannot match Chinese prefixes. */
export function findPreviewScopeCandidates(shallowNodes) {
  if (!Array.isArray(shallowNodes)) {
    throw new TypeError("shallow-nodes-must-be-an-array");
  }

  const seenNodeIds = new Set();
  const flattened = [];
  const visit = (node, label) => {
    assertStructuralNode(node, label);
    flattened.push(node);
    if (node.children !== undefined && !Array.isArray(node.children)) {
      throw new TypeError(`${label}-children-must-be-an-array`);
    }
    (node.children ?? []).forEach((child, index) =>
      visit(child, `${label}-child-${index}`),
    );
  };
  shallowNodes.forEach((node, index) => visit(node, `shallow-node-${index}`));
  return flattened.flatMap((node) => {
    if (!isPreviewScopeName(node.name) || seenNodeIds.has(node.id)) {
      return [];
    }
    seenNodeIds.add(node.id);
    return [{ id: node.id, name: node.name, type: node.type }];
  });
}

/** Choose first-level stable blocks and retain a disjoint recursive split tree. */
export function findPreviewIndexBlocks(previewScopes, shallowNodes) {
  if (!Array.isArray(previewScopes) || previewScopes.length === 0) {
    throw new TypeError("preview-scopes-must-be-a-non-empty-array");
  }
  if (!Array.isArray(shallowNodes)) {
    throw new TypeError("shallow-nodes-must-be-an-array");
  }
  const nodeById = new Map();
  const childrenById = new Map();
  const visit = (node, parentId, label) => {
    assertStructuralNode(node, label);
    if (nodeById.has(node.id)) {
      throw new TypeError(`duplicate-shallow-node: ${node.id}`);
    }
    nodeById.set(node.id, node);
    const children = node.children ?? [];
    if (!Array.isArray(children)) {
      throw new TypeError(`${label}-children-must-be-an-array`);
    }
    childrenById.set(node.id, children.map(({ id }) => id));
    children.forEach((child, index) =>
      visit(child, node.id, `${label}-child-${index}`),
    );
    if (parentId !== null) {
      const siblings = childrenById.get(parentId) ?? [];
      if (!siblings.includes(node.id)) {
        childrenById.set(parentId, [...siblings, node.id]);
      }
    }
  };
  shallowNodes.forEach((node, index) => visit(node, null, `shallow-node-${index}`));

  const blocks = [];
  const seenBlockIds = new Set();
  const textContainment = new Map();
  const containsText = (nodeId) => {
    if (textContainment.has(nodeId)) {
      return textContainment.get(nodeId);
    }
    const node = nodeById.get(nodeId);
    const result = (
      node?.type === "TEXT" ||
      (childrenById.get(nodeId) ?? []).some(containsText)
    );
    textContainment.set(nodeId, result);
    return result;
  };
  const stableContainment = new Map();
  const containsStableBlock = (nodeId) => {
    if (stableContainment.has(nodeId)) {
      return stableContainment.get(nodeId);
    }
    const result =
      INDEX_BLOCK_TYPES.has(nodeById.get(nodeId)?.type) ||
      (childrenById.get(nodeId) ?? []).some(containsStableBlock);
    stableContainment.set(nodeId, result);
    return result;
  };
  const nearestRangeRoots = (nodeId) => {
    if (INDEX_BLOCK_TYPES.has(nodeById.get(nodeId)?.type)) {
      return [nodeId];
    }
    if (!containsStableBlock(nodeId)) {
      return containsText(nodeId) ? [nodeId] : [];
    }
    return (childrenById.get(nodeId) ?? []).flatMap((childId) =>
      containsStableBlock(childId)
        ? nearestRangeRoots(childId)
        : containsText(childId)
          ? [childId]
          : [],
    );
  };
  const splitCandidatesFor = (blockNodeId, previewScopeNodeId) =>
    (childrenById.get(blockNodeId) ?? [])
      .flatMap(nearestRangeRoots)
      .map((candidateNodeId) => {
        const candidate = nodeById.get(candidateNodeId);
        return {
          id: candidate.id,
          name: candidate.name,
          type: candidate.type,
          parentBlockNodeId: blockNodeId,
          previewScopeNodeId,
          splitCandidates: splitCandidatesFor(candidate.id, previewScopeNodeId),
        };
      });
  for (const [scopeIndex, scope] of previewScopes.entries()) {
    assertStructuralNode(scope, `preview-scope-${scopeIndex}`);
    if (!isPreviewScopeName(scope.name)) {
      throw new TypeError(`non-preview-scope-cannot-plan-blocks: ${scope.id}`);
    }
    if (!nodeById.has(scope.id)) {
      throw new TypeError(`preview-scope-missing-from-shallow-tree: ${scope.id}`);
    }
    const nearestStableBlocks = (nodeId) =>
      INDEX_BLOCK_TYPES.has(nodeById.get(nodeId)?.type)
        ? [nodeId]
        : (childrenById.get(nodeId) ?? []).flatMap(nearestStableBlocks);
    const stable = (childrenById.get(scope.id) ?? []).flatMap(nearestStableBlocks);
    if (stable.length === 0) {
      throw new Error(`preview-scope-has-no-stable-index-blocks: ${scope.id}`);
    }
    for (const blockNodeId of stable) {
      if (seenBlockIds.has(blockNodeId)) {
        throw new TypeError(`duplicate-preview-index-block: ${blockNodeId}`);
      }
      seenBlockIds.add(blockNodeId);
      const block = nodeById.get(blockNodeId);
      blocks.push(
        Object.freeze({
          id: block.id,
          name: block.name,
          type: block.type,
          previewScopeNodeId: scope.id,
          parentBlockNodeId: null,
          splitCandidates: splitCandidatesFor(block.id, scope.id),
        }),
      );
    }
  }
  return Object.freeze(blocks);
}

/** Plan each stable block once; the preview root itself is never a Text query range. */
export function planPreviewTextIndexReads(indexBlocks, options = {}) {
  if (!Array.isArray(indexBlocks) || indexBlocks.length === 0) {
    throw new TypeError("preview-index-blocks-must-be-a-non-empty-array");
  }
  const { cache = createTaskReadCache() } = options;
  assertTaskReadCache(cache);
  const seenNodeIds = new Set();
  const cacheHits = [];
  const requests = indexBlocks.flatMap((block, index) => {
    assertStructuralNode(block, `preview-index-block-${index}`);
    if (
      !INDEX_BLOCK_TYPES.has(block.type) &&
      !(
        typeof block.parentBlockNodeId === "string" &&
        !NON_LEDGER_SCOPE_TYPES.has(block.type)
      )
    ) {
      throw new TypeError(`unstable-preview-index-block: ${block.id}`);
    }
    if (
      typeof block.previewScopeNodeId !== "string" ||
      block.previewScopeNodeId.length === 0
    ) {
      throw new TypeError(`preview-scope-node-id-required-for-block: ${block.id}`);
    }
    if (block.id === block.previewScopeNodeId || isPreviewScopeName(block.name)) {
      throw new TypeError(`preview-root-cannot-be-an-index-range: ${block.id}`);
    }
    if (seenNodeIds.has(block.id)) {
      throw new TypeError(`duplicate-preview-index-block: ${block.id}`);
    }
    seenNodeIds.add(block.id);
    if (!cache.claim("indexBlock", block.id)) {
      cacheHits.push(`indexBlock:${block.id}`);
      return [];
    }
    return [Object.freeze({
      kind: "indexBlock",
      resourceId: block.id,
      blockNodeId: block.id,
      blockName: block.name,
      previewScopeNodeId: block.previewScopeNodeId,
      parentBlockNodeId: block.parentBlockNodeId ?? null,
      splitCandidates: Object.freeze(
        structuredClone(block.splitCandidates ?? []),
      ),
      selector: "TEXT",
      traversal: "recursive",
      requestedFields: PREVIEW_TEXT_INDEX_FIELDS,
      dictionaryFields: PREVIEW_TEXT_INDEX_DICTIONARIES,
      returnShape: "dictionary-references",
    })];
  });

  return Object.freeze({
    phase: "read-light-text-index-blocks",
    requests: Object.freeze(requests),
    cacheHits: Object.freeze(cacheHits),
    maxFigmaCalls: requests.length,
    fixedTextChunkSize: null,
    allowFixedTextChunking: false,
    allowPreviewRootRead: false,
    overflowStrategy: "recursive-structural-descendants",
    retrySameRangeOnTruncation: false,
    forbiddenFields: FULL_COVERAGE_FORBIDDEN_FIELDS,
    transport: "archive-each-result-locally",
  });
}

function normalizeSplitCandidates(
  candidates,
  { parentBlockNodeId, previewScopeNodeId, seenNodeIds },
) {
  if (!Array.isArray(candidates)) {
    throw new TypeError(`overflow-block-split-candidates-invalid: ${parentBlockNodeId}`);
  }
  return candidates.map((candidate, index) => {
    assertStructuralNode(candidate, `overflow-candidate-${parentBlockNodeId}-${index}`);
    if (
      NON_LEDGER_SCOPE_TYPES.has(candidate.type) ||
      candidate.id === parentBlockNodeId ||
      candidate.parentBlockNodeId !== parentBlockNodeId ||
      candidate.previewScopeNodeId !== previewScopeNodeId
    ) {
      throw new TypeError(`invalid-overflow-split-candidate: ${candidate.id}`);
    }
    if (seenNodeIds.has(candidate.id)) {
      throw new TypeError(`duplicate-overflow-split-candidate: ${candidate.id}`);
    }
    seenNodeIds.add(candidate.id);
    return {
      id: candidate.id,
      name: candidate.name,
      type: candidate.type,
      parentBlockNodeId,
      previewScopeNodeId,
      splitCandidates: normalizeSplitCandidates(candidate.splitCandidates ?? [], {
        parentBlockNodeId: candidate.id,
        previewScopeNodeId,
        seenNodeIds,
      }),
    };
  });
}

function normalizeDictionary(dictionary, label) {
  if (dictionary === null || typeof dictionary !== "object" || Array.isArray(dictionary)) {
    throw new TypeError(`${label}-must-be-an-object`);
  }
  return Object.fromEntries(
    Object.entries(dictionary).map(([reference, value]) => {
      if (reference.length === 0) {
        throw new TypeError(`${label}-reference-required`);
      }
      return [reference, structuredClone(value)];
    }),
  );
}

/** Archive one block result immediately. A truncated range becomes a terminal split marker. */
export function recordPreviewTextIndexBlock(cache, request, result) {
  assertTaskReadCache(cache);
  if (request?.kind !== "indexBlock" || request.resourceId !== request.blockNodeId) {
    throw new TypeError("preview-index-block-request-required");
  }
  if (!cache.isClaimed("indexBlock", request.blockNodeId)) {
    throw new Error(`index-block-range-was-not-planned: ${request.blockNodeId}`);
  }
  const overflow = result?.status === "overflow" || result?.truncated === true;
  let archived;
  if (overflow) {
    const splitCandidates = normalizeSplitCandidates(
      request.splitCandidates ?? [],
      {
        parentBlockNodeId: request.blockNodeId,
        previewScopeNodeId: request.previewScopeNodeId,
        seenNodeIds: new Set([request.blockNodeId]),
      },
    );
    archived = {
      status: "overflow",
      reason: result.truncated === true ? "response-truncated" : "response-size-limit",
      blockNodeId: request.blockNodeId,
      blockName: request.blockName,
      previewScopeNodeId: request.previewScopeNodeId,
      parentBlockNodeId: request.parentBlockNodeId,
      splitCandidates,
    };
  } else {
    if (result?.status !== "complete") {
      throw new TypeError(`index-block-result-status-required: ${request.blockNodeId}`);
    }
    if (!Array.isArray(result.texts)) {
      throw new TypeError(`index-block-texts-must-be-an-array: ${request.blockNodeId}`);
    }
    const ancestorPaths = normalizeDictionary(
      result.dictionaries?.ancestorPaths,
      `ancestor-path-dictionary-${request.blockNodeId}`,
    );
    const components = normalizeDictionary(
      result.dictionaries?.components ?? {},
      `component-dictionary-${request.blockNodeId}`,
    );
    const seenTextIds = new Set();
    const texts = result.texts.map((text, index) => {
      if (typeof text?.id !== "string" || text.id.length === 0) {
        throw new TypeError(`index-text-id-required: ${request.blockNodeId}:${index}`);
      }
      if (seenTextIds.has(text.id)) {
        throw new TypeError(`duplicate-index-text-id: ${text.id}`);
      }
      seenTextIds.add(text.id);
      if (typeof text.characters !== "string" || typeof text.name !== "string") {
        throw new TypeError(`invalid-index-text-copy: ${text.id}`);
      }
      if (Object.hasOwn(text, "ancestorPath") || Object.hasOwn(text, "component")) {
        throw new TypeError(`index-text-must-use-dictionary-references: ${text.id}`);
      }
      if (
        typeof text.ancestorPathRef !== "string" ||
        !Object.hasOwn(ancestorPaths, text.ancestorPathRef)
      ) {
        throw new TypeError(`unknown-ancestor-path-reference: ${text.id}`);
      }
      if (
        text.componentRef !== null &&
        (typeof text.componentRef !== "string" ||
          !Object.hasOwn(components, text.componentRef))
      ) {
        throw new TypeError(`unknown-component-reference: ${text.id}`);
      }
      return {
        id: text.id,
        characters: text.characters,
        name: text.name,
        ancestorPathRef: text.ancestorPathRef,
        componentRef: text.componentRef,
      };
    });
    archived = {
      status: "complete",
      blockNodeId: request.blockNodeId,
      blockName: request.blockName,
      previewScopeNodeId: request.previewScopeNodeId,
      parentBlockNodeId: request.parentBlockNodeId,
      dictionaries: { ancestorPaths, components },
      texts,
    };
  }
  cache.record({
    kind: "indexBlock",
    resourceId: request.blockNodeId,
    requestedFields: request.requestedFields,
    value: archived,
  });
  return Object.freeze({
    blockNodeId: request.blockNodeId,
    status: archived.status,
    textCount: archived.status === "complete" ? archived.texts.length : 0,
    splitRequired: archived.status === "overflow",
  });
}

/** Split an archived overflow into the nearest disjoint structural descendants. */
export function planOverflowTextIndexReads(cache, blockNodeId) {
  assertTaskReadCache(cache);
  const archived = cache.get("indexBlock", blockNodeId);
  if (archived?.status !== "overflow") {
    throw new Error(`archived-overflow-block-required: ${blockNodeId}`);
  }
  if (archived.splitCandidates.length === 0) {
    throw new Error(`当前读取接口无法进一步安全拆分该节点: ${blockNodeId}`);
  }
  return planPreviewTextIndexReads(archived.splitCandidates, { cache });
}

/** Run structural overflow discovery and retries without exposing split planning. */
export async function runPreviewTextIndexCoverage(previewScopesOrBlocks, options = {}) {
  const {
    cache = createTaskReadCache(),
    readIndexBlock,
    shallowNodes,
  } = options;
  assertTaskReadCache(cache);
  if (typeof readIndexBlock !== "function") {
    throw new TypeError("read-index-block-function-required");
  }
  const indexBlocks =
    shallowNodes === undefined
      ? previewScopesOrBlocks
      : findPreviewIndexBlocks(previewScopesOrBlocks, shallowNodes);
  const pending = [...planPreviewTextIndexReads(indexBlocks, { cache }).requests];
  while (pending.length > 0) {
    const request = pending.shift();
    const {
      splitCandidates: _splitCandidates,
      parentBlockNodeId: _parentBlockNodeId,
      ...transportRequest
    } = request;
    const result = await readIndexBlock(Object.freeze(transportRequest));
    const summary = recordPreviewTextIndexBlock(cache, request, result);
    if (summary.splitRequired) {
      pending.push(
        ...planOverflowTextIndexReads(cache, request.blockNodeId).requests,
      );
    }
  }
  const ledger = buildPreviewTextLedgerFromCache(cache);
  const agentLedger = ledger.map(({ indexBlockNodeId: _indexBlockNodeId, ...entry }) =>
    Object.freeze(entry),
  );
  return Object.freeze({
    status: "complete",
    message: `已完整扫描 ${ledger.length} 个 Text`,
    scannedTextCount: ledger.length,
    ledger: Object.freeze(agentLedger),
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
      throw new TypeError(
        `non-preview-scope-cannot-build-ledger: ${batch.scope.id}`,
      );
    }
    if (!Array.isArray(batch.texts)) {
      throw new TypeError(
        `preview-scope-texts-must-be-an-array: ${batch.scope.id}`,
      );
    }

    batch.texts.forEach((node, textIndex) => {
      if (typeof node.id !== "string" || node.id.length === 0) {
        throw new TypeError(
          `text-node-id-required: ${batch.scope.id}:${textIndex}`,
        );
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
      const component = copyComponent(node.component);
      if (seenTextNodeIds.has(node.id)) {
        return;
      }

      seenTextNodeIds.add(node.id);
      ledger.push({
        nodeId: node.id,
        id: node.id,
        characters: node.characters,
        name: node.name,
        ancestorPath: node.ancestorPath.map(copyPathNode),
        component,
        previewScopeNodeId: batch.scope.id,
      });
    });
  });

  return ledger;
}

/** Merge completed leaf archives locally; no aggregate Text payload is requested from Figma. */
export function buildPreviewTextLedgerFromCache(cache) {
  assertTaskReadCache(cache);
  const snapshots = cache
    .snapshot()
    .filter(({ key }) => key.startsWith("indexBlock:"));
  const archivedByBlockId = new Map(
    snapshots.map(({ value }) => [value.blockNodeId, value]),
  );
  const pendingBlockIds = cache
    .snapshotClaims()
    .filter((key) => key.startsWith("indexBlock:"))
    .map((key) => key.slice("indexBlock:".length))
    .filter((blockNodeId) => !archivedByBlockId.has(blockNodeId));
  if (pendingBlockIds.length > 0) {
    throw new Error(`index-block-results-not-archived: ${pendingBlockIds.join(",")}`);
  }
  if (archivedByBlockId.size === 0) {
    throw new Error("no-index-block-archives");
  }
  for (const archived of archivedByBlockId.values()) {
    if (archived.parentBlockNodeId !== null) {
      const parent = archivedByBlockId.get(archived.parentBlockNodeId);
      if (parent === undefined) {
        throw new Error(`index-block-parent-not-archived: ${archived.blockNodeId}`);
      }
      if (
        parent.status !== "overflow" ||
        !parent.splitCandidates.some(({ id }) => id === archived.blockNodeId)
      ) {
        throw new Error(`index-block-not-declared-by-parent: ${archived.blockNodeId}`);
      }
      if (parent.previewScopeNodeId !== archived.previewScopeNodeId) {
        throw new Error(`index-block-preview-scope-mismatch: ${archived.blockNodeId}`);
      }
    }
    if (archived.status !== "overflow") {
      continue;
    }
    if (archived.splitCandidates.length === 0) {
      throw new Error(
        `当前读取接口无法进一步安全拆分该节点: ${archived.blockNodeId}`,
      );
    }
    const missingChildIds = archived.splitCandidates
      .map(({ id }) => id)
      .filter((childId) => !archivedByBlockId.has(childId));
    if (missingChildIds.length > 0) {
      throw new Error(
        `overflow-block-split-candidates-not-archived: ${archived.blockNodeId}:${missingChildIds.join(",")}`,
      );
    }
  }

  const rootBlockIdFor = (archived) => {
    let current = archived;
    const visited = new Set();
    while (current.parentBlockNodeId !== null) {
      if (visited.has(current.blockNodeId)) {
        throw new Error(`index-block-parent-cycle: ${current.blockNodeId}`);
      }
      visited.add(current.blockNodeId);
      current = archivedByBlockId.get(current.parentBlockNodeId);
      if (current === undefined) {
        throw new Error(`index-block-parent-not-archived: ${archived.blockNodeId}`);
      }
    }
    return current.blockNodeId;
  };

  const ledger = [];
  const seenTextNodeIds = new Set();
  for (const archived of archivedByBlockId.values()) {
    if (archived.status !== "complete") {
      continue;
    }
    const primarySectionNodeId = rootBlockIdFor(archived);
    for (const text of archived.texts) {
      if (seenTextNodeIds.has(text.id)) {
        throw new Error(`text-indexed-by-multiple-blocks: ${text.id}`);
      }
      seenTextNodeIds.add(text.id);
      const ancestorPath = archived.dictionaries.ancestorPaths[text.ancestorPathRef];
      assertPath(ancestorPath, `archived-text-ancestor-path-${text.id}`);
      const component =
        text.componentRef === null
          ? null
          : copyComponent(archived.dictionaries.components[text.componentRef]);
      ledger.push({
        nodeId: text.id,
        id: text.id,
        characters: text.characters,
        name: text.name,
        ancestorPath: ancestorPath.map(copyPathNode),
        component,
        previewScopeNodeId: archived.previewScopeNodeId,
        primarySectionNodeId,
        indexBlockNodeId: archived.blockNodeId,
      });
    }
  }
  return ledger;
}

export function hasTextPlaceholder(characters) {
  return (
    typeof characters === "string" && TEXT_PLACEHOLDER_PATTERN.test(characters)
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
      throw new TypeError(
        `invalid-group-structural-assessment: ${group.groupId}`,
      );
    }
    if (
      !Array.isArray(group.memberNodeIds) ||
      group.memberNodeIds.length === 0
    ) {
      throw new TypeError(
        `structural-group-members-required: ${group.groupId}`,
      );
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
    const group = membersBySignature.get(signature) ?? {
      memberNodeIds: [],
      groupingBasis:
        componentNodes(entry).length > 0
          ? "component-structure"
          : "ancestor-structure",
    };
    group.memberNodeIds.push(entry.nodeId);
    membersBySignature.set(signature, group);
  }

  let groupIndex = 0;
  return [...membersBySignature.entries()].flatMap(([structureKey, group]) => {
    const { memberNodeIds, groupingBasis } = group;
    if (memberNodeIds.length < 2) {
      return [];
    }
    groupIndex += 1;
    return [
      Object.freeze({
        groupId: `component-structure-${groupIndex}`,
        structureKey,
        groupingBasis,
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

/** Derive strong signals available directly in the five-field lightweight ledger. */
export function applyLightIndexSignals(entries) {
  return applyPlaceholderSignals(entries);
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
    return (
      signal.nodeId === entry.nodeId && hasTextPlaceholder(entry.characters)
    );
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
      throw new TypeError(
        `structurally-skipped-node-must-not-receive-signals: ${nodeId}`,
      );
    }
    if (
      !Array.isArray(assessment.keySignals) ||
      assessment.keySignals.length === 0
    ) {
      throw new TypeError(`key-signals-required: ${nodeId}`);
    }
    if (
      !assessment.keySignals.every((signal) => validKeySignal(signal, entry))
    ) {
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
      throw new TypeError(
        `structurally-resolved-node-must-not-be-ai-decided: ${nodeId}`,
      );
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

/** Resolve provisional confirm groups after an explicitly necessary cached screenshot read. */
export function applyConfirmEvidenceDecisions(entries, groupDecisions) {
  if (!Array.isArray(groupDecisions)) {
    throw new TypeError("confirm-group-decisions-must-be-an-array");
  }
  const entryByNodeId = indexEntries(entries);
  const decisionByNodeId = new Map();
  for (const group of groupDecisions) {
    if (typeof group?.groupId !== "string" || group.groupId.length === 0) {
      throw new TypeError("confirm-group-id-required");
    }
    if (
      !Array.isArray(group.memberNodeIds) ||
      group.memberNodeIds.length === 0
    ) {
      throw new TypeError(`confirm-group-members-required: ${group.groupId}`);
    }
    if (!TEXT_KEY_DECISIONS.has(group.keyDecision)) {
      throw new TypeError(`invalid-confirm-group-decision: ${group.groupId}`);
    }
    for (const nodeId of group.memberNodeIds) {
      const entry = entryByNodeId.get(nodeId);
      if (entry === undefined) {
        throw new TypeError(`unknown-confirm-group-member: ${nodeId}`);
      }
      if (assessTextKeyTarget(entry).result !== TEXT_KEY_DECISION.CONFIRM) {
        throw new TypeError(`confirm-group-member-not-confirm: ${nodeId}`);
      }
      if (decisionByNodeId.has(nodeId)) {
        throw new TypeError(`duplicate-confirm-group-member: ${nodeId}`);
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
      structuralAssessment: STRUCTURAL_ASSESSMENT.ELIGIBLE,
      keyDecision: group.keyDecision,
      keyDecisionReason: group.reason,
      keyDecisionSource: "confirm-screenshot-evidence",
      analysisGroupId: group.groupId,
      ...(group.keyDecision === TEXT_KEY_DECISION.CONFIRM
        ? { screenshotConfirmUnresolved: true }
        : {}),
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
      throw new TypeError(
        `structure-group-representative-required: ${group.groupId}`,
      );
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

function contextResourceFor(entry) {
  const components = componentNodes(entry);
  const component = components.at(-1);
  if (component !== undefined) {
    return { kind: "component", resourceId: component.id };
  }
  const ancestor = (entry.ancestorPath ?? []).at(-1);
  if (ancestor !== undefined) {
    return { kind: "ancestor", resourceId: ancestor.id };
  }
  if (typeof entry.previewScopeNodeId === "string") {
    return { kind: "ancestor", resourceId: entry.previewScopeNodeId };
  }
  return { kind: "node", resourceId: entry.nodeId };
}

/** Plan non-visual context only for unresolved representatives, with task-cache reuse. */
export function planTargetedContextReads(entries, options = {}) {
  const { cache = createTaskReadCache() } = options;
  assertTaskReadCache(cache);
  const entryByNodeId = indexEntries(entries);
  const unresolved = entries.filter(
    (entry) =>
      entry.structuralAssessment === STRUCTURAL_ASSESSMENT.ELIGIBLE &&
      !TEXT_KEY_DECISIONS.has(entry.keyDecision),
  );
  const reuseGroups = buildStructureReuseGroups(entries);
  const groupedNodeIds = new Set(
    reuseGroups.flatMap((group) => group.memberNodeIds),
  );
  const analysisGroups = [
    ...reuseGroups.map((group) => ({
      groupId: group.groupId,
      structureKey: group.structureKey,
      groupingBasis: group.groupingBasis,
      representativeNodeId: group.representativeNodeId,
      memberNodeIds: group.memberNodeIds,
    })),
    ...unresolved
      .filter((entry) => !groupedNodeIds.has(entry.nodeId))
      .map((entry, index) => ({
        groupId: `unresolved-single-${index + 1}`,
        structureKey: textStructureSignature(entry),
        groupingBasis: "single-representative",
        representativeNodeId: entry.nodeId,
        memberNodeIds: Object.freeze([entry.nodeId]),
      })),
  ].map((group) => Object.freeze(group));

  const resourceReads = analysisGroups.map((group) => {
    const representative = entryByNodeId.get(group.representativeNodeId);
    if (representative === undefined) {
      throw new TypeError(
        `unknown-context-representative: ${group.representativeNodeId}`,
      );
    }
    return {
      ...contextResourceFor(representative),
      groupIds: [group.groupId],
      requestedFields: TARGETED_CONTEXT_FIELDS,
      forbiddenFields: Object.freeze([
        ...DEFERRED_RICH_TEXT_FIELDS,
        ...CONFIRM_SCREENSHOT_FIELDS,
      ]),
    };
  });
  const planned = planUncachedTaskReads(cache, resourceReads);

  return Object.freeze({
    phase: "decide-unresolved-representatives",
    unresolvedNodeIds: Object.freeze(unresolved.map(({ nodeId }) => nodeId)),
    aiInputNodeIds: Object.freeze(
      analysisGroups.map(({ representativeNodeId }) => representativeNodeId),
    ),
    analysisGroups: Object.freeze(analysisGroups),
    requests: planned.requests,
    cacheHits: planned.cacheHits,
    allowWholeLedgerAi: false,
    allowFixedTextChunking: false,
    allowScreenshots: false,
  });
}

function screenshotRegionFor(entry) {
  return (
    entry.screenshotRegionNodeId ??
    entry.primarySectionNodeId ??
    entry.ancestorPath?.[0]?.id ??
    entry.previewScopeNodeId ??
    entry.nodeId
  );
}

/** Request screenshots only for explicit confirm nodes that cached evidence cannot resolve. */
export function planConfirmScreenshotReads(entries, options = {}) {
  const { requiredNodeIds = [], cache = createTaskReadCache() } = options;
  assertTaskReadCache(cache);
  if (!Array.isArray(requiredNodeIds)) {
    throw new TypeError("confirm-screenshot-node-ids-must-be-an-array");
  }
  const entryByNodeId = indexEntries(entries);
  const membersByRegion = new Map();
  for (const nodeId of new Set(requiredNodeIds)) {
    const entry = entryByNodeId.get(nodeId);
    if (entry === undefined) {
      throw new TypeError(`unknown-confirm-screenshot-node-id: ${nodeId}`);
    }
    if (assessTextKeyTarget(entry).result !== TEXT_KEY_DECISION.CONFIRM) {
      throw new TypeError(`screenshot-only-allowed-for-confirm: ${nodeId}`);
    }
    const regionNodeId = screenshotRegionFor(entry);
    const members = membersByRegion.get(regionNodeId) ?? [];
    members.push(nodeId);
    membersByRegion.set(regionNodeId, members);
  }
  const requested = [...membersByRegion.entries()].map(
    ([resourceId, memberNodeIds]) => ({
      kind: "regionScreenshot",
      resourceId,
      memberNodeIds: Object.freeze(memberNodeIds),
      requestedFields: CONFIRM_SCREENSHOT_FIELDS,
    }),
  );
  const planned = planUncachedTaskReads(cache, requested);
  return Object.freeze({
    phase: "confirm-screenshots-if-needed",
    requests: planned.requests,
    cacheHits: planned.cacheHits,
    allowNameOrSkipScreenshots: false,
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
    return {
      assessed: true,
      result: TEXT_KEY_DECISION.CONFIRM,
      reasonCodes: [],
    };
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
    uncoveredNodeIds: uncoveredIndexes.map(
      (index) => entries[index]?.nodeId ?? null,
    ),
    assessments,
  };
}

/** Coverage is anchored to the merged block archive, not a second Figma Text response. */
export function auditCachedTextKeyCoverage(cache, assessedEntries) {
  const archivedLedger = buildPreviewTextLedgerFromCache(cache);
  const assessedByNodeId = indexEntries(assessedEntries);
  const archivedNodeIds = new Set(archivedLedger.map(({ nodeId }) => nodeId));
  const missingNodeIds = [...archivedNodeIds].filter(
    (nodeId) => !assessedByNodeId.has(nodeId),
  );
  const extraNodeIds = [...assessedByNodeId.keys()].filter(
    (nodeId) => !archivedNodeIds.has(nodeId),
  );
  if (missingNodeIds.length > 0 || extraNodeIds.length > 0) {
    throw new Error(
      `cached-coverage-node-set-mismatch: missing=${missingNodeIds.join(",")};extra=${extraNodeIds.join(",")}`,
    );
  }
  const orderedEntries = archivedLedger.map(({ nodeId }) => assessedByNodeId.get(nodeId));
  const audit = auditTextKeyCoverage(orderedEntries);
  const indexBlocks = cache
    .snapshot()
    .filter(({ key }) => key.startsWith("indexBlock:"))
    .map(({ value }) => value);
  return {
    ...audit,
    source: "task-cache-index-block-archives",
    archivedBlockCount: indexBlocks.length,
    completeLeafBlockCount: indexBlocks.filter(({ status }) => status === "complete")
      .length,
    scannedTextCount: archivedLedger.length,
  };
}

/** Decision-only snapshot retained for compatibility; execution freezes once at Naming Plan. */
export function freezeTextKeyDecisions(entries) {
  const coverage = auditTextKeyCoverage(entries);
  if (!coverage.complete) {
    throw new Error("text-key-coverage-incomplete");
  }

  const outcomes = coverage.assessments.map((assessment, index) =>
    Object.freeze({
      nodeId: entries[index].nodeId,
      characters: entries[index].characters,
      currentName: entries[index].name,
      ancestorPath: Object.freeze(
        (entries[index].ancestorPath ?? []).map((node) =>
          Object.freeze(copyPathNode(node)),
        ),
      ),
      component:
        entries[index].component === undefined
          ? null
          : Object.freeze(structuredClone(entries[index].component)),
      previewScopeNodeId: entries[index].previewScopeNodeId,
      structuralAssessment: entries[index].structuralAssessment,
      structuralGroupId: entries[index].structuralGroupId,
      analysisGroupId: entries[index].analysisGroupId,
      analysisRepresentativeNodeId: entries[index].analysisRepresentativeNodeId,
      keyDecisionReason: entries[index].keyDecisionReason,
      keyDecisionSource: entries[index].keyDecisionSource,
      keySignals: Object.freeze(
        (entries[index].keySignals ?? []).map((signal) =>
          Object.freeze({ ...signal }),
        ),
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
export function freezeNamingPlan(entries, namingResults, options = {}) {
  if (!Array.isArray(namingResults)) {
    throw new TypeError("naming-results-must-be-an-array");
  }
  if (options.cache !== undefined) {
    const cachedCoverage = auditCachedTextKeyCoverage(options.cache, entries);
    if (!cachedCoverage.complete) {
      throw new Error("text-key-coverage-incomplete");
    }
  }
  const frozenDecisions = freezeTextKeyDecisions(entries);
  const entryByNodeId = new Map(entries.map((entry) => [entry.nodeId, entry]));
  const resultByNodeId = new Map();

  for (const result of namingResults) {
    const entry = entryByNodeId.get(result?.nodeId);
    if (entry === undefined) {
      throw new TypeError(`unknown-naming-result-node-id: ${result?.nodeId}`);
    }
    const frozen = frozenDecisions.outcomes.find(
      ({ nodeId }) => nodeId === result.nodeId,
    );
    if (frozen.result !== TEXT_KEY_DECISION.NAME) {
      throw new TypeError(
        `non-name-node-must-not-have-naming-result: ${result.nodeId}`,
      );
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
        throw new TypeError(
          `keep-name-must-match-current-name: ${result.nodeId}`,
        );
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
    version: "figma-text-naming-plan-v1",
    items: Object.freeze(items),
    writes: Object.freeze(items.filter(({ action }) => action === "rename")),
  });
}

function deepFreezeJson(value) {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    Object.values(value).forEach(deepFreezeJson);
    Object.freeze(value);
  }
  return value;
}

/** Serialize the one authoritative post-Coverage Naming Plan for later user follow-ups. */
export function serializeFrozenNamingPlan(plan) {
  if (
    plan?.version !== "figma-text-naming-plan-v1" ||
    !Array.isArray(plan.items) ||
    !Array.isArray(plan.writes)
  ) {
    throw new TypeError("frozen-naming-plan-required");
  }
  return JSON.stringify(plan);
}

/** Restore a frozen plan without rebuilding the ledger or rerunning Coverage. */
export function restoreFrozenNamingPlan(serialized) {
  if (typeof serialized !== "string") {
    throw new TypeError("serialized-naming-plan-must-be-a-string");
  }
  const plan = JSON.parse(serialized);
  if (
    plan?.version !== "figma-text-naming-plan-v1" ||
    !Array.isArray(plan.items) ||
    !Array.isArray(plan.writes)
  ) {
    throw new TypeError("invalid-frozen-naming-plan");
  }
  const seenNodeIds = new Set();
  for (const item of plan.items) {
    if (
      typeof item?.nodeId !== "string" ||
      seenNodeIds.has(item.nodeId) ||
      !["rename", "keep", "skip", "confirm"].includes(item.action)
    ) {
      throw new TypeError("invalid-frozen-naming-plan-item");
    }
    seenNodeIds.add(item.nodeId);
  }
  const expectedWrites = plan.items
    .filter(({ action }) => action === "rename")
    .map(({ nodeId, finalName }) => [nodeId, finalName]);
  const actualWrites = plan.writes.map(({ nodeId, finalName }) => [
    nodeId,
    finalName,
  ]);
  if (JSON.stringify(actualWrites) !== JSON.stringify(expectedWrites)) {
    throw new TypeError("invalid-frozen-naming-plan-writes");
  }
  return deepFreezeJson(plan);
}

/** Answer node follow-ups from the frozen result; only a miss permits more Figma reads. */
export function lookupFrozenNodeResult(plan, nodeId) {
  if (typeof nodeId !== "string" || nodeId.length === 0) {
    throw new TypeError("frozen-query-node-id-required");
  }
  const restored = Object.isFrozen(plan)
    ? plan
    : restoreFrozenNamingPlan(serializeFrozenNamingPlan(plan));
  const item = restored.items.find((candidate) => candidate.nodeId === nodeId);
  return item === undefined
    ? Object.freeze({ source: "cache-miss", allowFigmaLookup: true })
    : Object.freeze({
        source: "frozen-plan",
        allowFigmaLookup: false,
        item,
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

function existingHtmlSuffix(currentName, baseName) {
  const prefix = `${baseName}-`;
  if (
    typeof currentName !== "string" ||
    !currentName.startsWith(prefix) ||
    !validateDynamicTextName(currentName).valid
  ) {
    return null;
  }
  const suffix = currentName.slice(prefix.length);
  return /^[1-9]\d*$/.test(suffix) ? suffix : null;
}

function assignExistingSuffixes(htmlGroups) {
  const assignedByGroup = new Map();
  const ownerBySuffix = new Map();

  function relocate(groupIndex, blockedSuffixes, visitedGroups) {
    const currentSuffix = assignedByGroup.get(groupIndex);
    for (const suffix of htmlGroups[groupIndex].existingSuffixes) {
      if (blockedSuffixes.has(suffix)) continue;
      const owner = ownerBySuffix.get(suffix);
      if (owner === undefined) {
        if (currentSuffix !== undefined) ownerBySuffix.delete(currentSuffix);
        ownerBySuffix.set(suffix, groupIndex);
        assignedByGroup.set(groupIndex, suffix);
        return true;
      }
      if (owner === groupIndex || visitedGroups.has(owner)) continue;
      const nextVisited = new Set(visitedGroups).add(owner);
      if (relocate(owner, new Set(blockedSuffixes).add(suffix), nextVisited)) {
        if (currentSuffix !== undefined) ownerBySuffix.delete(currentSuffix);
        ownerBySuffix.set(suffix, groupIndex);
        assignedByGroup.set(groupIndex, suffix);
        return true;
      }
    }
    return false;
  }

  htmlGroups.forEach((group, groupIndex) => {
    for (const suffix of group.existingSuffixes) {
      const owner = ownerBySuffix.get(suffix);
      if (owner === undefined) {
        ownerBySuffix.set(suffix, groupIndex);
        assignedByGroup.set(groupIndex, suffix);
        return;
      }
      if (relocate(owner, new Set([suffix]), new Set([owner]))) {
        ownerBySuffix.set(suffix, groupIndex);
        assignedByGroup.set(groupIndex, suffix);
        return;
      }
    }
  });

  return { assignedByGroup, ownerBySuffix };
}

/**
 * Split one known business field by exact canonical HTML in frozen document order.
 * Existing legal -N names are retained before unassigned HTML groups take new numbers.
 */
export function assignCanonicalHtmlSuffixNames(entries) {
  if (!Array.isArray(entries)) {
    throw new TypeError("html-suffix-entries-must-be-an-array");
  }

  const copyGroups = new Map();
  entries.forEach((entry, index) => {
    if (typeof entry?.characters !== "string") {
      throw new TypeError(`html-suffix-characters-must-be-a-string: ${index}`);
    }
    if (typeof entry.businessField !== "string" || entry.businessField.length === 0) {
      throw new TypeError(`html-suffix-business-field-required: ${index}`);
    }
    if (typeof entry.canonicalHtml !== "string") {
      throw new TypeError(`canonical-html-must-be-a-string: ${index}`);
    }
    if (!validateDynamicTextName(entry.baseName).valid) {
      throw new TypeError(`html-suffix-base-name-invalid: ${index}`);
    }
    if (/-[1-9]\d*$/.test(entry.baseName)) {
      throw new TypeError(`html-suffix-base-name-must-not-have-suffix: ${index}`);
    }
    const currentName = entry.currentName ?? entry.name;
    if (typeof currentName !== "string") {
      throw new TypeError(`html-suffix-current-name-required: ${index}`);
    }

    let fields = copyGroups.get(entry.characters);
    if (fields === undefined) {
      fields = new Map();
      copyGroups.set(entry.characters, fields);
    }
    let group = fields.get(entry.businessField);
    if (group === undefined) {
      group = { baseName: entry.baseName, members: [] };
      fields.set(entry.businessField, group);
    } else if (group.baseName !== entry.baseName) {
      throw new TypeError(`html-suffix-inconsistent-base-name: ${index}`);
    }
    group.members.push({ entry, index, currentName });
  });

  const results = new Array(entries.length);
  for (const fields of copyGroups.values()) {
    for (const group of fields.values()) {
      const htmlByValue = new Map();
      for (const member of group.members) {
        let htmlGroup = htmlByValue.get(member.entry.canonicalHtml);
        if (htmlGroup === undefined) {
          htmlGroup = { members: [], existingSuffixes: [] };
          htmlByValue.set(member.entry.canonicalHtml, htmlGroup);
        }
        htmlGroup.members.push(member);
        const suffix = existingHtmlSuffix(member.currentName, group.baseName);
        if (suffix !== null && !htmlGroup.existingSuffixes.includes(suffix)) {
          htmlGroup.existingSuffixes.push(suffix);
        }
      }

      const htmlGroups = [...htmlByValue.values()];
      if (htmlGroups.length === 1) {
        for (const member of htmlGroups[0].members) {
          results[member.index] = Object.freeze({
            ...member.entry,
            currentName: member.currentName,
            finalName: group.baseName,
            suffix: null,
            action: member.currentName === group.baseName ? "keep" : "rename",
          });
        }
        continue;
      }

      const { assignedByGroup, ownerBySuffix } = assignExistingSuffixes(htmlGroups);
      let nextSuffix = 1;
      htmlGroups.forEach((htmlGroup, groupIndex) => {
        let suffix = assignedByGroup.get(groupIndex);
        if (suffix === undefined) {
          while (ownerBySuffix.has(String(nextSuffix))) nextSuffix += 1;
          suffix = String(nextSuffix);
          ownerBySuffix.set(suffix, groupIndex);
          assignedByGroup.set(groupIndex, suffix);
          nextSuffix += 1;
        }
        const finalName = `${group.baseName}-${suffix}`;
        for (const member of htmlGroup.members) {
          results[member.index] = Object.freeze({
            ...member.entry,
            currentName: member.currentName,
            finalName,
            suffix,
            action: member.currentName === finalName ? "keep" : "rename",
          });
        }
      });
    }
  }

  return Object.freeze(results);
}

/** Styled segments/HTML are deferred until final name targets actually need them. */
export function planDeferredRichTextReads(entries, options = {}) {
  const { pageCenterUpload = false, cache = createTaskReadCache() } = options;
  if (typeof pageCenterUpload !== "boolean") {
    throw new TypeError("page-center-upload-must-be-a-boolean");
  }
  assertTaskReadCache(cache);
  const coverage = auditTextKeyCoverage(entries);
  if (!coverage.complete) {
    throw new Error("text-key-coverage-incomplete");
  }
  const nameTargets = coverage.assessments.flatMap((assessment, index) =>
    assessment.result === TEXT_KEY_DECISION.NAME
      ? [
          {
            nodeId: entries[index].nodeId,
            characters: entries[index].characters,
          },
        ]
      : [],
  );
  const duplicateIndexes = new Set(
    findDuplicateTextGroups(nameTargets).flatMap(({ indexes }) => indexes),
  );
  const nodeIds = nameTargets.flatMap((target, index) =>
    pageCenterUpload || duplicateIndexes.has(index) ? [target.nodeId] : [],
  );
  const planned = planUncachedTaskReads(
    cache,
    nodeIds.map((resourceId) => ({
      kind: "node",
      resourceId,
      requestedFields: DEFERRED_RICH_TEXT_FIELDS,
    })),
  );

  return Object.freeze({
    phase: "deferred-rich-text",
    reason: pageCenterUpload
      ? "page-center-output"
      : "duplicate-copy-comparison",
    nodeIds: Object.freeze(
      planned.requests.map(({ resourceId }) => resourceId),
    ),
    requests: planned.requests,
    cacheHits: planned.cacheHits,
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
