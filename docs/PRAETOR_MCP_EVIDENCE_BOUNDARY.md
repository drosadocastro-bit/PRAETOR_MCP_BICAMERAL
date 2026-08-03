# PRAETOR-MCP Evidence Boundary

## Purpose

The Cortex-inspired Evidence Boundary Layer is a deterministic review boundary for proposed advisory answers. It helps prevent chat-provided claims or model inferences from being presented as MCP-verified evidence.

The layer is Praetor-native and uses no UAP-specific behavior. It is local, synthetic, advisory-only, and human-reviewed.

## Evidence origins

The gate keeps these origins distinct:

- `MCP_RETRIEVED`: evidence returned by the Praetor MCP server.
- `TOOL_RETRIEVED`: evidence returned by an explicitly authorized tool.
- `CHAT_CLAIM`: text supplied by the user or host prompt. It is an external claim, not verified evidence.
- `MODEL_INFERENCE`: a draft conclusion produced by a model. It is not evidence.
- `UNKNOWN`: an origin that cannot be established.

Only `MCP_RETRIEVED` and `TOOL_RETRIEVED` items can support a claim as authorized retrieved context. Matching words do not promote a chat claim, model inference, or unknown artifact into evidence.

## Host integration boundary

An MCP server cannot inspect arbitrary host chat text implicitly. The host or client must explicitly pass the user prompt, retrieved context, and optional draft answer to `evaluate_evidence_boundary`.

The tool evaluates the supplied material; it does not claim to intercept, observe, or validate messages that were not passed to it.

## Decisions

The deterministic gate can return:

- `allow`: no boundary violation was detected in the supplied inputs.
- `revise_with_boundary`: the answer may continue only with explicit claim and uncertainty boundaries.
- `refuse_evidence_based_answer`: the requested high-risk conclusion crosses an unsafe evidence boundary.
- `request_authorized_ingestion`: a cited or required source is absent from authorized retrieved context.
- `recommend_audit_log_only`: audit language was requested, but no actual audit sink call can substantiate that logging occurred.

High-risk domains include medical, legal, financial, aviation, safety, and maintenance-critical reasoning. Missing authorized evidence and unsafe inferences are handled more strictly in those domains.

## Audit honesty

A boundary result may recommend an audit event, but that recommendation is not an event record. Praetor must not say that Agent K logged an event unless a real logging capability was available and was called successfully. The default local sink persists successful events as bounded JSONL under `data/audit-events.ndjson`.

The result distinguishes:

- `shouldLog`: a deterministic recommendation that a boundary event merits logging;
- `eventLogged`: whether the configured sink append completed successfully.

When the sink is unavailable or the append fails, the result returns `eventLogged: false` and `reason: "No audit-event sink available"`. It does not make a false claim that the event was persisted.

## Scope

The gate reviews evidence provenance and answer boundaries. It does not diagnose conditions, determine equipment safety, authorize maintenance, create work orders, or replace qualified human judgment.
