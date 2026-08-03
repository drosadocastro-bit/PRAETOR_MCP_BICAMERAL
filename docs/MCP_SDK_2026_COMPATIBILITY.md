# MCP SDK 2.0.0 Compatibility Probe

## Scope

This probe runs on the isolated `mcp-2026-07-28-compat-shadow` branch. It upgrades the TypeScript MCP SDK packages from `2.0.0-beta.5` to exact `2.0.0` without changing the authoritative application safety model.

The current local stdio path remains authoritative. The probe does not enable HTTP, stateless transport migration, Tasks, MRTR, authorization, or shadow writes.

## Result

The existing implementation is source-compatible with the stable SDK in the tested scope:

- TypeScript check passed;
- shadow-mode tests passed;
- real MCP stdio smoke test passed;
- ReviewAgent stdio integration passed;
- full regression suite passed on the compatibility branch.

The SDK upgrade did not require application-code changes in the tested path. This is compatibility evidence, not a production migration approval.

## Safety interpretation

The stable SDK does not replace PRAETOR's application-level controls. Runtime session identity, bounded attempts, provenance validation, quarantine, review-only writes, and human review remain explicit host responsibilities.

No fallback is configured between SDK versions. Any future transport migration must be a separate experiment with read-only probes first, and all write paths must remain disabled until independently reviewed.

## Remaining limitations

This probe does not establish compatibility for the 2026-07-28 stateless HTTP transport, Multi Round-Trip Requests, header-based routing, cache hints, Tasks, or authorization changes. It also does not prove semantic or operational safety.