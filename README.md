# Figma UI 文案 Key 命名 Skill

从 Figma 完整效果稿中识别需要独立文案 Key 管理的 UI Text，生成、复核或写回 `文案/${business-domain}/${semantic-key}`，并可按需上传 Page Center。执行流程以 [SKILL.md](SKILL.md) 为准，命名规则以 [动态文本命名规范](references/dynamic-text-naming-rules.md) 为唯一事实源。

整页输入先浅层读取 `id/name/type`，在本地按 `预览页/`、`预览图/` 前缀定位效果区域；中文 selector 失败时不得退化为整页 Text 遍历。目标区域只批量读取轻量 Text 索引，随后在本地整组排除重复实体字段和视觉碎片，placeholder / variable binding 直接进入 `name` 候选。只有仍未决的结构代表节点才补读附近上下文并交给 AI；styled segments / HTML 延迟到最终重复候选比对或 Page Center 输出。

## 使用方式

提供 Figma Design 链接，并明确要求文案 Key、动态文字、特效文字、文案去重或重复文案命名。明确说明只读、预览或不要修改时只返回结果；否则只写回冻结计划中的 `TEXT.node.name`。

待确认项按逐字相同的 `characters` 分组展示，每组统一说明涉及区域、待确认原因、当前冲突和用户需要回答的问题。汇总同时保留待确认节点数和按原文聚合后的组数，例如 `待确认 4 个（2 组）`。

```text
$figma-text-naming
https://www.figma.com/design/xxx/activity?node-id=100-200

识别这里需要独立文案 Key 的 UI Text 并按规范命名。
```

## 本地校验

```bash
node scripts/validate-dynamic-text-name.mjs '文案/lottery/remaining-count'
node scripts/validate-dynamic-text-name.mjs --input /tmp/figma-text-names.json
node --test tests/*.test.mjs
```
