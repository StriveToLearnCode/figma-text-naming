# Figma 动态文本命名规范

- 适用对象：Figma 中包含动态内容的文字图层
- 命名位置：文字图层的 `node.name`
- 业务基础名称格式：`文案/${business-domain}/${semantic-key}`
- 最后更新：2026-08-12

本规范用于统一图层命名，便于研发及 AI 准确识别页面中的动态内容。

## 1. 标准名称格式

动态文字图层的业务基础名称（`baseName`）统一为：

```text
文案/${business-domain}/${semantic-key}
```

其中：

- 文案：固定前缀；
- business-domain：所属业务域，只使用一个英文单词；
- semantic-key：文字含义，使用一至两个英文单词。

通常直接使用 `baseName` 作为最终图层名称。只有同一 `baseName`、同一原文存在多个不同样式版本时，才允许在第三段末尾追加技术后缀：

```text
文案/${business-domain}/${semantic-key}-${style-index}
```

`style-index` 是从 1 开始的连续正整数，只用于区分样式版本，不属于 `semantic-key` 的业务语义，也不计入其一至两个英文单词限制。名称仍只能包含两个 `/`。

示例：

```text
文案/lottery/remaining-count
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
- 不使用下划线、camelCase 或业务上无语义的数字；第 2 节定义的样式技术后缀是唯一例外。

不合规示例：

```text
lottery/remaining-count
文案/coin-pool/balance
文案/tab1/count
文案/lottery/remaining-draw-count
文案/reward/reward_count
```

## 2. 重复文案与样式技术后缀

样式后缀只能按以下流程生成：

1. 先完成运行时字段判断和业务命名，再按完全相同的 `baseName + characters` 归组。文字不同或业务语义不同的 Text 不得进入同一组。
2. 对组内每个 Text 使用同一序列化流程，将完整原文及全部 styled segments 转换为 canonical HTML。序列化必须保持字符、空格、换行、标签层级和影响展示的样式；属性顺序等非语义差异必须由序列化流程统一，不得手工拼接或局部比较。
3. 组内 canonical HTML 完全相同，只使用无后缀 `baseName`。
4. 组内存在多个 canonical HTML 时，对去重后的完整 canonical HTML 按 Unicode code point 升序排列，依次分配 `-1`、`-2`、`-3`。相同 canonical HTML 必须使用相同后缀；所有版本都必须带后缀，不保留无后缀版本。
5. 遍历顺序、节点 ID、当前图层名称和画布位置不得影响后缀分配。样式差异只决定技术后缀，不得改变业务语义或是否命名的结论。

例如，同一组 `文案/event/countdown` 存在两种 canonical HTML，最终名称可以是：

```text
文案/event/countdown-1
文案/event/countdown-2
```

孤立的 `文案/event/countdown-1`，或无法提供上述归组和 canonical HTML 证据的数字后缀，仍属于不合规名称。

## 3. 业务域判断

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

## 4. 常用含义

本节只用于已经判定为需要命名的运行时文案。榜单条目、“我的排名”、榜单规则说明，以及奖励 / 道具展示位中的名称、数量、倍率等内容不适用本表，不生成 `文案/...` 名称。

| 中文含义 | 标准写法             | 示例                               |
| -------- | -------------------- | ---------------------------------- |
| 剩余数量 | `remaining-count`    | `文案/lottery/remaining-count`     |
| 余额     | `balance`            | `文案/coin/balance`                |
| 进度     | `progress`           | `文案/recharge/progress`           |
| 保底进度 | `guarantee-progress` | `文案/fountain/guarantee-progress` |
| 倒计时   | `countdown`          | `文案/event/countdown`             |
| 剩余时间 | `remaining-time`     | `文案/event/remaining-time`        |
| 确认     | `confirm`            | `文案/lottery/confirm`             |
| 成功     | `success`            | `文案/sign/success`                |
| 失败     | `failure`            | `文案/reward/failure`              |

## 5. 命名示例

| Figma 文案        | 标准名称                           |
| ----------------- | ---------------------------------- |
| 剩余xxx次         | `文案/lottery/remaining-count`     |
| 保底进度：xxx/100 | `文案/fountain/guarantee-progress` |
| xxx天xxx时xxx分   | `文案/event/countdown`             |
| 当前拥有xxx金币   | `文案/coin/balance`                |
