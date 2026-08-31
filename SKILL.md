---
name: figma-text-naming
description: "按照 WePie 规范分析、审核和重命名 Figma 活动 UI 动态文案。用户给出 Figma Design 链接并要求动态文本命名、文案命名、文字图层命名、批量改名、文案或 PageCenter Key、命名检查或按语义起名时使用。"
---

# Figma 动态文本命名

识别活动设计稿中真正由运行时管理的 UI Text，生成稳定的 `文案/${business-domain}/${semantic-key}` 名称，并按用户目标审核、报告或写回 Figma。

## 规则路由

只读取当前阶段需要的文档，不要在开始时一次性加载全部 references：

1. 开始任何命名任务，完整读取 [命名规范](references/naming-standard.md)。它是名称格式、语义、复用和样式后缀的唯一事实源，主文件不重复这些规则。
2. 确定范围、扫描 Text 和判断 `rename / keep / skip / confirm` 时，读取 [范围与分类](references/scope-and-classify.md)。
3. 出现 `rename / keep`，需要比较样式或准备 PageCenter 数据时，读取 [富文本数据](references/rich-text-value.md)。
4. 生成最终清单前，读取 [报告格式](references/report-format.md)。
5. 只有 `apply / repair` 需要写回时，读取 [Figma 写回](references/figma-writeback.md)，并先加载 `figma:figma-use`。

## 模式

- `apply`：默认模式。用户说“命名一下”“动态文本命名”“按语义起名”“批量改名”等时，分析和校验后直接写回，不再请求确认。
- `propose`：用户明确要求“仅生成清单”“只给建议”“先看看”或“不要修改”时，只读输出。
- `audit`：用户只要求“检查”或“审核现有命名”时，只读输出。
- `repair`：用户明确要求“审核并修复”或“检查后直接改”时，只修复能够确定目标名称的历史错误。

使用 `get_metadata` 读取节点结构、Text 内容和必要上下文；只有结构信息不足、需要辅助理解视觉关系时才使用 `get_screenshot`。Figma 连接器不可用或权限不足时降级为 `propose`。只处理 Figma Design；FigJam、Slides 和 Make 不属于此 Skill。

## 工作流

### 1. 确定目标

解析链接中的文件和 `node-id`，根据 [范围与分类](references/scope-and-classify.md) 确定 Scope。没有 `node-id` 时可使用用户当前明确选中的节点；仍无法确定则要求提供节点级链接，不猜测写入范围。

### 2. 完整扫描和分类

在确定的 Scope 内扫描全部 Text，不按 placeholder、当前名称、正则或文案内容预筛。每个 Text 必须且只能收敛为：

- `rename`：需要命名或已有名称需要修改
- `keep`：已有名称符合语义和规范
- `skip`：不属于运行时文案字段
- `confirm`：关键语义或运行时性质缺少证据

具体边界、排除区域、判断证据和置信度按 [范围与分类](references/scope-and-classify.md) 执行。

### 3. 生成并校验名称

对最终需要命名的 Text，按照 [命名规范](references/naming-standard.md) 确定业务域、语义 key、名称复用和样式技术后缀。已有 `文案/...` 不等于正确，仍需完成语义和格式审核。

无法确定业务域、字段职责或复用关系时使用 `confirm`，不得用 `common`、`unknown`、位置词或编号兜底。

### 4. 准备富文本数据

对全部 `rename / keep` 读取并保留原文、参数化结果和完整 styled segments，再按 [富文本数据](references/rich-text-value.md) 生成、校验并缓存 PageCenter 富文本 `value`。这里只准备数据；没有用户明确授权时不得写入 PageCenter。

### 5. 完整性闸门

写回前必须满足：

- Scope 可靠且 `unclassifiedTexts.length === 0`
- `Text 总数 = rename + keep + skip + confirm`
- 所有 `rename / keep` 名称通过 [命名规范](references/naming-standard.md) 校验
- 相同语义复用和相同 `baseName + characters` 的样式分组已经检查
- 每个 `confirm` 都记录缺失的判断证据

单个字段的 `confirm` 不阻塞其他互不依赖且已经确定的字段；Scope 不完整、存在未分类 Text 或写入范围有实质歧义时不得写回。

### 6. 写回和复核

`apply / repair` 按 [Figma 写回](references/figma-writeback.md) 执行，只修改确定的 `rename` 节点的 `node.name`。`audit / propose` 始终只读。

写回后重新读取本次 Scope 内全部已审核 Text，复核名称、原文、分类和样式分组；复核结果按 `nodeId` 合并，不能覆盖之前缓存的完整富文本数据。

### 7. 报告

按照 [报告格式](references/report-format.md) 先给结论，再给完整清单、统计、校验失败、确认项和实际写回结果。不得把未写回或写回失败伪装为成功。

## 不可变约束

- Figma 写回只允许修改 Text 的 `node.name`；不得修改内容、样式、布局、组件关系、Variable、property 或 binding。
- PageCenter 只有用户明确要求时才允许写入；准备好 `value` 不代表获得上传授权。
- 工具不可用、数据不完整或验证失败时如实降级或停止相关写入，不得伪造结果。
- 用户明确要求只读时，不主动催促或执行写回。
