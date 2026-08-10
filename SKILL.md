---
name: figma-text-naming
description: Use when 用户提供 Figma Design 链接并明确要求初始化、生成或复核动态文字/特效文本命名；优先把用户提供的 Text Sync/Page Center 文案清单精确映射为 文案/${source-key}，无清单时才按页面语义生成新 key。其他 Figma 请求不触发。
---

# Figma 动态文本初始化命名

## 边界

读取用户链接限定的 Figma 页面或 Frame，识别需要用图层名承载绑定 Key 的运行时动态文本，并在默认授权下写回高置信结果。用户提供 Text Sync、Page Center 或其他实际消费的 `{ key, value }` 文案清单时，图层名必须使用 `文案/${key}`；只有没有提供清单时才生成 `文案/${business-domain}/${semantic-key}`。

- 使用目标范围内的截图、节点树、文本、布局、组件关系、图层名称、变量绑定和明确标注判断节点；用户提供的文案清单是允许使用的绑定合同。
- 目标范围之外的信息不参与动态性、业务域或字段语义判断。
- 不修改 `characters`、样式、位置、尺寸、可见性、结构或组件关系。
- 动态不等于需要命名。由标准组件、接口数据、props 或奖励元数据直接渲染的内部字段不改图层名。
- “一次完成”表示一次执行写完所有可靠项，并明确留下不确定项；不得为追求覆盖率编造名称。

完整读取 [references/dynamic-text-naming-rules.md](references/dynamic-text-naming-rules.md)，并在本次执行中固定使用该版本。调用 Figma `use_figma` 前，完整读取并遵循 `figma-use` Skill。

## 四阶段工作流

### 1. 建立页面语义地图

先收集目标 Frame 的整体截图、完整节点树、全部 `TEXT` 节点、Frame/Group/Component 名称、节点位置与父子关系，以及完整预览、已有 `切图/...`、业务模块和规范文案名称。范围过大时可以分页读取，但必须先完成全局收集，再判断任何文本。

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

### 2. 配对预览与切图，建立前端叠加文字集合

按业务区域把完整预览与对应切图配对。配对必须由背景或装饰资产、尺寸比例、结构锚点、组件名称或相对位置中的多项证据共同支持；只因左右相邻、尺寸接近或肉眼相似不能强行配对。优先比较 Figma 节点树和对应区域截图，OCR 或像素差异只能辅助，不能单独决定文字是否存在。

对可靠配对区域，找出完整预览中存在、对应切图中未包含的 `TEXT` 节点，并记录：

```json
{
  "previewNodeId": "123:400",
  "sliceNodeId": "123:500",
  "status": "preview-only",
  "pairingEvidence": ["共用同一背景实例", "标题栏和奖励槽相对位置一致"],
  "comparisonEvidence": ["对应位置的切图不含该文字"]
}
```

`preview-only` 只表示文字由前端叠加，是候选发现证据，不证明它会在运行时变化，也不证明需要 `文案/...`。固定标题、Tab、按钮、规则和说明即使只出现在预览中仍为 static。配对缺失或不唯一时只记录未配对原因，不输出 `renderingComparison`，并继续扫描全部 `TEXT`；只有区域已经可靠配对但文字差集无法确认时才使用 `unresolved`。不得因为没有切图对照而漏掉候选。

### 3. 从叠加文字和全部 Text 中建立动态候选集合

把页面语义地图、可靠的预览切图对照与一批文字节点一起分析。每个节点都必须带上原文、所属区域、视觉角色、附近文字、节点路径、页面整体语义，以及存在时的 `renderingComparison`。先只回答：这个节点显示的是固定 UI 文案，还是页面运行过程中变化的数据值、实体值或组合动态内容？此阶段不得生成、推荐或复核 Key。

扫描全部 `TEXT` 节点以避免漏检，但默认把标题、Section 标题、Tab、导航、固定按钮、规则入口、完整规则、说明、字段 Label、冒号结尾字段名、固定日期、固定档位条件、固定百分比和固定次数规则判断为 static。自然语言句子包含数字、金额或百分比不构成动态证据；能理解业务含义也不构成动态证据。

动态候选必须提供独立的 `dynamicEvidence`，证明同一节点会被运行时值替换，例如明确 placeholder、独立 current/target 数值、倒计时、排名、积分、余额、次数、数量、运行时实体示例或重复数据卡片中的字段值。`preview-only` 不能写入 `dynamicEvidence` 充当运行时变化依据。Label 与 Value 必须分别判断：`فرص الخصم:` 是 static，旁边的 `0/20` 才能进入候选；`استهلاك الذهب:` 是 static，旁边的 `22500/550000` 才能进入候选。

动态候选阶段输出：

```json
{
  "nodeId": "123:456",
  "text": "22500/550000",
  "regionId": "region-b",
  "renderingComparison": {
    "previewNodeId": "123:400",
    "sliceNodeId": "123:500",
    "status": "preview-only",
    "pairingEvidence": ["共用同一背景实例", "进度条结构一致"],
    "comparisonEvidence": ["切图的进度条上方不含该数值"]
  },
  "isDynamic": true,
  "dynamicEvidence": [
    "作为独立 Value 节点显示 current/target",
    "与固定 Label ‘استهلاك الذهب:’ 分离"
  ],
  "evidence": ["位于充值优惠进度区域"]
}
```

static 节点只输出 `isDynamic: false` 与排除依据，不输出 `confidence`、`needsLayerName`、`semanticId`、`sourceKey` 或 `suggestedName`。只有 `isDynamic: true` 且 `dynamicEvidence` 非空的节点才能进入下一阶段。

### 4. 只为动态候选生成 naming plan

对候选集合判断图层命名必要性并生成或映射 Key：

```json
{
  "nodeId": "123:456",
  "text": "22500/550000",
  "regionId": "region-b",
  "semanticId": "recharge:current-target",
  "isDynamic": true,
  "dynamicEvidence": [
    "作为独立 Value 节点显示 current/target",
    "同一位置随运行时充值进度变化"
  ],
  "needsLayerName": true,
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

#### 优先映射实际文案清单

用户提供 `{ key, value }` 清单时，先把富文本 `value` 解析为可见文字、占位符序列和 styled segments，再与 Figma 的 `characters`、styled text segments、区域语义和当前名称整批匹配。清单是本次自动命名的 allowlist：

- 匹配成功时在 plan 中增加 `sourceKey`，`suggestedName` 必须逐字等于 `文案/${sourceKey}`，不得翻译、改写、单复数调整或按新规范美化旧 key；
- `semanticId` 固定使用同一个 `sourceKey`；即使源 key 含三词字段、数字或 `txt` 等历史格式，也原样复用，因为它是下游合同；
- 清单没有对应项的节点不得自动创造新 key，设为 `needsLayerName: false` 并跳过；静态标题、导航、活动时间、规则和说明文案通常属于此类；
- 同一个可见文案对应多个源 key 时，必须用完整 HTML/style、当前已验证名称、组件位置或明确标注消歧。无法唯一选择时 `confirm`，不得选一个看起来更规范的 key；
- 只比较可见纯文本会误配 `{{}}/{{}}` 等通用模板；占位符数量与顺序、固定文案、styled segments 和业务区域必须共同参与匹配。

清单只决定可使用的 key，不扩大 Figma 扫描范围，也不授权 Page Center 上传或其他外部写入。没有提供清单时，才按本规则的页面语义流程生成新 key。

先判断内容所有权，再判断名称。奖励卡、奖励详情、累计进度等标准组件中的道具名称、数量、单位或时长由 props、接口数据、奖励元数据或 `$getPropUnit` 一类组件逻辑渲染，统一设为 `needsLayerName: false`，保留原图层名且不生成 `suggestedName`。`{{}}`、占位符、跨实例值不同或字符串变量绑定只能证明动态性，不能证明需要 `文案/...` 图层名。只有明确作为独立 text key 或自定义代码绑定入口的文本才设为 `needsLayerName: true`。

`confidence` 只对已经通过动态候选门槛且确实需要图层名称的节点计算，表示“该节点确实需要动态文本命名，并且推荐 Key 正确”。它不能表示“AI 很确定自己理解文案”。static 节点没有命名置信度；例如 `العرض الأول` 即使含义完全明确也必须是 `isDynamic: false`，不能得到 `文案/first-offer/title`。

`semanticId` 只在内部标识同一业务字段，用于判断重复 Key 是合法复用还是冲突；不要求在用户回执中展示。

## 校验与写回

将完整 naming plan 交给 [scripts/validate-naming-plan.mjs](scripts/validate-naming-plan.mjs) 校验，输入为 `{ "items": [...], "existingNames": [...], "referenceEntries": [...] }` JSON；用户提供文案清单时必须原样放入 `referenceEntries`。`existingNames` 包含扫描范围内已占用的名称及其业务字段标识。存在可靠预览切图对照时，item 携带 `renderingComparison`。程序只执行确定性规则：字段合同、对照记录格式、清单 key 存在性与精确名称、置信度阈值、生成名称格式、重复节点、重复 Key、已有名称冲突；程序不得从文本内容或对照状态猜动态性和业务场景。

- `confidence >= 0.90`：名称与冲突校验通过后为 `rename` 或 `keep`；只有 `rename` 写回。
- `0.70 <= confidence < 0.90`：`confirm`，可以推荐名称，但不写回。
- `confidence < 0.70`：`skip`，不写入猜测名称。
- `isDynamic: false`：`skip`，不因高置信度写入。
- `isDynamic: true` 但缺少非空 `dynamicEvidence`：`confirm`，不生成名称。
- `needsLayerName: false`：`skip`，即使内容动态也不生成建议名称或写回。
- 提供 `referenceEntries` 后，没有 `sourceKey` 的项为 `skip`；`sourceKey` 不存在于清单或 `suggestedName` 不等于 `文案/${sourceKey}` 时为 `confirm`。
- 同一个 Key 只有在 naming plan 明确证明为同一业务字段时才能复用；不同字段或未知关系使用 `confirm`。

用户明确要求只读、预览或不要修改时，停止在完整计划预览。否则在全部节点和冲突一次校验完成后，统一写回所有 `rename`，再逐项回读；连接器不可用、无权限或回读不一致时如实计为失败。

## 输出

用户要求候选预览时，输出扫描总数、可靠预览切图配对数、preview-only 数、dynamic candidates 和 static skipped；只列出每个 dynamic candidate 的原文、推荐 Key、对照结论与独立动态判断依据，不写回。用户确认候选集合后才能进入写回。原文必须逐字保留，不翻译、概括或改写。
