# Figma 动态文本命名规则

- 当前快照：2026-08-10-r6
- 清单来源名称：`文案/${source-key}`，其中 `source-key` 必须逐字复用
- 无清单时生成名称：`文案/${business-domain}/${semantic-key}`
- 生成名称格式正则：`/^文案\/[a-z]+(?:-[a-z]+)?\/[a-z]+(?:-[a-z]+)?$/`

本文件是 Skill 当前绑定的完整规则快照。快照可以升级，但必须在同一次变更中整体替换规则，并同步更新 `SKILL.md`、确定性脚本、测试和快照标识；不得只改标识，也不得分批发布互不兼容的规则与实现。一次执行开始后固定使用同一快照版本。

本规则使用用户链接限定范围内的 Figma 信息判断节点。用户随任务提供的 Text Sync、Page Center 或其他实际消费的 `{ key, value }` 文案清单是额外的绑定合同；除此之外的目标范围外信息不参与判断。

## 页面语义地图

任何文本判断之前，先理解完整页面。至少收集：

1. 目标 Frame 整体截图；
2. 完整节点树和所有 `TEXT` 节点；
3. Frame、Group、Component、Instance 和文本节点名称；
4. 位置、尺寸、父子关系、兄弟关系和重复结构；
5. 附近文字、视觉组件、变量绑定与明确标注；
6. 完整预览、已有 `切图/...`、业务模块名和规范动态文本名。

用这些信息建立区域语义地图。区域边界应反映用户能感知的功能模块，不要求机械等同于某一层 Frame。每个区域记录 `regionId`、位置、业务语义和证据。页面级结论还要描述页面的整体目标，例如“充值达到不同档位领取奖励”。

结构名 `Frame 123`、`Group 8`、`板块2` 和位置“中部”能定位节点，但不能单独证明 `business-domain`。

## 预览与切图配对

完整预览展示最终页面组合，`切图/...` 通常展示会交付给前端的背景、装饰、按钮底板或组件视觉资产。二者可以帮助区分已经包含在视觉资产中的内容与由前端叠加的文字，但必须先建立可靠的区域级对应关系。

每个配对至少使用多项相互独立的证据，例如：

- 共用同一背景、边框、标题底板或装饰实例；
- 宽高、比例和内部留白一致；
- 标题栏、按钮、奖励槽、头像框等结构锚点的相对位置一致；
- Frame、Component、Instance 或 `切图/...` 名称表达相同业务模块；
- 同一模块的多个状态或重复实例能够互相印证。

画布上的左右相邻、单一坐标关系、近似尺寸或整体风格相似不能单独证明配对。无法唯一确定对应切图时，不制造配对结论，继续使用完整页面语义扫描。

可靠配对后，优先比较 Figma 节点树、实例关系和对应区域截图。OCR、像素差异或肉眼观察只能作为辅助证据，尤其不能用 OCR 未识别到某种语言就断言切图中没有文字。对预览中的 Text 可记录：

```json
{
  "renderingComparison": {
    "previewNodeId": "123:400",
    "sliceNodeId": "123:500",
    "status": "preview-only",
    "pairingEvidence": [
      "共用同一背景实例",
      "标题栏和奖励槽相对位置一致"
    ],
    "comparisonEvidence": [
      "对应位置的切图不含该文字"
    ]
  }
}
```

`status` 只允许：

- `preview-only`：文字存在于完整预览，但不包含在对应切图中，说明它是前端叠加文字；
- `included-in-slice`：文字已包含在对应切图视觉内容中；
- `unresolved`：区域已配对，但现有节点或视觉证据不足以确定该文字是否包含在切图中。

未找到可靠配对时不输出 `renderingComparison`。不得把 `unresolved` 当成 `preview-only`，也不得因为没有切图对照而从扫描集合中删除 Text。

### 差集结论的边界

`preview-only` 只能证明渲染归属，不证明内容动态。固定标题、Section 标题、Tab、导航、按钮、活动规则、说明和多语言 UI 文案经常也由前端叠加。它们即使不在切图中，仍按 static 判断。

`preview-only` 也不能单独证明需要图层名。奖励名称、数量、单位、时长等组件数据可能既由前端叠加又在运行时变化，但仍由 props、接口或奖励元数据直接渲染，因此 `needsLayerName: false`。

`included-in-slice` 是“可能属于视觉资产”的支持证据，不是禁止动态判断的硬规则。若存在独立、明确的运行时绑定证据，仍按实际节点和内容所有权判断；不要仅凭对照状态做最终分类。

## 批量分析合同

完成语义地图后，再把一批 Text 连同以下上下文一起判断：

- 原始 `characters` 和当前 `node.name`；
- 所属区域及其业务语义；
- 视觉角色，例如进度条数值、标题、按钮、奖励数量；
- 附近文字和相关组件；
- 从页面容器到节点的路径；
- 页面整体语义；
- 变量绑定、组件文本属性、重复字段和明确标注；
- 存在时的 `renderingComparison`，并保持它与运行时变化证据分离。

不要逐个 Text 调用 AI。超出上下文时可以分批，但每批必须携带同一份完整语义地图，并在所有批次完成后一次校验、一次写回。

扫描全部 `TEXT` 节点，不在程序里用正则或场景函数预筛。扫描是为了避免漏检，不表示全部文本都是命名候选。

## 动态候选硬门槛

AI 必须先独立判断节点是固定 UI 文案，还是页面运行过程中会变化的数据值、实体值或组合动态内容。只有后者才能进入 Key 生成阶段。知道文本含义、业务域或字段语义不能证明动态性，也不能提高命名置信度。

默认 static：

- 模块标题、Section 标题、Tab、导航；
- 固定按钮文案、活动规则入口、完整规则、说明和操作指引；
- 字段 Label，尤其冒号结尾的字段名；
- 固定活动日期或时间范围；
- 固定档位条件、固定百分比说明、固定次数规则；
- 任何只因包含数字、金额、百分比而被怀疑为动态的完整自然语言句子。

例如 `يتمتع كل حساب بـ20 فرصة`、`أثناء فترة النشاط، عندما يصل استهلاك الذهب إلى 550000`、`فرص الخصم:`、`استهلاك الذهب:` 和 `عروض الشحن` 全部是 static。它们不输出 Key，也没有命名置信度。

动态候选强信号：

- 明确 placeholder，如 `xxx`、`xx时xx分`；
- 与 Label 分离的独立 Value，如 `0/20`、`22500/550000`、倒计时、当前排名、积分、余额、次数或数量；
- 用户昵称、奖励名称、队伍名、房间名等运行时实体示例；
- 重复数据卡片中的字段值，但必须由卡片结构证明其为数据槽而非固定文案。

这些仍是证据而非仅凭字符串触发的程序规则。完整句子里的数字不是独立 Value。Label 与 Value 必须分别判断：

```text
فرص الخصم:       -> static
0/20             -> dynamic candidate
استهلاك الذهب:   -> static
22500/550000     -> dynamic candidate
```

动态候选必须包含非空 `dynamicEvidence`，说明运行时变化依据。`renderingComparison.status === "preview-only"`、切图中无文字或“由前端叠加”不能作为 `dynamicEvidence`；候选必须还有 placeholder、独立 Value、跨实例字段变化、变量绑定、组件属性或明确标注等运行时证据。static 节点只输出 `isDynamic: false` 与排除依据，不得携带 `confidence`、`needsLayerName`、`semanticId`、`sourceKey` 或 `suggestedName`。AI 输出每个候选节点的：

```json
{
  "nodeId": "123:456",
  "text": "22500/550000",
  "regionId": "region-b",
  "renderingComparison": {
    "previewNodeId": "123:400",
    "sliceNodeId": "123:500",
    "status": "preview-only",
    "pairingEvidence": ["共用同一背景实例", "进度条结构一致"],
    "comparisonEvidence": ["切图的进度条上方不含该数值"]
  },
  "semanticId": "recharge:current-target",
  "isDynamic": true,
  "dynamicEvidence": [
    "作为独立 Value 节点显示 current/target",
    "与固定 Label 分离且同一位置会被运行时进度替换"
  ],
  "needsLayerName": true,
  "suggestedName": "文案/recharge/current-target",
  "confidence": 0.96,
  "evidence": [
    "位于充值进度区域",
    "数值位于进度条上方",
    "附近存在累计充值和阶段奖励文案",
    "current/target 结构符合运行时进度展示"
  ]
}
```

`semanticId` 是 naming plan 内部用于校验 Key 复用的稳定业务字段标识。相同业务字段使用相同值；无法确认是否同一字段时不要强行设成相同值。

## 动态性与命名必要性

严格按顺序判断 `isDynamic`、`dynamicEvidence`、`needsLayerName`，最后才生成 Key。运行时会变化只说明 `isDynamic: true`；只有 Figma 图层名是独立 text key 或自定义代码绑定入口时，才设为 `needsLayerName: true`。

标准活动组件已经拥有的数据字段设为 `needsLayerName: false`，不生成 `suggestedName`，并保留设计稿原图层名。已验证的典型字段包括：

- 奖励卡、奖励详情、奖励轮播、累计进度中的道具名称；它们来自 props/reward metadata；
- 奖励数量、单位和时长；它们来自接口字段、组件配置或 `$getPropUnit` 一类组件逻辑；
- 标准列表组件内部由一条业务数据循环渲染的字段，前提是组件关系或明确标注能证明该所有权。

`{{}}`、`xxx`、数字、跨实例取值不同、变量绑定和重复结构只能支持动态性判断，不能单独证明需要修改图层名。无法证明绑定入口时降低置信度或设为 `needsLayerName: false`，不要用 `文案/...` 重命名组件内部数据槽。

## 实际文案清单

用户提供 `{ key, value }` 文案清单时，它是下游真实绑定合同，也是本次自动命名的 allowlist。先解析每个富文本 `value`，保留可见文字、`{{}}` 的数量与顺序、换行、HTML 实体和 styled segments，再与 Figma 节点整批比对。

匹配项必须增加：

```json
{
  "sourceKey": "recharge/consume-progress",
  "semanticId": "recharge/consume-progress",
  "suggestedName": "文案/recharge/consume-progress"
}
```

- `sourceKey` 必须逐字来自清单；名称必须逐字等于 `文案/${sourceKey}`。
- 禁止把源 key 翻译、纠错、改单复数、删数字或按生成名称规范“优化”。例如 `member/vip-open-chances`、`ring/open-count-01` 和 `txt/lottery` 都必须原样保留。
- 清单未匹配的节点不自动生成名称，设为 `needsLayerName: false` 并 `skip`。因此固定标题、导航、规则、活动时间和说明文案不会仅凭页面语义获得新 key。
- 同一个可见字符串或占位符模板对应多个 key 时，文本相似不构成唯一匹配。必须结合完整 HTML/style、当前已验证名称、组件位置或明确标注；仍有多个候选时 `confirm`。
- 清单可用于确定 key，不能用来扩大 Figma 扫描范围，也不代表用户授权上传或修改 Page Center。

只有用户没有提供实际文案清单时，才按页面语义生成新的 canonical key。源 key 与生成 key 使用不同校验合同：源 key 服从外部系统现状；生成 key 服从下方“名称格式”。

## 证据而非规则库

文本形态只作为证据，不直接决定结果：

- `xxx`、`XX`：很强的动态信号，但不证明业务域和字段语义；
- `0/20`、`22500/550000`：中等动态信号，需结合区域和视觉角色；
- `02:13:45`：中高动态信号，仍需区分倒计时、时刻或时长；
- `100`、昵称、金额：很弱的动态信号，可能只是固定示例；
- 固定标题、说明、按钮文案：弱或反向动态信号。

字符串变量绑定、组件文本属性、重复列表字段和明确动态标注可以增强证据。颜色、字号、节点 ID、坐标、区域序号不能单独证明动态性或命名语义。

禁止在程序中实现 `text.includes('xxx')`、占位符即动态、数字即进度等硬编码。不要建立 `looksLikeProgress()`、`looksLikeBalance()`、`looksLikeRank()` 一类不断增长的场景函数。业务示例只用于 few-shot，不是封闭分类体系。

## 单一置信度

`confidence` 只存在于通过动态候选门槛且 `needsLayerName: true` 的节点，取值 `0` 到 `1`，表示以下完整判断同时正确的把握：

1. 节点是否为运行时动态文本；
2. 节点是否需要用 Figma 图层名承载绑定 Key；
3. 节点属于哪个业务区域；
4. `business-domain` 是否准确；
5. `semantic-key` 是否准确；
6. 建议名称是否唯一且与其他字段无冲突。
7. 如果使用预览切图对照，对应关系与差集结论是否可靠。

必须分别提供非空 `dynamicEvidence` 和 `evidence`。前者只证明运行时变化，后者支撑命名必要性和具体 Key。不能因为能理解一句固定文案，就把它标成动态或赋予高命名置信度。

阈值固定为：

- `confidence >= 0.90`：高置信，校验通过后可自动命名；
- `0.70 <= confidence < 0.90`：待确认，可保留推荐名称但不写入；
- `confidence < 0.70`：跳过，不写入猜测名称；
- `isDynamic: false`：无论置信度多高都不命名。
- `needsLayerName: false`：无论内容是否动态都不生成建议名称或命名。

`0.90` 和 `0.70` 分别属于高置信和待确认区间。

## 名称格式

`business-domain` 表示稳定业务对象或功能模块，`semantic-key` 表示字段核心含义、状态或动作。

- 固定使用 `文案/` 前缀并且恰好包含两个 `/`；
- 两段各使用一至两个完整的小写英文单词；
- 两个单词之间使用一个连字符；
- 禁止下划线、camelCase、大写、缩写、无语义数字、节点 ID、坐标和区域编号；
- 禁止 `text`、`value`、`block`、`section`、`panel`、`tab`、`page` 等弱业务域；
- 禁止 `text`、`value`、`info`、`block`、`section`、`panel` 等弱字段名。

格式正确不表示语义正确。当前名称符合格式时仍要根据页面语义地图复核；证据充分且一致才 `keep`。

本节只约束无文案清单时生成的新 key，不得用于拒绝或改写清单中的实际 source key。

## Few-shot 词义示例

这些例子展示命名质量，不构成场景枚举：

```text
文案/task/completed-total
文案/recharge/current-target
文案/ranking/current-rank
文案/round/countdown
文案/chip/balance
文案/level/remaining-time
文案/reward/claim-failure
```

数量通常用 `count`，余额用 `balance`，剩余用 `remaining`，排名用 `rank`。时间字段应按真实含义选择 `duration`、`countdown`、`remaining-time`、`start-time` 或 `end-time`。这些词义偏好不能代替页面证据。

名称只保留稳定核心语义，不逐句翻译。删除业务域已经表达的重复词；仍有多个合理名称时降低置信度并留待确认，不机械截断或缩写。

## Key 复用与冲突

相同业务字段可复用完全相同的名称，并使用相同 `semanticId`。同一个建议名称对应不同 `semanticId`、缺失 `semanticId` 或已有其他业务字段占用时，全部冲突项进入 `confirm`。

不得追加节点 ID、Frame 编号、坐标、扫描顺序或无语义数字解决冲突。只有页面、区域、具名祖先或组件语义证明使用场景稳定不同，才可使用双词业务域区分，例如 `voice-ranking`。

旧的 `<business-domain>/<semantic-key>` 两段式名称不能 `keep`。只有完整页面证据支持时才迁移到带 `文案/` 前缀的新名称。

## 结果与修改边界

- `rename`：动态文本、置信度至少 `0.90`、名称与冲突校验通过，且当前名称不同；
- `keep`：同样满足高置信要求，且当前名称已经正确；
- `confirm`：置信度在 `[0.70, 0.90)`，或确定性校验发现缺名、格式错误或 Key 冲突；
- `skip`：置信度低于 `0.70`、`isDynamic` 为 `false`，或 `needsLayerName` 为 `false`。

只有 `rename` 写回 `node.name`。必须先完成整页 naming plan 和全量冲突校验，再统一写回并逐项回读。`keep`、`confirm` 和 `skip` 均不写入。

复核模式下，现有 `文案/...` 名称若不在本次清单中，不能 `keep`。若有本次或上一轮操作留下的可靠 `nodeId -> 修改前名称` 记录，可据此恢复误命名；没有可靠原名时列为 `confirm`，不得猜测原名或直接用 `characters` 覆盖。
