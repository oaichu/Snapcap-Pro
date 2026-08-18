# Security Policy

## Reporting a Vulnerability

We take the security of SnapCap seriously. If you believe you have found a security vulnerability, please report it to us as described below.

### How to Report

**Please do NOT report security vulnerabilities through public GitHub issues.**

Instead, please email us at: **[TODO: PM to fill security contact email]**

Include as much detail as possible in your report:

- Description of the vulnerability
- Steps to reproduce the issue
- Potential impact
- Any relevant code snippets or screenshots
- Your suggested fix (if any)

### What to Expect

- **Initial Response**: We will acknowledge receipt of your report within **48 hours**
- **Status Updates**: We will provide status updates every **7 days**
- **Resolution Timeline**: We aim to resolve critical issues within **30 days**
- **Disclosure**: We will coordinate with you on public disclosure timing

### Scope

This policy applies to:

- SnapCap Chrome Extension (all versions)
- SnapCap backend API (if using optional cloud sync)
- SnapCap web properties

### Out of Scope

The following are generally not considered security vulnerabilities:

- UI/UX issues that don't expose sensitive data
- Missing best practices (unless they lead to exploitable vulnerabilities)
- Issues requiring physical access to user's device
- Social engineering attacks against our team

### Bug Bounty Program

**Currently, we do not offer a bug bounty program.** As an open-source project provided free of charge, we rely on the goodwill of the security community to help keep our users safe.

However, we will:

- Publicly acknowledge your responsible disclosure (with your permission)
- Add you to our Security Hall of Fame
- Provide references/recommendations for security researchers

### Secure Development Practices

Our team follows these security practices:

1. **Code Review**: All changes require peer review before merging
2. **Minimal Permissions**: Extension requests only necessary permissions
3. **Content Security Policy**: Strict CSP headers prevent XSS attacks
4. **No eval()**: We avoid dangerous JavaScript functions
5. **Dependency Scanning**: Regular `npm audit` checks
6. **Secure Defaults**: All features default to privacy-preserving settings

### Known Security Features

- ✅ Manifest V3 architecture (latest security model)
- ✅ Content Security Policy configured
- ✅ Local storage by default (no cloud required)
- ✅ No third-party analytics in core extension
- ✅ Encrypted connections to Firebase (when cloud sync enabled)
- ✅ Minimal host permissions

### Past Security Advisories

| Date | Severity | Description | Status |
|------|----------|-------------|--------|
| [TODO] | [TODO] | [TODO] | [TODO] |

### Contact

For security-related inquiries:

- **Email**: [TODO: PM to fill security contact email]
- **PGP Key**: [TODO: Optional - add PGP key for encrypted communications]

---

**Last Updated**: [TODO: PM to fill date]

**Version**: 1.0.0
