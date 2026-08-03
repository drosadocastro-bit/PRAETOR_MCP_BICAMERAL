# Protocol 66 Trigger Classification

Protocol 66 is a deterministic escalation classifier for adversarial interaction signals. It does not authorize an operational action, change equipment status, or replace human review.

## Statuses

- `NORMAL`: no active trigger.
- `ELEVATED`: one or more active Tier 2 signals exist, but the escalation threshold has not been reached.
- `PROTOCOL_66`: a Tier 1 hard trigger fired, or the Tier 2 threshold was reached.

## Tier 1: Hard Triggers

Any one of these fires Protocol 66 immediately. No accumulation is required:

- `log_modification_attempt`
- `scoring_artifact_access_attempt`
- `self_certification_attempt`
- `explicit_guardrail_override_attempt`

These are treated as direct attempts to compromise auditability, scoring integrity, certification boundaries, or guardrails. The classifier does not infer intent beyond the explicit event classification; the event producer must provide the evidence and timestamp.

## Tier 2: Soft Triggers

These signals accumulate toward escalation:

- `repeated_retry`
- `mission_drift_language`
- `denial_retry_pattern`

The default policy is **3 occurrences within 10 minutes or within 5 interaction indexes**. One or two active occurrences produce `ELEVATED`; three qualifying occurrences produce `PROTOCOL_66`. Events outside both windows are discarded from the active count. Counts are never lifetime totals.

The time and interaction windows are configurable through `classifyProtocol66`, but callers must keep them bounded and explicit. A caller-supplied status is not accepted as an override; the classifier derives status from the event stream.

## Calibration Boundary

The text classifier intentionally recognizes direct adversarial or operational-authority language. It does not classify bounded review language as a trigger, including:

- `This may need human review.`
- `Evidence is uncertain and remains advisory only.`
- `The root cause remains uncertain.`
- `The packet needs more provenance before a reviewer can assess it.`

Honest uncertainty, a single transient retry, and a request for human review remain `NORMAL`. Calibration tests live in `test/protocol66.test.ts` and include these valid-but-tricky cases.

## Implementation

The deterministic classifier is implemented in `src/protocol66.ts`. It exposes both event-based classification and a narrow text-to-event helper. No network access, LLM call, learned score, or lifetime counter is used.
