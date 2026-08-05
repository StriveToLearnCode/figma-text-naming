# Figma 动态文本命名 Skill

用于识别 Figma 中含 `xx`、`XX` 等占位符的动态文本，生成稳定的业务 Key 和完整中文含义，并写回对应文字图层名称。

## 使用方式

提供 Figma Design 链接，并使用“动态文字命名”“特效文字命名”或“特效文本”之一。触发后，Skill 会自动扫描并写回文字图层名称，不需要再补充“写入”或“写回”。其他措辞、单独一个 Figma 链接、普通文字编辑或一般设计修改不会触发本 Skill；明确说明只读、预览或不要修改时，才只给建议。

### 只看命名建议

```text
$figma-text-naming
https://www.figma.com/design/xxx/activity?node-id=100-200

扫描这里的动态文本并给出命名建议，不要修改 Figma。
```

### 直接命名并写回

```text
$figma-text-naming
https://www.figma.com/design/xxx/activity?node-id=100-200

给这里的动态文字命名。
```

### 检查现有名称

```text
$figma-text-naming
https://www.figma.com/design/xxx/activity?node-id=100-200

检查这里已有的特效文本图层名称，只列出需要调整的项目，不要修改 Figma。
```

## 默认行为

| 用户要求 | Skill 行为 |
| --- | --- |
| Figma Design 链接 + `动态文字命名`、`特效文字命名` 或 `特效文本` | 自动扫描，把业务 Key 写入对应文字图层名称并回读确认 |
| 只提供 Figma Design 链接 | 不触发本 Skill |
| 明确要求只读、预览、不要修改 | 只读分析，不修改 Figma |
| 已表达命名意图，但没说写入、写回 | 仍自动写回图层名称，不需要额外提示词 |
| 没有符合条件的动态文本 | 简短说明没有候选 |
| 业务含义无法确认 | 列出该项和原因，不猜测名称 |

## 处理范围

- 只处理链接指向的文件、页面或节点范围，不自动扩大到其他区域。
- 识别 `xx`、`XX`、连续的 `x/X` 和独立大写 `X` 等动态占位符。
- 不把 `1x`、`box`、`extra` 等普通文本识别为动态占位符。
- 原文、占位符结构、文字样式和业务语义都一致的文本归为一组并复用同一个业务 Key。
- 预览时同组文本合并展示；写回时仍处理组内所有可写文本节点。

## 命名结果

业务 Key 使用以下格式：

```text
<business-domain>/<semantic-key>
```

例如：

```text
lottery/remaining-draw-count
reward/name
ranking/current-rank
```

默认结果只包含动态文本、完整中文含义和建议名称。完整规则以 [Figma 动态文本命名规范](references/naming-standard.md) 为准。

## 修改边界

- Figma Design 链接与“动态文字命名”“特效文字命名”或“特效文本”之一共同触发图层名称写回；其他措辞和单独链接不触发，明确要求只读、预览或不要修改时不写入。
- 写回时只修改对应文字图层的 `node.name`。
- 不修改文字内容、位置、尺寸、样式、可见性或组件关系。
- Figma 连接器不可用或没有编辑权限时，只能提供建议，不能声称已经写入。
- 只接受 Figma Design 链接作为设计输入，不读取飞书、需求文档、代码仓库或其他外部资料。
