# Regression Fixtures

本文件只用于修改 `figma-text-naming` 规则后的回归验证。正常 Figma 命名任务不得读取本文件，也不得把其中的文案、业务或数值复制进核心 Skill。

验证目标不是让某种字符串永远得到固定结果，而是证明相同表面格式会随 Scope、Logical Field、Entity Field Veto、Static Copy Veto、Naming Evidence 和 Remaining Exclusion 得到不同结论。

## 断言维度

每个 fixture 同时检查：

- Scope 是否正确；
- 逻辑字段边界与成员角色是否正确；
- Entity Field Veto 是否在 placeholder、Variable、状态值和动态模板证据之前执行；
- Static Copy Veto 是否在 Naming Evidence 之前排除没有运行时替换职责的固定 UI 文案；
- 直接证据或结构职责证据是否指向明确 carrier；
- 格式本身是否保持零证据权重；
- 明确 placeholder 是否与普通格式线索区分，且仍服从 Entity Field Veto、Static Copy Veto 和字段职责判断；
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

结构：没有 Variable、property 或任何已知运行时来源。固定 label、父级容器职责、用户操作前后状态和 value 槽位共同明确 value 完整承担当前运行时展示职责；该容器不是重复实体 Item。

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

该 Text 位于重复 Item 的实体属性槽位，随每个实体显示不同指标。

期望：`skip`；构建逻辑字段后立即命中 Entity Field Veto，不再用同槽位变化建立 Naming Evidence。

## Fixture 4：`99.99` 的五种证据

### 4A

单 Text 有直接 Variable binding，稳定 label、组件职责和用户操作前后状态共同证明它是当前运行时结果字段，不属于实体 Item。

期望：`name`。

### 4B

单 Text 位于可展示不同商品的 Item 价格槽位，并与商品图共同标识当前实体。

期望：`skip`；即使价格含 placeholder 或 Variable，也先命中 Entity Field Veto。

### 4C

单 Text 没有 binding，附近结构也无法说明它承担什么字段职责，且没有证据表明它是设计说明。

期望：`confirm`，原因是字段职责不明；不得仅凭小数格式决定，也不得把缺少 binding 本身作为原因。

### 4D

单 Text 位于结构明确的设计说明或标注区。

期望：`skip`。

### 4E

单 Text 与固定商品或当前方案形成明确的 label/value 字段；即使它由 Component property 控制，结构仍证明它是该商品或方案的固定价格，不会在同一 UI 实例中随当前状态替换。

期望：`skip`；property 只证明价格可配置，不能证明运行时替换职责。

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

同一业务含四个区域：一个 binding 与操作前后状态共同证明的当前进度字段、一个无 binding 但状态结构明确的完整当前进度字段、一个重复用户 Item 的实体数值、一个结构明确的设计说明示例。

期望依次为：

- binding 与状态共同证明的当前进度字段 `name`；
- 结构明确的完整当前进度字段 `name`；
- 实体数值 `skip`；
- 设计说明 `skip`。

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

同一原文分别出现在：有绑定且职责明确的运行时 carrier、无绑定但职责明确的完整当前运行时字段、可替换实体属性槽位、固定配置槽位、无上下文的未知区域。

期望分别为 `name`、`name`、`skip`、`skip`、`confirm`。exact `characters` 只能帮助找到副本，不能强制共享资格。

## Fixture 9：Scope 隔离

一个 Page 同时包含成品预览、母组件集合、资产陈列和设计说明。用户链接指向 Page。

期望：

- 仅结构上属于成品预览的 Text 进入识别；
- 预览中的 Instance 后代进入 Scope；
- 预览外的源 Component、资产和说明排除；
- 为结构或样式证据读取的 Scope 外节点不进入 Decision、Naming Plan、写回或扫描统计；
- 无法区分的根以 Scope 不确定进入 `confirm`，不写回。

## Fixture 10：样式复用

多个 carrier 已由结构证明确认为同一业务语义并共享 `baseName`。其中一组 `characters` 完全相同，但存在相同和不同的 canonical HTML；另有文字不同的 carrier。

期望：

- 所有等价字段先统一 shared semantic identity 和 `baseName`，不得独立起名后合并；
- 只在 `baseName` 和 `characters` 都相同时比较 canonical HTML；
- 同一文字只有一种 HTML 时复用无后缀名称；存在多种 HTML 时按完整字符串稳定排序并为所有样式版本分配连续技术后缀，相同 HTML 使用相同后缀；
- 文字不同不得因 HTML 不同而分配技术后缀；
- 样式不参与动态资格、字段职责或业务语义判断。

## Fixture 11：固定配置值

同一成品预览中包含：固定活动时间、固定商品价格、固定档位阈值、固定奖励数量、固定套餐信息，以及按钮上的固定价格和固定操作文案。部分值由 Component property、Variable 或 binding 控制，另一些值在不同方案实例或 Variant 间不同；各自结构都明确它们随活动、商品、档位或方案确定，而不是同一 UI 实例的当前状态。

期望：全部 `skip`。固定操作文案命中 Static Copy Veto；其余字段命中固定配置值排除。property、binding、跨实例差异、数值格式、数据展示位置和按钮交互均不能推翻各自结论。

另有一个同格式 Text，Figma 结构只能证明它是 value，无法区分当前运行时状态和当前方案配置。

期望：`confirm`，原因明确为“运行时状态与固定配置职责无法区分”；不得因数字、金额或数据展示位置直接 `name`。

## Fixture 12：Entity Field Veto 优先级

### 12A：奖励卡

结构：一个可复用奖励 Item 内包含道具图片、道具名称 Text 和数量 Text。名称含设计 placeholder，数量显示 `x1` 并绑定 Variable；同构实例中图片、名称和数量随当前道具一起变化。

期望：名称字段与数量字段分别命中 Entity Field Veto，均 `skip`。placeholder、Variable 和跨实例槽位变化不得让任何一个字段进入 Naming Evidence 或得到 `name`。

### 12B：排行榜 Item

结构：一个可复用列表行内包含头像、用户昵称和积分。昵称由 Text property 控制，积分含动态值 placeholder；同一结构展示不同用户。

期望：昵称与积分均 `skip`。变化来源是列表行当前绑定的用户实体，不是 UI 文案模板中的参数替换。

### 12C：Placeholder 边界

结构：同一组待检查 Text 中，一类明确以孤立的 `x`、`xx`、`XXX` 或 `{{}}` 代替未知值；另一类为 `x1`、单词内部的 `x` 或普通格式值。

期望：第一类可作为动态证据，但必须继续经过 Entity Field Veto 和字段职责判断；第二类不得识别为 placeholder，普通格式值也不增加动态证据权重。

### 12D：视觉资源不是实体

结构：一个当前进度字段附近有装饰图标，但图标不标识可替换实体；稳定 label、父级职责和操作前后状态共同证明 Text 完整承担同一 UI 实例的当前进度值。

期望：不得仅因图标邻近命中 Entity Field Veto；继续进入 Naming Evidence，并在其余证据充分时得到 `name`。

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

## 禁止回归

以下任一情况视为失败：

- 看到某种数字、时间、比例或货币格式就直接 `name`；
- 把 `x1`、单词内部的 `x` 或普通格式值误判为 placeholder；
- 仅因 Text 位于数据展示位置就直接 `name`；
- 仅因缺少 binding、接口、数据源或其他运行时来源就把职责明确的完整当前运行时字段判为 `confirm`；
- 仅凭 property、binding、跨实例或 Variant 差异就把固定配置值判为 `name`；
- Figma 结构无法区分运行时状态和固定配置时，因数值或金额外观直接 `name`；
- 为某个活动玩法、当前 Figma 文案或具体数值新增识别分支；
- 先按 Text node 独立判断，再事后拼接上下文；
- exact `characters` 相同就强制共享结果；
- binding 存在就忽略 Entity Field Veto、Static Copy Veto 或固定配置排除；
- placeholder、Variable、property、binding 或动态值证据覆盖 Entity Field Veto；
- 仅因标题、按钮、正文或标签所在的 Component、Variant、Instance、弹窗或交互状态会变化，就把固定 copy 送入 Naming Evidence 或判为 `name`；
- 标题、按钮或正文内部存在明确动态 carrier 时，仅因 UI 类型直接 `skip`；
- 仅因图片、头像或图标与 Text 邻近，就把非实体 UI 字段判为 `skip`；
- 把拆分视觉碎片拼成虚构 Text 并命名；
- 用样式强调推断动态性或业务语义。
- 运行时字段职责明确但参数边界不明时，把整个 `characters` 擅自替换为 `{{}}` 或把字段降为 `confirm`；
- 等价业务字段未先统一 shared semantic identity 和 `baseName` 就各自生成名称；
- 把 Scope 外的证据节点计入 Decision、Naming Plan、写回或扫描统计。
