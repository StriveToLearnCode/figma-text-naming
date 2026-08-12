---
name: figma-text-naming
description: "按照 WePie《Figma 动态文本命名规范》分析、审核和重命名 Figma 活动 UI 文案。用户给出 Figma design 链接并提到动态文本命名、文案命名、文字图层命名、批量改名、文案 Key、PageCenter Key、命名检查或“按语义起名”时都应使用；即使用户没有点名 Skill，只要目标是识别活动设计稿中需要运行时管理的 UI Text，并生成或应用 `文案/${business-domain}/${semantic-key}` 名称，也要触发。"
user-invocable: true
argument-hint: "<Figma design 链接> [默认直接改名|仅生成清单|检查现有命名|审核并修复]"
compatibility: "高质量文案识别依赖 Figma 连接器：get_metadata 用于读取节点结构、Text 内容和必要上下文，get_screenshot 仅在结构信息不足、需要辅助理解视觉关系时使用，use_figma 用于写回 Text 图层名称；执行任何 Figma 写操作前必须先加载 figma:figma-use。没有 Figma 连接器时只能基于用户提供的截图、图层信息或文本生成命名建议，不能直接改名。"
---

# Figma 动态文本命名

根据团队规范和设计语义，为真正需要运行时管理的活动 UI 文本生成稳定、可读的 文案/${business-domain}/${semantic-key} 名称。默认在分析完成后直接写回 Figma；只有用户明确要求“仅生成清单”“只给建议”“不要修改”等只读目标时，才不修改节点。

## 权威规则

开始命名前，完整读取 [references/naming-standard.md](references/naming-standard.md)。该文件是本 Skill 的命名事实源；不要凭记忆重写规范。

## 输入与默认行为

输入通常包含：

- Figma `/design/` 链接
- 可选目标：默认直接改名、仅出命名建议、检查现有名称或审核并修复

默认行为：

- 用户给出 Figma 链接并说“命名一下”“动态文本命名”“文案命名”“按语义起名”“批量改名”等时，默认进入 `apply`：完成只读分析和冲突检查后直接写回，不再暂停等待确认。
- 用户明确说“仅生成清单”“只给建议”“先看看”“不要改 Figma”等时，进入 `propose`，只输出报告，不修改节点。
- 用户只说“检查”“审核现有命名”时，进入 `audit`，保持只读；除非同时要求修复或改名。
- 用户明确要求“审核并修复”“检查后直接改”等时，进入 `repair`：审核现有名称，并只修复能够确定的错误名称。
- Figma 连接器不可用或权限不足时，降级为 `propose`，明确说明无法写回，不得声称已经修改节点。
- 没有 `node-id` 时，不猜目标节点。优先使用用户当前明确选中的节点；仍无法确定目标时，请用户提供节点级 Figma 链接。
- 只处理 Figma Design 文件。FigJam、Slides、Make 不属于本 Skill 的目标。

## 工作流

### 1. 解析链接与目标

识别用户目标：

- `audit`：检查已有命名，不写回
- `propose`：用户明确要求只生成命名清单
- `apply`：默认目标；分析后直接写回
- `repair`：审核已有命名，并修复能够确定的错误名称

默认命名范围：

1. 用户链接直接指向 `预览图/*` 或 `弹窗/*` 时，以该节点作为处理范围。
2. 用户链接指向包含多个页面或弹窗的上层节点时，只检查其直属子节点中的 `预览图/*` 和 `弹窗/*`，不递归向下搜索更深层的同类节点。
3. 用户明确指定某个非 `预览图/*`、非 `弹窗/*` 节点时，以该节点作为处理范围，不自动扩展到其他区域。

确定处理范围时，不默认扫描整页，也不从祖先、兄弟节点或其他画布区域补充范围。

以下区域默认不主动纳入处理范围，也不为了寻找动态文本继续向下遍历：

- `母组件`、`母组件（...）`、组件库、设计复用区
- `切图/*`、示意图、效果预览、标注和设计说明
- `动效`、动画、PAG / SVGA / SVG 展示或制作区

只有用户明确指定这些区域或其中节点时，才作为独立处理范围。

处理范围确定后，再在已确定的范围内向下扫描全部 Text；不得使用 placeholder、当前名称、正则或文案内容预筛 Text。

用户给出多个节点链接时，分别确定处理范围，并按 `nodeId` 去重。用户明确指定的节点优先于自动发现范围。

如果无法确定处理范围，不猜测；这类歧义会改变写入目标，因此写回前要求用户提供更具体的节点链接。

### 2. 扫描 Text 并建立判断清单

处理范围确定后，只在已确定的 Scope 内向下遍历全部 Text。

对每个 Text 至少记录：

- `nodeId`
- 节点路径
- 当前 `node.name`
- 原始 `characters`
- 所属预览图 / 页面
- 必要的父级、组件、布局和绑定信息

不得使用 placeholder、`x/xx/XXX/{{}}`、当前名称、正则或文案内容预筛候选。Scope 内所有 Text 都必须进入本次判断范围。

扫描时可以读取父级结构、同构节点、Instance / Component 关系、Variable、property、binding 等信息作为判断证据，但这些信息只用于后续判断，不直接决定 `name` 或 `skip`。

完成扫描后，逐个 Text 进入下一步语义判断；最终每个 Text 必须收敛为：

- `name`
- `skip`
- `confirm`

不得留下未处理或未分类的 Text。

### 3. 筛选真正需要命名的文案

命名对象通常是最终由运行时直接消费的 Text 文案字段，不是页面中所有会变化的文字，也不是参数、标签或列表项属性本身。

先确定“一个运行时文案字段对应的实际 Text 边界”：

1. 一个 Text 本身已经承载完整文案模板时，优先把整个 Text 作为命名对象，不把其中的 placeholder、数字、昵称、礼物名等参数拆成独立字段。
2. Text 含固定文字和一个或多个运行时参数，只要整体承担明确的 UI 文案职责，就按整个 Text 判断是否命名；参数数量和参数表示什么业务数据都不影响结果。
3. 同一个稳定的任务、条件、状态或提示文案位置，如果内容会根据当前任务、配置、用户操作、时间或业务状态替换，则属于运行时文案字段，即使当前设计稿中展示的是完整字面量，也应进入命名判断。
4. 当前配置已经确定具体文字，不等于固定文案。只有能够确认该位置在运行时始终不会替换，才按固定内容处理。
5. 整个 Text 只是单个运行时值时：
   - 位于重复、同构的列表项中，只是该项的昵称、数量、积分、奖励名等内部属性 → `skip`
   - 位于非重复 UI 中，作为独立稳定的展示字段，且职责明确 → `name`
   - 无法判断属于哪种情况 → `confirm`

placeholder、Variable、property、binding、同构槽位差异和状态变化都是运行时证据，不是自动命名条件。不得因为没有 placeholder 就排除，也不得因为出现 placeholder 就直接命名。

以下内容通常不命名：

- 固定标题、按钮、标签、规则说明和不会被替换的普通文案；榜单规则即使支持运营配置，也按规则说明处理
- 榜单条目和“我的排名”中的名次、积分 / 分数、昵称、成员名、队名 / 家族名、占位状态等榜单数据，无论页面只展示一条还是形成重复列表
- 奖励或道具展示位中的道具名称、数量、倍率等道具数据，无论页面只展示一个还是形成重复列表
- 其他重复列表项中的实体属性
- 装饰、示例、标注和设计说明
- 仅因 Variant、显隐、组件切换而变化，但 Text 内容本身不会被替换的文字

非榜单、非道具且不属于重复实体属性的独立运行时字段，继续按前述规则判断是否需要命名。

已有 `文案/...` 名称不等于已经正确。必须继续检查：

- 当前 Text 是否真的属于运行时管理字段；命中上述排除项时仍判为 `skip`，并报告为不应命名
- 字段职责和业务语义是否明确
- 名称是否符合 `references/naming-standard.md`
- 参数边界是否正确

只有完整通过判断后才保留现有名称；历史误命名在 `audit` 中报告，在 `repair` 中才修复。

### 4. 生成名称

业务基础名称（`baseName`）格式：

文案/${business-domain}/${semantic-key}
最终名称只能有这三段。文案/ 后必须同时包含业务域和语义 key；文案/count、文案/task/、空段和额外路径层级都不合规。只有同一 `baseName + characters` 存在多个 canonical HTML 时，才按 `references/naming-standard.md` 在第三段末尾追加 `-1`、`-2`、`-3` 技术后缀。

按以下顺序决策：

1. 根据 Text 所属的一级业务职责确定 ${business-domain}。
2. 根据 Text 在 UI 中承担的实际字段职责确定 ${semantic-key}。
3. 字段含义命中 `references/naming-standard.md` 中的常用含义时，使用对应的标准写法。
4. 当前组件或业务模块已有名称符合规范，且业务域和字段职责与当前 Text 等价时，复用已有语义；否则重新判断，不沿用历史名称。
5. 相同业务语义和字段职责优先复用同一个 baseName，不要因为位置、页面或当前展示值不同重新造名称。
6. 无法确定业务域或字段语义时，不使用 common、unknown、位置编号等兜底词，结果为 confirm。

变量应用：

- ${business-domain}：表示字段所属的一级业务模块，只使用一个简短英文单词，如 task、reward、ranking、lottery。
- ${semantic-key}：表示字段本身的职责，使用 1～2 个英文单词，如 remaining-count、current-rank、countdown、progress；样式技术后缀不属于 semantic key。
- 文案中的运行时参数不直接进入名称。昵称、礼物名、数量、金额、等级、比例等只用于理解字段职责。
- 当前展示的具体数字、日期、次数、Tab、状态和位置编号不作为名称的一部分。
- 同一字段存在多个参数时，仍按整段文案的职责命名，不为每个参数分别生成 key。
- 字体、颜色、字号、字重等视觉样式不参与 baseName 生成；重复文案存在样式差异时，交由后续“重复文案处理”判断。

语义英文要简短且稳定：

- ${business-domain} 和 ${semantic-key} 统一使用小写英文。
- ${business-domain} 只允许一个英文单词。
- ${semantic-key} 最多 2 个语义单词；包含两个单词时使用 lowercase kebab-case。
- 不音译中文，不使用 text1、value2、content、common、unknown 等弱语义词。
- 名称表达字段职责，不描述颜色、字号、位置、布局或当前示例值。
- 不使用 tab1、section2、panel、page、left、top 等位置词区分语义。
- 具体英文表达优先遵循 references/naming-standard.md，不要在本 Skill 中另建一套同义词表。

## 5. 处理状态、复用与冲突

先区分三种容易混淆的情况：

- **相同文案、相同语义**：`characters` 相同，字段职责和业务语义也相同，优先复用同一个 `baseName`。
- **文字相同、语义不同**：即使 `characters` 完全一致，只要所在字段职责不同，就分别命名，不得仅因文字相同强行复用名称。
- **语义相同、样式不同**：先使用相同 `baseName`；只有 `characters` 也相同，且完整 canonical HTML 确实不同时，才按下述规则使用技术后缀。

### 重复文案处理

1. 只对相同 `baseName + characters` 的 Text 归组；文字不同或业务语义不同的 Text 不得通过 canonical HTML 合并或分配后缀。
2. 按 `references/naming-standard.md` 的统一序列化规则为组内每个 Text 生成完整 canonical HTML，不得手工拼接或只比较部分 styled segments。
3. 组内 canonical HTML 全部相同：所有 Text 复用无后缀 `baseName`。
4. 组内存在多个 canonical HTML：对去重后的完整 HTML 按 Unicode code point 升序排列，从 `-1` 开始连续分配；相同 HTML 使用相同后缀，所有样式版本都带后缀。
5. 技术后缀不属于 semantic key，不受其一至两个业务单词限制。除此之外，禁止使用数字后缀区分位置、页面、状态或其他业务语义。
6. 对每个最终 `rename / keep` Text，在命名阶段同时保留由完整 styled segments 生成的 canonical HTML，作为该名称对应的 PC value；后续上传 PC 必须使用该 HTML，禁止使用 `characters` 纯文本。

已有名称与建议名称冲突时：

- 已有名称符合当前语义和命名规范 → `keep`
- 已有名称不符合当前字段语义，但能够确定正确名称 → `rename`
- 无法可靠确定应该复用哪个名称或最终语义 → `confirm`
- 不得为了避免冲突自行添加位置词、页面编号、`new`、`other`、`common`、`unknown` 等弱语义后缀

相同或相近文案的名称复用必须同时参考：

- `characters`
- 字段职责
- 所属业务语义
- 父级结构和上下文
- 同构槽位
- 页面或状态中的对应关系

仅名称相同、文字相同或空间位置接近，都不能单独证明两个 Text 应复用同一个名称。

写回前执行完整性检查：

- Scope 内每个 Text 必须且只能被分类为 `rename / keep / skip / confirm`
- `unclassifiedTexts.length === 0`
- 所有 `rename / keep` 名称都严格符合 `文案/${business-domain}/${semantic-key}` 三段格式
- `business-domain` 必须符合 `references/naming-standard.md`
- `semantic-key` 必须符合 lowercase kebab-case 和语义长度要求；技术后缀只能通过“重复文案处理”生成
- 不得残留中文业务域、空格、空段、额外斜杠或明显弱语义名称
- 相同语义字段的名称复用已经完成检查
- 相同 `baseName + characters` 的重复文案已经完成 canonical HTML 比较
- 因样式不同生成的 `-1 / -2 / -3` 后缀已按完整 canonical HTML 稳定排序、从 1 连续分配且所有版本均有后缀
- 所有 `confirm` 都明确记录缺失的判断证据

命名校验与处理分类相互独立，不能只检查 `rename`：

1. 建立 `auditedTextNodes`，包含全部 `rename / keep` Text，以及当前名称以 `文案/` 开头的 `skip / confirm` Text。
2. `rename` 校验建议写回名称，`keep` 校验当前名称，`skip / confirm` 校验其当前存在的 `文案/...` 名称。
3. 完整名称必须严格符合三段结构：

   ```text
   文案/${business-domain}/${semantic-key}
   ```

   不允许空段、额外 `/`、空格或非法字符。

4. `business-domain` 只允许一个稳定英文单词。
5. `semantic-key` 使用 lowercase kebab-case，并遵守 `references/naming-standard.md` 中的词数和固定名称规则。末尾数字只在能够证明属于同一 `baseName + characters` 样式组时按技术后缀校验；孤立或无归组证据的数字后缀不合规。
6. 已有 `文案/...` 名称即使最终处理为 `skip / confirm`，只要格式或语义明显不合规，也必须记录：

- `nodeId`
- 当前名称
- 失败原因

  在 `repair` 模式下，语义能够确定时可修复；无法确定时保持 `confirm`，不得隐藏问题。

写回闸门：

- `apply`：允许存在与其他字段无关的 `confirm`，只写回已经确定的 `rename`
- `repair`：只修复能够确定目标名称的历史错误
- 如果 Scope 本身不完整、扫描结果存在未分类 Text，或写入目标范围仍有实质歧义 → 不得写回
- 单个字段无法确认时，不阻塞其他已经确定且互不依赖的字段

置信度建议：

- `high`：placeholder / binding / Variable、明确结构职责、同构槽位或稳定上下文共同支持
- `medium`：字段职责和业务语义基本明确，但运行时证据较弱
- `low`：存在多个合理字段含义、复用关系或运行时性质无法可靠区分

`low` 且会影响是否命名或最终名称时，应使用 `confirm`，不要硬猜。

### 6. 输出命名报告

先给结论，再给表格。`apply` 模式先在内部生成并校验同样的清单，然后继续执行写回，不要把报告当作等待确认的暂停点；最终报告应反映实际写回结果。

| nodeId | 文案原文 | 当前名称 | 语义判断 | 建议完整名称 | 参数化 | 命名校验 | 规则依据 | 置信度 | 处理 |
| ------ | -------- | -------- | -------- | ------------ | ------ | -------- | -------- | ------ | ---- |

`处理` 只能是：

- `rename`：需要命名或已有名称需要修改
- `keep`：已有名称符合当前语义和命名规范
- `skip`：该 Text 不需要运行时文案命名
- `confirm`：字段职责、运行时性质、业务语义或参数边界之外的关键判断无法确定，需要用户确认

其中：

- `rename` 和 `keep` 都表示该 Text 最终属于需要命名的动态文案。
- `parameterized` 只描述参数边界，不改变 `rename / keep` 结果；边界未完全确认时标记为“待确认”。
- `confirm` 只用于会影响是否命名、字段职责或最终名称的实质歧义，不因缺少接口、代码或数据源单独产生。

报告末尾必须包含：

- 本次处理的 Scope，以及实际扫描的 Text 总数
- `rename / keep / skip / confirm` 数量
- 默认未纳入 Scope 的区域及原因汇总
- 名称复用与重名检查结果
- 完整性检查结果，包括：
  - 未分类 Text 数
  - 名称格式失败数
  - 业务域不合规数
  - semantic-key 不合规数
  - 参数边界待确认数
- 所有命名校验失败项的 `nodeId / 当前名称或建议名称 / 失败原因`
- 所有低置信度和 `confirm` 项
- `apply / repair` 模式下的写回结果：`nodeId: oldName -> newName`
- 写回失败项及失败原因

不要在报告里只给裸 key；需要展示名称时，始终给出完整 Figma 图层名：

```text
文案/${business-domain}/${semantic-key}
```

`skip` 只统计已经进入当前 Scope、经过文案语义判断后确认无需命名的 Text。

未进入 Scope 的 `母组件/*`、`切图/*`、动效区、标注、设计说明等区域不计入 `skip`，只按排除原因汇总说明，避免把未扫描区域的节点数量混入文案判断结果。

Scope 内所有 Text 都必须得到 `rename`、`keep`、`skip` 或 `confirm` 中的一个结果，不得存在未分类 Text。

最终应满足：

```text
Text 总数 = rename + keep + skip + confirm
```

`apply` 或 `repair` 写回完成后，报告中的 `rename` 项应反映实际执行结果；写回失败不得伪装为成功。

### 7. 写回 Figma

`apply` 是文案命名请求的默认模式。只要目标 Scope 可靠、Figma 连接器可用，就在本次调用中直接执行；不要再次要求用户确认。只有 `propose`、`audit` 或存在会改变写入范围的实质歧义时保持只读。`repair` 只修复能够确定的错误名称。

1. 加载 `figma:figma-use`，并按其要求读取必要 API 参考。
2. 使用 `use_figma`，`skillNames` 包含 `figma-use`。
3. 按 `nodeId` 精确定位 Text，不按旧名称或文案内容模糊搜索。
4. 每批最多重命名 10 个 Text；跨 Scope 时分别调用，并按 Figma Skill 规则并行执行。
5. 只修改 `node.name`，不得修改 `characters`、位置、尺寸、可见性、锁定、样式、布局、组件关系、Variable / property / binding 或其他数据。
6. 每批返回所有 `mutatedNodeIds`、成功映射、跳过项与错误。
7. 任一调用报错时停止当前批次，读取错误后修正；失败调用按原子操作处理，不假设存在部分写入。
8. `changes` 只包含已经完成判断、生成目标名称且允许写回的 `rename` Text；`keep`、`skip`、`confirm` 不得进入写入列表。
9. 已有名称与目标名称相同时不重复写入，计为 `keep`。
10. `audit` 不写回；`repair` 只写入能够确定正确目标名称的历史误命名，无法安全判断时保持原名称并报告。
11. 写回后重新读取本次 Scope 内全部已审核 Text，而不只是 `mutatedNodeIds`；复用写回前的同一套规则完成校验。

写回后至少校验：

- `node.name === targetName`
- `node.characters === originalCharacters`
- 名称符合 `文案/${business-domain}/${semantic-key}` 三段格式
- `business-domain` 与 `semantic-key` 符合 `references/naming-standard.md`
- 没有因为位置、当前数值、节点 ID 或弱语义生成错误名称
- 相同文案的复用与样式后缀符合“重复文案处理”规则
- Scope 内所有 Text 仍能对应到唯一的 `rename`、`keep`、`skip` 或 `confirm` 结果

推荐写入脚本形态：

```js
const changes = [
  {
    id: "1:2",
    oldName: "旧名称",
    newName: "文案/task/description",
    originalCharacters: "إرسال هدية XXX N مرة",
  },
];

const applied = [];
const skipped = [];

for (const change of changes) {
  const node = await figma.getNodeByIdAsync(change.id);

  if (!node || node.type !== "TEXT") {
    skipped.push({
      ...change,
      reason: "node-not-found-or-not-text",
    });
    continue;
  }

  if (node.name !== change.oldName) {
    skipped.push({
      ...change,
      actualName: node.name,
      reason: "name-changed-since-review",
    });
    continue;
  }

  if (node.characters !== change.originalCharacters) {
    skipped.push({
      ...change,
      actualCharacters: node.characters,
      reason: "characters-changed-since-review",
    });
    continue;
  }

  node.name = change.newName;

  applied.push({
    id: node.id,
    oldName: change.oldName,
    newName: node.name,
    characters: node.characters,
  });
}

return {
  mutatedNodeIds: applied.map((item) => item.id),
  applied,
  skipped,
};
```

### 8. 收尾

写回后汇报：

- 成功改名数量
- 跳过或失败数量及原因
- 全部受检节点的校验结果，包括 `skip / confirm` 中是否仍有不合规的 `文案/...` 名称
- 可用于回滚的 `old -> new` 清单

如果用户明确只要建议，不要写回或催促写回；直接交付可复制的命名清单。
