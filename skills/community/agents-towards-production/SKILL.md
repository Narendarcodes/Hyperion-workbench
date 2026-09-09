---
name: agents-towards-production
description: Production-readiness audit checklist distilled from NirDiamant/agents-towards-production (the "open-source playbook for turning prototypes into real-world products"). Use PROACTIVELY when asked to confirm a project is production-ready, run a production-readiness audit, harden a service for deployment, or review security/observability/evaluation/deployment perspectives of an application. Applies the repo's core pillars - security guardrails, observability, evaluation, deployment, and human-in-the-loop safety - to any backend/service codebase.
---

# Agents Towards Production — Production-Readiness Audit

This skill distills the production-readiness philosophy of the
`NirDiamant/agents-towards-production` repo (28 production-grade tutorials across
security, observability, evaluation, deployment, memory, and orchestration) into a
concrete audit the agent can run against a codebase. Use it to confirm a project is
"production ready in all perspectives."

## Core Pillars (from the repo)

### 1. Security Guardrails (repo: agent-security-*)
- **Input validation** — every external entry point validates and rejects malformed/malicious input before processing (schema validation, size limits, type checks).
- **Output sanitization** — never echo raw user input back into responses/logs/HTML; sanitize before persistence and before responding.
- **Tool/action access control** — least-privilege: every sensitive action is gated by explicit authorization (RBAC/permissions), never reachable by default.
- **Multi-layer defense** — layered controls (rate limiting, authn → authz → validation → action), not single points of defense.
- **Context isolation** — separate untrusted user data from trusted system data; never let user-controlled strings influence query/path/command construction (injection defense).
- **Secret hygiene** — no secrets in code or config; env-injected secrets, rotation, and never logged.

### 2. Observability (repo: tracing-with-langsmith)
- **Tracing** — requests are traceable end-to-end (request id / correlation id through logs).
- **Structured logging** — machine-parseable logs with request metadata, timestamps, levels; never log secrets/tokens/passwords.
- **Metrics** — key SLIs instrumented (latency, error rate, throughput, DB health); alerting hooks exist for errors and latency.
- **Decision visibility** — state transitions and domain events are logged/auditable (who did what, when) so behavior can be reviewed and regressions caught.
- **Incident response** — health endpoint, graceful failure, and a way to detect outages fast.

### 3. Evaluation (repo: agent-evaluation-intellagent)
- **Automated tests** cover happy path AND failure/security paths (unauthorized access, invalid input, state-machine violations).
- **Behavioral/security evaluation** — tests assert not just "works" but "cannot be abused" (outsider 403s, missing permissions, injection attempts).
- **Continuous evaluation in CI** — tests + lint + build run on every PR; regressions block merge.

### 4. Deployment (repo: docker-intro, runpod-gpu-deploy, aws_agentcore)
- **Containerized** — reproducible Docker image, multi-stage, non-root user, minimal footprint, pinned base image.
- **12-factor config** — config via environment, no hardcoded values, `.env.example` documents all vars.
- **Orchestration** — compose/manifest defines services + persistent volumes + health checks; secrets via env/secret manager, not baked in.
- **CI/CD pipeline** — automated build, test, lint, and security/dependency scan on push/PR.
- **Graceful shutdown** — handles SIGTERM, closes connections, drains work.

### 5. Human-in-the-Loop / Safety (repo: arcade-secure-tool-calling)
- **Sensitive/irreversible operations require explicit approval** — e.g., publishing/approving content requires a user with elevated permission, not implicit.
- **Audit trail** — approvals, rejections, and state changes are recorded and attributable.

## Audit Procedure

Run this checklist against the target codebase and report per-perspective status
(PASS / PARTIAL / FAIL + evidence + fix). Do not declare production-ready until each
pillar has evidence in code.

1. **Security** — authn (tokens, password hashing, refresh rotation), authz (RBAC, org-scoping, permission checks on every sensitive route), validation (Joi/schema on all inputs), rate limiting, headers (helmet), secrets (no defaults in prod path), file-upload safety (size, type, path traversal, storage isolation).
2. **Observability** — structured logger, request logging, domain-event/audit logging, health endpoint, no secret leakage in logs, metrics/tracing hooks present or documented gap.
3. **Evaluation** — test suites for auth, authorization, workflows, health; tests cover negative paths; CI runs tests+lint; coverage noted.
4. **Deployment** — Dockerfile (non-root, multi-stage, pinned), compose (volumes, healthcheck, env), .env.example complete, CI workflow, graceful shutdown, dependency lockfile.
5. **Safety/Governance** — sensitive transitions require elevated permission; audit trail via events/activity log; no action auto-approves itself.

## Output Format

Deliver a verdict per pillar with evidence (file:line references) and any
recommended fixes. End with an overall verdict: PRODUCTION READY / CONDITIONALLY
READY (with list of must-fix items) / NOT READY.

## Source
Distilled from https://github.com/NirDiamant/agents-towards-production (GenAI
agent production playbook). Principles generalized here for any backend service.
