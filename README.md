# Figma 动态文本命名 Skill

识别 Figma 中含动态占位符的文本，也支持通过“完整预览图有、对应切图没有”的差异发现动态文本，再按 `文案/${business-domain}/${semantic-key}` 生成或复核图层名称，并在默认写入模式下只修改对应文字图层的 `node.name`。

命名阶段会先按逐字相同的 `characters` 找出重复文案，核实业务字段，再比较完整 HTML。原文、字段和 HTML 都相同的节点统一使用一个名称；HTML 不同的重复文案当场使用稳定场景限定拆名。这个结果与是否立即上传 Page Center 无关，后续上传不会再做第二轮去重或改名。

两图比对只用于扩展候选发现。Skill 会先确认两张图属于同一设计状态、语言和版本，并只比较共同覆盖区域；差异文字还必须唯一映射到可编辑 Text 节点。裁剪、遮挡、素材版本不同或只有图片像素而没有对应文字层时不会自动命名。

执行时使用由浅入深的候选漏斗：优先读取页面结构、文字特征和素材关系，再围绕候选按证据缺口补充祖先、相邻文案、组件、样式或更广结构。已有证据足够时及时收敛；局部证据不足时允许有针对性地扩大范围。读写优先批量处理，工具条件不适合时采用其他可靠方式。

重复文案命名时，Skill 会读取组内成员的 Figma 文本分段样式，生成带颜色、字号、字重和行高的 `<span>` HTML，并将占位符转换为 `{{}}`。用户同时要求上传 Page Center 时，会为其余待上传候选生成 HTML；上传阶段只检查最终 `key -> HTML` 映射并执行上传。

## 使用方式

提供 Figma Design 链接，并使用“动态文字命名”“特效文字命名”“特效文本”“文案去重”或“重复文案命名”之一。明确说明只读、预览或不要修改时只返回结果；否则自动写回 `rename` 项并回读确认。

```text
$figma-text-naming
https://www.figma.com/design/xxx/activity?node-id=100-200

给这里的动态文字命名。
```

## 结果

- `rename`：当前名称不可保留，新名称已通过全部检查；
- `keep`：当前名称的格式、一级板块业务域、字段语义和冲突检查全部正确；
- `skip`：既不含受支持占位符，也没有可靠的预览图/切图差异证据；
- `confirm`：两图配对、Text 节点映射、业务域、字段语义、缩短方式或冲突处理证据不足。

只读或预览时会返回候选明细，默认使用编号列表，避免长文本、换行和特殊字符破坏 Markdown 表格。执行写回后只返回摘要和异常项，例如：

```text
命名完成：共扫描 126 个文本，已正确命名 118 个，跳过 5 个，待确认 1 个，失败 2 个。
```

其中 `rename` 写回并回读一致以及复核正确的 `keep` 都计入“已正确命名”；`confirm` 计入“待确认”；只有写入失败、回读不一致或其他执行错误才计入“失败”。成功项和跳过项不再逐条输出。上传 PC 时另行汇总上传成功与失败数量，只展开上传失败项。

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

校验和写回都不会修改文字 `characters`、样式、位置、尺寸、可见性、一级板块结构或组件关系。Page Center 上传只检查命名阶段产出的完整 `key -> HTML` 映射；同一 key 对应不同 HTML 时不会执行上传，也不会在上传阶段重新命名。
