# 命名规则

## 适用边界

本文件只约束 Figma 翻译页面中的动态文本图层。候选项检测正则是本 Skill 的扫描实现，不属于公司通用命名规范，也不得套用到以下对象：

- Figma 切图：继续使用 `切图/` 前缀及对应分类规则，例如 `切图/bg/1`、`切图/btn/confirm-宽度-颜色`。
- 图灵库 Figma 插件控件：继续使用 `turing-名称-三级分类-颜色-形状-序号`。
- Vue 项目代码：组件使用 kebab-case，路由使用全小写并以 `-` 分隔，方法和变量使用 camelCase，常量使用 UPPER_SNAKE_CASE。

## 候选项检测

使用文本节点的 `characters`，而不是其当前图层名称：

```js
const dynamicPlaceholder = /(^|[^A-Za-z0-9])(?:[xX]{2,}|X)(?=$|[^A-Za-z0-9])/;
const dynamicPlaceholders = /(^|[^A-Za-z0-9])(?:[xX]{2,}|X)(?=$|[^A-Za-z0-9])/g;
const isCandidate = dynamicPlaceholder.test(node.characters);
const normalizeDynamicPlaceholders = (text) => text.replace(dynamicPlaceholders, "$1{{}}");
```

此表达式可匹配 `xx时xx分`、`xxxx/100`、包含 `XX` 的阿拉伯语文本以及独立的大写 `X`，但不会匹配 `1x`。

使用以下表达式识别公司当前格式的可读 Key：

```js
const readableTextKey = /^[a-z][a-z0-9]*_[a-z][a-z0-9]*_txt\d{2,}$/;
const stableTextId = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
```

`stableTextId` 接受标准 UUID 变体；它只校验格式，不证明 UUID 来自权威配置或已经持久化。

格式为 `Page_Module_Index`，例如 `tab1_bg1_txt01`：

- `Page`：页面、页签或状态范围的稳定短标识，例如 `tab1`。
- `Module`：页面内稳定模块的短标识，例如 `bg1`；优先沿用设计或产品已有模块名。
- `Index`：使用 `txtNN`，至少两位数字，例如 `txt01`。

可读 Key 只用于阅读和代码引用，不是唯一身份。唯一身份是与其分离的 UUID。不得把 UUID、Figma 节点 ID 或业务域路径写入图层名称。

## 身份与可读 Key

为每个最终文本条目维护一组 `stableId + readableKey`：

1. `stableId` 必须是持久化 UUID。已有 UUID 必须保留；不得从 Figma 节点 ID 推导。
2. 只读扫描不能把临时生成的 UUID 当作稳定身份。缺少 UUID 时标记 `missingStableId`，交由能够持久化配置的下游流程创建一次并保存。
3. `readableKey` 使用 `Page_Module_txtNN`，写入 Figma 图层名称。
4. 运行时 `$tf()` 引用必须在可读 Key 前增加 `text/`，例如 `$tf('text/tab1_bg1_txt01', val)`。存储的可读 Key 本身不包含 `text/`。
5. UUID 才是唯一识别标识。即便可读 Key 当前在页面内唯一，也不得把它当作跨页面、跨版本的主键。

## 语义证据顺序

业务语义用于判断复用、冲突和去重，并辅助选择稳定的 Page 与 Module 标识。按以下顺序取证：

1. 完整文本的含义。
2. 当前文本图层的有意义名称。
3. 最近的具名父节点或祖先节点。
4. 相邻标签和兄弟文本。
5. 组件或变体状态以及明确的数据来源。
6. 语义组中重复项的位置。
7. 视觉顺序，仅用于初次分配 Index 或同优先级方案的稳定裁决。

拒绝 `板块4`、`Frame 123`、`Group 456`、`Text 128`、`数字`、`xx` 等无意义名称作为业务语义证据。它们可以在公司已有命名体系明确要求时作为 Page 或 Module 的既有标识被原样沿用，但不得据此推断文本运行时含义。

如果文本只有 `xx` 或 `xxx`，并且图层名称与上下文均无有效语义，则标记为低置信度，不得仅凭位置认定复用关系。

## 稳定选择顺序

对单个候选项或语义完全一致的重复组，按以下顺序选择身份和可读 Key，并在首个满足条件的层级停止：

1. 存在权威配置中的 UUID，且其运行时含义与当前条目完全一致：保留 UUID。
2. 当前图层名是有效可读 Key，且与当前 Page、Module 和业务语义一致：保留可读 Key。
3. 同一页面存在运行时含义、状态、数据来源、占位符语义顺序和渲染约定均一致的已命名条目：复用其 UUID 与可读 Key。
4. 根据公司已有页面和模块命名选择 `Page` 与 `Module`，为新条目分配 `txtNN`。
5. 无法确定 Page、Module、业务含义，或可能产生冲突：标记为 `confirm`。

新建 `txtNN` 时：

- 保留所有已有有效编号，不因扫描顺序、图层移动或新增节点重新编号。
- 对已有模块追加新条目时，使用该 `Page_Module` 下当前最大编号的下一位。
- 首次批量命名且不存在已有编号时，按 Frame 顺序、从上到下、从左到右稳定分配 `txt01`、`txt02`；节点 ID 只能作为最终排序裁决，不能写入 Key。
- 完全重复项共享同一 UUID 与可读 Key，不增加编号。

业务域词典可以帮助判断 `Page`、`Module` 及语义是否一致，但不得再生成 `<business-domain>/<semantic-key>` 形式的新 Key。

## 冲突与复用

- 只有运行时含义、渲染值、状态、数据来源和占位符语义顺序全部一致时，才复用同一 UUID 与可读 Key。
- 文案相同但语境、状态、数据来源或运行时含义不同：必须使用不同 UUID 与可读 Key。
- 可读 Key 相同但 UUID、值或语义不同：标记为冲突，不得静默覆盖。
- UUID 相同但可读 Key、值或语义出现不符合预期的变化：标记为身份漂移，要求确认或从权威配置恢复。
- 不得为解决冲突而追加 Figma 节点 ID，也不得重排已有 `txtNN`。
- 重复的奖励名或条目名先执行完全重复判断；只有确实不同的条目才分配新的 Index。

## Pagecenter 与代码侧交接

本 Skill 不读写 Pagecenter，也不修改 Vue 代码。向下游输出时必须明确区分：

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "key": "tab1_bg1_txt01",
  "runtimeKey": "text/tab1_bg1_txt01"
}
```

代码生成或联调文档必须使用 `runtimeKey`，例如 `$tf('text/tab1_bg1_txt01', val)`；遗漏 `text/` 会导致 Pagecenter 文案无法读取。不得把 `runtimeKey` 反写成 Figma 图层名称。
