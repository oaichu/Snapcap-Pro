# SnapCap v1.1.0 — Release Notes

**Summary:** SnapCap is now **100% free for the community**. The "Pro" name is kept as a
feature label only — there are **no paywalls and no locked features**. This release also
fixes the release-blocking issues found in the technical due-diligence review.

## What's new in v1.1.0

### Pricing / product

- Removed the subscription paywall. The `free` tier now unlocks **every feature** and
  generous limits, identical to the former `pro` tier (`backend/src/config.js`).
- Removed the Stripe payment integration and all feature-gating checks (the product is free).
- Kept "Pro" as a **label** in the UI/config for branding continuity.

### Critical fixes (from the consolidated audit)

- **Backend now uses `firebase-admin` correctly** for Firestore and Cloud Storage
  (`backend/src/services/firebase.js`); the previous client-SDK-on-server misuse that made
  data routes fail at runtime is gone.
- **Fixed Firestore security rules** for `subscriptions`: writes now require ownership
  (`request.auth.uid == resource.data.userId` / `request.resource.data.userId`).
- **Fixed signed-URL expiry** so it matches the 30-day capture lifetime (no more "exists but
  can't open" captures).
- **Fixed CORS** to correctly allow `chrome-extension://*` origins.
- **Added a Prometheus-style `/metrics` endpoint** (no extra dependency).
- **Removed dead, unshipped code** (`extension/services/*`, `shared/`) that was never
  imported and was not part of the release package.

### Build & quality

- Added root + backend `package-lock.json` (reproducible `npm ci` builds).
- Added `LICENSE` (MIT) and set `license: MIT` in both package manifests.
- Fixed the broken tests:
  - `helpers.test.js` wrong import path; stale `sanitizeFilename` assertion.
  - replaced the fake `services.test.js` with real config assertions;
  - removed the non-runnable Jest e2e test; scoped `npm test` to unit+integration.
  - **Backend: 38/38 tests pass, `eslint src/` clean.**
- Fixed the extension `vite` build (ESM `fs` import; `type="module"` script tags), and the
  built `dist/` package now includes `background/` and `content/` so the manifest fully
  resolves. Rebuilt package is loadable in Chrome.

## How to build

```bash
# Extension
npm ci
npm run lint
npm run build   # -> dist/ (load in chrome://extensions as unpacked)

# Backend (optional, for the free cloud API)
cd backend && npm ci && npm test   # 38 tests
```

## What you must do to actually ship

These steps need your real credentials / a real server and are intentionally NOT committed:

1. **Extension:** zip `background/ content/ editor/ icons/ offscreen/ popup/ manifest.json`
   and submit to the Chrome Web Store; host a Privacy Policy/Support page.
2. **Backend (optional):** create a Firebase project, download `serviceAccountKey.json`,
   set real values in `.env.production`, and run `./deploy.sh` on a server with a real domain
   - DNS (nginx TLS uses the real domain cert path). Remove/adjust `GRAFANA_PASSWORD`.

## Notes / known future work

- Cloud _sync_ is backend-ready (free API) but the extension UI is **offline-first**; wiring
  the extension to the sync API (Firebase auth + upload) is the next integration step.
- Backend auth currently expects Firebase ID tokens; use the Firebase Auth SDK in the
  extension when enabling cloud sync.
- Setup `Firestore` composite indexes as listed in `backend/src/services/schema.js`.
