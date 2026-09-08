# HYPERION

English | [中文](README.zh.md)

**Sovereign Intelligence for Industrial Work — Intelligence That Stays On-Premise.**

HYPERION is an **On-Premise Agentic AI Workbench** for confidential industrial knowledge work (SIH 2026, SIH26117). It runs tasks locally with controlled models, evidence-backed knowledge, bounded tools, and human verification — source evidence → AI analysis → explicit human decision. No external API key or endpoint is configured out of the box.

Built on the open-source [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) (`dsh`) agent runtime: an **everything-is-a-plugin** architecture powered by [Cordis](https://github.com/cordiverse/cordis), whose design is described in [_A Programming Paradigm for Spatiotemporal Composability_](https://arxiv.org/abs/2608.25512). HYPERION is the product identity; DeepSeek Harness remains the underlying open-source component. Upstream documentation lives at [https://deepseek-harness.github.io/deepseek-harness/](https://deepseek-harness.github.io/deepseek-harness/).

## Developer preview

HYPERION is in _developer preview_ and iterating rapidly. **THERE WILL BE COMPATIBILITY-BREAKING CHANGES.**

Review the [safety notice](SAFETY.md) before running the project.

## Run

### Prerequisites

- `Node.js` and `pnpm`
- A local model server: [llama.cpp](https://github.com/ggerganov/llama.cpp) `llama-server` serving an OpenAI-compatible API at `http://127.0.0.1:8080/v1` (any loaded GGUF is accepted as the default model)
- On Windows, a C++ build toolchain (Visual Studio Build Tools with the C++ workload) for one native dependency

### Run from source

```sh
git clone https://github.com/Narendarcodes/hyperion-workbench.git
cd hyperion-workbench
pnpm install
pnpm run build --profile official
pnpm dsh web
```

`--profile official` bakes in the HYPERION brand and title. The command starts the Web UI at `http://127.0.0.1:3080` by default and opens it in the default browser for a local launch. Pass `--no-open` to run the server without opening a browser. See [Web UI guide](docs/user/guide/index.md).

Start your `llama-server` before running tasks; without it the UI loads but model calls have nothing to reach.

## Community and support

- Upstream feedback or bug reports belong at [DeepSeek Harness GitHub Discussions](https://github.com/deepseek-ai/deepseek-harness/discussions).
- Add the [`dsh-plugin`](https://github.com/topics/dsh-plugin) topic to your plugin repository for discoverability.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## Development

Start with the [development guide](docs/development.md) and [architecture documentation](docs/architecture.md).

For agents, follow [AGENTS.md](AGENTS.md).

## License

[MIT](LICENSE)

Third-party dependencies and their licenses are disclosed in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). Upstream attribution, copyright, and safety notices remain with the DeepSeek Harness project.
