# Evidence Comparison Experiment Contract

## Decision

This document authorizes only a bounded, pure comparison-kernel experiment. It does not authorize a second MCP agent, network access, tool access, storage, packet submission, maintenance advice, or operational decisions.

## Role

The comparison kernel may compare already-retrieved synthetic evidence for consistency, contradiction, provenance completeness, and source independence. It may identify unresolved disagreement or repeated lineage.

It must not retrieve evidence, select authoritative evidence, diagnose equipment, determine safety status, authorize maintenance, create work orders, or submit advisory packets.

## Input contract

Inputs are caller-supplied `EvidenceItem` values that retain:

- source ID and source type;
- timestamp;
- excerpt;
- provenance metadata;
- uncertainty notes;
- independence group;
- optional assessment;
- optional derived-source and upstream-assumption links.

Evidence with missing source ID, source type, timestamp, provenance, or independence group is structurally incomplete. The kernel must flag it and must not describe the comparison as trusted.

`CHAT_CLAIM`, `MODEL_INFERENCE`, and `UNKNOWN` origins are not authorized source evidence. They may be reported as disallowed inputs, but they cannot support a comparison conclusion.

## Output contract

The result is an untrusted comparison analysis with:

- `status`: `compared` or `refused`;
- `confidence`: bounded at or below `0.49`;
- `human_review_required: true`;
- `authoritative: false`;
- contradiction, provenance, independence, circularity, and mission-drift flags;
- source IDs and independence groups only as traceable references;
- no operational recommendation or safety claim.

A refusal is required when there is no authorized evidence, provenance is incomplete, or the input contains mission-drift language that attempts to turn comparison into authority.

## Runtime and handoff boundary

The experiment is a pure function. It receives no `RuntimeToolInvoker`, raw MCP client, `ToolGateway`, storage handle, callback, or network capability. ReviewAgent must treat its result as untrusted analysis and never as independent corroboration.

A blocked or refused comparison has no alternate normal-result path. Human review remains required for every result, including `compared` results.

## Handoff contract

The approved handoff shape is `untrusted_comparison_analysis`. It is a separate envelope, not an `EvidenceItem` and not an advisory packet field. It must preserve:

- `authoritative: false`;
- `independent_corroboration: false`;
- `human_review_required: true`;
- confidence at or below `0.49`;
- source IDs, independence groups, and flags as traceable metadata only.

The runtime validator rejects forged or malformed handoffs. The bounded ReviewAgent path consumes this envelope only as metadata for the existing evidence-boundary review; it does not place the envelope in `supporting_evidence`, submit it as evidence, or treat it as independent corroboration.

## Acceptance gates

The experiment remains NO-GO for agent integration until tests demonstrate:

1. contradictory assessments are flagged;
2. duplicate or derived lineage is not counted as independent corroboration;
3. missing provenance causes refusal or an untrusted result;
4. chat/model/unknown origins cannot become authorized evidence;
5. authority laundering and operational claims are refused;
6. normal output remains non-authoritative and human-review-bound;
7. malformed or oversized inputs do not create unbounded work.
8. handoff envelopes cannot launder comparison analysis into evidence, authority, or independent corroboration.

## Explicit non-claims

Passing this kernel's tests will not establish semantic truth, equipment condition, safety status, root cause, maintenance need, or production readiness. It will establish only deterministic behavior for the tested synthetic input boundary.
