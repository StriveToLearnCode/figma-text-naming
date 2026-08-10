# Figma 动态文本初始化命名 Skill

`figma-text-naming` 先理解完整 Figma 页面，再批量识别动态文本并生成：

```text
文案/${business-domain}/${semantic-key}
```

执行分为两阶段：先用整页截图、完整节点树、全部 Text、位置关系和图层名称建立区域语义地图；再让每批 Text 携带同一份页面语义上下文生成完整 naming plan。不会逐 Text 调 AI，也不会在程序中用占位符、进度、余额或排名正则猜业务场景。

每个节点只使用一个最终命名置信度，并给出实际证据：

- `>= 0.90`：校验通过后自动命名；
- `0.70-0.89`：推荐但不写入；
- `< 0.70`：跳过。

确定性脚本只校验数据合同、阈值、名称格式、重复节点、重复 Key 和已有名称冲突。纯 Figma 信息不足时保留待确认项，不为实现全覆盖编造名称。

## 本地校验

```bash
node scripts/validate-dynamic-text-name.mjs '文案/recharge/current-target'
node scripts/validate-naming-plan.mjs naming-plan.json
node --test tests/*.test.mjs
```
