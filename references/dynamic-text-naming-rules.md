# Figma 动态文本命名规范

来源：[《Figma 动态文本命名规范》](https://wepie.feishu.cn/wiki/FWHawauMGiys1hk3AbZccQPPnSe)

- 本地规则快照日期：2026-08-11
- 重复文案命名补充：命名阶段统一完成原文与 HTML 去重（2026-08-11）
- 完整名称格式：`文案/${business-domain}/${semantic-key}`
- 格式正则：`/^文案\/[a-z]+(?:-[a-z]+)?\/[a-z]+(?:-[a-z]+)?$/`

本文件只回答一件事：已经确认需要命名的文本，名称应该怎么取。它是名称格式、业务域、字段语义、命名证据、重复文案拆名和兼容迁移的唯一事实源。候选如何发现、Figma 如何读取、结果如何执行和输出，由 `SKILL.md` 统一定义，不在本文件重复维护。飞书规范更新后，同步更新本文件、相关脚本、测试和快照日期。

## 目录

- 名称格式
- 一级板块与业务域
- 语义字段
- 标准词义
- 可用于命名的 Figma 语义证据
- 当前名称复核
- 重复文案命名与冲突
- 兼容与迁移

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
- `business-domain` 通常是一个小写英文单词；重复文案属于同一业务字段但完整 HTML 不同时，可使用“稳定场景-业务域”两个小写英文单词；
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

页面容器下的每个一级板块是独立业务域边界。开始命名前，先识别页面容器，再枚举其直接子级的一级板块，并把每个待命名文本归入唯一一级板块。

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

重复文案属于同一业务字段但生成的完整 HTML 不同时，在命名阶段使用两个单词的复合业务域拆分名称：`${stable-context}-${business-domain}`。稳定场景必须能由页面、一级板块、具名祖先或组件语义可靠确定，例如语音房排行可使用 `voice-ranking`，语音房奖励可使用 `voice-reward`。保留已经稳定使用的基础业务域，把需要区分的其他场景改为复合业务域，以减少无意义迁移。该拆分不依赖本次是否上传 Page Center，确保后续上传无需再次改名。

不得使用 `small-ranking`、`ranking-18px`、`ranking-v2` 等视觉值、版本号或临时描述作为复合业务域。若两个不同 HTML 无法获得稳定场景限定，则无法生成可靠名称，必须留待确认。

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

如果删除重复业务含义后仍超过两个单词，或存在多种同样合理的缩短方式，必须留待确认，不得靠删最后一个单词、缩写或泛化成弱语义词通过格式校验。

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

## 可用于命名的 Figma 语义证据

名称只能依据当前 Figma 链接范围内可观察的信息确定，按以下优先级使用：

1. Text 节点的完整原文及占位符结构；
2. 待命名文本所属的页面容器和一级板块；
3. 一级板块内与待命名文本唯一对应的中文备注；
4. 当前图层名称；
5. 一级板块内最近的具名业务父节点或祖先；
6. 一级板块内的相邻标签和兄弟文案；
7. 所属组件及变体状态；
8. 同一一级板块内已经确认的平行字段名称。

当前图层名称只能作为待复核证据，不能证明自身正确。

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

中文备注必须通过同组、邻接、标注连线、配对结构或其他明确关系与待命名文本唯一对应。仅仅位置靠近不够。备注与原文冲突、文本只有占位符且其他上下文不能确定含义时，必须留待确认。

完整效果展示区域与切图的文字差异只能用于候选发现或排除已烘焙文字，不得用于推断业务域或字段语义。颜色、字号、字重、位置和尺寸不得用于推断业务域或字段语义。重复文案生成后的完整 HTML 只用于决定同一业务字段能否复用名称；HTML 不同表示需要稳定场景限定，但具体限定仍须来自业务上下文。

## 当前名称复核

每个待命名文本都必须复核当前名称，即使当前名称匹配格式正则也不能直接保留。只有以下四项全部正确才能保留：

1. 格式符合 `文案/${business-domain}/${semantic-key}`；
2. 业务域符合待命名文本所属一级板块的业务域；
3. 字段语义准确且能由当前 Figma 证据支持；
4. 名称与其他业务字段不存在冲突，同一名称也不得对应不同完整 HTML。

任何一项错误都不能保留。有可靠替代名称时使用替代名称；证据不足以生成可靠替代名称时必须留待确认。

用户指定的名称也必须通过这四项检查。

## 重复文案命名与冲突

名称生成前，先按逐字相同的 `node.characters` 找出重复文案。匹配必须保留原语言、标点、大小写、空白、换行和占位符写法，不得先翻译、改写或把占位符统一为 `{{}}`。原文不同的节点不属于同一重复文案组。

重复原文只是分组入口，不单独证明字段语义相同。必须结合一级板块和命名证据核实每个成员的业务字段；相同原文表达不同业务字段时按各自真实语义命名，不得强行复用名称。

对确认属于同一业务字段的重复文案，在命名阶段使用 `SKILL.md` 生成的规范 HTML。按“逐字相同原文 + 同一业务字段 + 完整 HTML”一次确定最终名称：三项均相同的节点复用完全相同的名称；HTML 不同的组使用“稳定场景-业务域”复合业务域生成不同名称。完整 HTML 必须整体比较，不得只比较字号。该命名规则无论是否上传 Page Center 都必须执行。

例如普通活动页与语音房排行中的 `jewel-count` 文案相同但 HTML 不同，可保留 `文案/ranking/jewel-count`，并把语音房版本命名为 `文案/voice-ranking/jewel-count`。这表示两个稳定使用场景，不表示从样式反推业务语义。

同一名称对应不同业务字段时构成冲突，应按真实语义重新命名。不得追加节点 ID、Frame 编号、区域编号、坐标、扫描顺序或无语义数字解决冲突；无法可靠区分时必须留待确认。

用户要求上传 Page Center 时，名称同时是唯一的 HTML key。直接使用命名阶段已经确定的最终名称和 HTML 建立完整 `key -> HTML` 映射；该步骤只做安全校验，不再分组或改名。只要同一 key 出现两个不同 HTML，就构成命名冲突，必须在任何 Figma 或 Page Center 写入前停止并留待确认；不得先写回名称或上传无冲突项，也不得用后一个值覆盖前一个值。

多个现有名称都能表达同一业务字段时，优先选择格式合规、业务域正确、语义最准确且已稳定使用的名称。仍无法稳定选择时必须留待确认。

## 兼容与迁移

旧的 `<business-domain>/<semantic-key>` 两段式名称一律不符合新版格式，不能保留。业务域和语义仍准确时，迁移到带固定前缀的新名称：

```text
lottery/remaining-count
-> 文案/lottery/remaining-count
```

迁移不是无条件补前缀。旧名称仍须复核所属一级板块、业务域、字段语义和冲突；任何一项不可靠时必须留待确认。

旧名称的 `semantic-key` 超过两个单词时，按“语义字段”规则删除与业务域重复的含义，不能机械截断：

```text
lottery/remaining-draw-count
-> 文案/lottery/remaining-count
```

已经符合新三段式格式且四项检查全部通过的名称继续保留，避免无理由改用近义词。
