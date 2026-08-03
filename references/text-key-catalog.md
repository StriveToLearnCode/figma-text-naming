# Figma 文本语义词典

本词典用于从 Figma 可观察证据选择项目约定的业务域和语义词。命名前必须同时检索 [approved-name-corpus.md](approved-name-corpus.md)；先例是完整名称的最高优先级，本词典只帮助消歧和生成没有先例的新名称。

## 选择层级

1. **完整先例**：业务域、字段含义和用途一致时，原样复用完整名称。
2. **同域词汇**：没有完整匹配时，优先沿用同一业务域已出现的准确词，例如 `lottery/confirm`、`lottery/card-get-num`、`lottery/can-lottery-times`。
3. **跨域语义词**：不同业务域可以复用含义稳定的词，如 `name`、`time`、`progress`、`confirm`、`success`，但不得连业务域一起照搬。
4. **新名称**：仍无准确词时，使用 Figma 证据支持的新业务域和全小写 kebab-case 语义键。

不要为了命中词典牺牲准确性。完整文本、中文备注和组件上下文无法唯一选择名称时进入 `confirm`。

## 项目业务域

| 类型 | 已有业务域 | 使用要求 |
| --- | --- | --- |
| 活动玩法 | `lottery`、`achievement`、`build`、`cumulative`、`pass`、`exchange` | Figma 组件、父级或相邻文案明确指向对应玩法 |
| 内容对象 | `reward`、`task`、`rank`、`chip`、`room`、`broadcast` | 候选字段直接描述该对象 |
| 分享与场景 | `share`、`scene-share`、`scene-show`、`record` | 分享卡片、场景展示或记录区域明确 |
| 时间与计数 | `timer`、`countdown`、`time`、`progress`、`count` | 该对象本身就是稳定容器，不只是字段的数据类型 |
| 界面上下文 | `page`、`txt`、`text`、`info`、`confirm`、`dialog`、`bottom`、`select`、`pullup` | Figma 中存在对应的项目组件/容器约定；不得当作无法理解业务时的默认域 |
| 编号模块 | `mod11`、`mod12` | 只在 Figma 已明确使用该模块标识或复用完整先例时使用 |

业务域描述项目中的稳定模块或容器，不要求一定是抽象业务名。`page`、`txt`、`text` 等在本项目中是允许的真实约定；但若 Figma 已明确处于 `lottery`、`achievement` 等业务组件，应优先使用业务域。没有先例的新业务对象可以创建 `coupon`、`ring`、`member` 等全小写 kebab-case 域。

## 高频语义族

以下分组只用于比较候选，不表示组内名称可以互换：

| 语义族 | 已有写法 | 消歧重点 |
| --- | --- | --- |
| 时间 | `timer/time`、`share/time`、`txt/time`、`countdown/time`、`text/time`、`page/time`、`share/get-time`、`time/remaining`、`page/time-left` | 容器域、倒计时/剩余时间/获取时间等用途 |
| 倒计时 | `txt/countdown`、`info/countdown`、`page/countdown` | 所属组件，不只看显示文本 |
| 进度 | `page/progress`、`task/progress`、`txt/progress`、`progress/value`、`pullup/progcess` | 玩法进度、页面进度、进度值和历史兼容项 |
| 名称 | `text/reward-name`、`reward/name`、`select/reward-name`、`pass/task-name`、`achievement/card-name`、`share/name`、`mod12/choose-name` | 对象类型和展示/选择场景 |
| 数量 | `achievement/card-num`、`achievement/reward-num`、`txt/receive-num`、`pass/chip-num`、`text/chip-num`、`text/num`、`chip/num` | 被计数对象；不要无依据地只用 `num` |
| 确认 | `lottery/confirm`、`confirm/lottery`、`exchange/confirm`、`txt/exchange-confirm`、`pass/exchange-confirm`、`confirm/auto-buy` | “某模块的确认字段”与“确认弹窗中的业务字段”方向不同 |
| 结果状态 | `build/win`、`reward/success`、`reward/fail`、`achievement/composite-success`、`achievement/res-lose` | 成功/失败对应的业务动作或结果对象 |

## 词形规则

- `num`、`count`、`times`、`value`、`val` 不自动互换。优先复用同业务域、同对象的先例；没有先例时选择含义最直接的完整英文词。
- `time`、`timer`、`countdown`、`remaining`、`time-left` 含义不同，必须根据原文和组件用途选择。
- `txt` 和 `text` 都是批准域，按完整先例和 Figma 容器复用，不做全局统一。
- `xn`、`nxn`、`lv`、`val`、`recv` 等缩写只在完整先例或同一组件的明确平行约定中使用；新概念默认使用完整英文词。
- `chipShort`、`singleSuccess` 等 camelCase 只按完整先例复用。新名称不得据此创建新的 camelCase。
- `progcess` 是历史兼容拼写，只属于 `pullup/progcess`；其他进度字段使用 `progress`。
- `tip-1`、`tip-2`、`cong1`、`cong2`、`cong3`、`chip1Short`、`text2` 等数字只有在 Figma 能证明业务变体时使用，不得按节点顺序推断。

## 简短与准确

语义键优先保留 1 至 3 个必要词。业务域已表达的对象不在 Key 中机械重复，但删除后会混淆字段时必须保留，例如 `achievement/card-name`、`achievement/reward-num`。

以下做法应避免：

```text
lottery/current-available-lottery-times
achievement/current-reward-number
share/current-share-time-text
```

已有语义能匹配时分别优先复用 `lottery/can-lottery-times`、`achievement/reward-num`、`share/time`。若原文含义并不一致，则生成准确的新名称，不强行套用。

## 当前名称治理

- 当前名称精确命中先例，且 Figma 语义、用途和去重关系一致时保留。
- 当前名称未命中先例但符合新名称规则时，可以保留；先例不是封闭白名单。
- 当前名称与某条先例拼写接近但不完全一致时，不自动纠正。先用 Figma 证据确认是否为同一字段；确认后采用先例原文，否则进入 `confirm`。
- 历史名称不能单独证明自身正确；文本、中文备注或组件上下文与其冲突时进入 `confirm`。
