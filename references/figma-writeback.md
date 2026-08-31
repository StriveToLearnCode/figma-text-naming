# Figma 写回与复核

本文件只用于 `apply / repair`。执行前必须加载 `figma:figma-use` 并按其要求读取必要 API 参考；使用 `use_figma` 时，`skillNames` 包含 `figma-use`。

## 1. 写回规则

1. 按 `nodeId` 精确定位 Text，不按旧名称或文案内容模糊搜索。
2. 每批最多重命名 10 个 Text；跨 Scope 分别调用，并按 Figma Skill 规则并行执行。
3. 只修改 `node.name`，不得修改 `characters`、位置、尺寸、可见性、锁定、样式、布局、组件关系、Variable、property、binding 或其他数据。
4. `changes` 只包含已经完成判断、生成目标名称且允许写回的 `rename`；`keep / skip / confirm` 不进入写入列表。
5. 当前名称与目标名称相同时不重复写入，计为 `keep`。
6. 每批返回全部 `mutatedNodeIds`、成功映射、跳过项和错误。
7. 任一调用报错时停止当前批次，读取错误后修正；失败调用按原子操作处理，不假设存在部分写入。
8. `repair` 只写入能够确定正确目标名称的历史误命名；无法判断时保持原名称并报告。

写入前同时校验 `oldName` 和 `originalCharacters`，避免分析后节点已经变化却继续覆盖。

## 2. 推荐写入形态

```js
const changes = [
  {
    id: "1:2",
    oldName: "旧名称",
    nodeId: "1:2",
    newName: "文案/task/description",
    key: "task/description",
    originalCharacters: "إرسال هدية XXX N مرة",
    value: '<span style="...">إرسال هدية رة<br>{{}} {{}} مرة</span>',
  },
];

const applied = [];
const skipped = [];

for (const change of changes) {
  const node = await figma.getNodeByIdAsync(change.id);

  if (!node || node.type !== "TEXT") {
    skipped.push({ ...change, reason: "node-not-found-or-not-text" });
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

## 3. 写回后复核

重新读取本次 Scope 内全部已审核 Text，而不只读取 `mutatedNodeIds`，并复用分析阶段的同一套规则校验：

- `node.name === targetName`
- `node.characters === originalCharacters`
- 名称格式、业务域和 semantic-key 符合 [命名规范](naming-standard.md)
- 没有使用位置、当前数值、节点 ID 或弱语义生成名称
- 相同语义的复用和样式技术后缀仍然正确
- Scope 内每个 Text 仍对应唯一的 `rename / keep / skip / confirm`
- `skip / confirm` 中已有的 `文案/...` 名称也已完成合规检查

复核数据按 `nodeId` 与写回前缓存合并；富文本数据的覆盖限制见 [富文本数据](rich-text-value.md)。

最终报告成功数量、跳过或失败数量及原因，并给出可用于回滚的 `old -> new` 清单。
