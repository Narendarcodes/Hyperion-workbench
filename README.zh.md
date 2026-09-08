# HYPERION

[English](README.md) | 中文

**Sovereign Intelligence for Industrial Work —— Intelligence That Stays On-Premise（智能不出内网）。**

HYPERION 是面向机密工业知识工作的**本地智能体 AI 工作台**（SIH 2026，SIH26117）。它在本地使用受控模型、证据支撑的知识、有边界的工具与人工核验来执行任务——源证据 → AI 分析 → 人工明确决策。开箱即用，不配置任何外部 API 密钥或端点。

构建于开源 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)（`dsh`）智能体运行时之上：**一切皆插件**架构，由 [Cordis](https://github.com/cordiverse/cordis) 驱动，其设计参见论文 [_A Programming Paradigm for Spatiotemporal Composability_](https://arxiv.org/abs/2608.25512)。HYPERION 是产品身份；DeepSeek Harness 仍是底层的开源组件。上游文档见 [https://deepseek-harness.github.io/deepseek-harness/](https://deepseek-harness.github.io/deepseek-harness/)。

## 开发者预览

HYPERION 处于 _开发者预览_ 阶段，正在快速迭代。**未来将出现破坏兼容性的变更。**

运行本项目前，请阅读[安全说明](SAFETY.zh.md)。

## 运行

### 前置条件

- `Node.js` 与 `pnpm`
- 本地模型服务：[llama.cpp](https://github.com/ggerganov/llama.cpp) `llama-server`，在 `http://127.0.0.1:8080/v1` 提供 OpenAI 兼容 API（已加载的任意 GGUF 都会被接受为默认模型）
- Windows 上需要 C++ 构建工具链（带 C++ 工作负载的 Visual Studio 生成工具），用于编译一个原生依赖

### 从源码运行

```sh
git clone https://github.com/Narendarcodes/deepseek-harness.git
cd deepseek-harness
pnpm install
pnpm run build --profile official
pnpm dsh web
```
`--profile official` 会把 HYPERION 品牌与标题构建进产物。该命令默认会在 `http://127.0.0.1:3080` 启动 Web UI，本机启动时还会用默认浏览器打开页面。传入 `--no-open` 可仅运行服务器而不打开浏览器。详见 [Web UI 指南](docs/user/guide/index.zh.md)。

运行任务前请先启动 `llama-server`；没有它，UI 可以打开，但模型调用无处可达。

## 社区与支持

- 上游反馈或 bug 报告请前往 [DeepSeek Harness GitHub Discussions](https://github.com/deepseek-ai/deepseek-harness/discussions)。
- 为你的插件仓库添加 [`dsh-plugin`](https://github.com/topics/dsh-plugin) 话题，便于被发现。

## 参与贡献

参见 [CONTRIBUTING.md](CONTRIBUTING.zh.md)。

## 开发

请先阅读[开发指南](docs/development.zh.md)与[架构文档](docs/architecture.zh.md)。

面向 agent：请遵循 [AGENTS.md](AGENTS.md)。

## 许可证

[MIT](LICENSE)

第三方依赖及其许可证见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。上游归属、版权与安全说明仍归 DeepSeek Harness 项目所有。
