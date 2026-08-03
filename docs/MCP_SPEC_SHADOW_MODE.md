# MCP 2026-07-28 Shadow Mode

## Purpose

PRAETOR may observe the 2026-07-28 MCP request model without changing the current authoritative local stdio path. This is a compatibility experiment, not a protocol migration.

## Boundary

The current MCP SDK and transport remain authoritative. Shadow mode:

- builds a self-describing `2026-07-28` `tools/call` envelope;
- preserves tool name, arguments, session ID, trace ID, and client metadata;
- compares normalized result shapes when a read-only probe result is supplied;
- records mismatches as observations only.

Shadow mode must not:

- execute a second authoritative call;
- submit or persist a second advisory packet;
- retry a denied action;
- alter the authoritative result;
- bypass `AgentKRuntime`, bounded attempts, provenance checks, quarantine, or human review;
- run for `submit` or write actions.

## Read versus write

Read-only retrieval calls may be compared in a future probe because they have no write authority. Submission and write calls are categorically excluded. The current implementation records `shadow_allowed: false` for those actions even if a caller supplies a proposed shadow result.

## Interpretation

A matching result shape does not establish protocol equivalence, semantic equivalence, safety, or production readiness. A mismatch is an audit observation and must not trigger fallback or automatic behavior change.

The shadow harness is local and deterministic. It does not yet instantiate the new SDK or make HTTP requests. A future SDK compatibility test must remain behind this same boundary and must prove that the shadow path cannot invoke writes or bypass the authoritative runtime.
