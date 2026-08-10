---
name: figma-text-naming
description: Use when 用户提供 Figma Design 链接并明确要求初始化、生成或复核动态文字/特效文本命名；先理解整页视觉与区域语义，再批量生成并按置信度写回 文案/${business-domain}/${semantic-key}。其他 Figma 请求不触发。
---

# Figma 动态文本初始化命名

## 边界

读取用户链接限定的 Figma 页面或 Frame，识别运行时动态文本，生成或复核 `文案/${business-domain}/${semantic-key}`，并在默认授权下写回高置信结果。

- 只使用目标范围内的截图、节点树、文本、布局、组件关系、图层名称、变量绑定和明确标注作为证据。
- 目标范围之外的信息不参与动态性、业务域或字段语义判断。
- 不修改 `characters`、样式、位置、尺寸、可见性、结构或组件关系。
- “一次完成”表示一次执行写完所有可靠项，并明确留下不确定项；不得为追求覆盖率编造名称。

完整读取 [references/dynamic-text-naming-rules.md](references/dynamic-text-naming-rules.md)，并在本次执行中固定使用该版本。调用 Figma `use_figma` 前，完整读取并遵循 `figma-use` Skill。

## 两阶段工作流

### 1. 建立页面语义地图

先收集目标 Frame 的整体截图、完整节点树、全部 `TEXT` 节点、Frame/Group/Component 名称、节点位置与父子关系，以及已有的 `切图/...`、业务模块和规范文案名称。范围过大时可以分页读取，但必须先完成全局收集，再判断任何文本。

根据整页视觉和结构生成区域语义地图。每个区域至少记录：

```json
{
  "regionId": "region-b",
  "position": "中部",
  "semantics": "充值进度 / 阶段奖励",
  "evidence": ["区域标题为累计充值", "包含进度条和阶段奖励卡片"]
}
```

区域边界来自视觉分组、节点层级和业务语义的共同证据，不强制等同于一级 Frame。`板块2`、坐标或区域序号只用于定位，不能成为业务域。

### 2. 批量生成 naming plan

把页面语义地图与一批文字节点一起分析。每个节点都必须带上原文、所属区域、视觉角色、附近文字、节点路径和页面整体语义。不要逐个 Text 调用 AI；超出上下文时分批，但每批都复用同一份完整页面语义地图，全部批次完成前不得写回。

扫描全部 `TEXT` 节点，不用正则预筛。`xxx`、`0/20`、`02:13:45`、数字、固定标题等只作为强弱不同的证据，由页面上下文决定动态性和名称。一次生成完整 naming plan：

```json
{
  "nodeId": "123:456",
  "text": "22500/550000",
  "regionId": "region-b",
  "semanticId": "recharge:current-target",
  "isDynamic": true,
  "suggestedName": "文案/recharge/current-target",
  "confidence": 0.96,
  "evidence": [
    "位于充值进度区域",
    "数值位于进度条上方",
    "附近存在累计充值和阶段奖励文案",
    "current/target 结构符合运行时进度展示"
  ]
}
```

`confidence` 是整个最终判断的单一置信度：同时覆盖动态性、业务域、字段语义和名称唯一性。证据必须能支撑完整名称；占位符强只能证明动态性时，不得给高命名置信度。

`semanticId` 只在内部标识同一业务字段，用于判断重复 Key 是合法复用还是冲突；不要求在用户回执中展示。

## 校验与写回

将完整 naming plan 交给 [scripts/validate-naming-plan.mjs](scripts/validate-naming-plan.mjs) 校验，输入为 `{ "items": [...], "existingNames": [...] }` JSON；`existingNames` 包含扫描范围内已占用的规范名称及其业务字段标识。程序只执行确定性规则：字段合同、置信度阈值、名称格式、重复节点、重复 Key、已有名称冲突；程序不得从文本内容猜动态性或业务场景。

- `confidence >= 0.90`：名称与冲突校验通过后为 `rename` 或 `keep`；只有 `rename` 写回。
- `0.70 <= confidence < 0.90`：`confirm`，可以推荐名称，但不写回。
- `confidence < 0.70`：`skip`，不写入猜测名称。
- `isDynamic: false`：`skip`，不因高置信度写入。
- 同一个 Key 只有在 naming plan 明确证明为同一业务字段时才能复用；不同字段或未知关系使用 `confirm`。

用户明确要求只读、预览或不要修改时，停止在完整计划预览。否则在全部节点和冲突一次校验完成后，统一写回所有 `rename`，再逐项回读；连接器不可用、无权限或回读不一致时如实计为失败。

## 输出

输出扫描总数、已自动命名数、待确认数、跳过数和失败数。列出高置信项的原文、名称、百分比与关键证据；列出待确认项的推荐名称或无法唯一命名的原因。原文必须逐字保留，不翻译、概括或改写。
