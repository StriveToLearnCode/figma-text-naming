# Figma 动态文本初始化命名 Skill

`figma-text-naming` 先理解完整 Figma 页面，再批量识别动态文本。用户给出 Text Sync 或 Page Center 文案清单时，精确复用实际 key：

```text
文案/${source-key}
```

没有清单时才生成：

```text
文案/${business-domain}/${semantic-key}
```

执行分为四个阶段：先收集页面语义，再把完整预览与对应 `切图/...` 配对并找出前端叠加文字，然后独立判断运行时动态性，最后只为确实需要绑定入口的动态候选生成 naming plan。预览有、切图无只说明文字由前端叠加，不能单独证明动态；标题、导航、按钮、规则、说明、Label、固定日期和固定档位文案仍默认 static。每个候选必须提供独立的 `dynamicEvidence`。提供文案清单后，清单还是自动命名 allowlist，匹配的历史 key 原样保留。

每个节点只使用一个最终命名置信度，并给出实际证据：

- `>= 0.90`：校验通过后自动命名；
- `0.70-0.89`：推荐但不写入；
- `< 0.70`：跳过。

确定性脚本只校验数据合同、阈值、名称格式、重复节点、重复 Key 和已有名称冲突。纯 Figma 信息不足时保留待确认项，不为实现全覆盖编造名称。

## 本地校验

```bash
node scripts/validate-dynamic-text-name.mjs '文案/recharge/current-target' # 仅校验无清单时生成的新名称
node scripts/validate-naming-plan.mjs naming-plan.json
node --test tests/*.test.mjs
```
