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

`定位预览区域 -> 轻索引建 Scan Ledger -> 本地结构分组收敛 -> 强证据直接 name -> 只补读未决代表节点 -> AI 判断少量未决组 -> Coverage Audit -> 对 name 执行命名规则 -> Preflight -> Naming Plan Freeze -> 批量写 node.name -> Readback`

前一阶段未完成不得进入后一阶段。第一次写入前必须完成所有 Text 的判断、所有 `name` 节点的命名、冲突检查和 Naming Plan Freeze。禁止边发现、边命名、边写回；冻结后不得重新调用 AI 修改判断、名称或分组。

## 定位预览区域

1. 链接指向整页或高层节点（如 `0:1`）时，先调用 `planPreviewScopeDiscovery`，只浅层读取 `id/name/type`。禁止请求 `characters`、styled text segments、递归文本内容或整页 `TEXT` selector。
2. 定位名称以 `预览页/`、`预览图/` 开头的完整效果区域。Figma selector 无法匹配中文、返回空结果或报错时，复用已取得的浅层结构，在本地调用 `findPreviewScopeCandidates`，按 `node.name.startsWith()` 判断；禁止退化为整页 Text 扫描。
3. 命中 `预览页/` 后，只在该节点内继续浅层寻找更具体的 `预览图/`。优先冻结更具体区域，避免祖先与后代重复扫描；没有更具体区域时才使用完整的 `预览页/`。
4. 无法可靠定位时停止并请求用户确认范围，不得用切图、组件资产或说明区补足扫描数。

冻结区域 ID 后调用 `planPreviewTextIndexReads`。每个目标预览区域最多一次递归 Text 查询，批量取得且只取得：`id`、`type`、逐字 `characters`、当前 `name`、ancestor path、Component / Instance path 和 variable binding。不得按每 25 个或其他固定 Text 数量分页重调 Figma。

调用 `buildPreviewTextLedger` 建账本并按 `nodeId` 去重。Ledger 只保留上述轻索引白名单和所属预览区域；即使上游意外返回 screenshot、styled text segments、HTML 或其他完整节点数据，也不得写入 Ledger。不得根据 placeholder、当前名称或其他信号提前移除节点。

## 结构级排除

只使用轻索引在本地完成结构分组，并为账本写入 `structuralAssessment`：

- `visual-fragment`：更大逻辑字段因排版、字号、颜色或特效被拆出的视觉碎片，最终 `skip`。
- `repeated-entity-field`：重复 Item 中由业务实体直接填充的字段，最终 `skip`。
- `eligible`：能确定不属于以上两类，等待强证据或少量补充判断。
- `confirm`：当前 Figma 证据不足以可靠完成结构排除，最终 `confirm`。

倒计时拆成 `2 0 : 0 9 : 0 9` 时，每个单独 Text 都是 `visual-fragment`。它们运行时可能变化，但不是完整可命名 UI 文案。

只有同时满足以下条件，才把字段判为 `repeated-entity-field`：

- 位于列表、排行榜行、用户卡、奖励 Item、道具卡等重复结构；
- 同一 Component / Instance / Auto Layout 中存在多个同构 Item；
- 在各 Item 中占据同一结构槽位；
- 整个 Text 由该 Item 对应的业务实体数据直接填入，而不是包含固定文案结构的模板。

排行榜昵称、积分、实体排名，以及奖励 Item 的道具名称和数量，满足这些条件时均 `skip`。`已获得 XX 个` 等固定模板不属于整段实体字段，移出排除组继续判断。固定领奖台席位、奖励档位或角标也不能只因处于重复结构而判实体字段。

确认同构 Item 后，以共同祖先或组件为 `groupId`，调用 `applyGroupStructuralAssessments` 一次覆盖整组 `memberNodeIds`。Coverage Audit 只机械确认组员最终为 `skip`，不得把它们重新纳入 AI 或上下文补读。禁止用排行榜、奖励、昵称、数量等业务白名单或字符串 `includes` 代替结构证据。

调用 `buildStructureReuseGroups` 按 Component path 和相对结构槽位收敛其余同构 Text。同一 Component / 结构槽位只保留一个代表节点供后续判断；最终用 `applyStructureReuseDecisions` 把代表节点的结果复用到整组。重复原文只共享后续去重分析，不自动 `skip`。

## 文案 Key 判断

先调用 `applyLightIndexSignals` 从轻索引提取 placeholder 和文字 variable binding，再合并已由同槽位不同文案证明的信号。调用 `applyStrongEvidenceDecisions` 后，以下强证据直接得到 `keyDecision: name`，不得再送 AI 证明：

- 完整文案含明确 placeholder，如 `当前轮次：xx`、`当前财富值：xxxx/100`、`أزياء xxxxxx`；
- Figma Variable、Text Component Property 或其他明确文字绑定；
- 同一完整文案槽位在 Component Instance、Variant 或页面状态中出现不同文案。

强证据只决定进入 `name` 候选，不代替后续业务域、字段语义、重复文案和 HTML 命名检查。结构排除优先于强证据：重复实体字段或视觉碎片即使含 `XX` 或 binding，仍保持整组 `skip`。

仅对仍无 `keyDecision` 的 `eligible` 节点调用 `planTargetedContextReads`。按 shared ancestor 和 Component 结构一次补读代表节点所需的 siblings、nearby Text、组件职责或区域截图，再只把这些代表节点交给 AI 回答：

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

不得维护排行榜、充值、奖励、进度等无限增长的业务白名单。不得只看 `characters`，也不得输出置信度或把 `confirm` 自动转换为其他结果。

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
    "repeatedStructures": [{ "ancestorNodeId": "...", "memberNodeIds": ["..."] }],
    "screenshotRef": "optional-current-figma-region-screenshot"
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

不得为单个 Text 重复读取 Figma 上下文或逐层探索祖先。区域截图只允许覆盖一个或多个未决组；截图、siblings 和 nearby Text 都不是 Coverage 必填字段。补读阶段禁止请求 styled text segments 或 HTML。组内代表节点判断后立即本地复用，不得把其余成员再次交给 AI。

## Coverage 与冻结

- 调用 `auditTextKeyCoverage` 审计目标预览区域账本，不审计整页。每个 Scan Ledger 节点最终只需可归约为 `name | skip | confirm`：结构组可直接归约为 `skip/confirm`，其余节点需要 `keyDecision`。
- Coverage 不要求每个节点读过 siblings、nearby Text、截图、styled text segments、HTML 或完整上下文；不得把“已完整读取上下文”作为覆盖条件。
- Coverage 不完整时，禁止命名、Preflight、计划冻结、Figma 写入和 Page Center 上传。Readback 不能替代 Coverage。
- 调用 `freezeTextKeyDecisions` 一次冻结 `name/skip/confirm`。只有 `nameTargets` 应用现有命名规范；命名证据不足时，该节点最终转为 `confirm`，但不得反向修改其他判断。
- Coverage Audit 不重新解释 `visual-fragment` 或 `repeated-entity-field`，也不展开已整组排除的重复实体字段。

## 命名、Preflight 与写回

- 对全部 `nameTargets` 完整应用 `references/dynamic-text-naming-rules.md`，保留 `文案/${business-domain}/${semantic-key}`、重复文案与 HTML、PageCenter Key 和兼容迁移规则。
- 调用 `planDeferredRichTextReads`：只有最终 `nameTargets` 中逐字重复且需要 HTML 比对的成员读取 styled text segments；用户要求上传 Page Center 时，才为其他最终待上传 `name` 项补齐 HTML。非候选、非重复且不上传的 Text 禁止读取 styled text segments 或 HTML。
- 批量读取必要的 styled text segments，按既有规则生成 HTML。无法稳定取得或序列化时转 `confirm`，不得用纯 `characters` 代替。
- 对当前名称和拟写名称的全部唯一值一次校验。少量名称可直接传参；批量名称必须写临时 JSON 后使用 `--input <file>`，或通过 stdin 使用 `--stdin`，不得作为大量 shell 参数或 Base64 传递。随后检查 Figma 名称冲突；上传 Page Center 时，在任何写入前一次检查完整 `key -> HTML` 映射。
- 调用 `freezeNamingPlan` 冻结账本每个节点的唯一 action：`rename | keep | skip | confirm`。所有 `name` 节点必须已经得到合规 `finalName`，或因命名证据不足转为 `confirm`。
- 非只读任务只批量写 `rename` 对应 `TEXT.node.name`，然后批量回读并与冻结的 `finalName` 对比。`keep/skip/confirm` 不写入。
- 默认不修改 `characters`、样式、位置、尺寸、可见性、布局、层级、板块结构、组件关系或任何其他 Figma 数据。
- 用户要求上传 Page Center 时，回读 Figma 成功后再加载 `pagecenter` Skill，消费同一冻结计划批量上传并回读；上传阶段不得重新分组、改名或覆盖冲突。

## 性能与验证

- 正常完整页面的 Figma 调用以“范围发现 1 次 + 每个预览区域轻索引 1 次 + 少量未决组补读 + 写入/回读”为预算，目标为个位数或低两位数，不随 Text 数量按固定分片线性增长。
- 禁止每 25 个 Text 或按任何固定节点数反复调用 Figma；禁止对全量 Text 获取截图、siblings、styled text segments、HTML 或完整上下文。
- AI 输入只包含未由结构组或强证据收敛的代表节点。同构结构只分析一次并复用，Coverage Audit 不得触发新的 Figma 或 AI 调用。
- 大批量审计数据只通过工具结果、临时 JSON 文件或 stdin 传递，禁止 shell 命令行参数和 Base64。
- 平时修改本 Skill 先运行离线 semantic regression fixture 与 `node --test tests/*.test.mjs`；小范围 Figma Smoke Test 通过后再做整页集成测试。

## 输出合同

- 只读任务列出 `name` 节点的逐字 `characters`、完整中文含义、结果和名称。原文保留语言、标点、大小写、空白、换行和 placeholder；只有中文含义把 placeholder 表示为 `{{}}`。
- “共扫描 N 个文本”只统计 Scan Ledger。范围外 Text 不计入 `N` 或 `skip`。
- 所有 `confirm` 无论产生于结构判断、文案 Key 判断、HTML 比对还是命名阶段，都必须按逐字相同的 `characters` 分组后展示。原文不同的节点不得合并；同一原文即使位于不同板块、原因或冲突细节不同，也只展示一个组，组内合并说明差异。禁止按节点逐条输出同一原文。
- 每个待确认组必须依次展示：`文本`、`位置`、`为什么待确认`、`当前冲突`、`需要确认`。`位置` 使用用户可识别的预览区域、一级板块或稳定业务区域名称，去重后合并列出，不输出节点 ID。`为什么待确认` 说明阻止自动决定的具体证据缺口；`当前冲突` 明确列出当前无法同时满足的差异或至少两种合理解释；`需要确认` 必须是用户回答后即可解除该组阻塞的单一业务问题，不能只是“请确认如何处理”或重复原因。
- 重复原文因完整 HTML 不同且缺少稳定场景限定名而进入 `confirm` 时，必须明确说明：相同原文不能直接共用 Page Center Key、哪些位置的 HTML 不同、当前 Figma 为什么不足以稳定拆名，并询问这些位置是否属于不同业务场景。不得只输出“板块 A：原因”“板块 B：原因”。
- 写回后输出：`命名完成：共扫描 N 个文本，已正确命名 M 个，跳过 S 个，待确认 C 个（G 组），失败 F 个。` `C` 保持节点数，`G` 是按逐字 `characters` 聚合后的待确认组数；已正确命名包含回读一致的 `rename` 和复核正确的 `keep`。只读任务的汇总同样同时给出待确认节点数和组数。
- 仅当待确认或失败大于零时列出对应内容；待确认按上述组级合同展示，失败仍按实际失败项展示。默认不输出成功项、跳过项、节点 ID、内部账本、置信度或执行日志。
- 上传 Page Center 时另加：`PC 上传：成功 U 个，失败 P 个。` 只逐项列出上传失败项。

待确认组示例：

```text
文本：已累计：xxL/100L
位置：板块5、板块4

为什么待确认：
两处原文相同，但完整 HTML 不同，因此不能直接共用同一个 Page Center Key；当前 Figma 上下文又不足以生成稳定且不同的业务场景限定名。

当前冲突：
板块5与板块4需要使用不同 HTML，但现有语义证据只能支持同一个基础名称。

需要确认：
这两处是否属于不同业务场景？
```
