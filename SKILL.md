---
name: figma-text-naming
description: 基于 Figma Design 结构识别运行时 UI 文本字段，并按 `文案/业务域/语义-key` 生成、审核或写回 Text 图层名称。用户提供 Figma Design 链接，并要求处理动态文字或特效文字命名、批量命名、只读检查、审核修复时使用。
---

# Figma 动态文本命名

## 处理范围

- 调用 Figma `use_figma` 前，完整加载并遵循 `figma:figma-use` Skill。
- 用户链接指向的节点是唯一候选枚举边界；不得把其祖先、兄弟或其他画布区域纳入 Scope。Scope 的核心判断是：“这个 Text 是否是研发需要消费的实际 UI 字段？”不得改用“是否位于成品预览”或“是否位于切图”判断。
- 在候选枚举边界内，纳入结构上真正承担 UI 展示职责、可编辑且可由研发独立消费的 Text，包括完整页面或弹窗、研发使用的组件、局部效果、交付区域，以及其他职责明确的 UI 结构。是否组成完整成品画面不是必要条件；Instance 后代和源 Component 后代都按各自实际交付职责判断。
- 排除已烘焙在图片中的文字、标注、设计说明、样式展示和纯素材陈列。图片中不可编辑的字形不创建 Text Ledger 项；重复载体按下文规则只保留 canonical carrier 进入 Naming Plan。
- `预览图/*`、`切图/*`、`弹窗/*` 等节点名称只能作为辅助线索，不能直接决定纳入或排除，也不得扩展成节点名称白名单或业务场景特判。必须结合位置、尺寸、排列、包含关系、组件/实例关系、编辑性和交付职责判断。
- 无法确认某个 Text 是否承担可独立消费的实际 UI 职责 → 该 Text 为 `confirm`，原因写明“Scope 职责不确定”，不写回；禁止为了完成任务硬猜范围。
- 可以只读查看范围外节点作为结构或样式证据；这些节点不参与判断、命名、写回和统计。

确定范围后扫描其中全部 Text，建立不可裁剪的 `Scan Ledger`，记录范围根、排除根、Text 总数，以及每个 Text 的 node ID、节点路径、原始 `characters`。placeholder 检测和任何正则只能为 Ledger 项增加 `Naming Evidence`，不得决定哪些 Text 进入 Ledger，也不得作为后续 `candidate`、Decision 或 Naming Plan 的过滤条件。正则未命中只表示“没有发现显式 placeholder”，不是 `skip`、非运行时字段或无需语义判断的证据。

逐项构建逻辑字段并完成语义判断。Scope 内每个 Text 在写回前都必须有且只有一个节点决策：`name`、`skip` 或 `confirm`；supporting text、固定文案、无 placeholder、正则未命中和证据不足的 Text 也必须留在 Ledger 并分别收敛为 `skip` 或 `confirm`。完成前校验 `Text 总数 = name + skip + confirm`，不得留下未分类的 candidate。识别只使用 Figma 中的文字、层级、布局、组件、状态和绑定信息，不用外部资料补足结论。

## 判断是否需要命名

先构建完整逻辑字段并判断整个字段的输出职责，再识别其中的参数。不得根据字段表示哪类业务对象或哪种属性决定 `skip`；只依据 Text 的字段结构及其是否属于重复集合项的内部属性槽位。按以下顺序判断每个字段：

1. Text 含稳定文案结构和一个或多个已证明的运行时参数，是 `Template Field`。只要整体具有单一、明确、可独立消费的 UI 文案职责，正常判为 `name`；参数表示什么业务数据、字段是否位于某种业务组件中，都不改变这一结论。职责或业务语义缺少关键证据 → `confirm`。
2. 整个 Text 只承载运行时值，是 `Pure Value Field`。继续判断结构角色：
   - 位于重复、同构的 collection item 中，并且只是该 item 的内部属性槽位 → `skip`；placeholder、Variable、property、binding、各 item 值不同或邻近图片均不能推翻该结构结论。
   - 位于非重复 UI 中，作为独立、稳定的展示槽位，且运行时职责和业务语义明确 → `name`。
   - 是否属于重复同构 collection item 的内部属性、是否为独立稳定展示槽位或字段职责无法确定 → `confirm`，并写明缺失的结构证据。
3. 内容是固定标题、操作文案、说明或标签，且没有运行时替换职责 → `skip`。组件、Variant、显隐或交互状态变化不代表 Text 内容会替换；反之也不得仅因没有 placeholder、binding 或当前参数仍是字面量，就否决已有结构证据证明的运行时模板职责。
4. 只有 Figma 结构明确证明内容是固定配置，且同一 UI 实例中不会作为任务、条件、状态或其他 UI 模板被替换，才 → `skip`。property、Variable、binding 或不同实例差异不改变结果。若 Figma 无法区分固定配置值与运行时下发值 → `confirm`；不得因为没有 placeholder、binding 或接口信息就默认 `skip`。稳定的任务、条件或状态文案槽位若由当前任务或运行时配置选择完整内容，不属于普通固定说明，也不得仅因当前画面是一个字面量而在本步排除。
5. 内容只是装饰、示例、标注或设计说明 → `skip`。
6. 范围、Logical Field 边界、carrier、字段性质、运行时职责、业务语义或名称复用关系缺少关键证据 → `confirm`，并写明缺失项；这里的 Logical Field 边界不包括字段内部的参数边界。

运行时字段或其参数可由以下信息确认：明确的模板 token 或 placeholder；直接控制内容的 binding/property/Variable；完整 value 与父级职责、supporting text、同构槽位或状态变化形成的结构证据。这些信息只用于增加 Naming Evidence，证明存在参数或运行时替换，不直接决定整个字段的职责或类型。placeholder 是强证据，不是 `name` 的必要条件，也不是候选入口。无论 placeholder 检测是否命中，都继续判断字段结构、运行时职责和业务语义。没有 placeholder 或 binding 时，只要 Text 占据稳定的任务、条件或状态文案槽位，同构结构证明该槽位持续承担同一字段职责，并且结构证明内容由当前任务或运行时配置决定而非普通固定说明，即可确认运行时字段。当前示例中的数字或其他参数仍为字面量，不削弱这组结构证据。空间邻近、字面量或图层名称均不能单独确认字段关系。

数字、日期、金额、时间、比例、分隔方式、展示位置、图层名称和视觉样式不构成运行时证据。仅将边界独立、且明确用于代替未知值的 `x`、`xx`、`XXX` 或 `{{}}` 标记为显式 placeholder。嵌在普通 token 中的 `x`，如 `LVx`、`x1` 或单词内部的 `x`，不能仅凭字符形式认定为 placeholder 或参数；只有 binding/property/Variable、等价槽位差异、固定模板结构或同构副本等额外结构证据成立时，才可把相应片段认定为参数。正则只负责报告发现了哪些显式 placeholder，不得把未命中、非标准 token 或疑似边界输出为否定结论。缺少接口、代码或数据源不单独导致 `confirm`。已有 `文案/...` 名称也不证明需要命名。

字段是否 `name` 与参数边界分开判断，并且只在完整字段职责确定后处理。只要整句的运行时模板职责、业务语义和 carrier 明确，就按字段职责判为 `name`，不得因部分参数边界不明确把节点决策降为 `confirm`。单个 Text 同时包含固定文字和一个或多个运行时参数时，该 Text 整体就是一个 Template Carrier；参数数量不构成 `confirm`，多个参数也不得误判为多个 carrier。分别记录其中已证明的最小参数片段，不拆成多个字段，也不因参数表示某种业务对象或属性改变整个 Template Field 的判断。按 token/placeholder、binding/property/Variable、同槽位变化、等价槽位差异、固定模板结构、surrounding context 和同构副本对比确定参数边界；不扩充字符白名单，不因非标准字符形态本身认定参数。保留其余字符、空格、换行和标点。部分或全部参数边界不明时，节点决策仍为 `name`，仅将 `parameterized` 记为“待确认”；确认整个 Text 是单一运行时值时才整体替换为 `{{}}`。

## 多 Text 字段

- 先按共同容器、Auto Layout、稳定排列、阅读关系、同构槽位和 binding/property/Variable 将相关 Text 归为字段。空间邻近只能辅助，不能单独归组。
- 每个 Text 只属于一个字段。字段边界存在多个合理解释 → 相关字段为 `confirm`。
- `carrier` 是可独立消费的完整运行时字段；其余固定标签、前后缀、单位、分隔符、上下文和排版片段统称 `supporting text`。
- `name` 只写给 carrier；supporting text 为 `skip`。多个 Text 只能拼接后才可读、没有独立 carrier → 全部 `skip`，不拼成虚构 Text。
- 一个交付结构内的字段有多个可独立消费的 carrier → 拆成子字段；无法稳定拆分 → `confirm`。跨成品预览、开发组件或其他交付区域的疑似副本先按下文“重复载体处理”判断，确认不是重复载体后才分别处理。
- 多 carrier 分别保留原始 `characters` 和参数边界，不拼接、不改写。
- 相同 `characters` 只用于查找副本，不强制共享字段或结果。

## 重复载体处理

- 在名称生成和写回前，检查同一逻辑字段是否同时出现在成品预览、开发组件或其他交付区域。只有字段职责、业务语义、UI 状态和模板/参数结构等价，并有实例/源组件关系、同槽位映射或明确复制关系佐证时，才认定为同一字段的重复载体；相同 `characters` 或相似节点名称不能单独证明重复。
- 已确认是重复载体 → 只选择一个 `canonical carrier` 进入 Naming Plan。依次优先选择结构上直接供研发实现或配置的交付载体、字段证据更完整的可编辑载体；仍并列时按候选枚举边界内的稳定遍历顺序选择一个。其余副本保留在 Scan Ledger，节点决策为 `skip`，原因记为“duplicate carrier”，仅作为字段与参数证据，不重复命名或写回。节点名称不参与优先级。
- 已确认不是同一字段的重复载体 → 分别完成字段判断和命名，不合并。
- 无法确认是否重复 → 受影响载体为 `confirm`，写明缺失的复用关系证据，不写回。

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
- canonical HTML 只表示原文字及其样式，用于比较相同文字的样式版本。已确认同一业务语义且 `characters` 相同后，组内 canonical HTML 全部相同 → 复用无后缀 `baseName`。
- 组内因样式不同存在多个 canonical HTML → 按完整 HTML 稳定排序，连续使用 `-1`、`-2`、`-3`；相同 HTML 使用相同后缀。
- 正常业务命名禁止 `count-1` 这类无语义编号；上述样式区分是唯一允许生成数字后缀的情况。技术后缀不属于 `semantic-key` 的业务语义。
- 样式只影响技术后缀，不影响是否命名和业务语义。

## 写回与结果

- “命名”“批量命名”允许写回；“只读”“预览”“不要修改”不写回；“检查”只审核；“审核并修复”可修复错误名称。
- 先完成范围内全部结果、目标名称和复用关系。`confirm` 不阻塞无关的确定字段。
- 只写范围内、可写、目标名不同的 `name` carrier。只修改 `node.name`，不修改 `characters`、样式、布局、可见性、组件关系或其他数据。
- 分批写回时保持完整结果不变，并记录每批 mutated node IDs。
- 写回后逐项校验 `node.name === targetName` 且 `node.characters === originalCharacters`；任一失败附加执行状态 `failed`，但不替换该 Text 已完成的 `name` 决策。
- 独立区域读取失败时不写回；已进入 Scan Ledger 的 Text 逐项记为 `confirm`，原因写明缺失的读取证据。若失败导致 Scope 内 Text 无法完整枚举，则本次扫描为未完成：只报告已知结果和未读取区域，不得声称满足全量守恒或输出“命名完成”。

对外节点决策只使用 `name`、`skip`、`confirm`；`failed` 只表示附加的执行错误，不属于决策分类。逐字段保留 carrier 原文、字段职责、节点位置、目标名称、参数化结果和判断依据，不翻译、概括或纠错。默认只统计 `skip`，展开 `name`、`confirm`、`failed` 和历史误命名；汇总必须满足 `N = M + S + C`，`F` 是其中写回失败的 `name` 子集，不与前三类相加。

```text
命名完成：目标节点 Scope 内共扫描 N 个 Text，name M 个，skip S 个，confirm C 个，failed F 个。
```

## 回归入口

修改判断规则或重构本文时，完整读取 [回归案例](references/regression-fixtures.md) 并验证全部断言。正常命名任务不读取该文件。

回归失败时修正字段建模或证据链，不增加具体文案、业务类型、数值、正则白名单或格式特判。
