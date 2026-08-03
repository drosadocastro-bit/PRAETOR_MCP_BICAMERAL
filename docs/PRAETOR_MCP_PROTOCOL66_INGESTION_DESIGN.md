# PRAETOR-MCP Protocol 66 Event Ingestion Design Note

## Status

Future design only. v0.5 keeps `classifyProtocol66` pure and stateless. This note does not add stateful tracking, operational enforcement, automatic recovery, or human-review bypass.

## Boundary

The classifier accepts a validated event array and deterministic bounded policy, then returns a derived `NORMAL`, `ELEVATED`, or `PROTOCOL_66` decision. A future ingestion service must own event identity, ordering, retention, and concurrency before passing events to the classifier.

## Required Event Fields

A future event-ingestion boundary should require:

- `session_id`: the bounded review/session context;
- `stream_id`: the specific interaction or control stream within the session;
- `event_id`: a unique identifier used for deduplication;
- `interaction_index`: a non-negative monotonic index within the stream;
- `occurred_at`: a validated ISO timestamp;
- `kind`: a known Protocol 66 hard or soft trigger kind;
- bounded detail and producer provenance.

The classifier must not infer identity from free-form detail or from array position.

## Ordering and Time Semantics

The ingestion layer must define and test:

- whether future-dated events are rejected, quarantined, or accepted only within a bounded clock-skew allowance;
- whether out-of-order events are buffered, rejected, or reclassified without rewriting history;
- whether duplicate `event_id` values are ignored, reported, or treated as an integrity error;
- how timestamp and interaction-index disagreement is handled; and
- whether the time window uses event time, ingestion time, or both.

Invalid timestamps must never enter the active window through the interaction-index path. The current classifier rejects malformed timestamps before classification.

## Retention and Concurrency

A future stateful service should use bounded retention by session and stream, with explicit expiry and no lifetime trigger accumulation. It should define:

- maximum events per session and stream;
- maximum retention duration;
- atomic append/deduplication behavior;
- per-stream serialization or another documented concurrency model;
- behavior when two events share an interaction index; and
- isolation guarantees preventing one session or stream from contributing to another.

The pure classifier remains the preferred decision function. Stateful storage should only prepare a validated, bounded event set and must not become an authority source for verdicts or operational actions.

## Failure and Recovery Boundary

Malformed events, invalid policy configuration, duplicate identity, ordering violations, and retention overflow should return stable typed errors or explicit quarantine results. Recovery from `PROTOCOL_66` requires out-of-band human authorization and a reconstructable audit record. No event-ingestion API should self-clear containment because a caller claims that the interaction is safe.

## Production Boundary

This design is not a production enforcement claim. Thresholds, clock-skew rules, retention limits, concurrency behavior, and false-positive/false-negative characteristics require real calibration data and human review before any consideration beyond the local synthetic prototype.
