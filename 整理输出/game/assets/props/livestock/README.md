# 牧业产物视觉素材

来源：美术交付 `wooden poker chips 3d model.zip`（2026-10-31）。
按模型实际外观拆分为 `meat`、`wool`、`bone` 三个节点；不包含羊模型或羊的动作。

- 总计 839 个三角面，共用一个材质和原始 2048×2048 颜色贴图。
- 每组物品水平最大尺寸归一为 1，中心位于底部，导出 GLB。
- 保留原始 UV 和贴图；粗糙度 0.9，金属度 0。
- `scripts/livestock/export.py` 接受解压后的 FBX 绝对路径，需连同 `.fbm` 贴图目录保存。
- 使用 Blender 后台运行：`blender -b --factory-startup --disable-autoexec --python 整理输出/scripts/livestock/export.py -- /absolute/path/model.fbx`。

运行时：畜牧岛有实际产出时，每累计 12 秒轮换一次羊毛和肉类加工（肉片及骨头）展示。效果持续 4 秒，使用模拟时间；不改变经济、随机数、存档或羊的数量。重新开始/读档会重置展示计时。羊毛位于围栏旁，肉片及骨头位于仓库旁。没有绑定人类死亡事件。

预览：`/validation/harvest.html`。这里可以独立查看三类模型和播放效果，不影响游戏存档。
