---
name: figma-text-naming
description: '按照项目动态文本命名规范分析、审核、去重和重命名 Figma 特效文本。用户给出 Figma design 链接并提到 xx/XX 占位符、动态文本、特效文本、文本图层命名、批量改名、text key、命名检查、中文含义或文本去重时使用；即使用户没有点名 Skill，只要目标是为含动态占位符的文本生成或应用业务 Key，也要触发。'
---

# Figma 特效文本语义命名

根据文本内容、有效文字样式和业务上下文，为含 `xx`、`XX` 等占位符的动态文本生成稳定、准确的业务 Key 和完整中文含义。默认只读预览；只有用户明确要求命名、改名、写回或修复时才修改 Figma。

## 权威规则

开始处理前，完整读取 [references/naming-standard.md](references/naming-standard.md)。该文件是本 Skill 的命名事实源；不要凭记忆重写规则。

规则优先级从高到低：

1. 用户链接明确限定的扫描范围
2. 规范化文字与有效文字样式的精确去重结果
3. 已有且格式、语义、分组和冲突检查均合规的稳定名称
4. 当前 Figma 中可观察的业务语义证据
5. 根据标准词义生成的新名称

名称只表达稳定业务字段，不描述位置、颜色、Frame 编号或完整句子。中文含义必须忠实保留完整原文。

## 输入与默认行为

输入通常包含：

- Figma `/design/` 链接
- 可选扫描范围或业务背景
- 可选目标：预览、去重、检查、直接改名或审核并修复

默认行为：

- 用户说“扫描一下”“预览”“去重”“生成清单”或未明确要求修改时，进入 `propose`，只输出报告。
- 用户明确说“命名一下”“批量改名”“直接写回”“审核并修复”等时，进入 `apply`；完成只读分析和完整性检查后写回。
- 用户只说“检查/审核现有命名”时，进入 `audit`，保持只读；除非同时要求修复或改名。
- 用户明确说“不要修改”“仅生成清单”“只给建议”时，始终进入 `propose`。
- Figma 连接器不可用或权限不足时，降级为 `propose`，明确说明无法写回，不得声称已经修改节点。
- 只处理 Figma Design。FigJam、Slides、Make 不属于本 Skill 的目标。

## 工作流

### 1. 解析链接与目标

提取每个链接的 `fileKey` 与 `nodeId`，把 URL 中的 `1-2` 转为 API 使用的 `1:2`。

识别用户目标：

- `audit`：检查已有命名，不写回
- `propose`：扫描、预览、去重或只生成命名清单
- `apply`：用户明确要求命名、改名、写回或修复

根据链接确定扫描根节点：

1. 链接包含 `node-id` 时，以该节点本身作为扫描根节点，不自动提升到父级。
2. `node-id` 指向 `TEXT` 时，只扫描该节点本身。
3. `node-id` 指向页面或容器时，扫描该节点的全部后代。
4. 链接未提供 `node-id` 时，扫描文件内全部可访问页面。
5. 多个链接合并后按 `nodeId` 去重；一个根节点已包含另一个时，只保留范围更大的根节点。
6. 节点不存在、无权访问或无法读取时，记录失败，不得静默扩大范围。

同一页面内的多个扫描根节点可以共同去重，但不得跨页面自动去重。

### 2. 获取结构与候选文本

先读取扫描根节点的页面、层级、节点类型、名称、可见性和文本内容，再批量收集根节点本身及其全部后代 `TEXT`，包括隐藏文本。

使用 `characters` 而不是当前图层名称检测候选：

```js
const dynamicPlaceholder = /(^|[^A-Za-z0-9])(?:[xX]{2,}|X)(?=$|[^A-Za-z0-9])/;
const isCandidate = dynamicPlaceholder.test(node.characters);
```

可以识别：

```text
xx时xx分
xxxx/100
XX
独立大写 X
```

不匹配：

```text
1x
box
extra
```

当前名称已经合法的候选仍须进入候选集，用于复核语义、去重关系和名称冲突。

为每个候选建立只读快照，至少记录：

- `nodeId`、页面和扫描根节点
- 当前名称与完整 `characters`
- 用户可读的父级路径
- 可见性、实例继承和只读状态
- 后续比较所需的 styled text segments

实例继承或只读文本可以进入报告，但不得直接改名。

### 3. 去重文字与样式

先生成 `textSignature`：

- Unicode 统一为 NFC
- CRLF 和 CR 统一为 LF
- 每个动态占位符统一为 `{{}}`
- 只清理不影响展示的行尾空白

正文空格、标点、换行、占位符数量、位置和顺序任一不同，都视为不同文字。

只为 `textSignature` 相同的候选读取并比较 `styleSignature`。当前至少包含：

- 文字颜色
- 字号
- 字重
- 每段样式实际作用的字符范围

等价颜色、字号和字重先规范化，连续且完全相同的样式片段合并。样式值、作用范围、片段顺序或占位符样式任一不同，都视为不同样式。

去重结果只能是：

- `same`：规范化文字和规范化样式都完全一致
- `different`：文字或样式至少一项不同
- `confirm`：styled text segments 缺失、冲突或无法可靠比较

节点名称、候选 Key、页面 ID、节点 ID、Frame、父级路径、位置、顺序、可见性、业务语义和中文翻译均不得进入去重签名。不得因为业务含义接近而合并不同文字，也不得因为位置不同而拆开相同文字。

### 4. 生成名称与中文含义

完整名称格式：

```text
<business-domain>/<semantic-key>
```

新名称必须通过：

```js
const canonicalTextKey =
  /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*\/[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
```

只允许两个非空段、全小写、kebab-case 和正确英文拼写。禁止 camelCase、下划线、大写字母、无语义数字、历史错拼、节点 ID、Frame 序号、坐标和区域编号。

按以下顺序选择名称：

1. 复核当前名称；只有格式、业务域、字段语义、去重关系、样式编号和冲突检查全部通过时才保留。
2. 参考同页已经确认的平行字段，只复用稳定业务域和语义结构。
3. 根据完整原文、唯一对应的中文备注、当前名称、具名祖先、相邻文案、组件变体和同页平行字段生成新名称。
4. 无法可靠确定业务域或字段含义时标记 `confirm`，不得使用 `txt`、`text`、`value`、`info` 等兜底词猜测。

新名称通常让 `semantic-key` 使用 1–4 个必要英文词。优先使用 `count`、`remaining`、`balance`、`progress`、`rank`、`countdown`、`status`、`success`、`failure`、`name`、`title`、`number` 等规范词义。

中文含义必须：

- 将占位符统一表示为 `{{}}`
- 保留完整信息、数量、状态、时间、条件和否定关系
- 不增加原文没有的信息
- 不把完整句子概括成“奖励名称”“条件文案”等摘要

英文名称表达字段核心语义；中文含义表达完整原文，两者不要混用。

### 5. 处理样式版本、冲突与完整性

文字和样式都相同的候选共用一个名称，不增加编号。

文字相同、业务语义相同但样式不同的候选，可以使用共同基础名称加两位编号：

```text
ring/box-open-count-01
ring/box-open-count-02
```

编号只表示样式版本，不表示 Frame、区域、位置或节点顺序。首次分配时按规范化样式签名稳定排序；样式签名相同时，才用页面顺序和节点 ID 做稳定裁决，裁决信息不得进入名称。

先区分三种情况：

- **同一候选组**：文字和样式完全相同，所有成员共用一个目标名称。
- **样式版本组**：文字和业务语义相同但样式不同，使用稳定两位编号。
- **名称冲突**：不同文字或不同业务字段得到同一名称，根据真实语义重新命名；无法区分时标记 `confirm`。

同一候选组存在多个当前名称时：

1. 只有一个名称合规时使用它。
2. 多个名称合规且语义等价时，优先保留组内使用更多的名称。
3. 数量相同时，优先保留更准确、完整且不含兜底词的名称。
4. 仍无法稳定选择时标记 `confirm`。

每个候选必须且只能分类为：

- `rename`：需要改名
- `keep`：当前名称完整合规
- `skip`：实例继承、只读或用户明确排除
- `confirm`：语义、样式、范围或冲突需要确认

写回前建立 `auditedTextNodes`，包含全部 `rename / keep` 候选，以及已有名称但被处理为 `skip / confirm` 的候选。命名校验与处理分类相互独立，不能只验证 `rename`。

执行完整性闸门：

- `unclassifiedCandidates.length === 0`
- `invalidTextKeyFormats.length === 0`
- `unresolvedNameConflicts.length === 0`
- `inconsistentDedupGroupNames.length === 0`
- `missingStyleComparisons.length === 0`
- `outOfScopeChanges.length === 0`
- `missingRollbackEntries.length === 0`

`invalidTextKeyFormats` 必须覆盖 `rename` 建议名、`keep` 当前名，以及 `skip / confirm` 中看似业务 Key 但不合规的当前名。任何闸门项非零时不得写回，也不得宣称校验通过；先补齐分析，仍无法判断的候选进入 `confirm`。

置信度建议：

- `high`：完整原文、明确业务上下文和可靠样式共同支持
- `medium`：文本与上下文语义一致，但没有稳定平行字段
- `low`：仅凭弱上下文推断或存在多个合理含义

### 6. 输出命名报告

先给结论，再给表格。`apply` 模式先在内部生成并校验同样的清单，再继续写回；不要把报告当作等待确认的暂停点。

| nodeId | 当前名称 | Figma 文本 | 中文含义 | 建议名称 | 命名校验 | 语义和依据 | 置信度 | 处理 |
| ------ | -------- | ---------- | -------- | -------- | -------- | ---------- | ------ | ---- |

`处理` 只能是 `rename / keep / skip / confirm`。

报告末尾必须包含：

- 扫描页面、根节点和范围假设
- 候选数、去重组数及 `rename / keep / skip / confirm` 数量
- 相同文本组和样式版本组摘要
- 名称冲突检查结果
- 完整性闸门各项数量
- 所有校验失败项的 `nodeId / 当前名称或建议名称 / 失败原因`
- 低置信度、待确认、只读和实例继承项
- 写回预览：`nodeId: old -> new`

相同候选组在摘要中只显示一行，但内部必须保留全部成员。占位符统一显示为 `{{}}`，换行显示为字面量 `\n`。用户可见问题除 `nodeId` 外，还要提供 `页面名 > 扫描根节点 > 精简父级路径 > 文本摘要`。

`propose / audit` 必须明确说明未写回 Figma。

### 7. 写回 Figma

只有 `apply` 模式且完整性闸门通过时执行。

1. 加载 `figma:figma-use`，并按其要求读取必要 API 参考。
2. 使用 `use_figma`，`skillNames` 包含 `figma-use`。
3. 按 `nodeId` 精确定位，不按旧名称模糊搜索。
4. 每批最多重命名 10 个节点；跨页面时每页单独调用。
5. 只修改 `node.name`，不改变文字内容、位置、尺寸、可见性、样式或组件关系。
6. `changes` 只包含通过闸门的 `rename`；`keep / skip / confirm` 不得进入写入列表。
7. 写入前复核节点仍在原扫描范围，且 `characters`、旧名称、实例和只读状态与快照一致。
8. 任一调用或回读失败时停止后续批次，不假设部分写入状态。
9. 写回后重新读取全部 `auditedTextNodes`，不只检查 `mutatedNodeIds`；复用写回前的格式、语义、去重、样式编号和冲突规则。

推荐写入脚本形态：

```js
const changes = [
  {
    id: '1:2',
    oldName: 'Text 128',
    oldCharacters: '剩余抽奖次数 xx 次',
    newName: 'lottery/remaining-draw-count',
  },
]
const applied = []
const skipped = []

for (const change of changes) {
  const node = await figma.getNodeByIdAsync(change.id)
  if (!node || node.type !== 'TEXT') {
    skipped.push({ ...change, reason: 'node-not-found-or-not-text' })
    continue
  }
  if (
    node.name !== change.oldName ||
    node.characters !== change.oldCharacters
  ) {
    skipped.push({
      ...change,
      actualName: node.name,
      actualCharacters: node.characters,
      reason: 'node-changed-since-review',
    })
    continue
  }
  node.name = change.newName
  applied.push({ id: node.id, oldName: change.oldName, newName: node.name })
}

return {
  mutatedNodeIds: applied.map((item) => item.id),
  applied,
  skipped,
}
```

旧名称和原文校验用于避免审核期间的人工修改被覆盖。

### 8. 收尾

写回后汇报：

- 成功改名数量
- 跳过或失败数量及原因
- 全部受检候选的复核结果，包括 `skip / confirm` 中仍存在的不合规名称
- 去重组、样式版本和名称冲突的最终状态
- 可用于回滚的 `nodeId: old -> new` 清单

如果用户明确只要建议，不要催促写回；直接交付可复制的命名清单。
