# 双岛农民角色接入验收

本轮使用用户提供的原始模型、原贴图、UV、权重和五段骨骼动画。ZIP 与两份 blend 均未修改，也未加入 Git。`source-manifest.json` 的 14 项 SHA-256 校验全部通过。

## 已接入

- 两岛各 10 套服装，按实体 ID 与 country 稳定派生；不调用玩法 RNG，不改存档 v5。
- 原头型 01、原脸部、4 种无帽发型、3 种帽子配专用帽内头发。
- 成年与儿童沿用 .65 / .4 的尺寸比例。士兵、返乡、成年变化复用同一角色实例。
- 农耕居民部分携带原镰刀或篮筐；畜牧居民部分携带篮筐；民兵使用原锤。工具绑定 RigRPalm；儿童与病人无工具。
- Idle、原地 Walk、原地 Run；世界模拟时间驱动，.16 秒交叉淡化，稳定相位，暂停不推进。
- 交战只在真实攻击事件发生时触发跑步占位与命中反馈，伤害、冷却、灵魂结算不变。
- **没有新增真实收割、挥锤、受伤或死亡动画。劳作和战斗使用已有走路／跑步作为替代。**
- 原 sheep 与 undead 模型、岛屿场景和卡牌 UI 保留。

素材使用与未启用对象见 `../../game/assets/characters/peasants/mapping.json`。头型 02 无专门匹配面部；双手耙子、镐没有合适握姿；木料、陶罐没有当前用途，已导出但不启用。斧头不在本包清晰命名的可用物件中，民兵使用原锤。

## 导出与复查

Blender 5.2.3 LTS，在内存中操作副本，原 blend 不写回。隐藏部件最初的百倍尺寸是依赖图未刷新的结果；启用集合并刷新后，继承的 .01 单位比例正确，因此没有额外缩放或破坏权重。

```sh
/Applications/Blender.app/Contents/MacOS/Blender -b '/素材目录/农耕岛_麦田暖色.blend' --python 整理输出/scripts/characters/export.py -- "$PWD/整理输出/game/assets/characters/peasants"
/Applications/Blender.app/Contents/MacOS/Blender -b '/素材目录/畜牧岛_雾蓝冷色.blend' --python 整理输出/scripts/characters/export.py -- "$PWD/整理输出/game/assets/characters/peasants"
/Applications/Blender.app/Contents/MacOS/Blender -b --python 整理输出/scripts/characters/verify.py -- "$PWD/整理输出/game/assets/characters/peasants/farming.glb" /tmp/farming-verification.json
```

两份 GLB 回读：40 骨骼、10 套服装、5 段动画；所有换装首／中／末帧包围盒正常。源动作的 `/ Root` 通道保存在 faction-source.json；有位移动作保留为可选资源，游戏不使用。原头发 MixRGB 乘色转换为同值的 glTF baseColorFactor，避免导出后变灰。

## 验证

- `npm test`：40 项通过。
- `npm run balance`：15 个固定种子／策略结果与接入前逐字节一致。
- `runtime.json`：独立骨架、暂停、出征不重建、成年切换、生病移除工具、真实命中、读档外观、连续重开资源稳定均通过；浏览器无报错。
- `wardrobe.png`、`farming-game.png`、`livestock-game.png` 为实际 Three.js 运行截图。
- `/character-preview.html` 可切换待机／劳作替代／出征替代、暂停和前后视角。
- `batch-pixel-comparison.json`：固定姿态的原分件渲染与优化后渲染对照。平均通道误差小于 0.001/255，差异集中于极少量光栅化边缘像素；未重绘或缩小原贴图。

## 性能与限制

`baseline.json` 与 `after.json` 为同机 Chromium Metal、1280×720、DPR 1、种子 12345、相同镜头的三组测试。预热 2 秒，每组采样至少 10 秒；锁住测试出生进度以保持 16／160 人一致。每次只运行一个测试页。基线角色来自提交 0d65955。

保持原纹理分辨率、模型面数、阴影质量与每帧骨骼更新；没有动画降频。实现了部件合并、同外观实例化、独立骨架的集中纹理上传；透明脸部保留独立排序。重开四次纹理资源数保持 40。两岛 GLB 各加载一次，公共资源在两 GLB 间仍有重复，单岛内共享。

**新蒙皮角色的满人口绘制仍比原方块人物更重，160 人并非所有场景都能达到 30 FPS。详细前后数据见 JSON；不宣称没有性能代价。手机真机尚未验收。**

可复测：先启动 5179 端口服务，使用已安装的 Playwright（或设置 PLAYWRIGHT_MODULE）运行：

```sh
node 整理输出/scripts/characters/benchmark.cjs /tmp/baseline.json baseline
node 整理输出/scripts/characters/benchmark.cjs /tmp/after.json
node 整理输出/scripts/characters/browser-check.cjs
```


本机最终采样（平均 FPS / P95 帧耗时）：

| 场景 | 原方块人物 | 新角色 |
|---|---|---|
| 16 人全景 | 46.9 / 33.5 ms | 47.1 / 33.7 ms |
| 160 人全景 | 49.6 / 33.4 ms | 16.2 / 83.3 ms |
| 160 人近景 | 30.2 / 50.1 ms | 18.5 / 67.3 ms |
