# Figma UI 文案 Key 命名 Skill

从 Figma 完整效果稿中识别需要独立文案 Key 管理的 UI Text，生成、复核或写回 `文案/${business-domain}/${semantic-key}`，并可按需上传 Page Center。执行流程以 [SKILL.md](SKILL.md) 为准，命名规则以 [动态文本命名规范](references/dynamic-text-naming-rules.md) 为唯一事实源。

整页输入先浅层读取 `id/name/type` 和父子层级，在本地按 `预览图/` 前缀定位效果区域；中文 selector 失败时不得退化为整页 Text 遍历。第一次轻索引就按预览区域下的一级板块或最近稳定子范围分块，禁止先读整个预览区域。每块最多读取一次并立即归档，`ancestorPath/component` 通过字典引用复用；单块超限时由 Runner 穿透 GROUP 等包装层，递归拆成最近的 `FRAME/SECTION/COMPONENT/INSTANCE` 或更深的互斥结构叶范围。父范围不重读、不使用截断 Text，也不按固定 Text 数量切片。Coverage 只从任务缓存中的完整叶范围本地合并，不完整时禁止冻结和写回。

随后在本地整组排除重复实体字段和视觉碎片。只有仍未决的结构代表节点才补读无截图上下文；styled segments / HTML 只允许用于 `name` 候选，区域截图只允许用于缓存无法回答的 `confirm` 组。同原文、同业务字段存在多个 canonical HTML 时自动按稳定文档顺序分配 `-1`、`-2` 等后缀，相同 HTML 复用名称，合法现有后缀优先保留；HTML 差异本身不再触发待确认。Naming Plan Freeze 后的追问优先查询冻结快照和任务缓存，不重新扫描页面。

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
node scripts/validate-dynamic-text-name.mjs '文案/leaf/balance-1'
node scripts/validate-dynamic-text-name.mjs --input /tmp/figma-text-names.json
node --test tests/*.test.mjs
```
