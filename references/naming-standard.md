# Figma 动态文本命名规范

本文件由当前仓库团队维护，是 Figma 动态文本候选识别、业务 Key 和中文含义的唯一命名事实源，不是外部文档的快照。所有新名称、复用名称和用户指定名称都必须符合本规范；不要凭记忆重写规范。

- 维护位置：当前仓库
- 适用范围：Figma 动态文本业务 Key 和完整中文含义
- 任务输入：用户提供的 Figma Design 链接和自然语言要求
- 语义证据：该链接范围内可见或可读取的 Figma 内容与结构
- 最后更新：2026-08-05
- 标准格式与标准词义属于稳定契约，不因现有图层名、历史写法或临时示例改变。

规则优先级从高到低：

1. 本规范规定的名称格式和标准词义；
2. 当前业务模块中已经确认且符合本规范的稳定名称；
3. 根据原文和 Figma 上下文生成的新名称。

执行命名时不要求或读取飞书、需求文档、代码仓库或额外配置。本文件只规定“哪些文本需要命名”和“名称应该是什么”，不规定扫描实现、结果汇报格式或 Figma 写回流程。

## 目录

- 候选检测
- 核心原则
- 名称格式
- 业务域
- 语义字段
- 标准词义
- 命名证据
- 中文含义
- 名称选择
- 名称复用与冲突
- 稳定性

## 候选检测

使用文本节点的 `characters` 判断是否包含动态占位符，不使用当前图层名称：

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

当前名称已经符合格式的候选仍须参与语义复核，不能仅凭名称格式直接跳过。

## 核心原则

名称用于稳定识别业务字段，不用于描述图层位置、视觉样式或完整句子。

名称遵循：

```text
业务对象 / 字段含义
```

例如：

```text
lottery/remaining-draw-count
reward/name
team/contribution
founder/current-rank
fountain/guarantee-progress
```

名称脱离当前设计稿位置后，仍应能够说明该字段是什么。

## 名称格式

名称格式为：

```text
<business-domain>/<semantic-key>
```

只能包含一个 `/`，并通过：

```js
const canonicalTextKey =
  /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*\/[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
```

统一使用：

- 全小写；
- kebab-case；
- 正确、完整的英文单词；
- 一个业务域；
- 一个语义字段。

禁止使用 camelCase、下划线、大写字母、无语义数字、历史错拼、节点 ID、Frame 序号、坐标或区域编号。

以下名称不合规：

```text
coinPool/share-count
tab1/screen_tips
tab2/level_remain_time
signSuccess/reward
tab1/getTimes
```

## 业务域

`business-domain` 表示文本直接所属的稳定业务对象或功能模块。

优先根据完整原文和 Figma 业务上下文选择，例如：

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

业务域不得来自页面位置、Tab 序号、Frame 名称、区域编号、颜色、样式、节点 ID、音译或扫描顺序。

业务对象明确时，不得使用以下通用界面词作为业务域：

```text
txt
text
page
tab1
tab2
info
bottom
```

例如，剩余抽奖次数使用：

```text
lottery/remaining-draw-count
```

不要使用：

```text
txt/count
tab1/remain-count
page/value
```

只有文本确实描述通用弹窗、提示或界面能力，且无法归属于更具体的业务对象时，才可使用 `dialog`、`toast` 等通用业务域。

## 语义字段

`semantic-key` 表示字段的核心含义、状态或业务动作，通常使用 1 至 4 个必要英文词：

```text
remaining-count
current-rank
guarantee-progress
purchase-confirm
unlock-confirm
reward-name
seat-status
```

名称只保留足以识别字段的核心语义，不逐句翻译完整文案。

例如：

```text
确认花费 {{}} 个抽奖币抽奖 {{}} 次吗？
```

可以命名为 `lottery/confirm`，不需要展开成完整句子的英文翻译。

## 标准词义

新名称统一使用完整、含义明确的英文词。

### 数量

使用 `count`，不新建 `num`、`times`、`val`。需要区分被计数对象时，在 `count` 前补充对象：

```text
reward/count
vote/remaining-count
ranking/voter-count
lottery/remaining-draw-count
```

### 剩余

统一使用 `remaining`，不新建 `remain` 或 `left`：

```text
gift/remaining-count
level/remaining-time
lottery/remaining-draw-count
```

### 余额

可消费资源当前拥有量使用 `balance`：

```text
chip/balance
coin/balance
treasure/key-balance
```

只有纯数量展示、不表达当前持有余额时才使用 `count`。

### 进度

当前值与目标值之间的过程使用 `progress`：

```text
fountain/guarantee-progress
tier/progress
question/progress
```

只有明确表示保底进度时才保留 `guarantee`。

### 排名

排名位置使用 `rank`：

```text
founder/current-rank
ranking/friend-rank
ranking/national-rank
```

排行榜整体模块可以使用 `ranking`，具体名次字段使用 `rank`。

### 时间

根据实际含义区分：

```text
duration        持续时长
countdown       倒计时
remaining-time  剩余时间
start-time      开始时间
end-time        结束时间
```

不得因为文本中显示数字就统一使用 `time`。

### 状态

当前状态使用 `status`。具体身份、等级或阶段使用实际对象：

```text
level/seat-status
level/current-identity
level/current-tier
stage/current-name
```

### 确认操作

二次确认文案使用动作加 `confirm`：

```text
lottery/confirm
chip/purchase-confirm
dialog/unlock-confirm
dialog/retest-confirm
sign/compensation-confirm
```

业务动作已经由业务域完整表达时，可以只使用 `confirm`。

### 操作结果

操作结果使用 `success` 或 `failure`，需要时补充动作对象：

```text
chip/purchase-success
medal/unlock-success
reward/claim-failure
```

不得使用 `res`、`cong`、`result1`、`text2` 等含义模糊的词。

### 名称、标题与编号

根据真实含义选择 `name`、`title`、`number`：

```text
reward/name
season/title
founder/seat-number
share/ring-number
```

界面显示 `NO.{{}}` 时，如果实际表示席位编号，应使用 `seat-number`，不能仅根据展示形式命名为 `no`。

## 命名证据

名称只能依据当前 Figma 中可观察的信息确定，按以下优先级使用：

1. 完整原文及占位符结构；
2. 与候选唯一对应的中文备注；
3. 当前图层名称；
4. 最近的具名业务父节点或祖先；
5. 相邻标签和兄弟文案；
6. 所属组件及变体状态；
7. 同页已经确认的平行字段名称。

飞书文档、需求文档、代码仓库和其他外部资料不作为运行时命名输入或语义证据。

当前图层名称只能作为参考，不能反向证明自身正确。

以下自动或空泛名称不构成有效语义证据：

```text
Frame 123
Group 8
Text 128
板块4
数字
xx
```

中文备注只有在可以通过同组、邻接、标注连线、配对结构或其他明确关系唯一对应时才可使用。不能仅因为某段中文出现在候选附近，就认定它是候选的中文备注。

中文备注和原文含义冲突，或只有占位符且无法从其他上下文确定业务含义时，保持待确认，不得猜测。

颜色、字号、字重等视觉样式不得用于推断业务域或字段语义。

## 中文含义

中文含义必须忠实表达完整原文：

- 保留完整信息；
- 占位符统一表示为 `{{}}`；
- 保留数量、状态、时间、条件和否定关系；
- 不根据业务上下文增加原文没有的信息；
- 不将完整句子概括为“奖励名称”“条件文案”等摘要。

中文含义表达完整原文，英文名称只表达字段核心语义，两者分别处理。

## 名称选择

### 1. 复核当前名称

当前名称同时满足格式正确、业务域准确、字段语义准确且没有名称冲突时保持不变。不得仅因为存在更短或更常见的近义名称，就替换已经准确、稳定的当前名称。

### 2. 参考平行字段

当前名称不可用时，可以参考 Figma 中已经确认的平行字段，只复用已确认的业务域和稳定语义结构，不得根据单个相同单词机械套用。

例如，已有 `ranking/friend-rank` 时，另一个明确表示全国排名的字段可以使用 `ranking/national-rank`。

### 3. 创建新名称

没有可复用名称时，根据当前 Figma 证据创建新名称。新名称必须使用明确业务域和完整英文词，保持简短，并能区分其他业务字段。

无法可靠确定业务域或字段含义时保持待确认，不得使用 `txt`、`text`、`value`、`info` 等通用词猜测。

不得为了区分源文、译文、隐藏参考层或语言版本而追加 `source`、`translation`、`hidden`、语言代码或语言名称，除非它们确实是不同的稳定业务字段。

## 名称复用与冲突

相同业务字段复用同一名称；只有业务含义确实不同才创建不同名称。视觉样式、页面位置、节点顺序、显示或隐藏状态、语言版本本身都不是拆分业务名称的理由。

相同名称对应不同业务字段时，应根据真实语义重新命名。不得追加节点 ID、Frame 编号、区域编号、坐标或扫描顺序解决冲突；无法可靠区分时保持待确认。

多个现有名称都能表达同一业务字段时，优先保留格式合规、语义最准确且已经稳定使用的名称。仍无法稳定选择时保持待确认。

正则匹配不代表名称正确。业务域错误、字段语义错误、名称过度概括或包含无依据位置与编号的名称仍然不可用。

用户明确指定的名称也必须通过格式、语义和名称冲突检查。

## 稳定性

已有名称符合规则、语义准确且不存在冲突时，不得因为扫描顺序、图层移动、Frame 折叠、节点显隐、选中状态、无关节点变化或查询顺序而重新命名。

文本内容、占位符结构或业务语义发生变化时，重新复核名称。
