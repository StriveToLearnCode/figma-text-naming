# 富文本数据与 PageCenter Value

本文件负责保存命名时的富文本数据、生成 canonical HTML 和 PageCenter `value`，不授予 PageCenter 写入权限。

## 1. 命名时保留数据

对全部 `rename / keep` Text，在生成名称时同步读取并保留完整 styled segments，不要等到后续导入 PageCenter 时重新扫描 Figma。

每个条目保留：

- `nodeId`
- 原始 `characters`
- 最终完整名称
- 去掉 `文案/` 前缀后的 `key`
- 参数化结果
- 完整 styled segments
- PageCenter 富文本 `value`

读取 styled segments 后立即基于参数化结果生成并保留 `value`。即使整段文字只有一种样式，也必须生成带内联样式的 HTML，不能使用 `characters` 或参数化纯文本代替。

styled segments 同时用于样式版本比较和 PageCenter `value` 生成。本阶段只读取和缓存数据，不修改 Text 的 `characters` 或样式，也不写入 PageCenter。

## 2. HTML 生成

1. 以完整 styled segments 为唯一样式源，将每个样式区间转换为标准 HTML 和内联 CSS；至少保留字体颜色、字号和字重等影响展示的属性，不写入 `data-style` 或 Figma 原始样式 JSON。
2. 参数替换只能改变对应字符区间的内容，不能丢失包裹该区间的样式标签。
3. 保留原文中的空格和换行；换行统一序列化为 HTML void element `<br>`，禁止生成 `</br>`。
4. canonical HTML 必须保留完整原文、标签层级和影响展示的样式，同时统一属性顺序等非语义差异。不得手工拼接或只比较部分 styled segments。

canonical HTML 只在相同 `baseName + characters` 的组内用于分配样式技术后缀，具体分组和排序规则见 [命名规范](naming-standard.md)。

## 3. Value 校验

每个待用条目必须同时具备：

- 非空 `key`
- 参数化结果
- 完整 styled segments
- 非空且包含实际富文本标签与内联样式的 HTML `value`

上传前逐项从 `value` 反查文本内容，与参数化结果逐字一致；只有 `<br>` 与换行之间允许等价转换。同时确认所有 styled segment 都已消费，不存在越界、缺口或重叠冲突。

styled segments 缺失、不完整或 HTML 生成、校验失败时，按 `nodeId` 补读一次。仍无法得到合格 `value` 时，停止该条目上传并报告原因；禁止退化为 `characters`、参数化纯文本或空值继续写入。

## 4. 缓存合并和授权

写回 Figma 后的复核数据按 `nodeId` 合并。只有新结果包含完整 styled segments 时，才允许替换已缓存的 styled segments 和 `value`；不得用仅含 `characters / name` 的复核结果覆盖完整缓存。

后续同一上下文要求写入 PageCenter 时，直接复用已生成的 `value`。只有数据缺失或 Text 在命名后发生变化，才按 `nodeId` 补读对应节点，不重新扫描整个 Scope。

只有用户明确要求写入 PageCenter 时才执行外部写入。命名阶段即使已经生成并校验 `value`，也不得自动上传。
