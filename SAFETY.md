# Safety Notice

## Experimental status

**Hyperion Workbench** is experimental developer-preview software built for research and evaluation under the Smart India Hackathon (SIH 2026).

The workbench executes model-generated code and commands within bounded local environments and tools. Incorrect model outputs, defects, misconfiguration, or untrusted plugins may modify or delete files, or cause unexpected system behaviors.

---

## Sandbox & Operational Security

1. **Air-gapped & On-Premise**: Default routes point exclusively to local model endpoints (e.g. `llama.cpp` / `Ollama`). Ensure network boundaries are configured to prevent outbound external requests for confidential industrial data.
2. **Bounded Tools**: Inspect tool parameters and terminal commands via the Explainable AI Trajectory Panel before execution.
3. **Local Backups**: Maintain backups of local project workspaces prior to running autonomous multi-step editing tasks.

---

## No Warranty or Liability

Use Hyperion Workbench at your own risk. The software is provided under the [MIT License](LICENSE) without warranty of any kind.
