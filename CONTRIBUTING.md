# Contributing to Hyperion Workbench

Thank you for your interest in contributing to **Hyperion Workbench** — the sovereign industrial AI workbench for confidential knowledge work.

We welcome contributions across all areas: core plugin architecture, local model integrations, Indic language ASR models, explainable AI trajectory visualizers, and tool runtime safety.

---

## Code of Conduct

We are committed to providing a welcoming, inclusive, and harassment-free experience for everyone. Please be respectful, constructive, and collaborative in all discussions and pull requests.

---

## Getting Started

1. **Fork and clone the repository**:
   ```sh
   git clone https://github.com/Narendarcodes/Hyperion-workbench.git
   cd Hyperion-workbench
   ```

2. **Install dependencies**:
   ```sh
   pnpm install
   ```

3. **Run local builds and typecheck**:
   ```sh
   pnpm run build
   pnpm run typecheck
   ```

4. **Run the Workbench locally**:
   ```sh
   pnpm dsh web
   ```

---

## Development Workflow

- **Branching**: Create a focused feature branch for your changes:
  ```sh
  git checkout -b feat/your-feature-name
  ```
- **Testing**: Ensure all tests pass before submitting a PR:
  ```sh
  pnpm run test
  ```
- **Code Quality**: Follow strict TypeScript typing and the Cordis plugin lifecycle conventions.
- **Pre-push hooks**: Ensure `lefthook` validation checks pass cleanly.

---

## Submitting Pull Requests

1. Push your branch to GitHub.
2. Open a Pull Request with a clear description of the problem solved, architectural decisions, and verification evidence.
3. Provide screenshots or recordings for any user-facing UI changes.

Thank you for helping build sovereign, private, and powerful industrial AI!
