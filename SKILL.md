---
name: figma-text-naming
description: 扫描名称形如 `翻译页面[pagecenterPageId]` 的 Figma 页面，在顶层 `预览图/*` Frame 内识别含 `xx`/`XX` 占位符的动态文本，生成项目约定的业务 Key、完整中文含义和保留 Figma 样式的富文本，并按需命名、去重或产出可供下游直接写入的文本条目。用户要求扫描、预览、命名、去重、生成或交付特效文本时使用；默认仅预览，仅在用户明确要求命名时修改 Figma，本 Skill 不读写 Pagecenter。
---

# Figma 特效文本命名与交付

扫描 Figma 动态文本，生成 Key、富文本值和中文描述，并在用户明确要求时命名图层。命名、中文含义、去重和返回格式使用本 Skill 的新版规则；候选发现、样式提取和占位符转换沿用固定流程。

调用 Figma `use_figma` 前加载并遵循 `figma-use` Skill。本 Skill 不执行 `pc` 命令，不读取、比较、写入或发布 Pagecenter 配置；只留下稳定的下游交付合同。

## 解释请求

- `扫描`、`预览`、`看看`：只读扫描并返回建议，不改 Figma。
- `命名`、`执行命名`、`写回 Figma`：按建议修改 Figma 图层名称并回读。
- `生成特效文本`、`导出特效文本`、`交付文本`：生成下游合同，不修改外部系统。
- `上传特效文本`、`上传 Pagecenter`、`同步文本`、`sync`：本 Skill 只完成 Figma 侧命名和文本条目交付；实际写入由后续写入方负责。
- `去重`：对本次 Figma 候选执行分组，只影响交付条目，不读取或清理外部历史 Key。

## 限定范围

1. 用 `^翻译页面\[([^\]]+)\]$` 匹配目标 Figma 页面，并原样提取括号内容作为 `pagecenterPageId`。不得把 Figma file key、页面节点 ID 或 Frame ID 当作 Pagecenter 页面 ID。
2. 只进入匹配页面的直接子级中名称符合 `^预览图\/[^/]+$` 的 `FRAME`。
3. 扫描这些 Frame 内的全部后代 `TEXT`，包括隐藏节点。
4. 按 [references/naming-rules.md](references/naming-rules.md) 的表达式识别含动态占位符的候选；不匹配 `1x` 等数量后缀。
5. 当前名称合法的候选仍参与语义复核、去重和交付，不因已有名称而跳过。
6. 实例继承或只读文本放入 `skippedInstances`，不直接改名；记录主组件上下文。

无法从页面名唯一取得 `pagecenterPageId` 时，纯扫描仍可返回 Figma 预览，但不得生成声称可直接写入的下游合同。

## 工作流

### 1. 发现与快照

- 解析 Figma URL，以只读方式定位页面和目标 Frame。多页面文件按页面分别读取。
- 为每个候选收集 `nodeId`、当前名称、`characters`、明确对应的中文备注、精简父级路径、相邻语义文本、可见性、实例状态、Frame，以及保留颜色、字号、字重所需的 styled text segments。
- 读取样式片段是默认候选采集的一部分，因为富文本值和去重签名都依赖它；不得等到用户额外要求 HTML 才读取。

### 2. 构建完整文本条目

对每个非实例候选先构建完整条目，再命名和去重：

```json
{
  "nodeId": "",
  "key": "",
  "sourceText": "",
  "plainText": "",
  "value": "",
  "describe": "",
  "status": "ready | confirm"
}
```

- `sourceText`：Figma 原始 `characters`。
- `plainText`：把动态占位符规范化为 `{{}}` 后的完整原文，保留数量、顺序和换行。
- `value`：根据 Figma styled text segments 生成的富文本值。无局部样式时为经过 HTML 安全转义的 `plainText`；有局部样式时生成最小 `<span>`，保留颜色、字号、字重、换行和全部文本。
- `describe`：对完整 `plainText` 的忠实中文翻译，占位符保持为 `{{}}`。不得只写“礼品卡名称”“求婚条件”等摘要，也不得根据业务上下文补充原文没有的信息。

HTML 解析并解码实体后的文本投影必须等于 `plainText`。任何文本缺失、占位符数量/顺序变化、样式片段无法可靠还原或中文无法完整翻译时，将该项标为 `confirm`，不得进入下游合同。

生成 `value` 时只使用 Figma 返回的样式片段：先转义 `&`、`<`、`>` 和引号；RGB 颜色转两位小写十六进制；字号按 `px / 100` 转 rem，最多保留两位小数；字重按 Thin 100、Extra Light 200、Light 300、Regular 400、Medium 500、Semi Bold 600、Bold 700、Extra Bold 800、Black 900 映射。连续同样式片段可合并，不同样式不得合并，不发明样式。

### 3. 命名与去重

为候选选择名称前完整读取 [references/naming-rules.md](references/naming-rules.md)、[references/text-key-catalog.md](references/text-key-catalog.md) 和 [references/approved-name-corpus.md](references/approved-name-corpus.md)。需要判断共享关系时读取 [references/deduplication.md](references/deduplication.md)。

- 优先原样复用业务域和用途都匹配的已批准先例；没有先例时才生成全小写 kebab-case 新名称。
- 同一目标页面内，规范化文字、占位符结构和有意义样式一致的 `exact` 组共用一个 Key，只生成一个 `textItems` 条目。
- 文字相同但有意义样式不同的 `near` 组不得合并；在共同基础名称后使用稳定的 `-01`、`-02` 自动样式编号。
- `text2`、`chip1Short`、`cong1` 等先例数字属于业务名称，不是样式编号。
- 文字、占位符结构或业务语义不同的候选分别命名。不得只因翻译相近而合并。
- 外部系统中的既有 Key 不进入 Figma 文本/样式去重签名，也不由本 Skill 查询。

### 4. 返回预览

默认只返回摘要、三列表格和确有内容的异常项；每个建议 Key 一行，`exact` 重复组不展开成员，不输出内部 JSON、签名、置信度、节点数量或完整样式代码。

```text
扫描到 26 个候选文本，建议使用 15 个名称。
本次仅预览，未修改 Figma。

| 建议名称 | Figma 文本 | 中文含义 |
| --- | --- | --- |
| lottery/can-lottery-times | 当前可抽奖次数：{{}} | 当前可抽奖次数：{{}} |
| reward/name | بطاقة الهدية\n{{}} | 礼品卡\n{{}} |
| ring/proposal | أرسل 30 هدية من “{{}}” ... | 赠送 30 份来自“{{}}”的礼物…… |

待确认：
- `12:34`：样式片段缺失，无法生成完整富文本。

回复“执行命名”会修改 Figma；回复“生成特效文本”会产出下游可直接消费的文本条目。
```

Figma 文本列把占位符统一显示为 `{{}}`，换行显示为字面量 `\n`，过长文本可以 `...` 截断。中文含义必须基于完整原文翻译；表格可以截断显示，但内部 `describe` 和交付 `value` 不得截断。

生成文本或命名已明确执行时，仍使用同一三列表格作为结果主体，再补充简短结果计数：Figma 改名成功、交付条目数、跳过、待确认和失败。只有用户明确要求技术明细时才展示 HTML、下游合同或逐节点信息。

### 5. 执行 Figma 改名

仅在用户明确要求命名，或要求生成可交付文本且同时明确需要改名时执行；跳过 `confirm` 和实例继承节点：

1. 用预览快照复核节点仍在范围内，文本、旧名称和实例状态未变化。
2. 按预览建议改名，不静默重新生成；每批最多 10 个节点，只改名称，不加载字体。
3. 每批后按节点 ID 回读，名称等于目标且仍通过规则校验才记为成功。
4. 写入失败时停止后续批次；未成功改名或未确认 Key 的节点不得进入下游合同。

### 6. 下游交付合同

用户要求生成、交付或上传特效文本时，产出以下稳定合同，交给后续写入方：

```json
{
  "pagecenterPageId": "",
  "textItems": [
    {"key": "reward/name", "value": "<span style=\"...\">...</span>", "describe": "完整中文翻译"}
  ]
}
```

- `textItems` 只包含 `ready` 项；每个 `exact` 组只出现一个条目，`near` 和 `unique` 分别出现。
- 每项只交付 `key`、`value`、`describe`，不夹带节点 ID、Figma 路径、内部签名、状态或写入操作。
- `value` 必须是完整原文及样式，`describe` 必须是完整中文翻译；两者的占位符数量和顺序一致。
- `confirm`、实例继承、改名失败或 Key 冲突项不进入 `textItems`，在用户报告中单独列出。
- 本 Skill 生成合同后即结束；任何外部读取、差异判断、写入和验证都由下游负责。

## 稳定性

- 再次扫描不得因折叠、隐藏、选中状态、扫描顺序或新增无关节点改变已有合法名称。
- 首次需要排序时使用 Frame 页面顺序、层级/视觉顺序和节点 ID；这些信息不进入名称或去重签名。
- 下游合同是纯数据产物，不表示任何外部写入已经发生。
