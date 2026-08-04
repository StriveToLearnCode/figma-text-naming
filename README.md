# Figma 动态文本命名 Skill

用于识别 Figma 中含 `xx`、`XX` 等占位符的动态文本，生成稳定的业务 Key 和完整中文含义，并可按需写回图层名称。

## 使用方式

提供 Figma Design 链接，再说明需要查看建议、检查现有名称或直接写回即可。不需要额外填写页面名、Frame 格式或配置表，也不需要提供飞书、需求文档或代码仓库。

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

为这里的动态文本命名并写回 Figma。
```

### 检查现有名称

```text
$figma-text-naming
https://www.figma.com/design/xxx/activity?node-id=100-200

检查这里已有的动态文本名称，只列出需要调整的项目。
```

## 默认行为

| 用户要求 | Skill 行为 |
| --- | --- |
| 扫描、预览、检查、给建议 | 只读分析，不修改 Figma |
| 命名、改名、写回 | 修改对应文本图层名称并回读确认；Text Sync 在绑定为空时用该名称自动回填 `text key` |
| 没有符合条件的动态文本 | 简短说明没有候选 |
| 业务含义无法确认 | 列出该项和原因，不猜测名称 |

## 处理范围

- 只处理链接指向的文件、页面或节点范围，不自动扩大到其他区域。
- 识别 `xx`、`XX`、连续的 `x/X` 和独立大写 `X` 等动态占位符。
- 不把 `1x`、`box`、`extra` 等普通文本识别为动态占位符。
- 原文、占位符结构、文字样式和业务语义都一致的文本归为一组并复用同一个业务 Key。
- 预览时同组文本合并展示；写回时仍修改组内所有可写文本节点。

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

## Text Sync 约定

- Figma 文本图层名称是 `text key` 的默认来源，不另外维护第二套命名。
- Text Sync 已有绑定时保留原绑定；绑定为空时，插件自动把符合规范的 `node.name` 填入 `text key`。
- 自动回填只是填写插件输入框，不代表已经持久化或同步远端。
- 只有用户明确要求更新或同步时，才持久化绑定或写入 PageCenter。
- 插件私有 `pluginData` 不能由通用 Figma MCP 直接读写，因此自动回填能力应由 Text Sync 插件实现。

## 修改边界

- 未明确要求写回时，不修改 Figma。
- 写回时只修改图层名称。
- Text Sync 自动回填 `text key` 不要求用户再次输入，也不会自动触发更新或远端同步。
- 不修改文字内容、位置、尺寸、样式、可见性或组件关系。
- Figma 连接器不可用或没有编辑权限时，只能提供建议，不能声称已经写回。
- 只接受 Figma Design 链接作为设计输入，不读取飞书、需求文档、代码仓库或其他外部资料。
