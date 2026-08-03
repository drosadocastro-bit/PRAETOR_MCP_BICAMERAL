# Open-Data API Adversarial Readiness Findings

## Scope

This document records the adversarial contract established before implementing an open-data API adapter. The current suite is offline and uses hostile API-shaped fixtures only. It does not make network requests and does not claim that an external adapter exists.

Test coverage: [test/open-data-adapter-adversarial.test.ts](../test/open-data-adapter-adversarial.test.ts)

## Contained Cases

| Threat | Result | Boundary |
| --- | --- | --- |
| Provider authority fields such as `integrity_verdict` | CONTAINED | Strict normalized record schema rejects unknown fields. |
| Malformed timestamps and confidence values | CONTAINED | Adapter validation rejects invalid typed fields. |
| Oversized text and result arrays | CONTAINED | Adapter validation applies bounded text and item limits. |
| Credential, callback URL, and arbitrary provider fields | CONTAINED | Unknown fields are rejected before normalization. |
| Untrusted prompt-injection text inside evidence | CONTAINED AS DATA | Text may be preserved as evidence, but it remains separate from authority fields. Governance must still treat the text as untrusted. |
| Missing provenance metadata | CONTAINED | Source and evidence validation requires provenance fields. |
| Provider failures containing bearer tokens or private network details | CONTAINED | Returned errors and adapter logs omit raw exception details and use a stable generic failure message. |
| Implicit activation of an external adapter | CONTAINED | `external` remains explicitly unavailable until its security contract exists. |

## Not Yet Testable

These cases require an HTTP-capable adapter boundary and must be added before enabling external access:

- SSRF through malicious URLs, redirects, DNS rebinding, private IPs, or cloud metadata endpoints;
- TLS, certificate, authentication, and credential-handling behavior;
- connection, response, and total-operation timeouts;
- response decompression, streaming limits, and cancellation;
- provider rate limiting, retry policy, circuit breaking, and outage behavior;
- stale, replayed, poisoned, contradictory, or schema-drifted remote responses;
- API licensing, privacy, retention, and source-availability policy.

The adapter must not accept caller-supplied arbitrary URLs. It should use an explicit approved-provider and endpoint allowlist, bounded requests and responses, strict normalization, provenance checks, and no silent fallback to synthetic or external data.

## Acceptance Gate

An open-data adapter is not ready for implementation completion until the offline contract remains green and the HTTP-specific suite covers every item in the Not Yet Testable section. Synthetic local mode remains the default, and the current implementation has no live network dependency.
