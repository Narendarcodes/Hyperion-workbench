# @deepseek-ai/dsh-llm-router

This package provides a Universal Automatic LLM Model Router for the project.

## Summary

The router receives an arbitrary natural language task and automatically selects the most appropriate model based on statically registered model capabilities, without inventing an orchestration workflow or agent topology.

It operates in three steps:
1. **Laya Task Characterization**: It spawns a persistent Python daemon (`laya_daemon.py`) using the fast non-autoregressive `laya` package. Laya categorizes the task by its type (coding, reasoning, creative, qa), complexity, and tool requirements in a single sub-35ms forward pass.
2. **Task Requirements**: The outputs from Laya form a requirement vector.
3. **Static Model Registry & Policy Scoring**: The router filters ineligible models (e.g., context window constraints or tool limitations) and scores the eligible models based on their hardcoded capability vector and cost profile. The highest scoring model is selected.

## Integration

Any LLM request in the system (e.g. `ReactLoopAgent`) can route a prompt through this package before finalizing its call configuration:

```typescript
import { UniversalModelRouter } from '@deepseek-ai/dsh-llm-router';

const router = new UniversalModelRouter();
const decision = await router.route(promptText);

config = {
  ...proposedConfig,
  provider: decision.selectedModel.provider,
  model: decision.selectedModel.id,
}
```

## Setup

The router requires `laya` to be installed in the project's Python environment:
```bash
python -m pip install laya
```

## What This Does NOT Do

This is strictly a **Model Router**. It does not perform:
- Automatic capability discovery of models via the internet.
- Learned routing or reinforcement learning.
- Task decomposition.
- Multi-agent workflow generation or agent orchestration.

These responsibilities, if needed, should be handled by orchestrators upstream of the router.

## Testing and Evaluation

Run the unit tests via `vitest`:
```bash
pnpm vitest run tests/router.spec.ts
```

Run the benchmark dataset to evaluate routing decisions:
```bash
pnpm tsx scripts/benchmark.ts
```
