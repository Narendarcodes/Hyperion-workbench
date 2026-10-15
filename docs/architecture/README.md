# Architecture diagrams

Mermaid sources (`.mmd`) with SVG and PNG renders, embedded in the root [README](../../README.md) and [APPROACH.md](../../APPROACH.md).

| Diagram | Source |
|---|---|
| System context | [01-system-context.mmd](01-system-context.mmd) |
| Packages involved in the MRPL / RAG wiring | [02-components.mmd](02-components.mmd) |
| RAG query and abstention sequence | [03-rag-query-abstention.mmd](03-rag-query-abstention.mmd) |
| Start Investigation data flow | [04-start-investigation-flow.mmd](04-start-investigation-flow.mmd) |

Re-render after editing a source (mermaid-cli 11):

```sh
cd docs/architecture
for f in *.mmd; do
  b=${f%.mmd}
  npx -y @mermaid-js/mermaid-cli -i "$f" -o "$b.svg" -b white
  npx -y @mermaid-js/mermaid-cli -i "$f" -o "$b.png" -b white -w 1600 -s 2
done
```

The renders in this folder used the `default` theme with `fontSize: 15px`, `flowchart.htmlLabels: true` and `sequence.mirrorActors: false`.
