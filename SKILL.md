---
name: figma-text-naming
description: 基于 Figma 预览范围、逻辑字段、设计语义和结构证据排除可替换实体的属性字段与固定 UI 文案，区分运行时状态值与固定配置值，识别需要独立文案 Key 管理的动态 UI 文案；生成、审核或写回 `文案/业务域/语义-key` 图层名称，并在需要时生成 PageCenter HTML。用于动态文字、特效文字、批量命名、只读审核和审核修复；不要求接口或其他运行时来源，不得依据具体业务、文案或数值格式直接判定。
---

# Figma 动态文本命名

最小判断对象是“逻辑字段（Logical Field）”，不是单个 Text，也不是某种字符串格式。

始终按顺序问：

> 这组 Text 是否是当前可替换实体的属性字段，其变化是否来自“当前展示的是哪个实体”？若不是，它是否只是没有运行时替换职责的固定 UI 文案？若仍不是，它是否共同表达一个会随用户操作、时间推进或业务状态变化而被替换的运行时 UI 字段；其中哪个 Text 独立承载这个字段？

先排除可替换实体的属性字段与固定 UI 文案，再区分“运行时状态值”和“当前活动、商品、方案或档位的固定配置值”，最后判断是否需要文案 Key。数值、日期、时间、金额、比例、次数、阈值、分隔符以及“位于数据展示位置”只能帮助发现值得检查的区域；它们本身既不能证明运行时替换，也不能证明需要文案 Key。明确用于代替未知运行时值的设计 placeholder 可以作为动态证据，但仍须经过 Entity Field Veto、Static Copy Veto 和字段职责判断。

## 执行边界

- 只处理用户提供的 Figma Design 节点范围；不得扩大到其他页面或文件。
- 调用 Figma `use_figma` 前，完整加载并遵循 `figma:figma-use` Skill。
- “命名”“批量命名”默认允许写回；“只读”“预览”“不要修改”禁止写回；“检查”只审核；“审核并修复”可修复错误名称。
- 识别只使用 Figma 内的节点、文字、层级、布局、组件、状态和绑定信息。不得读取需求文档、代码、接口或配置来补足资格与语义。
- 分析完成前不得修改节点。只允许修改最终 `name` 项的 `node.name`；不得修改 `characters`、样式、布局、可见性、组件关系或其他数据。
- 不要求设计师为了识别调整 Frame、Group、Section、Component 或 Instance 结构。

## 强制流程

严格按以下顺序执行：

```text
确定 Scope
-> 扫描 Scope 内全部 Text
-> 构建 Logical Field
-> 应用 Entity Field Veto
-> 应用 Static Copy Veto
-> 仅对未否决字段汇总 Naming Evidence
-> 应用其余 Exclusion
-> 分别确认存活 carrier 的命名资格、业务语义和参数边界状态
-> 输出 name / skip / confirm
-> 处理名称复用与 canonical HTML
-> 统一写回并逐项回读
```

样式不得参与 Scope、字段边界、命名资格或业务语义判断。只有最终 `name` 项需要解决 HTML 复用，或用户要求上传 PageCenter 时，才读取 styled segments。

## 1. Scope

Scope 只回答“哪些 Text 属于用户要求处理的预览区域”，不判断动态性。读取节点不等于将节点纳入 Scope，证据节点也不等于命名节点。

1. 用户给出具体 Frame、Section、Component 或 Instance 时，以该节点的可见子树为边界。
2. 用户给出 Page 或包含多类内容的宽范围节点时，根据画布结构识别预览根：页面级容器关系、屏幕或页面构图、重复状态之间的并列关系、实例在成品画面中的组合关系可作为证据。
3. 位于预览根之外的母组件集合、资产陈列、样式展示、标注区和设计说明不进入 Scope；若用户链接直接指向其中某个节点，则该节点重新成为显式 Scope。
4. Instance 在预览画面中的后代 Text 属于 Scope；画布其他位置的源 Component 不因被实例引用而自动进入 Scope。
5. 节点名称只能作为弱线索，必须与 containment、位置、尺寸、排列或实例关系共同成立。
6. 若多个区域都可能是目标预览且结构无法消歧，把受影响 Text 标为 `confirm`，原因写明“Scope 边界不确定”，不得猜测或写回。

为判断 containment、实例关系或样式，允许只读查看 Scope 外的切图、源 Component、母组件、素材或其他结构节点；这些节点只能作为证据，绝不能进入 Logical Field、Decision、Naming Plan、写回或扫描统计。只有目标预览 Scope 内、可写且角色为 `carrier` 的 Text 才可能被命名。

扫描账本必须记录 Scope 根、排除的根、纳入的 Text 总数及每个 Text 的可理解路径。Scope 外证据节点另行记录，不计入纳入总数，也不获得 `name / skip / confirm` 结果。

## 2. Logical Field

不要假设一个 Text 就是一个业务字段。先建立只存在于分析账本中的逻辑字段；不得修改或物理合并 Figma 节点。

### 字段构建

从最小有意义的共同容器开始，结合以下关系聚类 Text：

- 同父级或同一小型语义容器；
- Auto Layout 顺序、稳定的排列方向和间距；
- 基线、边缘、中心线或阅读顺序上的邻近关系；
- label/value、prefix/value、value/unit 等职责关系；
- 同构实例、Variant 或状态中的相同相对槽位；
- Text property、Component property、Variable 或 binding 指向同一展示职责。

空间邻近不能单独成组。至少需要一个容器或槽位关系，再由排列、职责或绑定关系佐证。大画布上偶然靠近、视觉重叠或跨容器对齐不构成字段。

每个 Scope 内 Text 必须归入且只归入一个逻辑字段。一个字段可以只有一个 Text，也可以包含多个 Text。字段边界存在两种同样合理的解释时，相关字段统一 `confirm`，不得为了得到结果强行拆分或拼接。

### 字段成员角色

为字段成员标记结构角色：

- `carrier`：独立承载候选模板或完整展示值、状态、进度、剩余量、结果等字段的 Text；只有被证明承担运行时替换职责且未命中 Entity Field Veto、Static Copy Veto 或其他 Exclusion 的 carrier 才可能写入文案名称。
- `label`：为 carrier 提供稳定含义的固定标签。
- `affix`：独立排版的前缀、后缀、单位或分隔符。
- `context`：帮助确定职责但不属于字段输出的附近文字。
- `fragment`：仅为视觉排版拆出的片段，无法独立被业务消费。

角色来自结构和证据，不来自字符长相。固定 label 与 value 可以属于同一逻辑字段，但 label 不因字段需要命名而自动获得文案 Key。

### 跨副本汇总

未经规范化的完整 `characters` 可以作为跨副本索引，用于寻找相同内容的其他上下文；它不能替代逻辑字段，也不能强制相同原文共享资格。

只有槽位、组件职责和字段边界等价的副本才共享证据。相同 `characters` 出现在不同逻辑字段时可以分别得到不同结果；若是否等价无法确认，仅相关复用关系 `confirm`。

对等价 Logical Field，先确定共同的 shared semantic identity，再进入名称生成。样式差异不得拆分或创造业务语义；同一业务字段的副本必须从同一个 shared semantic identity 推导同一个 `baseName`，不得各自起名后再尝试合并。

## 3. Entity Field Veto

构建逻辑字段后、检查 placeholder、Variable、状态值或动态模板之前，先判断每个字段是否为可替换实体的属性字段。这里的实体是卡片、Item、列表行或其他可复用展示单元所代表的业务对象；字段随当前对象一起被替换，而不是同一 UI 文案模板中的参数被替换。

结合以下结构证据判断，不得只凭某个词或数值格式命中：

- Text 与图片、头像、商品图、道具图标或其他实体识别资源处于同一卡片、Item、列表行或紧密语义容器；
- Text 承担该实体的名称、数量、积分、价格、等级或其他自身属性，而不是描述 UI 当前状态、进度、剩余量或运行时结果；
- 同构 Item、实例、Variant、可替换资源或稳定属性槽位证明该结构可展示不同实体；
- Text 的变化与实体视觉资源或实体身份同步，变化来源是“当前展示的是哪个实体”。

结构明确满足实体属性职责时，该逻辑字段直接 `skip`，字段内所有成员均 `skip`，不再进入 Naming Evidence。一个 Item 中的实体名称、数量等可以分别属于不同逻辑字段；应逐字段应用同一个实体容器证据，不得因为它们不是同一逻辑字段而漏判。

placeholder、设计占位符、Text Variable、bound variable、Component property、同槽位差异或动态值外观都不能覆盖此否决；这些信息最多证明实体属性会变化。图片或头像邻近本身也不能单独触发否决：若 Figma 结构无法确定视觉资源是否代表可替换实体，或无法区分“实体属性变化”与“同一 UI 字段的运行时变化”，相关潜在 carrier `confirm`，不得仅因 placeholder 或 Variable 直接 `name`。

## 4. Static Copy Veto

应用 Entity Field Veto 后、汇总 Naming Evidence 前，先按结构职责排除没有运行时替换职责的固定 UI 文案。“所在 UI 会变化”不等于“Text 内容会被替换”；Component、Variant、Instance、弹窗或交互状态本身的变化，不能作为其内部固定 copy 的动态证据。

先检查 Text 自身或同一逻辑字段中的潜在 carrier。存在以下任一证据时，不应用本 Veto，保留相关 carrier 继续进入 Naming Evidence：

- Text 内有明确设计 placeholder 或运行时模板 token；
- binding、Text property 或 Component property 直接控制 Text 内容；
- Text 独立承担 value carrier 职责；
- 同一槽位有证据表明 Text 内容随运行时状态被替换。

继续进入 Naming Evidence 只表示需要分析，不直接得到 `name`；这些证据仍须证明运行时替换职责，并继续接受 Remaining Exclusion。

若没有上述证据，结合容器、层级、控件角色、阅读顺序和字段成员职责，以下固定 copy 直接 `skip`，不进入 Naming Evidence：

- 固定标题或 Heading：页面、弹窗、卡片或模块的标题；所在容器、弹窗或状态变化不改变结论。
- 固定操作文案：Button、CTA、Toggle、Tab 等控件的固定 label；点击、显隐、enable/disable 或控件状态变化不改变结论。
- 固定说明文案：完整固定的规则说明、帮助正文、描述正文或提示说明，且内部没有动态参数 carrier。
- 固定标签：字段标题、导航标签、状态标签或 Section label，只提供语义且不独立承担运行时 value。

按 Logical Field 与成员职责执行本 Veto：整个字段只是固定 copy 时字段所有成员均 `skip`；固定 label 与独立运行时 carrier 共存时，只将固定成员记为 `skip`，carrier 继续进入 Naming Evidence。标题、按钮或正文内部确有动态参数时，不得因其 UI 类型直接排除，须继续分析其中的 carrier。

## 5. Naming Evidence

Naming Evidence 只对未命中 Entity Field Veto 或 Static Copy Veto 的逻辑字段或存活 carrier 执行，回答“同一 UI 实例中，该逻辑字段是否会随用户操作、时间推进或业务状态变化而被新的运行时值替换”。只使用 Figma 可见的设计语义和结构；接口、数据源或其他运行时实现信息不是必要输入。

必须分别记录三类事实：哪一个 Text 是可变化的 carrier、变化是否来自同一 UI 实例的运行时状态、参数边界是否已经确定。命名资格依赖前两类事实和稳定业务语义，不依赖第三类事实已经确定；只证明“这个值可配置、可绑定或在副本间不同”，不能单独证明运行时替换职责。

### Placeholder 与格式线索

- 数字、日期、金额、时间、比例及其分隔方式只是普通格式线索，不能单独作为动态证据。
- 明确孤立地用于代替未知值的 `x`、`xx`、`XXX` 或 `{{}}` 是设计 placeholder，可以作为动态证据并帮助确定边界。
- placeholder 证据必须先通过 Entity Field Veto 和 Static Copy Veto，再结合容器、槽位、label/value、组件职责或状态关系确认字段职责；它不能单独决定 `name`。
- `x1`、单词内部的 `x`，以及承担普通文字含义而非未知值替身的 `x` 不属于 placeholder。

### 直接证据

- carrier 中存在边界明确的运行时模板 token 或设计 placeholder，且其字段语义指向同一 UI 实例的运行时字段；
- Text Variable、bound variable、Text property 或 Component property 直接控制 carrier 内容，且组件职责或状态结构说明它在同一 UI 实例中承担运行时字段；
- 同一结构槽位在实例、状态或 Variant 间出现内容差异，且差异可定位到同一字段的运行时状态变化。

直接证据必须同时指向 carrier 和运行时替换职责，命名资格才成立；仍需应用其余 Exclusion，并从 Figma 结构中确定字段语义。参数边界单独判断，边界待确认不推翻已经成立的命名资格。若 property、binding 或槽位差异只证明固定配置可替换，应用固定配置值排除。

### 组合结构证据

- 稳定 label 与相邻 value 构成明确的 label/value 字段，value 自身完整承担当前运行时值展示；
- siblings、父级容器、组件职责、同构槽位和空间排列相互佐证，明确指向同一个 Text 承担完整的当前状态、当前进度、剩余量或运行时结果字段；
- 多个运行时状态保持字段边界和固定部分不变，只有可定位的 carrier 或参数片段随用户操作、时间或业务状态变化。

结构证据不要求同时出现 binding 或数据来源。空间邻近只能参与佐证，不能单独证明字段关系；至少还需要容器、槽位、label/value 或组件职责中的一项证据。

为每个字段维护证据账本：证据来源、作用到哪个成员、能证明 carrier 与字段职责还是只能帮助定位、是否存在反证。

### 证据充分条件

满足以下任一条件，才认为命名资格证据充分：

1. carrier 有直接证据，且 Figma 字段语义同时明确其运行时替换职责；
2. Text 自身完整承担 value 展示，且 nearby label、siblings、父级结构、组件职责、同构槽位或空间关系中的多项证据共同确定其当前运行时字段职责；
3. 同槽位变化与稳定 label 或组件职责同时成立，并共同证明变化来自同一 UI 实例的用户操作、时间推进或业务状态，而不是固定配置差异。

不要求读取接口、代码或其他外部运行时来源；这些来源缺失不能单独导致 `confirm`。但 Figma 结构和上下文必须足以区分运行时状态值与固定配置值：明确是前者才继续 `name`，明确是后者则 `skip`，两者都合理且无法消歧时 `confirm`。

以下信息不增加命名资格证据权重：

- 字符串看起来像数值、日期、时间、比例、货币、范围或计数；
- 数值大小、分隔方式或常见产品格式；
- Text 位于数据展示位置、数值区域、按钮或高频更新区域；
- 当前图层名称包含动态含义；
- 字号、颜色、字重或其他视觉强调；
- 仅凭经验认为“这个位置通常会变化”。

格式和展示位置只能把区域放入“待检查”队列。若没有任何上下文说明字段职责，或上下文无法区分运行时状态与固定配置，结果为 `confirm`；若 Figma 结构已经明确运行时替换职责，不得再因缺少接口、代码或数据来源降为 `confirm`。

## 6. Remaining Exclusion

以下 Exclusion 在 Naming Evidence 之后执行，并优先于命名资格。即使已有 carrier、binding、property 或槽位变化证据，符合以下职责也统一 `skip`。实体属性字段和固定 UI 文案必须已经分别由 Entity Field Veto 与 Static Copy Veto 处理，不得延后到本阶段。

### 固定配置值

若 Text 展示当前活动、商品、方案、档位或套餐已经确定的配置内容，并且同一 UI 实例中不会随用户操作、时间推进或业务状态被替换，则统一 `skip`。固定活动时间、固定商品价格、固定档位或阈值、固定奖励数量、固定套餐信息都属于此类；数值、日期、金额、比例、次数或时间格式不改变结论。

Component property、Variable、binding、不同实例或 Variant 间的值差异可能只表示设计复用或配置切换，不能推翻固定配置排除。位于按钮或其他控件中的固定配置值同样 `skip`。若 Figma 上下文无法判断该值是同一 UI 实例的运行时状态还是当前方案的固定配置，结果为 `confirm`，不得因其是数据、金额或位于数据展示位置而 `name`。

### 视觉碎片

若字段只能通过拼接多个 Text 才形成可读值，而单个节点只是字符、单位、分隔符或排版片段，这些节点是 `fragment`。不得把它们在分析中拼成虚构的单 Text，也不得为碎片生成文案 Key。

固定 label 与独立 carrier 的组合不等同于视觉碎片：carrier 若完整承担当前运行时字段职责，即使没有 binding 或同槽位变化，仍可独立判定；label 已由 Static Copy Veto 记为 `skip`。若只证明 carrier 是完整配置值，则命中固定配置值排除。

### 装饰内容与设计说明

装饰字、示例值、标注和设计预览说明不承担当前字段或模板职责时排除。固定标题、操作文案、说明正文和标签必须已经由 Static Copy Veto 处理。已有 `文案/...` 名称不能反向证明资格。

## 7. Decision

对未命中 Entity Field Veto、Static Copy Veto 或其他 Exclusion 的字段，先确定 carrier、运行时字段职责和业务语义，输出唯一的字段结论；再独立记录参数边界状态。字段可以得到 `name`，同时 `parameterized` 为待确认。

按以下证据确定最小参数边界：

1. 模板 token 或设计占位符的明确边界；
2. Text/Component property、binding 或变量定义；
3. 等价槽位在实例、状态或 Variant 间的差异；
4. 稳定 label、affix 与变化 carrier 的结构关系；
5. 同构副本中固定片段与变化片段的对比。

保留所有已证明固定的字符、空格、换行和标点，只把已证明动态的最小连续片段替换为 `{{}}`。确认 carrier 是运行时字段，但无法确认其中哪些字符动态时，将 `parameterized` 标记为待确认；不得猜测边界，也不得把完整 `characters` 擅自替换为 `{{}}`。只有证据明确确认整个 Text 是单一运行时值时，才能把整个 Text 参数化为 `{{}}`。逻辑字段包含多个 Text 时，分别记录 carrier 的参数化状态，不得拼接或改写原始 `characters`。

业务语义只从 Figma 字段语义、ancestor、Component/Instance、siblings、binding 和等价槽位推导。不得读取外部资料补足；多个语义同样合理时证据不足。

每个逻辑字段只能得到一个字段结论：

- `name`：命名资格证据充分，没有命中 Entity Field Veto、Static Copy Veto 或其他 Exclusion，字段边界和 carrier 明确，并能从 Figma 确认稳定业务语义；参数边界可以已确认或待确认。
- `skip`：证据明确表明字段静态，或命中 Entity Field Veto、Static Copy Veto 或其他 Exclusion。
- `confirm`：Scope、字段边界、carrier、实体属性与 UI 运行时字段的职责区分、运行时状态与固定配置的职责区分、业务语义或名称复用关系仍缺少关键证据。仅参数边界待确认不把 `name` 降为 `confirm`。

不得把“缺少接口、代码或其他外部运行时来源”写成 `confirm` 原因。需要 `confirm` 时，必须指出 Figma 设计中实际无法确定的字段职责、实体/UI 字段性质、运行时/配置性质、字段边界、业务语义或复用关系；参数边界的不确定只记录在 `parameterized`。

映射回 Text 节点时：

1. `name` 字段只把目标名称写给 `carrier`；同字段的固定 `label`、`affix`、`context` 和 `fragment` 记为 `skip`。
2. `skip` 字段的所有成员均为 `skip`。
3. `confirm` 字段的潜在 carrier 记为 `confirm`；已明确只是支持信息或碎片的成员仍可记为 `skip`。
4. 一个字段若出现多个各自独立消费的 carrier，先依据结构拆成子字段；无法稳定拆分时 `confirm`。

不得用置信度数字替代三种结果，也不得把“看起来可能动态”降级为无理由的 `name`。

## 8. 名称生成

目标名称保持：

```text
文案/${business-domain}/${semantic-key}
```

- 使用英文 lowercase kebab-case。
- 业务域来自稳定的组件职责或业务对象；semantic key 表示字段职责。
- 不使用位置、颜色、字号、板块序号、节点 ID、`common`、`unknown` 等弱语义。
- 名称必须忠实表达 Decision 阶段已经确认的业务语义，不得在本阶段补猜语义。
- 等价 Logical Field 先统一 shared semantic identity，再一次性生成共同的 `baseName`；不得让重复字段各自生成名称，也不得用样式差异修饰 `baseName`。

已有 `文案/...` 名称必须重新审核资格与语义。最终 `name` 的目标名称相同则不写，不同则写回；两者都计为 `name`。普通命名模式不修改 `skip` 项；“审核并修复”发现历史误命名时，无法安全恢复普通名称就只报告，不猜测。

## 9. 名称复用与 HTML

先完成 Logical Field、Decision、carrier 和业务语义，并为等价字段确定 shared semantic identity 与共同 `baseName`，再处理复用。参数边界状态与字段结论分别保留。

只有业务语义等价的 `name` carrier 才可能复用 Key。对共享同一 `baseName` 的 carrier 读取 styled segments，生成完整 canonical HTML：

- 所有 canonical HTML 完全相同：共同复用无后缀 `baseName`。
- 存在不同 canonical HTML：对去重后的完整 HTML 按 Unicode code point 升序排序，并从 `-1`、`-2`、`-3` 连续分配技术后缀。
- 相同 HTML 必须获得相同后缀；遍历顺序、节点 ID、当前名称不得影响结果。

样式差异只决定技术后缀，不得被解释为新的业务语义，也不得单独造成 `confirm`。

用户明确要求上传 PageCenter 时，为每个最终 Key 生成 HTML，把已确认参数替换为 `{{}}` 并保留固定文字与样式。`parameterized` 待确认时不得擅自替换字符，也不得上传受影响的 Key；这不改变该字段已经成立的 `name` 结论。首次 Figma 或 PageCenter 写入前，必须确保一个 Key 只对应一种 HTML；上传后逐项回读 Key 和 HTML。

## 10. 写回与失败隔离

1. 先完成 Scope 内全部字段的 `name / skip / confirm` 决策和目标名称。
2. `confirm` 不阻塞与其字段边界、语义或 Key 复用无关的确定字段。
3. 只写目标预览 Scope 内、可写、目标名称与当前名称不同的 `name` carrier；Scope 外证据节点绝不进入写回清单。
4. 分批写回时保持完整决策账本不变；每批返回所有 mutated node IDs。
5. 回读所有已写节点，验证 `node.name` 与原始 `characters`；不一致计为 `failed`。
6. 独立区域读取失败时，不分析、不猜测、不写回该区域；其他完整读取区域可以继续。

## 11. 输出合同

对外语义结果只使用 `name`、`skip`、`confirm`；`failed` 只表示执行错误。

只读或预览时逐字段输出：

```text
result: name | skip | confirm
field: 可理解的逻辑字段职责
members: 字段内 Text 的角色与位置
characters: carrier 的原始 characters；逐字保留
name: 仅 name 输出
parameterized: 仅 name 输出；边界已确认时输出参数化文本，否则输出“待确认”
location: 可理解的 Figma 区域路径
reason: 证据链或明确缺失的证据
```

保留原语言、标点、大小写、空白、换行和 placeholder，不翻译、不概括、不纠错。默认不展开全部 `skip`；报告总数，并展开 `name`、`confirm`、`failed` 和历史误命名。

写回后使用：

```text
命名完成：目标预览 Scope 内共扫描 N 个 Text，name M 个，skip S 个，confirm C 个，failed F 个。
```

上传 PageCenter 时另加：

```text
PC 上传：成功 U 个，失败 P 个。
```

## 12. 回归验证

修改本 Skill 的识别规则时，完整读取 [references/regression-fixtures.md](references/regression-fixtures.md)。正常执行 Figma 命名任务时不要加载 fixtures，避免案例内容污染业务判断。

回归至少验证：

1. Scope 是否只纳入目标预览区域，且 Scope 外证据节点不进入 Decision、Naming Plan、写回或扫描统计；
2. 多 Text 是否先形成逻辑字段，再识别 carrier 与支持成员；
3. 普通格式线索是否始终保持零证据权重，明确 placeholder 是否仅在通过 Entity Field Veto、Static Copy Veto 和字段职责判断后作为动态证据；
4. Entity Field Veto 是否在 placeholder、Variable、状态值和动态模板证据之前执行，并覆盖可替换实体的名称、数量、积分、价格、等级等属性；
5. Static Copy Veto 是否在 Naming Evidence 之前排除无运行时替换职责的固定标题、操作文案、说明正文和标签，且不因 Component、Variant、Instance 或交互状态变化放行；
6. 标题、按钮或正文内部存在明确动态 carrier 时，是否继续进入 Naming Evidence；
7. 命名资格是否同时证明 carrier 与同一 UI 实例中的运行时替换职责；
8. Remaining Exclusion 是否能覆盖固定配置值、视觉碎片、装饰内容和设计说明；
9. 同一种字符串格式能否因证据不同自然得到 `name / skip / confirm`；
10. 已确认运行时字段但参数边界不明时，是否保持 `name` 并将 `parameterized` 标为待确认，且只有整个 Text 被确认为单一运行时值时才整体参数化；
11. 等价字段是否先统一 shared semantic identity 和 `baseName`，再按 canonical HTML 稳定决定无后缀复用或技术后缀；
12. confirm 是否明确指出缺少 Scope、字段边界、实体/UI 字段职责区分、运行时/配置职责区分、业务语义或复用关系中的哪一项，而不是笼统要求外部运行时来源。

回归失败时修正字段建模或证据链，不得新增具体文案、业务类型、数值、正则白名单或格式特判。
