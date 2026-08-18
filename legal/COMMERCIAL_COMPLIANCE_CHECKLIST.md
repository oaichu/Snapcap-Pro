# Commercial Use Compliance Checklist for SnapCap

## Overview

This document provides a comprehensive checklist to ensure SnapCap is legally compliant for commercial distribution and business operations.

---

## ✅ 1. Software License

**Status: COMPLETE**

- [x] MIT License file present at `/LICENSE`
- [x] License permits commercial use, modification, and distribution
- [x] Copyright notice includes current year range (2024-2026)
- [x] License file included in all distributions

**Notes**: The MIT License is permissive and allows commercial use without restrictions.

---

## ✅ 2. Privacy Policy

**Status: DRAFT - Requires Completion**

- [x] Privacy Policy document exists at `/legal/PRIVACY_POLICY.md`
- [ ] **TODO: Fill in contact email** (Section 2 & 15)
- [ ] **TODO: Fill in website URL** (Section 2)
- [ ] **TODO: Fill in postal address** (Section 15)
- [ ] **TODO: Set last-updated date** (Section 1)
- [ ] Must be hosted at a public URL before Chrome Web Store submission
- [ ] Must be accessible via HTTPS

**Required Actions**:

1. Replace all `[TODO: PM to fill ...]` placeholders with actual information
2. Host the policy on a public website (see `LEGAL_HOSTING_GUIDE.md`)
3. Submit the URL to Chrome Web Store during listing setup

---

## ✅ 3. Terms of Service

**Status: DRAFT - Requires Completion**

- [x] Terms of Service document exists at `/legal/TERMS_OF_SERVICE.md`
- [ ] **TODO: Fill in support contact email** (Section 11)
- [ ] **TODO: Fill in jurisdiction** (Section 12)
- [ ] **TODO: Confirm liability cap wording** (Section 9 - free service adjustment needed)
- [ ] **TODO: Set last-updated date** (Section 1)
- [ ] Must be hosted at a public URL before commercial launch
- [ ] Must be accessible via HTTPS

**Required Actions**:

1. Consult legal counsel to finalize liability limitations for free service model
2. Specify governing law jurisdiction (e.g., "State of California, USA" or your country)
3. Replace all `[TODO: PM to fill ...]` placeholders
4. Host publicly with SSL certificate

---

## ✅ 4. Cookie Policy

**Status: DRAFT - New Document Created**

- [x] Cookie Policy document created at `/legal/COOKIE_POLICY.md`
- [ ] **TODO: Fill in contact email** (Section 8)
- [ ] **TODO: Fill in postal address** (Section 8)
- [ ] **TODO: Set last-updated date** (Section 1)
- [ ] Recommended for GDPR compliance if serving EU users
- [ ] Should be linked from Privacy Policy

**Required Actions**:

1. Fill in contact information placeholders
2. Link to this policy from the Privacy Policy (Section 12 or 13)
3. Consider hosting alongside other legal documents

---

## ❌ 5. Business Registration & Tax Compliance

**Status: NOT STARTED**

### 5.1 Business Entity Formation

- [ ] Choose business structure (LLC, Corporation, Sole Proprietorship, etc.)
- [ ] Register business name with government authority
- [ ] Obtain Employer Identification Number (EIN) or tax ID
- [ ] Register for state/local business licenses if required

### 5.2 Tax Obligations

- [ ] Register for sales tax/VAT collection if applicable
- [ ] Understand nexus rules for digital products
- [ ] Set up accounting system for revenue tracking
- [ ] Consult tax professional for international sales implications

### 5.3 Banking & Finance

- [ ] Open business bank account
- [ ] Set up payment processor (if accepting donations/premium features later)
- [ ] Obtain business insurance (general liability, E&O)

**Required Actions**:

1. Consult with a business attorney in your jurisdiction
2. Register your business entity before launching commercially
3. Set up proper bookkeeping from day one

---

## ❌ 6. Intellectual Property Protection

**Status: PARTIAL**

- [x] Copyright notice in LICENSE file
- [ ] Consider trademark registration for "SnapCap" name/logo
- [ ] Document original code creation dates
- [ ] Review third-party dependencies for license compatibility
- [ ] Create attribution file for third-party assets

**Required Actions**:

1. Conduct trademark search for "SnapCap" in your target markets
2. File trademark application if name is available
3. Audit all npm dependencies for license compatibility (MIT, Apache 2.0, BSD are safe)
4. Create `/ATTRIBUTION.md` file listing all third-party libraries and their licenses

---

## ❌ 7. Data Protection Compliance

### 7.1 GDPR (European Union)

- [x] Privacy Policy includes GDPR rights section
- [x] Legal basis for processing documented
- [ ] Appoint Data Protection Officer (if required)
- [ ] Implement data processing agreements with processors (Firebase/Google)
- [ ] Set up data breach notification procedure
- [ ] Enable user data export functionality
- [ ] Enable user data deletion functionality

### 7.2 CCPA/CPRA (California, USA)

- [x] Privacy Policy includes CCPA rights section
- [ ] Add "Do Not Sell My Personal Information" link (if applicable)
- [ ] Implement opt-out mechanism for data sales/sharing
- [ ] Track response timelines (45-day requirement)

### 7.3 Other Jurisdictions

- [ ] Review requirements for other regions (Brazil LGPD, Canada PIPEDA, etc.)
- [ ] Consider implementing global privacy standards

**Required Actions**:

1. Review Firebase/Google data processing terms
2. Implement user data export/delete features in the extension
3. Create internal procedures for handling privacy requests
4. Document all data flows and third-party processors

---

## ❌ 8. Chrome Web Store Compliance

**Status: DOCUMENTED - PENDING EXECUTION**

See `/CHROME_WEBSTORE_CHECKLIST.md` for detailed requirements.

**Critical Items**:

- [ ] Privacy Policy hosted at public HTTPS URL
- [ ] Terms of Service hosted at public HTTPS URL
- [ ] Chrome Web Store Developer Account ($5 fee)
- [ ] Extension screenshots and promotional images
- [ ] Accurate store listing description
- [ ] Support contact information
- [ ] Tested on clean Chrome profile

---

## ❌ 9. Accessibility Compliance

**Status: NOT STARTED**

- [ ] WCAG 2.1 AA compliance for any web interfaces
- [ ] Accessible extension UI (popup, editor)
- [ ] Keyboard navigation support
- [ ] Screen reader compatibility
- [ ] Color contrast verification

**Required Actions**:

1. Run accessibility audit on popup and editor interfaces
2. Fix any critical accessibility issues
3. Document accessibility features in store listing

---

## ❌ 10. Security Best Practices

**Status: PARTIAL**

- [x] Content Security Policy configured in manifest
- [x] Minimal permissions requested
- [x] No eval() or inline scripts
- [ ] Regular security audits scheduled
- [ ] Vulnerability disclosure policy
- [ ] Incident response plan
- [ ] Secure development lifecycle documentation

**Required Actions**:

1. Create SECURITY.md file with vulnerability disclosure process
2. Schedule quarterly security reviews
3. Set up automated dependency scanning (npm audit, Snyk, etc.)

---

## ❌ 11. Consumer Protection Laws

**Status: NOT STARTED**

- [ ] Clear refund/cancellation policy (if accepting payments later)
- [ ] No deceptive or misleading claims in marketing
- [ ] Accurate feature descriptions
- [ ] Age restrictions clearly stated (16+)
- [ ] Terms prominently displayed before use

---

## ❌ 12. Employment & Contractor Agreements

**Status: NOT APPLICABLE (Currently)**

If you have team members or contractors:

- [ ] Employment contracts
- [ ] Independent contractor agreements
- [ ] IP assignment clauses
- [ ] Non-disclosure agreements (NDAs)
- [ ] Work-for-hire documentation

---

## 📋 Action Plan Summary

### Immediate Actions (Before Launch)

1. **Fill in all TODO placeholders** in Privacy Policy, Terms of Service, and Cookie Policy
2. **Host legal documents** at public HTTPS URLs (use GitHub Pages, Netlify, or Firebase Hosting)
3. **Register Chrome Web Store Developer Account** ($5 one-time fee)
4. **Complete Chrome Web Store Checklist** items marked as ❌

### Short-Term Actions (First 30 Days)

5. **Consult business attorney** for entity formation and jurisdiction selection
6. **Register business entity** and obtain tax ID
7. **Conduct trademark search** and file application if clear
8. **Create ATTRIBUTION.md** for third-party dependencies
9. **Implement user data export/delete** functionality

### Medium-Term Actions (First 90 Days)

10. **Set up accounting system** and business bank account
11. **Review GDPR compliance** with legal counsel
12. **Create SECURITY.md** with vulnerability disclosure process
13. **Schedule first security audit**
14. **Implement accessibility improvements**

### Ongoing Maintenance

- Monitor regulatory changes
- Update legal documents annually or when practices change
- Conduct regular security reviews
- Respond to user privacy requests within required timeframes

---

## 📞 Professional Resources Recommended

### Legal

- Business formation attorney
- Intellectual property attorney (trademark)
- Privacy law specialist (GDPR/CCPA compliance)

### Financial

- CPA or tax advisor familiar with digital products
- Business banker

### Technical

- Security auditor (annual review)
- Accessibility consultant (if needed)

---

## ⚠️ Disclaimer

**This checklist is for informational purposes only and does not constitute legal advice.**

Laws and regulations vary by jurisdiction and change over time. You should consult with qualified legal counsel licensed in your jurisdiction to ensure full compliance with all applicable laws and regulations before conducting business.

---

## 📝 Document History

| Version | Date   | Changes       | Author |
| ------- | ------ | ------------- | ------ |
| 1.0.0   | [TODO] | Initial draft | [TODO] |

---

## 🔗 Related Documents

- `/LICENSE` - Software license
- `/legal/PRIVACY_POLICY.md` - Privacy Policy
- `/legal/TERMS_OF_SERVICE.md` - Terms of Service
- `/legal/COOKIE_POLICY.md` - Cookie Policy
- `/CHROME_WEBSTORE_CHECKLIST.md` - Chrome Web Store submission guide
- `/LEGAL_HOSTING_GUIDE.md` - Guide for hosting legal documents
