---
name: figma-text-naming
description: 基于 Figma Design 结构识别运行时 UI 文本字段，并按 `文案/业务域/语义-key` 生成、审核或写回 Text 图层名称。用户提供 Figma Design 链接，并要求处理动态文字或特效文字命名、批量命名、只读检查、审核修复时使用。
---

# Figma 动态文本命名

## 处理范围

- 调用 Figma `use_figma` 前，完整加载并遵循 `figma:figma-use` Skill。
- 只处理用户链接指向的节点范围。具体容器以可见子树为边界；Page 或宽范围节点根据页面层级、成品构图、重复状态和实例组合识别预览根。
- 预览外的源组件、资产陈列、样式展示、标注和设计说明不纳入。链接直接指向其中节点时，该节点成为处理范围。
- 预览中 Instance 的后代 Text 纳入；画布其他位置的源 Component 不自动纳入。
- 节点名称只作辅助线索，需要位置、尺寸、排列、包含关系或实例关系佐证。
- 范围无法确定 → 受影响 Text 为 `confirm`，原因写明“Scope 边界不确定”，不写回。
- 可以只读查看范围外节点作为结构或样式证据；这些节点不参与判断、命名、写回和统计。

确定范围后扫描其中全部 Text，记录范围根、排除根、Text 总数和节点路径。识别只使用 Figma 中的文字、层级、布局、组件、状态和绑定信息，不用外部资料补足结论。

## 判断是否需要命名

按以下顺序判断每个字段：

1. 字段随当前展示的业务对象一起变化，内容是该对象的属性 → `skip`。图片或图标邻近不能单独证明这一点；placeholder、Variable、property、binding 和槽位差异不改变结果。对象属性与 UI 运行时字段无法区分 → `confirm`。
2. 内容是固定标题、操作文案、说明或标签，且没有运行时替换职责 → `skip`。组件、Variant、显隐或交互状态变化不代表 Text 内容会替换。
3. 内容由当前配置预先确定，同一 UI 实例中不会随操作、时间或业务状态替换 → `skip`。property、Variable、binding 或不同实例中的差异不改变结果；无法区分运行时状态与固定配置 → `confirm`。
4. 内容只是装饰、示例、标注或设计说明 → `skip`。
5. carrier 会在同一 UI 实例中随用户操作、时间或业务状态替换，且字段职责和业务语义明确 → `name`。
6. 范围、字段边界、carrier、字段性质、运行时职责、业务语义或名称复用关系缺少关键证据 → `confirm`，并写明缺失项。

运行时字段可由以下信息确认：明确的模板 token 或 placeholder；直接控制内容的 binding/property/Variable；完整 value 与父级职责、supporting text、同构槽位或状态变化形成的结构证据。空间邻近不能单独确认字段关系。

数字、日期、金额、时间、比例、分隔方式、展示位置、图层名称和视觉样式不构成运行时证据。孤立且用于代替未知值的 `x`、`xx`、`XXX` 或 `{{}}` 是 placeholder；`x1`、单词内的 `x` 和普通文字不是。缺少接口、代码或数据源不单独导致 `confirm`。已有 `文案/...` 名称也不证明需要命名。

参数边界与 `name` 分开判断。按 token/placeholder、binding/property/Variable、等价槽位差异、固定文字关系、同构副本对比确定最小动态片段；保留其余字符、空格、换行和标点。边界不明时保持 `name`，将 `parameterized` 记为“待确认”；确认整个 Text 是单一运行时值时才整体替换为 `{{}}`。

## 多 Text 字段

- 先按共同容器、Auto Layout、稳定排列、阅读关系、同构槽位和 binding/property/Variable 将相关 Text 归为字段。空间邻近只能辅助，不能单独归组。
- 每个 Text 只属于一个字段。字段边界存在多个合理解释 → 相关字段为 `confirm`。
- `carrier` 是可独立消费的完整运行时字段；其余固定标签、前后缀、单位、分隔符、上下文和排版片段统称 `supporting text`。
- `name` 只写给 carrier；supporting text 为 `skip`。多个 Text 只能拼接后才可读、没有独立 carrier → 全部 `skip`，不拼成虚构 Text。
- 一个字段有多个可独立消费的 carrier → 拆成子字段；无法稳定拆分 → `confirm`。
- 多 carrier 分别保留原始 `characters` 和参数边界，不拼接、不改写。
- 相同 `characters` 只用于查找副本，不强制共享字段或结果。

## 名称生成

只有字段已经判定为 `name` 后，才完整读取并遵循 [动态文本命名规范](references/naming-rules.md) 生成最终图层名称。该规范只用于名称生成，不反向改变已经依据前文识别逻辑得到的 `name / skip / confirm` 结果。

- 名称严格使用 `文案/${business-domain}/${semantic-key}`。
- `business-domain` 只允许一个英文单词，不使用 `tab`、`block`、`section`、`panel`、`page`、板块编号等位置词。
- `semantic-key` 使用 1～2 个英文单词和 lowercase kebab-case；优先复用规范第 6 节“常用含义”的稳定表达，并用第 7 节“命名示例”校准相同或相近文案的名称。
- 不使用位置、样式、节点 ID、`common`、`unknown` 等弱语义，也不在命名阶段补猜语义。
- 结构、槽位和职责等价的字段先统一业务语义，再生成共同 `baseName`；等价性无法确认 → 相关复用关系为 `confirm`。
- 已有 `文案/...` 名称重新审核。目标名相同则不写，不同则写回，两者都计为 `name`。
- 普通命名不修改 `skip`；“审核并修复”遇到无法安全恢复普通名称的历史误命名时，只报告。

## 重复文案处理

- 先按相同 `baseName` 和完全相同的 `characters` 归组；文字不同不得通过 canonical HTML 合并或分配技术后缀。
- canonical HTML 只表示原文字及其样式，用于比较相同文字的样式版本。组内 canonical HTML 全部相同 → 复用无后缀 `baseName`。
- 组内因样式不同存在多个 canonical HTML → 按完整 HTML 稳定排序，连续使用 `-1`、`-2`、`-3`；相同 HTML 使用相同后缀。
- 正常业务命名禁止 `count-1` 这类无语义编号；上述样式区分是唯一允许生成数字后缀的情况。技术后缀不属于 `semantic-key` 的业务语义。
- 样式只影响技术后缀，不影响是否命名和业务语义。

## 写回与结果

- “命名”“批量命名”允许写回；“只读”“预览”“不要修改”不写回；“检查”只审核；“审核并修复”可修复错误名称。
- 先完成范围内全部结果、目标名称和复用关系。`confirm` 不阻塞无关的确定字段。
- 只写范围内、可写、目标名不同的 `name` carrier。只修改 `node.name`，不修改 `characters`、样式、布局、可见性、组件关系或其他数据。
- 分批写回时保持完整结果不变，并记录每批 mutated node IDs。
- 写回后逐项校验 `node.name === targetName` 且 `node.characters === originalCharacters`；任一失败记为 `failed`。
- 独立区域读取失败时，不判断、不写回该区域；其他完整区域继续处理。

对外结果只使用 `name`、`skip`、`confirm`；`failed` 只表示执行错误。逐字段保留 carrier 原文、字段职责、节点位置、目标名称、参数化结果和判断依据，不翻译、概括或纠错。默认只统计 `skip`，展开 `name`、`confirm`、`failed` 和历史误命名。

```text
命名完成：目标预览 Scope 内共扫描 N 个 Text，name M 个，skip S 个，confirm C 个，failed F 个。
```

## 回归入口

修改判断规则或重构本文时，完整读取 [回归案例](references/regression-fixtures.md) 并验证全部断言。正常命名任务不读取该文件。

回归失败时修正字段建模或证据链，不增加具体文案、业务类型、数值、正则白名单或格式特判。
