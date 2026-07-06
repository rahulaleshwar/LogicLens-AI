---
name: passive-security-inspection
description: Perform authorized, evidence-grounded passive HTTP security inspection through LogicLens MCP tools.
version: 1.0.0
---

# Passive Security Inspection

Use this skill only for an HTTP(S) target explicitly supplied by the user.

## Workflow

1. Call `inspect_http_url` with `GET` or `HEAD`.
2. If it succeeds, pass its captured headers to `inspect_security_headers`.
3. If the response contains HTML, call `extract_public_links` with the final URL
   and captured body sample.
4. For HTTPS, call `inspect_tls_certificate` using the target hostname.
5. Produce an evidence ledger before writing findings.
6. Reject any finding that cannot cite a tool-returned field.

## Safety

- Never fuzz routes, parameters, credentials, or sessions.
- Never issue mutation requests or execute downloaded code.
- Never bypass target validation or redirect validation.
- Never reinterpret a tool error as evidence.
- `request_active_test` is a denial/approval-gate demonstration, not an active
  testing capability.
- Active testing requires an externally verified, target-scoped human approval
  record and is outside this skill.

## Output Contract

Return:

- inspected target and final URL;
- tool calls used;
- evidence ledger;
- findings with confidence and remediation;
- rejected or unsupported hypotheses;
- passive-assessment limitations.
