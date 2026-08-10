# Figma 动态文本命名规范

来源：[《Figma 动态文本命名规范》](https://wepie.feishu.cn/wiki/FWHawauMGiys1hk3AbZccQPPnSe)

- 本地规则快照日期：2026-08-10
- 候选检测补充：完整预览图与对应切图比对方案（2026-08-10）
- 搜索策略补充：候选漏斗与按缺口扩展方案（2026-08-10）
- 完整名称格式：`文案/${business-domain}/${semantic-key}`
- 格式正则：`/^文案\/[a-z]+(?:-[a-z]+)?\/[a-z]+(?:-[a-z]+)?$/`

本文件是飞书规范在仓库中的完整本地规则快照，也是 Skill 运行时唯一的命名事实源。运行时必须直接读取本文件，不得读取飞书。飞书规范更新后，同步更新本文件、脚本、测试和快照日期。

## 目录

- 候选检测
- 搜索与收敛原则
- 名称格式
- 一级板块与业务域
- 语义字段
- 标准词义
- 命名证据
- 当前名称复核
- 名称复用与冲突
- 兼容与迁移
- 动态文本原文
- 中文含义
- 结果模型
- 修改边界

## 候选检测

动态文本候选有两个互相独立的来源。任一来源证据完整即可进入后续命名复核；`node.name`、样式或可见性不能单独证明候选。

### 占位符候选

根据文本节点的 `characters` 判断：

```js
const dynamicPlaceholder =
  /(^|[^A-Za-z0-9])(?:x{2,}|X+)(?=$|[^A-Za-z0-9])/;
const isCandidate = dynamicPlaceholder.test(node.characters);
```

可以识别：

```text
xx时xx分
xxxx/100
XX
X
XXX
剩余 xx 次
```

不匹配：

```text
1x
x1
box
extra
example
```

当前名称看似合规的候选仍须进入完整复核，不能因正则通过而跳过。

### 完整预览图与切图差异候选

当 Figma 链接范围内同时存在完整预览图和对应切图时，可以把“完整预览图中出现、切图中缺失”的文字作为另一种候选来源。该来源不要求 `characters` 含 `x` 或 `X` 占位符，但必须同时满足：

1. 两张素材的对应关系能由结构、命名、位置、标注或视觉特征可靠支持；关系明确时直接使用，关系不明确时先寻找可能的对应关系再验证，不能只凭视觉相似认定；
2. 两张素材属于同一设计版本、语言和界面状态；
3. 通过非文字视觉地标确认待比较区域在两张素材中共同覆盖且能够对应；
4. 文字在完整预览图中清晰可见，在切图的对应区域内确实没有；
5. 缺失不是由裁剪边界、遮挡、缩放、清晰度、蒙版或素材状态差异造成；
6. 预览图中的差异文字能够唯一映射到链接范围内的一个可编辑 Text 节点。

比对只用于证明文字“可能由运行时动态叠加”，不能证明业务域、字段语义或最终名称。最终记录和输出的动态文本必须逐字来自唯一匹配 Text 节点的 `characters`，不得把图片 OCR 结果当作 `characters`，也不得给图片像素命名。

如果已经观察到“预览有、切图没有”的文字差异，但素材状态、共同区域或 Text 节点映射任一项未证实，使用 `confirm`。两种候选来源都不成立时使用 `skip`。

## 搜索与收敛原则

采用由浅入深的候选漏斗。先用页面结构、文字特征和素材对应关系快速定位可能的动态文字，再围绕候选逐步补充祖先、相邻文案、组件和样式等证据。已有证据足以判断时及时收敛；证据不足时，根据当前缺口选择最有价值的下一步读取，并控制扩展范围。

- 优先读取信息密度高、成本低的内容。页面结构、Text 节点的 `characters` 和边界通常适合初筛，但可根据工具返回和设计结构选择其他等价信息。
- 优先复用同一板块、共享祖先和已读取素材的证据，避免为多个候选重复获取同一上下文。
- 图片关系明确时直接比较；关系不明确时可以结合结构、命名、位置、标注和视觉特征寻找可能的对应关系，再验证版本、语言、界面状态与共同覆盖区域。
- 局部证据不足时允许逐层扩大范围。样式、完整节点树或更广范围的信息，在确实有助于解决当前候选发现、关系验证或语义缺口时再读取。
- 读写尽量批量处理；工具条件不适合批量时可以采用其他可靠方式。置信度可以帮助安排搜索顺序，但结果仍以候选、业务域、字段语义和冲突等确定性检查为准。

搜索策略可以适应新的 Figma 结构，但不能越出用户链接限定范围。完成与当前证据缺口相称的针对性读取后仍不足以可靠命名时使用 `confirm`；不得猜测名称。所有写入仍须遵循修改边界并完成写后回读。

## 名称格式

完整名称必须是：

```text
文案/${business-domain}/${semantic-key}
```

并且完整匹配：

```js
const canonicalDynamicTextName =
  /^文案\/[a-z]+(?:-[a-z]+)?\/[a-z]+(?:-[a-z]+)?$/;
```

格式合同：

- `文案/` 是固定中文前缀；
- 完整名称恰好包含两个 `/`；
- `business-domain` 通常是一个小写英文单词；同一业务字段因 PC HTML 不同而必须拆 key 时，可使用“稳定场景-业务域”两个小写英文单词；
- `semantic-key` 只能是一至两个小写英文单词；
- 两个语义单词之间使用一个连字符；
- 禁止下划线、camelCase、大写、缩写、无语义数字、错拼、节点 ID、Frame 序号、坐标和区域编号。

合法示例：

```text
文案/lottery/remaining-count
文案/reward/name
文案/ranking/current-rank
文案/fountain/guarantee-progress
文案/voice-ranking/jewel-count
```

非法示例：

```text
lottery/remaining-count
文案/lottery/remaining-draw-count
文案/coinPool/share-count
文案/tab1/screen-tips
文案/sign/getTimes
文案/reward/reward_name
文案/voice-room-ranking/jewel-count
```

格式校验只证明字符串结构正确，不证明业务域、字段语义或冲突正确。

## 一级板块与业务域

页面容器下的每个一级板块是独立业务域边界。开始命名前，先识别页面容器，再枚举其直接子级的一级板块，并把每个候选归入唯一一级板块。

`板块1`、`板块2`、`Frame 123` 等名称只用于确定结构边界，不是业务语义证据，不能由此生成业务域。

`business-domain` 表示该一级板块承载的稳定业务对象或功能模块。必须结合板块内标题、原文、相邻标签、组件含义和平行字段确定，通常使用一个小写英文单词，例如：

```text
lottery
reward
team
ranking
founder
level
medal
puzzle
recharge
sign
share
broadcast
```

不得从页面位置、Tab 序号、Frame 名、区域编号、颜色、样式、节点 ID、音译或扫描顺序生成业务域。禁止使用以下结构词或弱语义词作为业务域：

```text
txt
text
value
info
block
section
panel
tab
tab1
tab2
page
bottom
```

同一页面的不同一级板块必须分别判断业务域。不能因为两个板块相邻、视觉相似或同属一个页面，就共享一个未经证实的业务域。

用户要求上传 PC，且相同业务字段生成的完整 HTML 不同时，使用两个单词的复合业务域拆分 key：`${stable-context}-${business-domain}`。稳定场景必须能由页面、一级板块、具名祖先或组件语义可靠确定，例如语音房排行可使用 `voice-ranking`，语音房奖励可使用 `voice-reward`。保留已经稳定使用的基础业务域，把需要区分的其他场景改为复合业务域，以减少无意义迁移。

不得使用 `small-ranking`、`ranking-18px`、`ranking-v2` 等视觉值、版本号或临时描述作为复合业务域。若两个不同 HTML 无法获得稳定场景限定，使用 `confirm`，不得上传。

## 语义字段

`semantic-key` 表示字段的核心含义、状态或业务动作，只能使用一至两个完整的小写英文单词：

```text
count
remaining-count
current-rank
guarantee-progress
purchase-confirm
seat-status
```

名称只保留足以稳定识别字段的核心语义，不逐句翻译完整文案。

当自然描述需要三个或更多单词时，不得机械截断。先检查其中是否重复了 `business-domain` 已表达的业务含义，再删除重复部分。例如“剩余抽奖次数”位于抽奖板块时：

```text
lottery + remaining-draw-count
```

应收敛为：

```text
文案/lottery/remaining-count
```

如果删除重复业务含义后仍超过两个单词，或存在多种同样合理的缩短方式，使用 `confirm`，不得靠删最后一个单词、缩写或泛化成弱语义词通过格式校验。

证据不足时不得使用以下词猜测语义：

```text
txt
text
value
info
block
section
panel
```

## 标准词义

新名称使用完整、含义明确的英文词。以下词义是稳定契约。

### 数量

数量使用 `count`，不使用 `num`、`times`、`val`。需要区分对象时，在 `count` 前增加一个对象词；对象已由业务域表达时不重复：

```text
文案/reward/count
文案/vote/remaining-count
文案/ranking/voter-count
文案/lottery/remaining-count
```

### 剩余与余额

剩余统一使用 `remaining`，不使用 `remain` 或 `left`：

```text
文案/gift/remaining-count
文案/level/remaining-time
```

可消费资源当前持有量使用 `balance`；纯数量才使用 `count`：

```text
文案/chip/balance
文案/coin/balance
文案/treasure/key-balance
```

### 进度与排名

当前值与目标值之间的过程使用 `progress`；只有明确表示保底进度时使用 `guarantee-progress`：

```text
文案/fountain/guarantee-progress
文案/tier/progress
```

排名位置使用 `rank`，按语义区分：

```text
文案/founder/current-rank
文案/ranking/friend-rank
文案/ranking/national-rank
```

### 时间

按真实含义选择：

```text
duration
countdown
remaining-time
start-time
end-time
```

不得因为文本显示数字就统一使用 `time`。

### 状态、确认与结果

当前状态使用 `status`，身份、等级和阶段使用实际对象：

```text
文案/level/seat-status
文案/level/current-tier
文案/stage/current-name
```

二次确认使用 `confirm`，需要区分动作时增加一个动作词。业务动作已由业务域完整表达时只使用 `confirm`：

```text
文案/lottery/confirm
文案/chip/purchase-confirm
文案/dialog/unlock-confirm
```

操作结果使用 `success` 或 `failure`，需要时增加一个动作词：

```text
文案/chip/purchase-success
文案/medal/unlock-success
文案/reward/claim-failure
```

不得使用 `res`、`cong`、`result1`、`text2` 等模糊词。

### 名称、标题与编号

按真实含义选择 `name`、`title`、`number`：

```text
文案/reward/name
文案/season/title
文案/founder/seat-number
文案/share/ring-number
```

界面显示 `NO.{{}}` 时仍须判断真实编号对象，不能仅按展示形式命名为 `no`。

## 命名证据

名称只能依据当前 Figma 链接范围内可观察的信息确定，按以下优先级使用：

1. Text 节点的完整原文及占位符结构；
2. 候选所属的页面容器和一级板块；
3. 一级板块内与候选唯一对应的中文备注；
4. 当前图层名称；
5. 一级板块内最近的具名业务父节点或祖先；
6. 一级板块内的相邻标签和兄弟文案；
7. 所属组件及变体状态；
8. 同一一级板块内已经确认的平行字段名称。

运行时不得读取飞书、需求文档、代码仓库或其他外部资料作为命名输入。当前图层名称只能作为待复核证据，不能证明自身正确。

以下自动、结构性或空泛名称不构成业务语义证据：

```text
Frame 123
Group 8
Text 128
板块1
板块2
数字
xx
```

中文备注必须通过同组、邻接、标注连线、配对结构或其他明确关系与候选唯一对应。仅仅位置靠近不够。备注与原文冲突、候选只有占位符且其他上下文不能确定含义时，使用 `confirm`。

完整预览图与切图的文字差异只能用于候选发现，不得用于推断业务域或字段语义。颜色、字号、字重、位置和尺寸不得用于推断业务域或字段语义。用户要求上传 PC 时，生成后的完整 HTML 只用于判断同一名称能否安全复用；HTML 不同表示需要稳定场景限定，但具体限定仍须来自业务上下文。

## 当前名称复核

每个候选都必须复核当前名称，即使当前名称匹配格式正则也不能直接 `keep`。只有以下四项全部正确才能 `keep`：

1. 格式符合 `文案/${business-domain}/${semantic-key}`；
2. 业务域符合候选所属一级板块的业务域；
3. 字段语义准确且能由当前 Figma 证据支持；
4. 名称与其他业务字段不存在冲突；用户要求上传 PC 时，同一名称也不得对应不同 HTML。

任何一项错误都不能 `keep`。有可靠替代名称时 `rename`；证据不足以生成可靠替代名称时 `confirm`。

用户指定的名称也必须通过这四项检查。

## 名称复用与冲突

未要求上传 PC 时，相同业务字段复用完全相同的完整名称。视觉样式、页面位置、节点顺序、显隐状态、语言版本和一级板块编号本身都不是推断字段语义的理由。

用户要求上传 PC 时，名称同时是唯一的 PC HTML key。必须先为同一业务字段的全部候选生成规范 HTML，再按“业务字段 + 完整 HTML”分组：HTML 完全相同的节点复用名称；HTML 不同的组使用“稳定场景-业务域”复合业务域生成不同名称。style 属性固定按颜色、字号、字重、行高输出；比较范围包括文案、颜色、字号、字重、行高、换行、空白和 styled text 分段生成的全部 HTML，不得只比较字号。

例如普通活动页与语音房排行中的 `jewel-count` 文案相同但 HTML 不同，可保留 `文案/ranking/jewel-count`，并把语音房版本命名为 `文案/voice-ranking/jewel-count`。这表示两个稳定使用场景，不表示从样式反推业务语义。

同一名称对应不同业务字段时构成冲突，应按真实语义重新命名。不得追加节点 ID、Frame 编号、区域编号、坐标、扫描顺序或无语义数字解决冲突；无法可靠区分时使用 `confirm`。

上传前必须对全部待上传项建立 `key -> HTML` 映射。只要同一 key 出现两个不同 HTML，就在任何 Figma 或 PC 写入前停止，把冲突项标记为 `confirm`；不得先写回名称或上传无冲突项，也不得用后一个值覆盖前一个值。

多个现有名称都能表达同一业务字段时，优先选择格式合规、业务域正确、语义最准确且已稳定使用的名称。仍无法稳定选择时使用 `confirm`。

## 兼容与迁移

旧的 `<business-domain>/<semantic-key>` 两段式名称一律不符合新版格式，不能 `keep`。业务域和语义仍准确时，迁移到带固定前缀的新名称：

```text
lottery/remaining-count
-> 文案/lottery/remaining-count
```

迁移不是无条件补前缀。旧名称仍须复核所属一级板块、业务域、字段语义和冲突；任何一项不可靠时使用 `confirm`。

旧名称的 `semantic-key` 超过两个单词时，按“语义字段”规则删除与业务域重复的含义，不能机械截断：

```text
lottery/remaining-draw-count
-> 文案/lottery/remaining-count
```

已经符合新三段式格式且四项检查全部通过的名称保持 `keep`，避免无理由改用近义词。

## 动态文本原文

结果中的“动态文本”必须逐字复制文字节点的 `characters`，不得使用图层名称、中文翻译、业务标签或语义摘要代替。

必须保留原文的：

- 原语言和文字书写系统；
- 标点及全角、半角形式；
- 大小写；
- 空格、换行和其他空白；
- 占位符的原始写法与数量，例如 `X`、`XX`、`xx`、`xxxx`。

不得翻译、概括、纠错、补字、删字、调整标点、统一大小写，或把原文占位符替换为 `{{}}`。`{{}}` 只用于“完整中文含义”。

相同业务字段合并预览时，仍须逐项列出组内每个不同的 `characters` 原文；不得用“奖励名称”“当前轮次”“徽章解锁提示”等中文业务标签代替原文。

## 中文含义

中文含义必须忠实表达完整原文：

- 保留完整信息；
- 占位符统一表示为 `{{}}`；
- 保留数量、状态、时间、条件和否定关系；
- 不根据上下文增加原文没有的信息；
- 不将完整句子概括为“奖励名称”“条件文案”等摘要。

中文含义表达完整原文，英文名称只表达字段核心语义，两者分别处理。

## 结果模型

每个扫描到的文本节点只使用以下结果之一：

- `rename`：是候选，当前名称不能保留，且新名称已经通过格式、业务域、字段语义和冲突检查；
- `keep`：是候选，当前名称已经通过全部四项检查；
- `skip`：`characters` 不匹配候选正则，且没有可靠的完整预览图与切图差异证据；
- `confirm`：观察到候选信号，但素材配对、共同区域、Text 节点映射、业务域、字段语义、缩短方式或冲突处理缺少可靠证据。

`confirm` 项不得写回猜测名称。`skip` 项不得参与命名。

## 修改边界

写回时只修改 `rename` 项对应文字图层的 `node.name`。不得修改候选文字的 `characters`、样式、位置、尺寸、可见性、一级板块结构、组件关系或其他 Figma 数据。`keep`、`skip` 和 `confirm` 项不写入。
