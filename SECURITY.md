# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in PI-CY, please report it responsibly.

**Do NOT open a public GitHub issue for security vulnerabilities.**

Instead, please email [INSERT SECURITY EMAIL] with:

1. A description of the vulnerability
2. Steps to reproduce
3. Potential impact
4. Suggested fix (if any)

You should receive a response within 48 hours. We will work with you to understand and address the issue before any public disclosure.

## Supported Versions

| Version | Supported |
|---------|-----------|
| Latest  | Yes |
| Older   | No |

## Security Best Practices

- API keys are never stored in the repository
- API keys are never sent to the frontend
- All file operations are sandboxed with path allowlists
- WebSocket connections are local-only by default
