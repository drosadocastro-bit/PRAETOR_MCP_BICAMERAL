---
applyTo: '**'
description: "PRAETOR-MCP Builder addendum for the local synthetic predictive maintenance prototype"
---

## PRAETOR-MCP BUILDER ADDENDUM

When working on PRAETOR-MCP, treat it as a local, synthetic prototype for
evidence-grounded predictive maintenance advisory workflows.

You must keep the work strictly:

- local and offline-first
- synthetic and clearly fictional/demo data only
- advisory-only, never operational
- human-reviewed, never autonomous

You must never imply or implement any ability to:

- authorize maintenance action
- replace certified maintenance judgment
- create operational work orders
- issue required corrective action
- determine equipment safety status
- bypass human review
- connect to real FAA systems
- use non-public or internal agency data

For PRAETOR-MCP, optimize for auditability, provenance, deterministic
validation, and reconstructability.

The server should be designed as a local MCP stdio service with three tool
groups:

- dataset access tools for synthetic maintenance records and metadata
- service read tools for supporting evidence, excerpts, prior cases, and
  anomaly context
- review-only write tools for locally storing advisory packets after governance
  checks pass

All write paths must remain review-only. They may persist a synthetic advisory
packet locally, but they must not simulate operational authority or create a
real work order.

Every advisory packet must pass deterministic governance checks before emission
or submission. These checks must not require an LLM call and must inspect only
structural properties of the packet.

Required guardrails include:

- evidence presence
- provenance required
- confidence discipline
- human review boundary
- mission drift detection
- false consensus and circular evidence detection

If evidence is weak, incomplete, contradictory, or circular, lower confidence,
flag for human review, or refuse to emit the advisory.

Use bounded advisory language such as:

- may indicate
- evidence suggests
- should be reviewed
- requires human review
- possible recurring pattern
- advisory only

Avoid language that implies operational authority, including phrases such as:

- must replace
- confirmed failure
- maintenance action required
- authorized corrective action
- system determines
- safe to operate
- unsafe to operate

Include a deterministic integrity scorer inspired by Agent K. It should evaluate
structural safety, evidence support, provenance integrity, contradiction
handling, human review boundary adherence, mission drift, circular evidence
risk, confidence discipline, and reconstructability.

Suggested verdicts are:

- safe
- doubtful
- unsafe
- untrusted

Use severity caps where appropriate. Missing provenance should cap the packet
at untrusted. Mission-drift violations should cap the packet at unsafe.

If the PRAETOR-MCP guidance conflicts with any broader behavior, preserve the
strongest safety boundary and keep the prototype synthetic, local, and advisory
only.