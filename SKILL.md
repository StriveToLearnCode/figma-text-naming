---
name: figma-text-naming
description: Use when 用户提供 Figma Design 链接并要求识别、生成、复核或写回需要独立文案 Key 的 UI Text，也包括以“动态文字命名”“特效文字”“文案去重”或“重复文案命名”等旧说法提出的任务；只处理完整效果区域，可按需上传 Page Center。仅查看、实现、普通静态文字编辑或只给链接时不触发。
---

# Figma UI 文案 Key 命名

## 前置条件与边界

- 调用 Figma `use_figma` 前，加载并遵循 `figma-use` Skill。
- 完整读取 [动态文本命名规范](references/dynamic-text-naming-rules.md)。该文件只回答“已经确认需要独立文案 Key 的 Text 应该怎么命名”，是名称格式、业务域、字段语义、重复文案与 HTML、兼容迁移的唯一事实源；不要在本文件另写命名规则。
- 核心问题始终是：**这个 Text 是否是一段需要独立文案 Key 管理的 UI 文案？** 不以运行时是否变化作为判断标准。
- 只读取 Figma 链接限定的文件、页面或节点。候选判断不得读取飞书、代码仓库、需求文档、API、`ui-meta`、`review.textKey` 或外部配置。
- 只命名目标预览区域内部的可编辑 `TEXT`。切图素材、母组件、组件资产、素材陈列、标注、说明区和其他非预览区域不进入 Scan Ledger，也不计入扫描数或 `skip`。
- Figma Design 链接与“动态文字命名”“特效文字命名”“特效文本”“文案去重”或“重复文案命名”之一共同出现时，沿用默认写回授权。用户明确要求只读、预览、不要修改或先确认时禁止写入。

## 原子流程

严格执行：

`定位预览区域 -> 创建任务级读取缓存 -> 冻结一级索引块 -> 分块轻量账本并即时归档 -> 结构级批量 skip -> 判断 name / skip / confirm -> 仅 name 候选读取必要样式与 HTML -> 仅 confirm 必要时补区域截图 -> 缓存 Coverage Audit + 命名 + Preflight -> Naming Plan Freeze 并保存 -> 批量写回 -> Readback`

前一阶段未完成不得进入后一阶段。第一次写入前必须完成所有 Text 的最终判断、所有 `name` 节点的命名、冲突检查和唯一一次 Naming Plan Freeze。禁止边发现、边命名、边写回。初判 `confirm` 可在必要截图后整组收敛；Freeze 后不得修改判断、名称或分组。

任务开始立即调用 `createTaskReadCache`。轻索引统一交给 `runPreviewTextIndexCoverage`；范围规划、overflow 发现、结构拆分、重试和逐块归档全部由 Runner 内部完成，Agent 不得自行规划或重试索引范围。Runner 只向 Agent 返回完整 Scan Ledger 与 `已完整扫描 N 个 Text`，或真正无法覆盖时的技术错误。其他定向读取先调用 `planUncachedTaskReads`，取得结果后立即 `cache.record`。每个 Text 的同一投影、每个祖先、每个 Component、每个区域截图原则上各最多一次，后续一律复用缓存。

## 定位预览区域

1. 链接指向整页或高层节点（如 `0:1`）时，先调用 `planPreviewScopeDiscovery`，只浅层读取 `id/name/type` 及其父子层级。禁止请求 `characters`、styled text segments、递归文本内容或整页 `TEXT` selector。
2. 定位名称以 `预览图/` 开头的完整效果区域。Figma selector 无法匹配中文、返回空结果或报错时，复用已取得的浅层结构，在本地调用 `findPreviewScopeCandidates`，按 `node.name.startsWith()` 判断；禁止退化为整页 Text 扫描。浅层结构必须保留到直接子节点的关系，供第一次轻索引前完成分块。
3. 命中多个范围时优先冻结互不包含的最具体 `预览图/`，避免祖先与后代重复扫描。
4. 无法可靠定位时停止并请求用户确认范围，不得用切图、组件资产或说明区补足扫描数。

冻结区域 ID 后，把预览区域与已缓存的浅层层级交给 Runner。Runner 从预览区域下的一级板块开始；一级节点只是包装层时，选择每条分支上最近的稳定子 `FRAME/SECTION/COMPONENT/INSTANCE`。找不到初始稳定块时停止，不得把整个预览区域作为兜底读取范围。

Runner 的每个请求只递归读取一个结构范围，Coverage 投影严格只允许 `id`、逐字 `characters`、当前 `name`、`ancestorPathRef`、`componentRef`，并分别用 `ancestorPaths`、`components` 字典承载重复结构。例如：

```json
{
  "dictionaries": {
    "ancestorPaths": { "path:1": [{ "id": "...", "name": "...", "type": "FRAME" }] },
    "components": { "component:1": [{ "id": "...", "name": "...", "type": "COMPONENT" }] }
  },
  "texts": [
    { "id": "...", "characters": "...", "name": "...", "ancestorPathRef": "path:1", "componentRef": "component:1" }
  ]
}
```

禁止在每个 Text 上重复返回 `ancestorPath` 或 `component`，也禁止请求 `type`、variable binding、截图、styled text segments、完整 HTML、完整节点或其他字段。不得先请求整个预览区域再依赖返回截断恢复，也不得按每 25 个或其他固定 Text 数量分页。

Runner 必须只使用最初缓存的完整浅层结构处理所有超限，不得依赖截断内容探索范围。Agent 不读取或消费 Runner 的内部范围元数据、拆分计划和重试状态。Runner 对外只保证：父超限范围不进入 Text ledger，同一超限范围不重读，不按 Text 数量分块，最终完整叶范围不重不漏。若读取接口确实无法继续安全覆盖，Runner 返回 `当前读取接口无法进一步安全拆分该节点`；不得要求用户修改 Figma 或增加容器来适配读取实现。

Runner 只从全部归档完成的叶范围在本地合并 Scan Ledger；父超限范围和未完成范围不得参与合并，跨叶范围出现重复 `nodeId` 必须作为范围重叠错误停止。内部叶范围归属只保存在任务缓存中，不返回给 Agent；Agent 收到的 Ledger 只保留轻量字段、所属预览区域和一级板块。不得要求 Figma 或工具把全量 Text JSON 再一次性返回给模型，也不得根据 placeholder、当前名称或其他信号提前移除节点。

## 结构级排除

只使用轻索引在本地完成结构分组，并为账本写入 `structuralAssessment`：

- `visual-fragment`：更大逻辑字段因排版、字号、颜色或特效被拆出的视觉碎片，最终 `skip`。
- `repeated-entity-field`：重复 Item 中由业务实体直接填充的字段，最终 `skip`。
- `eligible`：能确定不属于以上两类，等待强证据或少量补充判断。
- `confirm`：当前轻量证据不足以可靠完成结构排除，先进入待确认组；只有后续必要截图可再收敛。

倒计时拆成 `2 0 : 0 9 : 0 9` 时，每个单独 Text 都是 `visual-fragment`。它们运行时可能变化，但不是完整可命名 UI 文案。

只有同时满足以下条件，才把字段判为 `repeated-entity-field`：

- 位于列表、排行榜行、用户卡、奖励 Item、道具卡等重复结构；
- 同一 Component / Instance / Auto Layout 中存在多个同构 Item；
- 在各 Item 中占据同一结构槽位；
- 整个 Text 由该 Item 对应的业务实体数据直接填入，而不是包含固定文案结构的模板。

排行榜昵称、积分、实体排名，以及奖励 Item 的道具名称和数量，满足这些条件时均 `skip`。`已获得 XX 个` 等固定模板不属于整段实体字段，移出排除组继续判断。固定领奖台席位、奖励档位或角标也不能只因处于重复结构而判实体字段。

确认同构 Item 后，以共同祖先或组件为 `groupId`，调用 `applyGroupStructuralAssessments` 一次覆盖整组 `memberNodeIds`。Coverage Audit 只机械确认组员最终为 `skip`，不得把它们重新纳入 AI 或上下文补读。禁止用排行榜、奖励、昵称、数量等业务白名单或字符串 `includes` 代替结构证据。

调用 `buildStructureReuseGroups` 按 Component 或 ancestor 相对结构槽位收敛其余同构 Text。同一 Component / 祖先结构槽位只保留一个代表节点供后续判断；最终用 `applyStructureReuseDecisions` 把代表节点的结果复用到整组。一次任务内已经分析过的结构签名直接复用结果，不得逐 Text 重复判断。重复原文只共享后续去重分析，不自动 `skip`。

## 文案 Key 判断

先调用 `applyLightIndexSignals`，只从轻量账本提取 placeholder，再合并已由同槽位不同文案证明的信号。Variable、Text Component Property 等 binding 不属于 Coverage 字段；只有未决代表组确实需要时，才可在无截图的定向上下文读取中补查一次并写入缓存。调用 `applyStrongEvidenceDecisions` 后，以下强证据直接得到 `keyDecision: name`，不得再送 AI 证明：

- 完整文案含明确 placeholder，如 `当前轮次：xx`、`当前财富值：xxxx/100`、`أزياء xxxxxx`；
- Figma Variable、Text Component Property 或其他明确文字绑定；
- 同一完整文案槽位在 Component Instance、Variant 或页面状态中出现不同文案。

强证据只决定进入 `name` 候选，不代替后续业务域、字段语义、重复文案和 HTML 命名检查。结构排除优先于强证据：重复实体字段或视觉碎片即使含 `XX` 或 binding，仍保持整组 `skip`。

仅对仍无 `keyDecision` 的 `eligible` 组调用 `planTargetedContextReads(entries, { cache })`。按 shared ancestor 和 Component 结构一次补读代表节点所需的 siblings、nearby Text、组件职责或文字 binding；此阶段禁止截图、styled text segments 和 HTML。缓存命中不调用 Figma，直接把缓存上下文交给代表节点；同一上下文资源服务多个组时只读一次。

只把每组一个代表节点交给 AI 回答：

> 这个 Text 是否是一段需要独立文案 Key 管理的 UI 文案？

输出只允许：

- `name`：需要建立 `文案/...` Key，进入命名阶段。
- `skip`：不是独立文案 Key 的目标。
- `confirm`：当前 Figma 证据不足，需人工确认。

“字段语义明确”“运行时会变化”“看起来像数字、价格、进度、时间或名称”均不能单独推出 `name`。例如：

- 排行榜昵称、积分和奖励 Item 的名称、`1x` 是重复实体字段，`skip`；
- 固定奖励档位 `700 / 3200 / 10000`、固定标题和规则是设计配置或固定文案，`skip`；
- 孤立价格或无语义数字在缺少足够结构上下文时 `confirm`；
- `22500/550000` 只有在 ancestor、相邻标签、组件职责和区域截图共同证明它是独立管理的完整进度文案槽位时才 `name`，不能仅凭数值格式或“进度”语义得出结论。

不得维护排行榜、充值、奖励、进度等无限增长的业务白名单。不得只看 `characters`，也不得输出置信度。此阶段先让每个组归约为 `name | skip | confirm`；只有后续必要截图可以把 `confirm` 整组改为 `name`、`skip` 或继续 `confirm`。

## 少量补读与复用

补读请求只允许包含未决组，不得包含已由结构或强证据收敛的节点。每组输入至少包含：

```json
{
  "groupId": "stable-group-id",
  "representativeNodeId": "node-id-1",
  "memberNodeIds": ["node-id-1", "node-id-2"],
  "groupingBasis": "shared-ancestor | component-structure | spatial-region",
  "context": {
    "previewScope": { "nodeId": "...", "name": "..." },
    "primarySection": { "nodeId": "...", "name": "..." },
    "sharedAncestors": [{ "nodeId": "...", "type": "...", "name": "..." }],
    "componentOrInstance": { "nodeId": "...", "type": "...", "name": "..." },
    "neighboringTexts": [{ "nodeId": "...", "characters": "...", "relation": "..." }],
    "repeatedStructures": [{ "ancestorNodeId": "...", "memberNodeIds": ["..."] }]
  },
  "text": { "nodeId": "node-id-1", "characters": "...", "name": "...", "parentPath": ["..."] }
}
```

同组一次输出：

```json
{
  "groupId": "stable-group-id",
  "representativeNodeId": "node-id-1",
  "keyDecision": "name",
  "reason": "..."
}
```

不得为单个 Text 重复读取 Figma 上下文或逐层探索祖先。所有上下文先查任务缓存；缓存缺字段时，只补读最小缺口并立即合并缓存。组内代表节点判断后立即本地复用，不得把其余成员再次交给 AI。

完成初判后，先对 `name` 候选调用 `planDeferredRichTextReads(entries, { cache, pageCenterUpload })`。只读取现有命名规则或 Page Center 真正需要的 styled text segments / HTML；`skip`、`confirm` 和其他非候选一律禁止读取。每个 name 节点的富文本投影最多补读一次。

然后才处理仍为 `confirm` 且缓存无法回答的组。只有具体验证问题必须依赖视觉布局时，才把这些节点传给 `planConfirmScreenshotReads(entries, { requiredNodeIds, cache })`；按稳定业务区域合并截图，一张截图同时服务区域内多个 confirm 组。禁止为 `name`、`skip`、Coverage 或“以防万一”截图。用 `applyConfirmEvidenceDecisions` 把截图结论一次复用到整组；业务语义证据仍不足则保留 `confirm`。若截图支持转为 `name`，但该节点还需要未缓存的 styled segments / HTML 才能完成命名，禁止回跳深读，并在 Freeze 前报告读取失败；不得因技术数据缺口保留 `confirm`。

## Coverage 与冻结

- 调用 `auditCachedTextKeyCoverage(cache, assessedEntries)` 审计目标预览区域，不审计整页。它必须先从已归档的完整叶子块合并节点集合，再与本地判断结果逐 `nodeId` 对齐；任何未归档块、未完成的溢出子块或节点集合差异都使 Coverage 失败。禁止为 Coverage 重新调用 Figma，或要求把所有 Text JSON 重新聚合传回模型。
- 每个缓存节点最终只需可归约为 `name | skip | confirm`：结构组可直接归约为 `skip/confirm`，其余节点需要 `keyDecision`。
- Coverage 不要求每个节点读过 siblings、nearby Text、截图、styled text segments、HTML 或完整上下文；不得把“已完整读取上下文”作为覆盖条件。
- Coverage 不完整时，禁止命名、Preflight、计划冻结、Figma 写入和 Page Center 上传。Readback 不能替代 Coverage。
- Coverage Audit 不重新解释 `visual-fragment` 或 `repeated-entity-field`，也不展开已整组排除的重复实体字段。
- Coverage Audit 是纯本地机械检查，禁止触发 Figma、截图、AI、重新分组或重新判断。此时仍不调用 `freezeTextKeyDecisions`；本流程只在全部命名和 Preflight 完成后执行一次 Naming Plan Freeze。

## 命名、Preflight 与写回

- 对全部 `nameTargets` 完整应用 `references/dynamic-text-naming-rules.md`，保留 `文案/${business-domain}/${semantic-key}`、重复文案与 HTML、PageCenter Key 和兼容迁移规则。
- 只消费此前 name 候选阶段已经缓存的必要 styled text segments / HTML，不得在命名阶段重新读取同一节点。无法稳定取得或序列化时在 Freeze 前报告读取失败，不得用纯 `characters` 代替，也不得转为 `confirm`。
- 对“逐字相同原文 + 同一业务字段”按完整 canonical HTML 分组，并调用 `assignCanonicalHtmlSuffixNames` 自动生成稳定 `-N` 名称。`characters` 必须逐字匹配，不得翻译、改写或合并繁简文本；原文不同仍分别完成业务语义判断，不套用同一个 `-1/-2` 序列。相同 HTML 必须复用名称；优先保留合法现有后缀，确保后续扫描顺序变化时 HTML 与后缀映射不反转，其余按冻结后的稳定文档顺序分配。禁止使用 nodeId 或随机数。HTML 不同本身不得进入 `confirm`，只有业务域、字段语义或业务字段归属无法确定时才允许 `confirm`。
- 对当前名称和拟写名称的全部唯一值一次校验。少量名称可直接传参；批量名称必须写临时 JSON 后使用 `--input <file>`，或通过 stdin 使用 `--stdin`，不得作为大量 shell 参数或 Base64 传递。随后检查 Figma 名称冲突；上传 Page Center 时，在任何写入前一次检查完整 `key -> HTML` 映射。
- 调用 `freezeNamingPlan(entries, namingResults, { cache })` 唯一一次冻结账本每个节点的 action：`rename | keep | skip | confirm`。该调用必须再次校验缓存中的完整叶范围与 entries 节点集合完全一致；所有 `name` 节点必须已经得到合规 `finalName`，或因命名证据不足转为 `confirm`。立即调用 `serializeFrozenNamingPlan`，把序列化结果作为本次任务的权威判断快照保存到当前任务状态，直到任务结束；后续输出、写回和追问都只消费此快照。
- 非只读任务只批量写 `rename` 对应 `TEXT.node.name`，然后批量回读并与冻结的 `finalName` 对比。`keep/skip/confirm` 不写入。
- 默认不修改 `characters`、样式、位置、尺寸、可见性、布局、层级、板块结构、组件关系或任何其他 Figma 数据。
- 用户要求上传 Page Center 时，回读 Figma 成功后再加载 `pagecenter` Skill，消费同一冻结计划批量上传并回读；上传阶段不得重新分组、改名或覆盖冲突。

## Freeze 后追问

- 用户后续追问某个节点、原文、位置、判断原因或名称时，先恢复已保存快照并调用 `lookupFrozenNodeResult`；也可在冻结 `items` 中按逐字 `characters` 或已缓存位置本地查询。
- 命中冻结结果时直接回答，禁止重新扫描页面、重建 Scan Ledger、重跑 Coverage、重新分组、重新调用 AI 或重新读取 Figma。
- 冻结快照未命中时，先查任务读取缓存。只有冻结结果和缓存都无法回答，才允许对具体缺口做一次最小 Figma 补查；不得因此扫描整页或其他节点。补查只回答追问，不得修改已冻结计划。

## 性能与验证

- 正常完整页面的 Figma 调用以“范围发现 1 次 + 每个一级稳定块各 1 次 + 仅超限分支的结构叶范围各 1 次 + 少量未决组补读 + 写入/回读”为预算。调用数只随结构拆分范围和真实未决组增长，不随 Text 数量按固定分片线性增长。
- 预览区域根节点的递归 Text 读取调用数必须为 0。每个轻索引 `blockNodeId` 最多出现一次；已规划、已完成或已归档为 overflow/truncated 的范围都不得重读。
- 禁止每 25 个 Text 或按任何固定节点数反复调用 Figma；禁止对全量 Text 获取截图、siblings、styled text segments、HTML 或完整上下文。
- AI 输入只包含未由结构组或强证据收敛的代表节点。同构结构只分析一次并复用，Coverage Audit 不得触发新的 Figma 或 AI 调用。
- 300～500 个 Text 的页面，定向深读节点数必须接近最终 `name + 必要 confirm` 的节点或代表组数量，而不是 Scan Ledger 总数；若深读随总 Text 数线性增长，立即停止并检查范围、分组与缓存是否失效。
- 任务结束前检查缓存快照：同一 `indexBlock` 不得出现重复规划或归档；同一 node、ancestor、Component、regionScreenshot 不得出现重复键；所有深读必须能追溯到 name 候选或明确需要截图的 confirm 组。任何因返回截断而发生的同范围重读都直接判为性能缺陷，不以最终 Coverage 成功抵消。
- 大批量审计数据只通过工具结果、临时 JSON 文件或 stdin 传递，禁止 shell 命令行参数和 Base64。
- 平时修改本 Skill 先运行离线 semantic regression fixture 与 `node --test tests/*.test.mjs`；小范围 Figma Smoke Test 通过后再做整页集成测试。

## 输出合同

- 只读任务列出 `name` 节点的逐字 `characters`、完整中文含义、结果和名称。原文保留语言、标点、大小写、空白、换行和 placeholder；只有中文含义把 placeholder 表示为 `{{}}`。
- “共扫描 N 个文本”只统计 Scan Ledger。范围外 Text 不计入 `N` 或 `skip`。
- 所有 `confirm` 无论产生于结构判断、文案 Key 判断还是业务语义命名阶段，都必须按逐字相同的 `characters` 分组后展示。原文不同的节点不得合并；同一原文即使位于不同板块、原因或冲突细节不同，也只展示一个组，组内合并说明差异。禁止按节点逐条输出同一原文。
- 每个待确认组必须依次展示：`文本`、`位置`、`为什么待确认`、`当前冲突`、`需要确认`。`位置` 使用用户可识别的预览区域、一级板块或稳定业务区域名称，去重后合并列出，不输出节点 ID。`为什么待确认` 说明阻止自动决定的具体证据缺口；`当前冲突` 明确列出当前无法同时满足的差异或至少两种合理解释；`需要确认` 必须是用户回答后即可解除该组阻塞的单一业务问题，不能只是“请确认如何处理”或重复原因。
- 不得把“同原文存在不同完整 HTML”列为待确认原因；该差异应已在命名阶段按 canonical HTML 自动分配数字后缀。待确认说明必须指向尚未确定的业务语义本身。
- 写回后输出：`命名完成：共扫描 N 个文本，已正确命名 M 个，跳过 S 个，待确认 C 个（G 组），失败 F 个。` `C` 保持节点数，`G` 是按逐字 `characters` 聚合后的待确认组数；已正确命名包含回读一致的 `rename` 和复核正确的 `keep`。只读任务的汇总同样同时给出待确认节点数和组数。
- 仅当待确认或失败大于零时列出对应内容；待确认按上述组级合同展示，失败仍按实际失败项展示。默认不输出成功项、跳过项、节点 ID、内部账本、置信度或执行日志。
- 上传 Page Center 时另加：`PC 上传：成功 U 个，失败 P 个。` 只逐项列出上传失败项。

待确认组示例：

```text
文本：$0.99
位置：板块2

为什么待确认：
当前 Figma 上下文不能确定该价格属于购买价格、充值金额还是其他业务字段。

当前冲突：
`purchase-price` 与 `recharge-amount` 都是合理解释，现有证据无法排除其中任一项。

需要确认：
该价格具体表示哪个业务字段？
```
