# Regression Fixtures

本文件只用于修改 `figma-text-naming` 规则后的回归验证。正常 Figma 命名任务不得读取本文件，也不得把其中的文案、业务或数值复制进核心 Skill。

验证目标不是让某种字符串或业务对象类型永远得到固定结果，而是证明相同表面格式会随 Scope、Logical Field、Template/Pure Value Field、collection item 结构角色、Static Copy Veto、Naming Evidence 和 Remaining Exclusion 得到不同结论。

## 断言维度

每个 fixture 同时检查：

- Scope 是否正确；
- Scope 是否以研发需要消费的实际 UI 字段为核心，而不是以成品预览或节点名称为核心；
- Scope 内全部 Text 是否先进入不可裁剪的 Scan Ledger，并最终逐项得到且只得到 `name`、`skip` 或 `confirm`；
- placeholder 检测或任何正则是否只增加 Naming Evidence，不作为 Ledger、candidate、Decision 或 Naming Plan 的过滤条件；
- 逻辑字段边界与成员角色是否正确；
- 是否先区分含稳定文案结构的 `Template Field` 与整个 Text 只承载运行时值的 `Pure Value Field`；
- `Template Field` 是否不受参数所表示的业务对象或属性类型影响；
- `Pure Value Field` 是否只在属于重复、同构 collection item 的内部属性槽位时 `skip`；
- 非重复 UI 中独立、稳定的 `Pure Value Field` 是否能在证据充分时 `name`，结构不明时是否 `confirm`；
- Static Copy Veto 是否在 Naming Evidence 之前排除没有运行时替换职责的固定 UI 文案；
- 直接证据或结构职责证据是否指向明确 carrier；
- 格式本身是否保持零证据权重；
- 明确 placeholder 是否与普通格式线索区分，且仍服从字段结构、Static Copy Veto 和字段职责判断；嵌在 `LVx`、`x1` 或单词内部的 `x` 是否仅在额外结构证据成立时才作为参数；
- placeholder 是否只作为强证据而非命名门槛，无 placeholder 的稳定任务、条件或状态模板槽位能否由结构职责成立；
- Exclusion 是否优先；
- 缺少接口、代码或其他外部运行时来源是否不会单独导致 `confirm`；
- 固定配置值是否在 property、binding 或跨实例差异存在时仍能被排除；
- `name` 与参数边界是否独立判断，边界不明时是否保留 `name` 并将 `parameterized` 标为待确认；
- `confirm` 是否指出具体缺失的字段职责、运行时/配置性质、字段边界、业务语义或复用关系。

## Fixture 1：固定 label 与动态 value

结构：同一小型 Auto Layout 内有两个 Text。label 固定；value 绑定 Text Variable，并在同一 UI 的用户操作前后状态中变化。

期望：

- 两个 Text 组成一个逻辑字段；
- value 是 `carrier`，命名资格证据充分，结果 `name`；
- label 是 `label`，节点结果 `skip`；
- 不得把两个 `characters` 拼成新的 Text。

### 1B：无 binding 的结构证明

结构：没有 Variable、property 或任何已知运行时来源。固定 label、父级容器职责、用户操作前后状态和 value 槽位共同明确 value 完整承担当前运行时展示职责；该容器不是重复、同构的 collection item。

期望：value `name`，label `skip`。命名资格来自 Figma 内的 label/value、父级职责、状态关系和槽位关系，不得因为缺少 binding 或数据来源自动降为 `confirm`。

### 1C：有限状态中的当前值

结构：多个 Variant 在同一槽位预写有限的状态值。固定 label、父级职责和槽位关系共同证明该 Text 完整承担“当前状态”字段，但没有 binding 或接口信息。

期望：状态 value `name`，label `skip`。不得仅因状态候选有限或文案预写而命中 Static Copy Veto；若各 Variant 只是互不关联的固定标签、没有共同当前字段职责，则命中 Static Copy Veto 并 `skip`。

## Fixture 2：视觉拆分字段

结构：同父级相邻 Text 共同拼出一个数值展示，但各节点没有独立 binding、property 或同槽位职责，只承担排版片段。

期望：

- 多个节点组成一个逻辑字段；
- 成员角色均为 `fragment` 或 `affix`；
- 即使整体视觉上会变化，也统一 `skip`；
- 不得虚构合并后的参数化字符串。

## Fixture 3：`22500/550000` 的四种证据

### 3A

单 Text 由 Component property 控制；等价实例证明左右两段分别来自两个运行时字段。

期望：`name`，按证据参数化两段。

### 3B

单 Text 没有 binding、property 或已知数据来源；nearby label、siblings、父级进度容器和稳定槽位共同证明它完整承担当前进度值字段。

期望：`name`；完整 Text 是 carrier，缺少运行时来源不构成 `confirm`。结构只能确认该 Text 承担运行时字段、不能确认哪些字符动态时，`parameterized` 标为待确认，不得参数化整个 Text。

### 3C

单 Text 只有该字符格式，没有 binding、property、同槽位变化、label/value 或组件职责证据。

期望：`confirm`，原因是无法确定 Text 承担什么字段职责；不得因比例外观直接 `name`，也不得把“缺少运行时来源”作为原因。

### 3D

该 Text 位于重复、同构 collection item 的内部属性槽位，各 item 在该槽位显示不同运行时值。

期望：作为 collection item 内部的 `Pure Value Field` 判为 `skip`；不得把各 item 值不同当成独立 UI 展示槽位的 Naming Evidence。

## Fixture 4：`99.99` 的五种证据

### 4A

单 Text 有直接 Variable binding，稳定 label、组件职责和用户操作前后状态共同证明它是非重复 UI 中独立、稳定的当前运行时结果槽位。

期望：`name`。

### 4B

单 Text 位于重复、同构 collection item 的内部属性槽位，并与该 item 的视觉内容一起重复。

期望：作为 collection item 内部的 `Pure Value Field` 判为 `skip`；即使含 placeholder 或 Variable 也不改变结构角色。

### 4C

单 Text 没有 binding，附近结构也无法说明它承担什么字段职责，且没有证据表明它是设计说明。

期望：`confirm`，原因是字段职责不明；不得仅凭小数格式决定，也不得把缺少 binding 本身作为原因。

### 4D

单 Text 位于结构明确的设计说明或标注区。

期望：作为设计说明或标注排除在 Scope 外，不进入 Scan Ledger、Decision 或 Naming Plan。

### 4E

单 Text 与某项固定配置形成明确的 label/value 字段；即使它由 Component property 控制，结构仍证明它不会在同一 UI 实例中随当前状态替换。

期望：`skip`；property 只证明内容可配置，不能证明运行时替换职责。

## Fixture 5：倒计时

### 5A

单 Text 由一个 Text property 控制，稳定容器职责和状态差异共同证明其承担当前剩余状态展示。

期望：`name`；参数边界按 property 证据确定。

### 5B

单 Text 显示 `99:59:59`，没有 binding、property 或已知数据来源；附近 label、父级倒计时容器和稳定槽位共同证明它完整承担当前剩余时间字段。

期望：`name`；缺少运行时来源不构成 `confirm`。只有结构证据同时确认整个 Text 是一个不可再分的单一运行时值时，才参数化为 `{{}}`；若只能确认运行时字段职责，`parameterized` 标为待确认。

### 5C

视觉时间被拆为多个数字与分隔符 Text，没有任一独立 carrier。

期望：所有节点 `skip`。

### 5D

单 Text 只有时间外观，没有任何运行时或结构证据。

期望：`confirm`；格式只能触发检查，原因是字段职责不明，而不是缺少运行时来源。

### 5E

单 Text 位于活动信息区，结构明确说明它是当前活动固定的开始和结束时间，不是倒计时、当前时间或剩余时间。

期望：`skip`；日期和时间格式不构成动态证据。

## Fixture 6：充值进度

同一用户节点范围含四个区域：一个 binding 与操作前后状态共同证明的当前进度字段、一个无 binding 但状态结构明确的完整当前进度字段、一个重复同构 collection item 的内部纯值槽位、一个结构明确的设计说明示例。

期望依次为：

- binding 与状态共同证明的当前进度字段 `name`；
- 结构明确的完整当前进度字段 `name`；
- collection item 内部的纯值槽位 `skip`；
- 设计说明排除在 Scope 外，不进入 Scan Ledger、Decision 或 Naming Plan。

核心 Skill 不得出现“充值”关键词或该玩法的专用规则。

## Fixture 7：抽奖次数

结构一：固定 label、绑定 value 与操作前后状态共同证明当前剩余次数。结构二：按钮上的固定操作标签。结构三：多个字符节点拼成次数展示。结构四：按钮展示当前档位的固定价格。

期望：

- 结构一仅 value carrier `name`，label `skip`；
- 结构二命中 Static Copy Veto 并 `skip`；
- 结构三全部 `skip`。
- 结构四 `skip`；按钮位置、价格格式或点击行为都不能证明运行时替换职责。

核心 Skill 不得出现“抽奖”关键词或次数格式白名单。

## Fixture 8：相同 characters，不同逻辑字段

同一原文分别出现在：有绑定且职责明确的运行时 carrier、无绑定但职责明确的非重复 UI 独立展示槽位、重复同构 collection item 的内部纯值槽位、固定配置槽位、无上下文的未知区域。

期望分别为 `name`、`name`、`skip`、`skip`、`confirm`。exact `characters` 只能帮助找到副本，不能强制共享资格。

## Fixture 9：交付职责 Scope

一个 Page 同时包含完整成品页面、研发直接使用的局部组件、纯素材陈列和设计说明。用户链接指向 Page。局部组件不构成完整成品画面，但结构与组件关系明确证明其 Text 是研发独立消费的实际 UI 字段。

期望：

- 成品页面中的实际 UI Text 进入识别；
- 研发局部组件中的实际 UI Text 也进入识别，不因它位于预览外而排除；
- Instance 和源 Component 后代都按实际交付职责判断，不按节点类型一律纳入或排除；
- 纯素材陈列、图片内烘焙文字和说明排除；
- 为结构或样式证据读取的 Scope 外节点不进入 Decision、Naming Plan、写回或扫描统计；
- 无法确认是否承担研发交付职责的 Text 以“Scope 职责不确定”进入 `confirm`，不写回。

## Fixture 9B：Page 下的独立成品弹窗

结构：同一个 Page 下同时存在：

- `预览图/*` 成品页面；
- 一个名称不以 `预览图/` 开头的独立完整弹窗；
- 不用于研发交付的源 Component / 母组件陈列；
- 资产陈列；
- 切图；
- 标注和设计说明。

独立弹窗具有完整 UI 构图和可独立展示职责，内部包含需要识别的 Text。

期望：

- `预览图/*` 成品区域进入 Scope；
- 独立完整弹窗也进入 Scope，即使名称不是 `预览图/*`；
- 不用于研发交付的源 Component 陈列、纯素材、标注和设计说明排除；
- `切图/*` 不能仅凭名称排除，其中若存在承担实际 UI 展示职责、供研发独立消费的可编辑 Text，仍应进入 Scope；
- 不得通过节点名称白名单只选择 `预览图/*`；
- 节点名称只能作为辅助证据；
- Scope 冻结后，所有纳入成品区域内的 Text 都必须进入扫描 Ledger；
- 不得使用 placeholder、图层名称或候选规则再次缩小 Text Ledger；
- 无法判断某个同级区域中的 Text 是否承担实际 UI 交付职责时，应得到 Scope `confirm`，不能直接排除。

## Fixture 9C：混合 Page 与重复载体

结构：用户链接指向同一个 Page，Page 内同时存在：

- 一个成品预览，包含运行时字段 `current-progress` 的可编辑 Text carrier；
- 一个供研发实现的开发交付组件，位于名为 `切图/进度效果` 的容器内，包含与预览 carrier 有明确实例/源组件映射、相同字段职责、UI 状态和模板结构的可编辑 Text；
- 同一开发交付组件中的另一个可编辑运行时 Text，其字段只在该组件中出现；
- 一个纯素材区，仅陈列图片、图标和已烘焙在图片中的文字；
- 一个为展示 `current-progress` 效果而复制的 Text，结构明确不承担独立交付职责，也不是成品或开发交付载体；
- 标注、设计说明和样式展示 Text。

期望：

- `切图/进度效果` 中只在开发组件出现的实际 UI Text 进入 Scope，并按既有动态字段规则判断，不得因父节点名为 `切图/*` 而漏掉；
- 预览字段与开发组件字段若字段职责、业务语义、UI 状态和模板/参数结构等价，并有实例/源组件映射或同槽位关系佐证，则识别为重复载体；只选择开发交付组件中的 carrier 作为 canonical carrier 进入 Naming Plan，预览 carrier 在 Scan Ledger 中记为 `skip: duplicate carrier`，不重复命名；
- 纯展示副本排除在 Scope 外，仅作为重复关系证据，不进入 Scan Ledger、Decision 或 Naming Plan；
- 纯素材区的图片和图标不产生 Text Ledger 项，图片内烘焙文字不因视觉可见而进入 Scope；标注、设计说明和样式展示 Text 排除；
- 若移除实例/源组件映射和同槽位等价证据，导致无法确认预览与开发组件中的两个 carrier 是否重复，则二者均为 `confirm`，不得擅自合并或分别写回；
- 若结构明确证明两个相似 carrier 属于不同 UI 状态、字段职责或业务语义，则分别处理；
- `预览图/*`、`切图/*`、`弹窗/*` 只作辅助信息，不得成为白名单或排除条件。

## Fixture 10：样式复用

多个 carrier 已由结构证明确认为同一业务语义并共享 `baseName`。其中一组 `characters` 完全相同，但存在相同和不同的 canonical HTML；另有文字不同的 carrier。

期望：

- 所有等价字段先统一 shared semantic identity 和 `baseName`，不得独立起名后合并；
- 只在 `baseName` 和 `characters` 都相同时比较 canonical HTML；
- 同一文字只有一种 HTML 时复用无后缀名称；存在多种 HTML 时按完整字符串稳定排序并为所有样式版本分配连续技术后缀，相同 HTML 使用相同后缀；
- 文字不同不得因 HTML 不同而分配技术后缀；
- 样式不参与动态资格、字段职责或业务语义判断。

## Fixture 11：固定配置值

同一成品预览中包含多种固定配置 Text，以及按钮上的固定配置值和固定操作文案。部分值由 Component property、Variable 或 binding 控制，另一些值在不同配置实例或 Variant 间不同；各自结构都明确它们由当前配置确定，而不是同一 UI 实例的当前状态。

期望：全部 `skip`。固定操作文案命中 Static Copy Veto；其余字段命中固定配置值排除。property、binding、跨实例差异、数值格式、数据展示位置和按钮交互均不能推翻各自结论。

另有一个同格式 Text，Figma 结构只能证明它是 value，无法区分当前运行时状态和当前方案配置。

期望：`confirm`，原因明确为“运行时状态与固定配置职责无法区分”；不得因数字、金额或数据展示位置直接 `name`。

## Fixture 12：Template Field 与 Pure Value Field

### 12A：重复集合项的内部属性

结构：多个重复、同构的 collection item 都包含视觉内容和两个 Pure Value Text。一个 Text 含设计 placeholder，另一个由 Variable 控制；它们分别占据每个 item 内相同的属性槽位。

期望：两个 Pure Value Field 均 `skip`。依据是它们属于重复集合项的内部属性；placeholder、Variable 和各 item 值不同不得让它们得到 `name`。

### 12B：非重复 UI 的独立展示槽位

结构：一个 Pure Value Text 位于非重复 UI 中。稳定 label、父级职责、操作前后状态和槽位关系共同证明它是独立、稳定的当前值展示槽位。

期望：`name`。不得因为整个 Text 只是运行时值就自动 `skip`。

### 12C：Placeholder 边界

结构：同一组待检查 Text 中，一类明确以孤立的 `x`、`xx`、`XXX` 或 `{{}}` 代替未知值；另一类为 `x1`、单词内部的 `x` 或普通格式值。

期望：第一类可作为动态证据，但必须继续经过 Template/Pure Value 分类、collection item 结构角色和字段职责判断；第二类不得识别为 placeholder，普通格式值也不增加动态证据权重。

### 12D：邻近视觉资源不证明集合属性

结构：一个当前进度字段附近有装饰图标，但图标不标识可替换实体；稳定 label、父级职责和操作前后状态共同证明 Text 完整承担同一 UI 实例的当前进度值。

期望：不得仅因图标邻近就认定 Text 是 collection item 内部属性；继续进入 Naming Evidence，并在其余证据充分时得到 `name`。

### 12E：Template Field 包含多个参数

结构：一个单 Text 同时包含稳定固定文字和两个运行时参数。父级职责、同构槽位和状态共同证明整个 Text 是可独立消费的 UI 文案模板。

期望：先按完整 Text 判断为 Template Field；整个 Text 是唯一 `carrier` 并得到 `name`。两个参数分别记录为该 carrier 的参数，不拆成多个字段，也不按参数表示的数据类型改变结论。

### 12F：重复集合项中的独立纯值

结构：同一组重复、同构 collection item 中，两个运行时值各自是独立 Text，各自完整承担 item 内稳定属性槽位；附近没有固定文字与其共同组成可独立消费的 UI 模板。

期望：两个逻辑字段都是 Pure Value Field，并因属于 collection item 的内部属性而 `skip`。不得把 12E 的 Template Field 规则扩张到独立纯值字段。

### 12G：Pure Value Field 结构角色不明

结构：已证明一个 Text 整体只承载运行时值，但当前 Scope 缺少足够的父级和同构结构，无法判断它是重复 collection item 的内部属性，还是非重复 UI 中的独立稳定展示槽位。

期望：`confirm`，原因明确为“Pure Value Field 结构角色不明”；不得按运行时值表示的数据类型猜测 `skip` 或 `name`。

## Fixture 13：Static Copy Veto

### 13A：固定标题

结构：`Tiger/Lion` 是页面、弹窗、卡片或模块中的完整固定 Heading。其所在容器存在 Component、Variant、Instance、显隐或弹窗状态变化，但 Text 自身没有 placeholder、内容 binding、独立 value carrier 或同槽位运行时内容变化。

期望：命中 Static Copy Veto 并 `skip`，不进入 Naming Evidence；容器状态变化不得作为标题内容动态的证据。

### 13B：固定操作文案

结构：Button 的固定 label 为 `Send Gift`。控件可点击，并存在显隐、enable/disable 或交互 Variant，但 Text 自身没有运行时替换职责。

期望：命中 Static Copy Veto 并 `skip`，不进入 Naming Evidence；按钮交互性和控件状态变化不得让固定 label 得到 `name`。

### 13C：固定规则正文与标签

结构：一段具体规则正文是完整固定 copy；附近另有只提供语义的字段标题、导航标签、状态标签或 Section label。所在组件会切换状态，但这些 Text 都没有动态参数 carrier。

期望：全部命中 Static Copy Veto 并 `skip`，不因组件、Variant、弹窗或交互上下文变化而进入 Naming Evidence。

### 13D：固定 copy 内含动态 carrier

结构：标题、按钮或正文 Text 内有明确 placeholder、内容 binding，或同一逻辑字段中存在独立 value carrier；同一槽位也可能有运行时内容变化证据。

期望：不得仅因 UI 类型命中 Static Copy Veto；相关 carrier 继续进入 Naming Evidence，再按运行时职责与其余 Exclusion 决定结果。固定 label 成员仍可单独 `skip`。

## Fixture 14：Placeholder 不是命名门槛

### 14A：无 placeholder 的结构明确模板

结构：一个单 Text 没有 placeholder、binding、property 或 Variable，当前画面中的参数仍显示为普通字面量。该 Text 占据稳定的任务、条件或状态文案槽位；父级职责与多个同构结构共同证明该槽位始终输出同一字段，内容由当前任务或运行时配置选择，而不是普通固定说明。

期望：整个 Text 是 `carrier` 并得到 `name`。命名资格来自稳定槽位、同构职责和当前任务或运行时配置的组合结构证据；不得因没有 placeholder、没有 binding 或参数仍是字面量而 `skip` 或 `confirm`。参数边界若无充分证据则记为“待确认”，不影响 `name`。

### 14B：无 placeholder 的普通固定说明

结构：一个 Text 同样没有 placeholder 或 binding，但结构只证明它是固定标题、按钮、标签或规则正文，没有稳定的任务、条件、状态模板槽位，也没有内容由当前任务或运行时配置选择的证据。

期望：命中 Static Copy Veto 并 `skip`。14A 不得让所有无 placeholder 文案都进入 Naming Evidence。

### 14C：固定配置属性保持排除

结构：一个无 placeholder Text 位于稳定 value 槽位，同构实例中职责一致，但结构证明它只展示当前配置值，不承担任务、条件、状态或其他 UI 模板职责。

期望：`skip`。稳定槽位和同构职责只能证明字段职责，不能把固定配置属性变成运行时模板。

## Fixture 15：Scan Ledger 与 Placeholder 检测解耦

### 15A：全量入账与守恒

结构：Scope 内同时包含显式 placeholder 模板、无 placeholder 但职责明确的运行时模板、固定 label、supporting text、结构证据不足的 Text，以及需要写回但写回失败的 carrier。

期望：所有 Text 在任何 placeholder 检测前进入同一 Scan Ledger，每项最终且只得到 `name`、`skip` 或 `confirm`，并满足 `Text 总数 = name + skip + confirm`。写回失败的 carrier 仍属于 `name`，另附 `failed` 执行状态；不得出现未分类 candidate。

### 15B：正则未命中不是否定证据

结构：两个没有命中 placeholder 正则的 Text，一个由稳定槽位、父级职责和同构状态证明为运行时模板，另一个缺少足够证据区分固定与运行时职责。

期望：二者都继续完成语义判断，分别得到 `name` 和 `confirm`。正则未命中不得让它们跳过 Ledger、candidate 或字段判断，也不得直接导出 `skip`。

### 15C：嵌入普通 token 的 `x`

结构：一组 Text 分别包含独立 `x`、`xx`、`XXX`、`{{}}`，以及 `LVx`、`x1` 和单词内部的 `x`。前一组明确以独立 token 代替未知值；后一组中一部分没有其他证据，另一部分有 binding、等价槽位差异和固定模板结构共同证明具体片段会替换。

期望：前一组可被检测为显式 placeholder。后一组不得仅凭 `x` 的字符形态认定参数；无额外证据者只是不增加 placeholder evidence，仍继续语义判断，有额外结构证据者可按证据确认参数边界。

### 15D：命名资格与参数边界独立

结构：一个完整单 Text 的运行时模板职责、业务语义和 carrier 明确，但只能确认其中部分参数边界，其他疑似动态片段仍缺少最小边界证据。

期望：节点决策为 `name`，仅 `parameterized` 标为“待确认”；不得把节点降为 `confirm`，也不得擅自扩大参数边界。

### 15E：读取失败不制造漏项

结构：一个独立区域读取失败。部分 Text 已进入 Scan Ledger，但证据不完整；另一次失败发生在枚举完成前，无法确认该区域的 Text 总数。

期望：已入账 Text 逐项 `confirm` 并说明缺失的读取证据，不写回。无法完整枚举时本次扫描明确为未完成，只报告已知结果和未读取区域；不得用局部统计冒充 Scope 全量守恒或输出“命名完成”。

## 禁止回归

以下任一情况视为失败：

- 看到某种数字、时间、比例或货币格式就直接 `name`；
- 把 `x1`、单词内部的 `x` 或普通格式值误判为 placeholder；
- 因 placeholder 正则未命中而把 Text 排除出 Scan Ledger、candidate、Decision 或 Naming Plan，或跳过字段职责与业务语义判断；
- Scope 内存在未得到 `name`、`skip` 或 `confirm` 的 Text，或把 `failed` 当作第四种互斥决策导致汇总不守恒；
- 读取失败后静默丢弃已知 Text，或在 Scope 无法完整枚举时宣称扫描完成；
- 仅凭 `LVx`、`x1` 或单词内部的 `x` 的字符形式认定参数，没有要求额外结构证据；
- 仅因 Text 位于数据展示位置就直接 `name`；
- 仅因缺少 binding、接口、数据源或其他运行时来源就把职责明确的完整当前运行时字段判为 `confirm`；
- 仅凭 property、binding、跨实例或 Variant 差异就把固定配置值判为 `name`；
- Figma 结构无法区分运行时状态和固定配置时，因数值或金额外观直接 `name`；
- 为某个活动玩法、当前 Figma 文案或具体数值新增识别分支；
- 先按 Text node 独立判断，再事后拼接上下文；
- exact `characters` 相同就强制共享结果；
- binding 存在就忽略 collection item 结构角色、Static Copy Veto 或固定配置排除；
- placeholder、Variable、property、binding 或动态值证据覆盖重复集合项内部 Pure Value Field 的 `skip` 结论；
- 按运行时参数表示的业务对象或属性类型决定 Template Field 或 Pure Value Field 是否 `skip`；
- 把完整单 Text 模板中的多个参数和固定文字拆成多个逻辑字段或多个 carrier；
- 把 placeholder 当作 `name` 的必要条件，因结构明确的任务、条件或状态模板没有 placeholder、binding，或参数仍是字面量，就直接 `skip` 或 `confirm`；
- 仅因标题、按钮、正文或标签所在的 Component、Variant、Instance、弹窗或交互状态会变化，就把固定 copy 送入 Naming Evidence 或判为 `name`；
- 标题、按钮或正文内部存在明确动态 carrier 时，仅因 UI 类型直接 `skip`；
- 仅因图片或图标与 Text 邻近，就把非重复 UI 的独立展示字段判为 `skip`；
- 把拆分视觉碎片拼成虚构 Text 并命名；
- 用样式强调推断动态性或业务语义。
- 运行时字段职责明确但参数边界不明时，把整个 `characters` 擅自替换为 `{{}}` 或把字段降为 `confirm`；
- 等价业务字段未先统一 shared semantic identity 和 `baseName` 就各自生成名称；
- 把 Scope 外的证据节点计入 Decision、Naming Plan、写回或扫描统计；
- Page 级 Scope 只扫描成品预览，遗漏开发组件、局部效果或其他结构明确的研发交付 UI Text；
- 因 Text 位于 `切图/*` 而直接排除，或因位于 `预览图/*`、`弹窗/*` 而直接纳入；
- 使用具体节点名称白名单或业务场景特判代替实际 UI 交付职责判断；
- Scope 已纳入某个实际 UI 交付区域后，又用 placeholder 或候选规则过滤其中 Text。
