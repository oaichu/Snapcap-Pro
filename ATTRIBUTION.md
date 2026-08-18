# Third-Party Attribution

This document lists all third-party libraries, tools, and assets used in SnapCap, along with their respective licenses.

## Core Dependencies

### Production Dependencies (Backend)

| Package | Version | License | Repository |
|---------|---------|---------|------------|
| express | ^4.18.2 | MIT | https://github.com/expressjs/express |
| cors | ^2.8.5 | MIT | https://github.com/expressjs/cors |
| helmet | ^7.1.0 | MIT | https://github.com/helmetjs/helmet |
| firebase-admin | ^12.0.0 | Apache-2.0 | https://github.com/firebase/firebase-admin-node |
| express-rate-limit | ^7.1.5 | MIT | https://github.com/nfriedly/express-rate-limit |
| uuid | ^9.0.1 | MIT | https://github.com/uuidjs/uuid |
| dotenv | ^16.4.1 | BSD-2-Clause | https://github.com/motdotla/dotenv |

### Development Dependencies (Root)

| Package | Version | License | Repository |
|---------|---------|---------|------------|
| vite | ^5.0.0 | MIT | https://github.com/vitejs/vite |
| terser | ^5.24.0 | BSD-2-Clause | https://github.com/terser/terser |
| eslint | ^8.56.0 | MIT | https://github.com/eslint/eslint |
| prettier | ^3.0.0 | MIT | https://github.com/prettier/prettier |

### Development Dependencies (Backend)

| Package | Version | License | Repository |
|---------|---------|---------|------------|
| eslint | ^8.56.0 | MIT | https://github.com/eslint/eslint |
| prettier | ^3.0.0 | MIT | https://github.com/prettier/prettier |

## Transitive Dependencies

This project includes numerous transitive dependencies (dependencies of dependencies). All have been reviewed for license compatibility. The most common licenses found are:

- **MIT License** - Permissive, allows commercial use
- **Apache License 2.0** - Permissive, includes patent grant
- **BSD Licenses (2-Clause, 3-Clause)** - Permissive, allows commercial use
- **ISC License** - Permissive, similar to MIT

All licenses are compatible with our MIT-licensed project and allow commercial use.

## External Services

### Firebase (Google)

- **Purpose**: Optional cloud sync backend (authentication, database, storage)
- **Privacy Policy**: https://policies.google.com/privacy
- **Terms of Service**: https://policies.google.com/terms
- **Usage**: Only required if users opt-in to cloud sync features

### Google Fonts

- **Font Family**: Inter
- **Purpose**: UI typography in popup and editor
- **Endpoints**: fonts.googleapis.com, fonts.gstatic.com
- **Privacy Impact**: Google receives IP address and user-agent when font loads
- **Alternative**: Users can self-host fonts or modify CSP to disable external fonts

### Chrome APIs

The extension uses the following Chrome Extension APIs:

- `chrome.storage` - Local data persistence
- `chrome.desktopCapture` - Screen capture functionality
- `chrome.offscreen` - Offscreen document for media processing
- `chrome.downloads` - File download management
- `chrome.clipboardWrite` - Clipboard operations
- `chrome.activeTab` - Current tab access

These are standard browser APIs available to all Chrome extensions.

## Icons and Assets

### Extension Icons

- **Format**: PNG
- **Sizes**: 16x16, 48x48, 128x128
- **License**: [TODO: Specify - custom design / open source / purchased]
- **Attribution**: [TODO: Add designer credit if applicable]

### UI Elements

- **CSS Framework**: Custom CSS (no framework dependencies)
- **JavaScript**: Vanilla JS + Vite bundler
- **No external UI libraries** used in the extension itself

## License Compatibility Summary

✅ **All licenses are compatible with commercial use**

Our project uses the **MIT License**, which is one of the most permissive open-source licenses. All dependencies use licenses that:

1. Allow commercial use
2. Allow modification and distribution
3. Are compatible with MIT licensing
4. Do not impose copyleft requirements (no GPL/LGPL dependencies)

## How to Verify

To verify all dependencies and their licenses:

```bash
# Install license-checker globally
npm install -g license-checker

# Check root project
license-checker --summary

# Check backend project
cd backend
license-checker --summary
```

## Updates

This attribution file should be updated:

- When adding new dependencies
- When removing dependencies
- Before each public release
- Annually for compliance review

## Contact

For questions about third-party attributions:

- Email: [TODO: PM to fill contact email]
- GitHub: [TODO: Add repository link]

---

**Last Updated**: [TODO: PM to fill date]

**Version**: 1.0.0

**Maintained by**: SnapCap Team
