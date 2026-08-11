# Figma 动态文本命名 Skill

识别 Figma 完整效果区域中的动态文本，生成、复核或写回 `文案/${business-domain}/${semantic-key}`，并可按需上传 Page Center。执行流程以 [SKILL.md](SKILL.md) 为准，名称业务规则以 [动态文本命名规范](references/dynamic-text-naming-rules.md) 为唯一事实源。

候选池取“占位符命中”和“完整效果/切图差异命中”的并集；写回前必须审计扫描账本的候选覆盖，写后回读只验证名称写入结果，不能替代覆盖审计。

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
