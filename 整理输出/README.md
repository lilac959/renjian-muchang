# HTML 开发目录

从仓库根目录或本目录运行 `npm run dev`，浏览器打开终端显示的本机地址。源码直接提供服务，不需要构建步骤。

- `game/`：HTML、样式、Three.js场景与DOM界面、模拟引擎和运行配置。
- `scripts/serve.mjs`：仅监听127.0.0.1的本地预览服务，支持 `PORT` 环境变量。
- `scripts/sync_config.py`：Excel校验与JSON原子同步。
- `scripts/balance.mjs`：固定种子的300秒真实模拟，输出 `reports/core-balance.json`。
- `tests/`：模拟规则与配置导入回归测试。
- `配置表/`：策划维护工作簿及字段目录。
- `reports/`：当前实现与验证记录。
- `design/`、`skills/`：美术参考源文件；三神定稿已复制到game/assets/ui用于运行。

规则以本目录的 [核心循环策划案](神明也疯狂·手机版策划案（核心循环版）.md) 为准。开发与操作说明见 [仓库说明](../README.md)。
