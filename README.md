# Figma 动态文本命名 Skill

识别 Figma 中含动态占位符的文本，按 `文案/${business-domain}/${semantic-key}` 生成或复核图层名称，并在默认写入模式下只修改对应文字图层的 `node.name`。

用户同时要求上传 PC 时，Skill 会读取 Figma 文本分段样式，生成带颜色、字号、字重和行高的 `<span>` HTML，并将占位符转换为 `{{}}`。相同业务字段只有在完整 HTML 一致时才复用 key；HTML 不同时使用 `voice-ranking/...` 等稳定场景限定拆分 key，禁止覆盖已有样式。

## 使用方式

提供 Figma Design 链接，并使用“动态文字命名”“特效文字命名”或“特效文本”之一。明确说明只读、预览或不要修改时只返回结果；否则自动写回 `rename` 项并回读确认。

```text
$figma-text-naming
https://www.figma.com/design/xxx/activity?node-id=100-200

给这里的动态文字命名。
```

## 结果

- `rename`：当前名称不可保留，新名称已通过全部检查；
- `keep`：当前名称的格式、一级板块业务域、字段语义和冲突检查全部正确；
- `skip`：文本 `characters` 不是动态文本候选；
- `confirm`：业务域、字段语义、缩短方式或冲突处理证据不足。

合法名称示例：

```text
文案/lottery/remaining-count
文案/reward/name
文案/ranking/current-rank
文案/voice-ranking/jewel-count
```

旧两段式名称不能保留。例如 `lottery/remaining-count` 在语义复核通过后迁移为 `文案/lottery/remaining-count`。

完整规则以 [本地规则快照](references/dynamic-text-naming-rules.md) 为准。Skill 运行时不读取飞书。

## 本地校验

```bash
node scripts/validate-dynamic-text-name.mjs '文案/lottery/remaining-count'
node --test tests/*.test.mjs
```

校验和写回都不会修改文字 `characters`、样式、位置、尺寸、可见性、一级板块结构或组件关系。PC 上传会先检查完整的 `key -> HTML` 映射；同一 key 对应不同 HTML 时不会执行上传。
