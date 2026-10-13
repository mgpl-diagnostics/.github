# Security policy

MGPL Diagnostics software produces medical reports and patient bills, so we treat security reports seriously.

## Reporting a vulnerability

**Do not open a public issue.** Report it privately:

1. Open the affected repository on GitHub.
2. Go to **Security → Report a vulnerability**.
3. Describe the issue, how to reproduce it, and its impact.

Only the maintainers can see the report. We aim to acknowledge it within **3 days** and to agree a fix
and disclosure timeline with you.

## What counts

- Anything that could expose patient data, or let someone alter a report or invoice.
- Path traversal, injection, or request-size / DoS issues in the HTTP handlers.
- Real patient data, signatures or secrets accidentally committed to any repo or package.
- Supply-chain problems in our workflows or published packages.

## Supported versions

The latest major release of each package receives security fixes.
