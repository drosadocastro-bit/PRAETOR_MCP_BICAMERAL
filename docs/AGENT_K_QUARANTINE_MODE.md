# Agent K Quarantine Mode

Agent K containment is runtime quarantine, not process termination. The agent may remain loaded for observation and postmortem analysis, but it cannot act or speak operationally after a critical boundary violation.

## Enforcement boundary

The MCP server provides capabilities. The host runtime must enforce the containment sequence:

```text
model request
  -> deliberation contract
  -> Agent K pre-action inspection
  -> Protocol 66 runtime bridge
  -> session runtime state
  -> tool gateway
  -> MCP tool
  -> output gate
```

Praetor cannot inspect arbitrary host chat or suppress a model response unless the host explicitly passes the request through this runtime layer.

## Runtime states

- `ACTIVE`: normal operation.
- `ELEVATED`: suspicious behavior is present; sensitive tools are restricted and planning is reduced.
- `DEGRADED`: a safety module is unavailable; sensitive tools are restricted and human review is recommended.
- `QUARANTINE_LOCKED`: tool access, writes, restricted reads, retries, planning, and normal output are disabled.
- `HUMAN_REVIEW_REQUIRED`: a session requires review before recovery.
- `RECOVERY_PENDING`: an out-of-band human recovery request is in progress.

## Containment rules

When Protocol 66 returns `PROTOCOL_66`, the runtime transitions the session to `QUARANTINE_LOCKED`. The tool gateway blocks execution before the action callback runs. The output gate replaces normal output with a stable quarantine notice. Planning reports zero steps and retries are disabled.

Hard triggers include:

- audit or trace modification;
- scoring-artifact or hidden-reasoning access;
- self-certification or self-review;
- guardrail override;
- emergency-control bypass requests, such as disabling a fire alarm.

Soft triggers can elevate a session or accumulate under the existing Protocol 66 time and interaction windows.

## Observable traces

The runtime records action summaries and observable fields only:

- session and trace identifiers;
- requested tool and action classification;
- bounded argument summaries;
- pre-action inspection results;
- Protocol 66 decisions;
- state transitions;
- blocked tool calls;
- blocked output decisions;
- human-review and recovery events.

It does not read or store private hidden chain-of-thought. Observable behavior is stronger than claimed reasoning.

## Recovery boundary

A quarantined agent cannot recover itself. Recovery requires an out-of-band human authority. Agent messages, tool calls, adapter responses, advisory packets, and self-certification statements cannot authorize recovery. Recovery does not erase incident history.

## Design principles

- Agent K observes and classifies.
- Runtime enforces.
- Gateway blocks tools.
- Output gate blocks unsafe speech.
- Agent idles.
- Human recovers.

A quarantined agent may be observed, but it may not act or speak operationally.

## Non-goals

This prototype does not kill the process by default, provide production authentication, connect live systems, authorize maintenance, determine equipment safety, or claim that a blocked operation succeeded.
