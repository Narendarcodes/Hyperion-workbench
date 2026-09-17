# Agent Note: Hyperion Mission View living office simulation and reactive projection

Status: implemented

English

## Problem

The previous Mission View was an unpopulated dark blueprint floor plan that failed to visually convey an active autonomous AI workforce. Specialist agents were tiny monochrome dots in vast empty rooms with no sense of life or role clarity. Mechanically, the conversation target pipeline had no registered node definitions to pass session events to the view builder, causing `replace` and `apply` to return an empty snapshot. When an event source was connected, omitting revision-based identity caching caused `useSyncExternalStoreWithSelector` to enter an infinite re-render loop that crashed the React render pass, leading `SlotErrorBoundary` to silently render an empty `<div data-slot-error="conversation.view" />` and leave the screen completely white.

## Decision

We designed and implemented `@deepseek-ai/dsh-client-ui-mission` as a first-class browser plugin in the `conversation.view` slot. Following the Hyperion Mission View Master Implementation Plan, the architecture refactors the mission model to strictly decouple Agent, Cabin, Task, Step, Activity, Location, and Visual State:

1. **Dynamic Agents & Dedicated Personal Cabins**: Agents are dynamic workers rather than fixed stations. Each spawned agent receives a unique, stable personal cabin (`cabin-1`, `cabin-2`, etc.) equipped with a private desk, monitor, office chair, and status indicator. Cabin task titles are dynamic, displaying the worker's current operational responsibility (e.g., "Pump Failure Analysis", "Inspection Report Review").
2. **Shared Collaborative Work Areas**: Specialized rooms (Documents, Knowledge Base, Analysis, Tools/Code, Testing, Verification, Report/Delivery, Orchestrator) serve as shared destinations rather than permanent homes. Each shared area features multiple predefined seats (Seat A, Seat B, Seat C) with deterministic seat allocation to prevent worker collision and overlap.
3. **Multi-Step Real-Execution Workflows**: A single specialist can execute multi-step workflows (e.g., Cabin → Knowledge Base → Code → Testing → Verification → Orchestrator → Cabin) without mutating its identity or fabricating multiple agents. Tool calls dynamically map to activities and target locations while preserving stable worker identifiers.
4. **Deterministic Visual Simulation**: RAF movement interpolation guides workers along safe floor corridors between cabins, shared rooms, and the elevated orchestrator dais. Cold replay and incremental live event streams produce byte-identical snapshots and visual states.

## Alternatives considered

- **Permanent six-agent department layout** — rejected per master plan. A real mission dynamically scales from 1 to N agents; fixing six permanent departments conflated worker identity with shared work areas.
- **Timer-driven ambient wandering** — rejected. All visual movement is strictly derived from canonical session event state transitions to guarantee replay determinism.
- **Single-seat shared work stations** — rejected. Multiple concurrent workers targeting the same capability (e.g. searching the Knowledge Base) require distinct seats to prevent spatial overlap.

## Consequences

The Mission View visualizes autonomous AI workforce execution with 3–5 second visual comprehension. The living pixel-art office reflects active work, speech bubbles, verification checkpoints, and deliverables. All 30 tests across 7 test files pass, client typechecking compiles with zero diagnostics, Oxlint passes cleanly, and tsdown bundles the production client artifact.
