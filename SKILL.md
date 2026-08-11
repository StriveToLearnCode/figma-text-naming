---
name: figma-text-naming
description: Use when 用户提供 Figma Design 链接并明确要求动态文字或特效文字命名、特效文本、文案去重或重复文案命名；基于完整效果区域的 Figma 结构与语义识别动态 Text，生成、复核或写回业务名称，可按需上传 Page Center。仅查看、实现、静态文字编辑或只给链接时不触发。
---

# Figma 动态文本命名

## 前置条件与边界

- 调用 Figma `use_figma` 前，加载并遵循 `figma-use` Skill。
- 完整读取 [动态文本命名规范](references/dynamic-text-naming-rules.md)。该文件只负责“已经确认需要命名的文本，名称应该怎么取”，是名称格式、业务域、字段语义、命名证据、重复文案拆名和兼容迁移的唯一事实源；本文件只维护范围、候选、读取、执行和输出流程。
- 只接受 Figma Design 链接和用户自然语言要求作为任务输入，只读取链接限定的文件、页面或节点。候选判断不得读取飞书、代码仓库、需求文档、API、`ui-meta`、`review.textKey` 或外部配置。
- 只命名完整效果展示区域内或与其有明确归属关系的可编辑 `TEXT`。切图、素材陈列、设计标注、说明区和非最终效果展示区不进入扫描账本，不计入扫描数或 `skip`。
- 将 Figma Design 链接与“动态文字命名”“特效文字命名”“特效文本”“文案去重”或“重复文案命名”之一共同视为默认写回授权。用户明确要求只读、预览、不要修改或先确认时，禁止写入。

## 原子执行顺序

严格按以下顺序一次执行，不得跳步、交错或回退：

`Scan Ledger -> Placeholder Scan -> Batch AI Semantic Assessment -> Coverage Audit -> Candidate Freeze -> Naming -> Preflight -> Naming Plan Freeze -> Figma Write -> Readback`

1. **Scan Ledger**：定位完整效果展示区域，将范围内或明确归属该区域的全部可编辑 `TEXT` 记入账本。不得根据 placeholder、当前名称、样式、切图状态或其他候选信号提前裁剪。
2. **Placeholder Scan**：对账本全部 Text 批量执行 `hasDynamicPlaceholder(node.characters)`。命中项直接写入 `semanticAssessment: "dynamic"`，不再交给 AI 证明。
3. **Batch AI Semantic Assessment**：只把没有 placeholder 的账本 Text 分组交给 AI。每组一次分析，不得逐 Text 调 AI。
4. **Coverage Audit**：调用 `auditDynamicTextCandidateCoverage`，确认每项已经具有 `nodeId`、`characters` 和合法的 `semanticAssessment`。不完整时立即停止。
5. **Candidate Freeze**：调用 `freezeDynamicTextCandidates` 一次冻结结果。只有 `dynamic` 进入 Naming，`static` 映射为 `skip`，`confirm` 映射为 `confirm`。
6. **Naming**：只对冻结的 dynamic 候选应用 `references/dynamic-text-naming-rules.md`，生成或复核名称；不得另写业务域或 semantic-key 规则。
7. **Preflight**：按需完成重复原文与 HTML 分组、名称批量校验、Figma 名称冲突和 Page Center `key -> HTML` 冲突检查。
8. **Naming Plan Freeze**：为账本每个节点确定唯一结果 `rename`、`keep`、`skip` 或 `confirm` 并冻结计划。
9. **Figma Write**：非只读任务只批量写入冻结计划中的 `rename` 项。
10. **Readback**：批量回读所有写入项并与冻结的 `finalName` 对比。用户要求上传 Page Center 时，只在回读后消费同一冻结计划上传并回读。

前一阶段未完成不得进入后一阶段。禁止边发现、边命名、边写回。Naming Plan Freeze 后不得重新调用 AI 改动态判断，不得修改 `result`、`finalName` 或分组。

## Scan Ledger 与 Placeholder

- 先通过页面结构、视觉完整性、素材关系、位置和标注识别完整页面、弹窗、浮层、独立状态或明确业务模块，不要求容器名称包含“预览图”。无法可靠定位时不得扩大到整页盲扫，应等待用户确认范围。
- 账本必须保留目标区域全部可编辑 Text。禁止 `data.filter((item) => hasDynamicPlaceholder(item.characters))` 或任何等价的提前过滤。
- 每项至少保留 `nodeId` 与逐字复制的 `characters`，并记录所属一级板块及已批量读取的结构归属供后续复用。不得用 `node.name` 替代 `characters`。
- `applyPlaceholderScan` 返回与输入等长的账本；placeholder 命中项直接得到 `dynamic`，未命中项保持待 AI 判断。

## Batch AI Semantic Assessment

AI 只回答一个问题：

> 这个 Text 在当前 UI 结构中，是一个需要由内容/数据填入或替换的字段，还是设计本身的固定展示内容？

每个 Text 的输出值只允许：

- `dynamic`：当前 Figma 结构和语义足以判断它是需要由数据或状态内容填入或替换的字段。
- `static`：当前 Figma 结构和语义足以判断它属于设计固定展示内容。
- `confirm`：仅凭当前 Figma 无法可靠区分。

不得输出或使用置信度，也不得把 `confirm` 自动转换成 `dynamic` 或 `static`。不得维护 progress、ranking、nickname、countdown、title、rule、threshold、reward 等业务类型白名单，不得通过 `text.includes(...)`、`parentName.includes(...)` 或同类业务语义硬编码决定动态性。

判断对象是 Text 在结构中的“槽位职责”，不是字符看起来像数字、名称或时间：

- 同一职责槽位会随内容、数据或界面状态替换，即使当前 `characters` 是普通字面值，也判 `dynamic`。
- 一组平行位置各自展示稳定且不同的字面内容，并共同构成设计内固定配置、选项或刻度时，判 `static`；不能因为它们是数值或处于重复结构就判 dynamic。
- 当前结构既能解释为可替换槽位，也能解释为固定设计内容时，判 `confirm`。

优先按一级板块组织批次，再在板块内复用共享祖先、Component / Instance 与空间区域上下文。AI 每次分析的输入结构固定为：

```json
{
  "groupId": "stable-group-id",
  "groupingBasis": "primary-section | shared-ancestor | component-instance | spatial-region",
  "context": {
    "primarySection": { "nodeId": "...", "name": "..." },
    "sharedAncestors": [{ "nodeId": "...", "type": "...", "name": "..." }],
    "componentOrInstance": { "nodeId": "...", "type": "...", "name": "..." },
    "spatialRegion": { "label": "...", "screenshotRef": "optional-current-figma-screenshot" },
    "neighboringTexts": [{ "nodeId": "...", "characters": "...", "name": "...", "relation": "..." }],
    "parallelFields": [{ "nodeId": "...", "characters": "...", "name": "...", "relation": "..." }],
    "repeatedStructures": [{ "ancestorNodeId": "...", "memberNodeIds": ["..."] }]
  },
  "texts": [{ "nodeId": "...", "characters": "...", "name": "...", "parentPath": ["..."] }]
}
```

同一批次输出：

```json
{
  "assessments": [
    { "nodeId": "node-id-1", "semanticAssessment": "dynamic" },
    { "nodeId": "node-id-2", "semanticAssessment": "static" },
    { "nodeId": "node-id-3", "semanticAssessment": "confirm" }
  ]
}
```

输入只能使用当前 Figma 范围内已经读取的 `node.characters`、当前 `node.name`、一级板块、父级/祖先结构、相邻标签与兄弟文案、Component / Instance、平行字段、重复业务结构和对应区域截图。不得为了单个 Text 逐层探索祖先；先批量读取并复用组上下文，只有整个分组仍缺共同结构时才补读一次。

## 可选切图反证

- 切图不再是候选发现的必经输入，主流程不要求 `sliceStatus` 或 `sliceComparisonStatus`，也不默认调用切图 helper。
- 没有切图、找不到切图或对应关系复杂时，继续执行 AI Semantic Assessment，不得阻断或降级为 `confirm`。
- 只有对应切图已经容易取得、关系明确，并能可靠证明某段文字已包含在图片素材本身时，才可把当前 Figma 截图证据放入该组 AI 上下文，用于排除非 placeholder Text。
- `SLICE_COMPARISON_STATUS`、`assessLegacySliceEvidence` 和 `auditLegacySliceCandidateCoverage` 仅为旧实验 A/B 与回退保留。`verified-difference`、`verified-text-slot`、`no-text-slot`、slice coverage 等旧状态不得成为主候选成立或 Coverage 完成的条件。

## Coverage、冻结与命名

- Coverage Audit 只保证所有账本 Text 已被判断，不判断业务域、semantic-key、HTML 或最终名称。
- 每项最终必须有 `{ nodeId, characters, semanticAssessment: "dynamic" | "static" | "confirm" }`。缺少任一字段、值不合法，或 placeholder 项不是 `dynamic` 时，`complete = false`。
- Coverage 不完整时禁止 Candidate Freeze、Naming、Preflight、Naming Plan Freeze、Figma Write 和 Page Center upload；Readback 不能替代 Coverage。
- Candidate Freeze 后只有 `semanticAssessment === "dynamic"` 的节点进入命名。`static -> skip`；`confirm -> confirm`，两者均不参与命名。
- dynamic 候选后续完整应用 `references/dynamic-text-naming-rules.md`。命名证据不足时仍可在命名阶段得到 `confirm`，但不得反向修改已冻结的动态判断。

## 规范 HTML 与 Preflight

- 根据命名规则确定需要比较 HTML 的重复文案组；用户要求上传 Page Center 时，再为其余待上传候选补齐 HTML。非重复且不上传的候选不得仅为普通命名读取 styled text segments。
- 批量读取所需节点的 styled text segments。style 属性固定按颜色、字号、字重、行高输出；按 `100px = 1rem` 转换字号；将动态占位符转换为 `{{}}`；多种分段样式生成连续 `<span>`。无法取得必要样式或不能稳定序列化时记为 `confirm`，不得用纯 `characters` 替代 HTML。
- 按命名规则完成重复原文、业务字段与完整 HTML 分组。收集当前名称和拟写名称的全部唯一值，一次批量运行 `node '<本 Skill 目录>/scripts/validate-dynamic-text-name.mjs' <name...>` 并解析完整 JSON。
- 用户要求上传 Page Center 时，在任何写入前对冻结计划的完整 `name -> HTML` 集合调用 `findPageCenterKeyConflicts` 一次。冲突时按命名规则停止，不得在上传阶段二次分组、改名或覆盖。
- 上传前加载并遵循 `pagecenter` Skill，只使用任务中明确可用且有写入、批量和回读合同的文本同步出口。优先批量上传与回读；上传失败不得改变冻结计划。

## 性能与 Figma 读写

- Text 基础信息、一级板块、共享祖先、组件、空间区域、名称校验、写入和回读均优先批量处理；同板块和同共享祖先上下文只读取一次。
- 不逐 Text 调 AI，不逐 Text 探索祖先，不逐 Text 寻找切图。一组 Text 一次 AI 分析。
- styled text segments 只按命名去重或 HTML 需要读取。每次补读必须解决明确的分组证据缺口，不扩大用户范围。
- 写入阶段只消费冻结计划，只修改 `rename` 对应文字图层的 `node.name`。`keep`、`skip`、`confirm` 不写入；不得修改 `characters`、样式、位置、尺寸、可见性、层级、板块结构、组件关系或其他 Figma 数据。
- 优先批量写入全部 `rename`，再批量回读。无法写入或回读不一致时按实际状态报告失败，不得生成另一套名称。

## 输出合同

- 只读、预览或不要修改时，输出 dynamic 候选的动态文本、完整中文含义、结果和名称，并列出语义判断为 `confirm` 的 Text 与简短原因。默认使用编号列表，只有用户明确要求时才使用 Markdown 表格。
- “动态文本”必须逐字复制 `node.characters`，保留原语言、标点、大小写、空白、换行和 placeholder 写法；不得用图层名、翻译或业务标签代替。只有“完整中文含义”将 placeholder 表示为 `{{}}`。
- “共扫描 N 个文本”只统计进入账本的完整效果展示区域 Text；切图、素材陈列、标注和说明区域中的 Text 不计入 `N` 或 `skip`。
- 写回后输出：`命名完成：共扫描 N 个文本，已正确命名 M 个，跳过 S 个，待确认 C 个，失败 F 个。` 已正确命名包含回读一致的 `rename` 和复核正确的 `keep`；`static` 对应 `skip`；语义或命名阶段的 `confirm` 均计入待确认。
- 仅当待确认或失败大于零时逐项列出对应原文和简短原因。不得列出成功项、跳过项、节点 ID、内部账本、置信度、样式签名或执行日志，除非用户明确要求。
- 上传 PC 时另加：`PC 上传：成功 U 个，失败 P 个。` 只逐项列出上传失败项。没有 dynamic 候选时用一句话说明，不输出空表格。
