# Canonical HTML 复用规则

本规则只用于同一 `baseName`、原始 `characters` 完全相同的文字图层之间比较样式和分配技术后缀，不参与动态文本识别、字段归组、业务语义或 `name / skip / confirm` 判断。

## 生成 canonical HTML

按 Figma styled segments 的原始顺序处理，不重新排序，也不基于相邻样式或遍历环境合并 segment。每个 segment 固定输出一个连续的 `<span>`：

```html
<span
  style="color:#rrggbbaa;font-size:Nrem;font-weight:N;line-height:Nrem;white-space:pre-wrap"
  >escaped text</span
>
```

多个 segment 直接连接，不在 `<span>` 之间添加空格或换行。

对每个 segment 使用以下规则：

1. 保持原始文本的字符、空格和换行，不做 trim、换行转换或 Unicode normalization。
2. 按 `&` → `&amp;`、`<` → `&lt;`、`>` → `&gt;`、`"` → `&quot;`、`'` → `&#39;` 的顺序对文本做 HTML escape。转义只作用一次。
3. `style` 只按 `color`、`font-size`、`font-weight`、`line-height`、`white-space` 的固定顺序输出，不插入额外属性、空格或可选分号。
4. `color` 统一输出小写 `#rrggbbaa`。将 Figma RGBA 各通道限制在 `[0, 1]`，乘以 `255` 后四舍五入为整数，再输出两位小写十六进制；缺省 alpha 按 `1` 处理。
5. `font-size` 将 Figma px 值除以 `100` 后输出 `rem`。
6. `line-height` 为 px 时同样除以 `100` 后输出 `rem`；百分比保持百分比语义并输出最简十进制 `%`，自动行高固定输出 `normal`。
7. `font-weight` 输出十进制数值。
8. 所有数值使用普通十进制，去掉无意义的末尾 `0` 和小数点；`-0` 统一为 `0`，不使用指数形式。
9. `white-space` 固定输出 `pre-wrap`。

生成过程中不得依赖节点 ID、对象键顺序、locale、遍历顺序或运行环境默认格式。同一组 styled segments 输入必须生成逐字完全相同的 canonical HTML。

## 分配技术后缀

只在 `baseName` 和原始 `characters` 都相同时比较 canonical HTML：

- 组内 canonical HTML 全部相同：所有节点使用无后缀 `baseName`。
- 组内存在不同 canonical HTML：先对完整 canonical HTML 去重，再按 Unicode code point 升序稳定排序，从 `-1` 开始连续分配技术后缀；相同 canonical HTML 使用相同后缀。

技术后缀只区分同一文字的样式版本，不属于 `semantic-key` 的业务语义。原始 `characters` 不同的节点不得通过本规则合并或分配技术后缀。
