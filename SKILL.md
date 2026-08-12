---
name: figma-text-naming
description: Use when 用户提供 Figma Design 链接并要求动态文字、特效文字、批量命名、只读检查或审核修复；基于 Figma 结构识别运行时 UI 字段，生成、审核或写回 `文案/业务域/语义-key` 图层名称。
---

# Figma 动态文本命名
## 执行边界

- 只处理用户提供的 Figma Design 节点范围，不扩展到其他页面或文件。
- 调用 Figma `use_figma` 前，完整加载并遵循 `figma:figma-use` Skill。
- “命名”“批量命名”允许写回；“只读”“预览”“不要修改”不写回；“检查”只审核；“审核并修复”可修复错误名称。
- 识别只使用 Figma 中的节点、文字、层级、布局、组件、状态和绑定信息，不用需求、代码、接口或配置补足资格与语义。
- 分析完成前不修改节点。写回只改最终 `name` carrier 的 `node.name`，不改 `characters`、样式、布局、可见性、组件关系或其他数据。
- 不要求设计师调整 Frame、Group、Section、Component 或 Instance 结构。

## 核心原则

- 一个 Text 不一定等于一个业务字段。
- 会变化不等于需要文案 Key。
- 读取节点不等于纳入 Scope。
- 样式不参与动态性和业务语义判断，只影响同名字段的技术后缀。
- 不确定就 `confirm`，不猜。

## 处理流程

`确定范围 -> 字段归组 -> 排除实体数据 -> 排除固定文案 -> 判断是否为运行时字段 -> 排除固定配置和视觉碎片 -> name / skip / confirm -> 生成名称 -> 处理名称复用 -> 写回并校验`

## 1. 确定范围（Scope）

Scope 只决定哪些 Text 属于目标预览，不判断动态性。

- 链接指向具体容器时，以该节点的可见子树为边界。
- 链接指向 Page 或宽范围节点时，根据页面级容器、成品构图、重复状态、并列关系和实例组合识别预览根。
- 预览外的母组件、资产陈列、样式展示、标注和设计说明不纳入；链接直接指向它们时，以该节点为显式 Scope。
- 预览中 Instance 的后代 Text 纳入；画布其他位置的源 Component 不自动纳入。
- 节点名称是弱线索，需要 containment、位置、尺寸、排列或实例关系佐证。
- 多个候选范围无法消歧时，受影响 Text 为 `confirm`，原因写“Scope 边界不确定”，不写回。
- 可只读查看 Scope 外节点作为结构或样式证据；这些节点不进入字段归组、决策、命名计划、写回和扫描统计。
- 只有 Scope 内、可写且角色为 `carrier` 的 Text 可能命名。

确定范围后扫描其中全部 Text，记录 Scope 根、排除根、Text 总数及每个 Text 的可理解路径。Scope 外证据单独记录，不产生 `name / skip / confirm`。

## 2. 字段归组（Logical Field）

从最小有意义的共同容器开始，先建立分析账本中的字段，不物理合并节点。

- 结合共同容器、Auto Layout 顺序、稳定排列与间距、阅读关系、成员职责、同构槽位和 binding/property/Variable 归组。
- 空间邻近只作佐证；归组至少需要容器或槽位关系。
- 每个 Scope 内 Text 只属于一个字段。边界有多个同样合理的解释时，相关字段为 `confirm`。

为每个成员标记角色：

- `carrier`：独立承载候选模板或完整展示字段；只有通过后续判断的 carrier 可命名。
- `label`：提供稳定含义的固定标签。
- `affix`：独立排版的前后缀、单位或分隔符。
- `context`：只帮助确认职责的附近文字。
- `fragment`：为视觉排版拆分、无法独立消费的片段。

完整 `characters` 只用于查找副本，不强制共享字段或结果。槽位、组件职责和字段边界等价时才共享证据；等价性无法确认时，相关复用关系为 `confirm`。

等价字段先统一 shared semantic identity，再生成共同 `baseName`。

## 3. 排除实体数据（Entity Field Veto）

先判断字段是否为可替换实体的属性。实体是可复用展示单元所代表的业务对象；字段随“当前展示哪个对象”而变化，不是同一 UI 模板中的运行时参数。

- Text 与实体识别资源处于同一展示单元或紧密语义容器。
- Text 承担对象自身属性，而不是 UI 当前状态、进度、剩余量或运行时结果。
- 同构结构、可替换资源或稳定属性槽位表明该单元可展示不同对象。
- Text 与实体身份同步变化。

职责明确时，字段及全部成员为 `skip`，不再判断运行时字段。每个属性字段分别应用同一实体容器证据。

placeholder、Variable、property、binding 或槽位差异只能证明属性可变化，不能覆盖本排除。实体识别资源邻近不能单独触发排除。实体关系无法确认，或实体属性与 UI 运行时字段无法区分时，潜在 carrier 为 `confirm`。

## 4. 排除固定文案（Static Copy Veto）

排除没有运行时替换职责的固定 UI 文案。容器、组件、Variant、Instance、显隐或交互状态变化，不代表其中的 Text 内容会替换。

Text 存在明确 placeholder、内容 binding/property、独立 value carrier 或同槽位运行时内容变化时，保留相关 carrier，继续下一步；这些线索本身不直接产生 `name`。

否则，根据容器、层级、控件职责、阅读顺序和成员角色，将固定标题、操作文案、说明正文和标签记为 `skip`。

整个字段都是固定文案时，全部成员为 `skip`。固定成员与独立 carrier 共存时，只保留 carrier 继续判断。

## 5. 判断是否为运行时字段（Naming Evidence）

只判断存活 carrier 是否会在同一 UI 实例中随用户操作、时间推进或业务状态被新的运行时值替换。

分别记录：carrier、运行时替换职责、参数边界。命名资格依赖前两项和稳定业务语义；参数边界可稍后确认。

格式、展示位置、当前图层名和视觉强调不增加动态证据。孤立且明确用于代替未知值的 `x`、`xx`、`XXX` 或 `{{}}` 是设计 placeholder；普通文字中的 `x` 和 `x1` 不是。placeholder 仍需结合字段职责判断。

1. carrier 有模板 token、placeholder 或内容 binding/property，且 Figma 语义同时明确同一 UI 实例中的运行时职责。
2. Text 完整承担 value，且 label、siblings、父级职责、同构槽位或空间关系中的多项证据共同确认运行时职责。
3. 同槽位变化与稳定 label 或组件职责共同表明变化来自同一 UI 实例的用户操作、时间或业务状态。

空间邻近不能单独证明字段关系。property、binding 或副本差异若只证明内容可配置，也不证明运行时替换。

为每个字段记录证据来源、作用成员、证明内容和反证。缺少接口、代码或外部数据源不单独导致 `confirm`；只看 Figma 是否足以区分字段职责。

## 6. 最终排除（Remaining Exclusion）

对已收集运行时证据的字段继续应用以下排除：

- **固定配置**：内容由当前配置预先确定，同一 UI 实例中不随操作、时间或业务状态替换，结果为 `skip`；property、Variable、binding 或副本差异不改变结论。无法区分运行时状态与固定配置时为 `confirm`。
- **视觉碎片**：多个 Text 只能拼接后形成可读值，单个节点无法独立消费时，成员为 `fragment` 或 `affix`，结果为 `skip`；不拼成虚构 Text。
- **装饰和说明**：不承担当前字段或模板职责的装饰字、示例值、标注和设计说明为 `skip`。

已有 `文案/...` 名称不构成资格证据。

## 7. 决策与参数边界（Decision）

- `name`：字段边界、carrier、运行时职责和稳定业务语义明确，且未命中任何排除。参数边界可以待确认。
- `skip`：字段静态或命中任一排除。
- `confirm`：Scope、字段边界、carrier、实体/UI 职责、运行时/配置职责、业务语义或复用关系缺少关键证据。写明实际缺失项。

参数边界按模板或 placeholder、binding/property/Variable、等价槽位差异、label/affix 结构、同构副本对比的顺序确定。保留已证明固定的字符、空格、换行和标点，只将已证明动态的最小连续片段替换为 `{{}}`。

carrier 已确认但参数边界不明时，保持 `name`，将 `parameterized` 记为“待确认”。完整 Text 只有在被确认是单一运行时值时才整体参数化。多 Text 字段分别记录 carrier，不拼接或改写原始 `characters`。

业务语义只从 Figma 字段语义、ancestor、Component/Instance、siblings、binding 和等价槽位推导；多个语义同样合理时为 `confirm`。

映射到节点：`name` 只作用于 carrier，其他成员为 `skip`；`skip` 字段全部成员为 `skip`；`confirm` 字段的潜在 carrier 为 `confirm`，已明确的支持成员仍可 `skip`。多个 carrier 可独立消费时先拆分子字段，无法稳定拆分则 `confirm`。

不使用置信度数字替代三种结果，也不以“可能动态”为由直接 `name`。

## 8. 生成名称

名称格式为 `文案/${business-domain}/${semantic-key}`，使用英文 lowercase kebab-case。

- business domain 来自稳定组件职责或业务对象；semantic key 表示已确认的字段职责。
- 不使用位置、样式、板块序号、节点 ID、`common`、`unknown` 等弱语义，也不在命名阶段补猜语义。
- 等价字段从 shared semantic identity 一次生成共同 `baseName`。
- 已有 `文案/...` 名称重新审核。目标名相同则不写，不同则写回，两者都计为 `name`。
- 普通命名不修改 `skip`；“审核并修复”遇到无法安全恢复普通名称的历史误命名时，只报告。

## 9. 处理名称复用

只对业务语义等价且共享 `baseName` 的 `name` carrier 处理复用。canonical HTML 只作为稳定的样式比较值，用于决定图层名称是否添加技术后缀。按 styled segment 原顺序生成：文字做 HTML 转义；连续输出 `<span>`；style 固定按 `color`、`font-size`、`font-weight`、`line-height`、`white-space` 排列；字号和像素行高按 `100px = 1rem` 转换；使用 `white-space: pre-wrap`。

- canonical HTML 全部相同：复用无后缀 `baseName`。
- HTML 不同：对去重后的完整 HTML 按 Unicode code point 升序排序，从 `-1` 起连续分配技术后缀。
- 相同 HTML 使用相同后缀；结果不受遍历顺序、节点 ID 和当前名称影响。

## 10. 写回、校验与输出

1. 先完成 Scope 内全部决策、目标名称和复用关系。`confirm` 不阻塞无关的确定字段。
2. 只写 Scope 内、可写、目标名不同的 `name` carrier。分批写回时保持完整决策账本，并记录所有 mutated node IDs。
3. 回读每个已写节点，校验 `node.name === targetName` 且 `node.characters === originalCharacters`；任一失败记为 `failed`。
4. 独立区域读取失败时，不分析、不写回该区域；其他完整区域继续处理。

对外语义只使用 `name`、`skip`、`confirm`；`failed` 只表示执行错误。只读、预览或检查时逐字段输出：

```text
result: name | skip | confirm
field: 字段职责
members: 成员角色与位置
characters: carrier 原文
name: 仅 name 输出
parameterized: 仅 name 输出；参数化文本或“待确认”
location: Figma 区域路径
reason: 证据链或明确缺失项
```

原文逐字保留语言、标点、大小写、空白、换行和 placeholder，不翻译、概括或纠错。默认只统计 `skip`，展开 `name`、`confirm`、`failed` 和历史误命名。写回后报告 Scope 内扫描总数及各结果数量。

```text
命名完成：目标预览 Scope 内共扫描 N 个 Text，name M 个，skip S 个，confirm C 个，failed F 个。
```

## 回归验证

修改识别规则或重构本文时，完整读取 [references/regression-fixtures.md](references/regression-fixtures.md) 并验证全部断言。正常命名任务不加载该文件，避免案例影响业务判断。

回归失败时修正字段建模或证据链，不增加具体文案、业务类型、数值、正则白名单或格式特判。
