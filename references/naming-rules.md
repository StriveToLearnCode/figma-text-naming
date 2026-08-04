# 命名规则

本文件负责识别需要命名的动态文本，并为去重后的候选组生成稳定、准确的业务 Key。

文本和样式是否相同由 [deduplication.md](deduplication.md) 判断。本文件不负责修改 Figma、生成富文本或定义用户汇报格式。

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

当前名称已经符合规范的文本仍须参与扫描，用于复核语义、去重关系和名称冲突。

## 核心原则

名称用于稳定识别业务字段，不用于描述图层位置、视觉样式或完整句子。

命名时遵循：

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

名称应在脱离当前设计稿位置后仍然能够说明该字段是什么。

## 名称格式

名称格式为：

```text
<business-domain>/<semantic-key>
```

只能包含一个 `/`，新名称必须通过：

```js
const canonicalTextKey =
  /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*\/[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
```

新名称统一使用：

- 全小写；
- kebab-case；
- 正确英文拼写；
- 一个业务域；
- 一个语义字段。

禁止创建：

```text
coinPool/share-count
tab1/screen_tips
tab2/level_remain_time
signSuccess/reward
tab1/getTimes
```

应改为符合实际语义的标准名称，而不是继续继承历史格式。

禁止使用：

- camelCase；
- 下划线；
- 大写字母；
- 无语义数字；
- 历史错拼；
- 节点 ID；
- Frame 序号；
- 坐标或区域编号。

## 业务域

`business-domain` 表示文本直接所属的稳定业务对象或功能模块。

优先从完整文案和 Figma 业务上下文中选择，例如：

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

业务域不得来自：

- 页面位置；
- Tab 序号；
- Frame 名称或序号；
- 158、388 等区域标识；
- 颜色或样式；
- 节点 ID；
- 中外文音译；
- 扫描顺序。

以下通用界面词不得在业务对象已经明确时作为业务域：

```text
txt
text
page
tab1
tab2
info
bottom
```

例如，文本表达剩余抽奖次数时，应使用：

```text
lottery/remaining-draw-count
```

而不是：

```text
txt/count
tab1/remain-count
page/value
```

只有文本本身确实描述通用弹窗、提示或界面能力，并且无法归属于更具体的业务对象时，才可以使用：

```text
dialog
toast
```

## 语义字段

`semantic-key` 表示字段的核心含义、状态或业务动作。

通常使用 1 至 4 个必要英文词，例如：

```text
remaining-count
current-rank
guarantee-progress
purchase-confirm
unlock-confirm
reward-name
seat-status
```

名称不逐句翻译完整文案，只保留足以识别字段的信息。

例如：

```text
确认花费 {{}} 个抽奖币抽奖 {{}} 次吗？
```

可以命名为：

```text
lottery/confirm
```

不需要命名为：

```text
lottery/confirm-spend-lottery-coins-and-draw-times
```

## 标准词义

新名称统一使用完整、含义明确的英文词。

### 数量

使用：

```text
count
```

不新建：

```text
num
times
val
```

当被计数对象需要区分时，在 `count` 前补充对象：

```text
reward/count
vote/remaining-count
ranking/voter-count
lottery/remaining-draw-count
```

### 剩余

统一使用：

```text
remaining
```

例如：

```text
gift/remaining-count
level/remaining-time
lottery/remaining-draw-count
```

不新建：

```text
remain-count
remain-time
left
```

### 余额

可消费资源当前拥有量使用：

```text
balance
```

例如：

```text
chip/balance
coin/balance
treasure/key-balance
```

只有纯数量展示、不表达用户当前持有余额时才使用 `count`。

### 进度

当前值与目标值之间的过程使用：

```text
progress
```

例如：

```text
fountain/guarantee-progress
tier/progress
question/progress
```

只有明确是保底进度时才保留 `guarantee`。

### 排名

排名位置使用：

```text
rank
```

例如：

```text
founder/current-rank
ranking/friend-rank
ranking/national-rank
```

排行榜整体模块可以使用 `ranking`，具体名次字段使用 `rank`。

### 时间

根据实际含义区分：

```text
duration       持续时长
countdown      倒计时
remaining-time 剩余时间
start-time     开始时间
end-time       结束时间
```

不得因为文本中显示数字就统一使用 `time`。

### 状态

表示当前状态时使用：

```text
status
```

例如：

```text
level/seat-status
```

具体身份、等级或阶段应使用实际对象：

```text
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

当业务动作已经由业务域完整表达时，可以只使用 `confirm`。

### 操作结果

操作结果使用：

```text
success
failure
```

需要说明动作时补充动作对象：

```text
chip/purchase-success
medal/unlock-success
reward/claim-failure
```

不得使用含义模糊的：

```text
res
cong
result1
text2
```

### 名称、标题与编号

根据字段真实含义选择：

```text
name
title
number
```

例如：

```text
reward/name
season/title
founder/seat-number
share/ring-number
```

界面显示 `NO.{{}}` 时，如果实际表示席位编号，应使用 `seat-number`，不能仅根据显示格式命名为 `no`。

## 命名证据

名称只能依据当前 Figma 中可观察的信息确定，按以下顺序使用：

1. 完整原文及占位符结构；
2. 与候选唯一对应的中文备注；
3. 当前图层名称；
4. 最近的具名业务父节点或祖先；
5. 相邻标签和兄弟文案；
6. 所属组件及变体状态；
7. 同页已经确认的平行字段名称。

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

中文备注只有在可以通过同组、邻接、标注连线、配对结构或其他明确关系唯一对应时才可使用。

不能仅因为某段中文出现在候选附近，就认定它是候选的中文备注。

中文备注和原文含义冲突时，标记为 `confirm`。

只有占位符且无法从其他上下文确定业务含义时，也标记为 `confirm`。

局部样式只用于去重和区分样式版本，不得用于推断业务域或字段语义。

## 中文含义

中文含义必须忠实翻译完整原文。

要求：

- 保留完整信息；
- 占位符统一表示为 `{{}}`；
- 保留数量、状态、时间、条件和否定关系；
- 不根据业务上下文增加原文没有的信息；
- 不将完整句子概括为“奖励名称”“条件文案”等摘要。

中文含义和英文名称分别处理：

- 中文含义表达完整原文；
- 英文名称只表达字段核心语义。

## 名称选择顺序

### 1. 复核当前名称

当前名称同时满足以下条件时保持不变：

- 符合标准格式；
- 业务域准确；
- 字段语义准确；
- 与去重结果一致；
- 与样式编号规则一致；
- 当前扫描范围内不存在名称冲突。

不得仅因为存在一个更短或更常见的近义名称，就替换已经准确、稳定的当前名称。

### 2. 参考同页平行字段

当前名称不可用时，可以参考同页已经确认的平行字段。

例如同一模块已经存在：

```text
ranking/friend-rank
```

另一个明确表示全国排名的字段可以使用：

```text
ranking/national-rank
```

只能复用已经确认的业务域和稳定语义结构，不得根据单个相同单词机械套用。

### 3. 创建新名称

没有可复用名称时，根据当前 Figma 证据生成新的标准名称。

新名称必须：

- 使用明确业务域；
- 使用完整英文词；
- 保持简短；
- 能够区分同页其他字段；
- 不包含位置或样式信息。

无法可靠确定业务域或字段含义时，标记为 `confirm`，不得使用 `txt`、`text`、`value`、`info` 等通用词猜测。

不得为了区分设计稿中的源文、译文、隐藏参考层或语言版本而追加 `source`、`translation`、`hidden`、语言代码或语言名称，除非它们在产品中确实是不同的稳定业务字段。

## 样式版本编号

文字和样式都相同的候选共用一个名称，不增加编号。

文字相同、业务语义相同，但样式不同的候选可以使用共同基础名称加两位编号：

```text
ring/box-open-count-01
ring/box-open-count-02
```

编号只表示同一字段的不同样式版本，不表示：

- Frame；
- 页面区域；
- 158 或 388；
- 组件位置；
- 视觉顺序；
- 节点顺序。

只有文字和业务语义都能确认相同时，才允许建立样式编号组。

多个只显示 `xx` 的候选，如果无法确认业务语义相同，不得命名为：

```text
txt/01
txt/02
```

已有编号与对应样式稳定匹配时保持不变。

新增样式版本使用组内未占用的最小两位编号。

首次分配编号时按规范化样式签名稳定排序；样式签名相同时，再使用 Frame 页面顺序和节点 ID 进行稳定裁决。

排序信息不得进入名称。

## 语义等价的多语言文本

不同去重组只有同时满足以下条件时，才可以作为语义等价组共用一个业务 Key：

- Figma 中存在明确的一一对应关系，例如同一组件的源文与译文、明确配对的本地化标注或同一字段的语言变体；
- 占位符数量、顺序和业务指代能够对应，允许因语言语序产生位置变化；
- 完整语义一致，不存在条件、否定、数量、时间、状态或动作差异；
- 共用名称表达稳定业务字段，不表达语言、可见性或设计稿状态。

语义等价组仍是多个精确去重组，不得报告为 `same`，也不参与样式版本编号。证据不足、原文与译文含义不一致或无法一一对应时标记为 `confirm`，不得仅凭“看起来像翻译”强行共名。

## 名称冲突

### 相同名称对应不同候选组

相同名称对应不同业务字段，或不同文字在没有可靠语义等价证据时共用名称，属于冲突。文字不同本身不自动构成冲突。

不得通过追加以下信息解决冲突：

- 节点 ID；
- Frame 编号；
- 区域编号；
- 坐标；
- 扫描顺序。

应根据不同字段的真实语义重新命名。无法可靠区分时标记为 `confirm`。

### 同一候选组存在多个名称

文字和样式完全相同的候选组中存在多个不同当前名称时：

- 只有一个名称符合本规则时，使用该名称；
- 多个名称都符合规则且语义等价时，优先保留已经被更多组内成员使用的名称；
- 使用数量相同时，优先保留更准确、完整且不含通用兜底词的名称；
- 仍无法稳定选择时标记为 `confirm`。

不得为了保留全部旧名称而将相同候选拆成多个组。

### 格式正确但语义错误

正则匹配不代表名称正确。

以下名称仍然不可用：

- 业务域错误；
- 字段语义错误；
- 名称过度概括；
- 包含无依据的位置或编号；
- 相同候选被错误拆分；
- 不同业务字段错误共用名称。

用户明确指定的名称也必须通过格式、语义、去重关系和名称冲突检查。

## 分类与完整性闸门

每个候选必须且只能分类为：

- `rename`：需要改名；
- `keep`：当前名称完整合规；
- `skip`：实例继承、只读或用户明确排除；
- `confirm`：语义、样式、范围或冲突需要确认。

内部建立逐节点 `auditedTextNodes`，至少保留 `nodeId`、页面和扫描根节点、当前名称、完整原文、完整中文含义、去重组、语义等价组、建议名称、依据、置信度、校验结果和处理。用户可见汇总不能替代这份账本。

写回前检查：

- `unclassifiedCandidates.length === 0`；
- `invalidTextKeyFormats.length === 0`；
- `unresolvedNameConflicts.length === 0`；
- `inconsistentDedupGroupNames.length === 0`；
- `missingStyleComparisons.length === 0`；
- `outOfScopeChanges.length === 0`；
- `missingRollbackEntries.length === 0`。

`invalidTextKeyFormats` 覆盖 `rename` 建议名、`keep` 当前名，以及 `skip / confirm` 中看似业务 Key 但不合规的当前名。`missingRollbackEntries` 只检查计划写入的 `rename`；只读任务没有写入计划时为空。

任何闸门项非零时不得写回，也不得宣称校验通过。先补齐分析；仍无法判断的候选进入 `confirm`。

## 稳定性

已有名称符合规范、语义准确且不存在冲突时，不得因为以下原因重新命名：

- 扫描顺序变化；
- 图层移动；
- Frame 折叠或展开；
- 节点隐藏或显示；
- 选中状态变化；
- 新增无关节点；
- 查询返回顺序变化。

文本内容、占位符结构、有效局部样式或业务语义发生变化时，重新复核名称。
