# Figma 动态文本命名 Skill

识别 Figma 完整效果区域中的动态文本，生成、复核或写回 `文案/${business-domain}/${semantic-key}`，并可按需上传 Page Center。执行流程以 [SKILL.md](SKILL.md) 为准，名称业务规则以 [动态文本命名规范](references/dynamic-text-naming-rules.md) 为唯一事实源。

完整效果区域内的可编辑 Text 全量进入扫描账本：placeholder 命中项直接判为 dynamic，其余 Text 按结构上下文成组交给 AI 判断 dynamic、static 或 confirm。切图仅作为容易取得且关系明确时的可选反证；写回前必须审计每个账本 Text 是否已有三态判断。

## 使用方式

提供 Figma Design 链接，并使用“动态文字命名”“特效文字命名”“特效文本”“文案去重”或“重复文案命名”之一。明确说明只读、预览或不要修改时只返回结果；否则自动写回 `rename` 项并回读确认。

```text
$figma-text-naming
https://www.figma.com/design/xxx/activity?node-id=100-200

给这里的动态文字命名。
```

## 本地校验

```bash
node scripts/validate-dynamic-text-name.mjs '文案/lottery/remaining-count'
node --test tests/*.test.mjs
```
