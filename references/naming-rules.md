# Figma 动态文本命名规范

- 适用对象：Figma 中包含动态内容的文字图层
- 命名位置：文字图层的 `node.name`
- 完整名称格式：`文案/${business-domain}/${semantic-key}`
- 最后更新：2026-08-05

本规范用于统一图层命名，便于研发及 AI 准确识别页面中的动态内容。

## 1. 标准名称格式

动态文字图层名称统一为：

```text
文案/${business-domain}/${semantic-key}
```

其中：

- 文案：固定前缀；
- business-domain：所属业务域，只使用一个英文单词；
- semantic-key：文字含义，使用一至两个英文单词。

示例：

```text
文案/lottery/remaining-count
文案/ranking/current-rank
文案/reward/name
文案/fountain/guarantee-progress
文案/event/countdown
```

格式要求：

```text
文案/业务域/文字含义
```

- 必须以 `文案/` 开头；
- 只能包含两个 `/`；
- 英文全部小写；
- 两个语义单词使用连字符连接；
- 不使用下划线、camelCase 或无语义数字。

不合规示例：

```text
lottery/remaining-count
文案/coin-pool/balance
文案/tab1/count
文案/lottery/remaining-draw-count
文案/reward/reward_count
```

## 2. 业务域判断

页面容器下的每一个一级板块代表一个独立业务域。

```text
预览图/页签2
├── 板块1
├── 板块2
└── 板块3
```

例如：

```text
板块1 → lottery
板块2 → ranking
板块3 → reward
```

业务域只使用一个能够代表板块核心业务的英文单词：

```text
lottery
ranking
reward
fountain
recharge
sign
team
medal
```

不得使用页面位置或结构编号：

```text
tab1
block
section
panel
page
```

板块1 只用于确定业务边界，不能直接生成 `block1` 等名称。

## 6. 常用含义

| 中文含义 | 标准写法             | 示例                               |
| -------- | -------------------- | ---------------------------------- |
| 数量     | `count`              | `文案/reward/count`                |
| 剩余数量 | `remaining-count`    | `文案/lottery/remaining-count`     |
| 余额     | `balance`            | `文案/coin/balance`                |
| 进度     | `progress`           | `文案/recharge/progress`           |
| 保底进度 | `guarantee-progress` | `文案/fountain/guarantee-progress` |
| 当前排名 | `current-rank`       | `文案/ranking/current-rank`        |
| 倒计时   | `countdown`          | `文案/event/countdown`             |
| 剩余时间 | `remaining-time`     | `文案/event/remaining-time`        |
| 名称     | `name`               | `文案/reward/name`                 |
| 确认     | `confirm`            | `文案/lottery/confirm`             |
| 成功     | `success`            | `文案/sign/success`                |
| 失败     | `failure`            | `文案/reward/failure`              |

## 7. 命名示例

| Figma 文案        | 标准名称                           |
| ----------------- | ---------------------------------- |
| 剩余xxx次         | `文案/lottery/remaining-count`     |
| 当前排名：xxx     | `文案/ranking/current-rank`        |
| 奖励名称：xxx     | `文案/reward/name`                 |
| 保底进度：xxx/100 | `文案/fountain/guarantee-progress` |
| xxx天xxx时xxx分   | `文案/event/countdown`             |
| 当前拥有xxx金币   | `文案/coin/balance`                |
