# Figma 文本语义词典

本词典用于从 Figma 可观察证据选择简短的业务域和语义词，不是必须穷举的封闭词表。优先复用已有标准词；只有现有词无法准确表达时才建议新词。

## 业务域

| 业务域 | 适用语义 | 常见 Figma 证据 |
| --- | --- | --- |
| `coupon` | 优惠券、券领取或券时效 | 优惠券区域、券组件、领取/失效标签 |
| `reward` | 徽章、礼物卡、服饰等奖励对象 | 奖励区域、奖品列表、领奖组件 |
| `chest` | 宝箱轮次、轮次积分或宝箱状态 | 宝箱区域、轮次标签、积分组件 |
| `ring` | 戒指、戒指盒、求婚或开启次数 | 戒指组件、求婚状态、戒指盒标签 |
| `member` | 会员开启、续期或机会次数 | 会员区域、开通/续期状态 |
| `lottery` | 抽奖、开奖、抽取次数和结果 | 抽奖、转盘、扭蛋组件 |
| `rank` | 排名、积分和榜单状态 | 排行榜、名次、积分榜、段位榜 |
| `task` | 任务进度、完成状态和任务奖励 | 任务、目标、每日或阶段任务区域 |
| `shop` | 商品价格、库存和限购数量 | 商店、兑换、商品或购买组件 |

业务域以 Figma 中明确的图层、组件或区域名称，以及当前页面中已由 Figma 上下文确认的相同功能为证据。不要用 `板块4`、`tab1` 等位置名创建业务域。

## 推荐短名称

| 名称 | 中文含义 |
| --- | --- |
| `coupon/countdown` | 优惠券倒计时 |
| `reward/badge-rule` | 徽章解锁条件 |
| `reward/gift-card-name` | 礼物卡名称 |
| `reward/outfit-name` | 服饰名称 |
| `chest/round` | 当前轮次 |
| `chest/round-score` | 当前轮次积分 |
| `ring/proposal` | 求婚条件 |
| `ring/open-count` | 戒指盒开启次数 |
| `member/renew-chance` | 续费获得的开箱机会 |
| `member/open-chance` | 当前开箱机会 |
| `lottery/count` | 抽奖次数 |
| `rank/score` | 排行积分 |
| `task/progress` | 任务进度 |

常用语义词还包括 `name`、`count`、`countdown`、`progress`、`score`、`round`、`price`、`stock`、`multiplier`、`completed`、`claimed` 和 `locked`。`current-count`、`remaining-count`、`total-count` 只有在“当前/剩余/总计”确实用于区分字段时使用，不得互换。

以下名称把可从业务域或上下文得知的信息重复写入，或混入过多条件，应缩短：

```text
reward/badge-unlock-requirement
chest/current-round
chest/current-round-points
ring/proposal-requirement
member/renewal-open-chances
member/remaining-open-chances
```

依次优先缩短为 `reward/badge-rule`、`chest/round`、`chest/round-score`、`ring/proposal`、`member/renew-chance`、`member/open-chance`。`reward/gift-card-name` 和 `reward/outfit-name` 保留对象词，因为删除后会使同一业务域内的奖励对象无法区分。

## 同类对象与确认

- 多个节点属于同类对象但表示不同字段，且没有更短稳定的语义词可区分时，使用两位编号，例如 `ring/open-count-01`、`ring/open-count-02`。
- 编号只由当前 Figma 页面内可观察的共同语义和对象差异支持，不能由位置、扫描顺序或节点标识证明。
- 徽章、礼物卡等对象只要候选文本、现有中文名称或精简路径已经说明对象，就直接命名。只有这些 Figma 证据不足或互相冲突时才批量补查一次，之后仍不确定再进入 `confirm`。

## 组件语义

| 组件 | 常见独立语义 |
| --- | --- |
| 抽奖 | 抽奖次数、倒计时、奖品名称 |
| 奖励 | 奖励名称、数量、轮次、积分、领取状态 |
| 任务 | 任务进度、奖励数量、完成状态 |
| 排行 | 当前名次、榜单积分 |
| 商店 | 商品价格、库存、剩余可购次数 |

组件名称只是证据之一。文案出现“奖励”不等于业务域一定是 `reward`；抽奖组件中的奖品名称可属于 `lottery`。只有占位符时，必须结合写回前中文图层名、祖先、相邻文案、组件或变体判断，否则进入 `confirm`。

## 已有合法名称

- 当前名称只有在格式合法、简短、与 Figma 可观察语义一致且复用关系正确时才保留。
- 历史名称不享有额外优先级，也不能作为自身语义正确的证明。
- 当前名称与可观察语义不一致时进入 `confirm`，不得强制保留。

## 词条治理

- 有意义的写回前图层名可作为证据；自动名称、纯占位符和通用容器名不构成证据。
- 优先选择能区分字段的最短词，不为避免冲突发明同义词。
- 新词应有明确、可复用的业务含义；孤立或含义不清的文本等待用户确认。
