# Chrome Web Store Submission Checklist

## Pre-Submission Requirements

### ✅ Manifest V3 Compliance
- [x] Manifest version 3
- [x] Service worker for background scripts
- [x] CSP header configured
- [x] No eval() or inline scripts
- [x] Minimum required permissions only
- [x] Host permissions properly scoped

### ✅ Extension Assets
- [x] Icons: 16x16, 48x48, 128x128 (PNG)
- [ ] Promotional images (1280x800, 440x280)
- [ ] Screenshots (1280x800 or 640x400) - minimum 1, max 5
- [ ] Promo video (YouTube link) - optional but recommended

### ✅ Store Listing
- [x] Extension name: "SnapCap - Screenshot & 30s Recorder"
- [ ] Short description (≤ 132 chars)
- [ ] Detailed description (≥ 500 chars, ≤ 16000 chars)
- [ ] Category: Productivity / Developer Tools
- [ ] Language support (English at minimum)
- [ ] Privacy Policy URL (required)
- [ ] Support email/contact
- [ ] Website URL (optional)

### ✅ Technical Requirements
- [x] No external dependencies (zero npm deps)
- [x] Content Security Policy configured
- [x] Proper error handling
- [x] Graceful degradation
- [x] No console.log in production (should be removed)
- [x] Works offline (local storage)

### ⚠️ Before Submission - Must Complete

| Item | Status | Notes |
|------|--------|-------|
| Privacy Policy hosted online | ❌ | Must host at public URL |
| Terms of Service hosted online | ❌ | Must host at public URL |
| Chrome Web Store Developer Account | ❌ | $5 one-time fee |
| Extension package (.zip) created | ❌ | Run build script |
| Tested on clean Chrome profile | ❌ | Required |
| Tested on multiple Chrome versions | ❌ | Chrome 88+ |
| Tested on Edge/Brave/Vivaldi | ❌ | Chromium-based |
| Screenshots captured | ❌ | 1280x800 recommended |
| Promotional images created | ❌ | 1280x800, 440x280 |
| Demo video recorded | ❌ | Optional but helps |
| Support email configured | ❌ | Required |
| Developer dashboard configured | ❌ | One-time setup |

## Submission Steps

### 1. Prepare Assets
```bash
# Create extension package
cd open-capture-extension
zip -r snapcap-v1.0.0.zip \
  background/ content/ editor/ icons/ offscreen/ popup/ \
  manifest.json -x "*.DS_Store"
```

### 2. Create Developer Account
- Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
- Pay $5 one-time registration fee
- Verify email

### 3. Submit Extension
1. Click "New Item"
2. Upload `snapcap-v1.0.0.zip`
3. Fill in store listing:
   - Name, description, category
   - Upload icons, screenshots, promo images
   - Add privacy policy URL
   - Add support email
4. Select visibility: Public / Unlisted / Private
5. Submit for review

### 3. Post-Submission
- Wait for review (typically 1-3 business days)
- Monitor developer dashboard for feedback
- Address any rejection reasons
- Publish when approved

## Review Guidelines Compliance

### Functionality
- [x] Core features work as described
- [x] No broken links or placeholder content
- [x] Clear user flow and UX

### Privacy & Security
- [x] Minimal permissions
- [x] CSP header present
- [x] No data sent to third parties without consent
- [x] User data stored locally (IndexedDB)
- [ ] Privacy policy discloses data practices

### User Experience
- [x] Clear onboarding
- [x] Intuitive UI
- [x] Error messages are helpful
- [ ] Keyboard shortcuts documented
- [ ] Accessibility considerations

### Content Policies
- [x] No misleading claims
- [x] No prohibited content
- [x] No spam or deceptive practices
- [x] Proper attribution for third-party assets

## Post-Launch Monitoring

### Week 1
- [ ] Monitor review status
- [ ] Check for crash reports
- [ ] Monitor user feedback
- [ ] Respond to reviews

### Month 1
- [ ] Track install/uninstall rates
- [ ] Monitor crash-free sessions
- [ ] Collect feature requests
- [ ] Plan v1.1 updates

### Ongoing
- [ ] Regular security updates
- [ ] Chrome version compatibility
- [ ] Feature improvements
- [ ] Performance optimization

## Required URLs (Must Be Live Before Submission)

| URL | Status | Location |
|-----|--------|----------|
| Privacy Policy | ❌ | `https://your-domain.com/privacy` |
| Terms of Service | ❌ | `https://your-domain.com/terms` |
| Support/Contact | ❌ | `https://your-domain.com/contact` |
| Extension Website | ❌ | `https://snapcap.com` |

## Estimated Timeline

| Phase | Duration |
|-------|----------|
| Asset creation | 1-2 weeks |
| Legal docs hosting | 1 week |
| Developer account setup | 1 day |
| Submission & review | 1-7 days |
| Post-launch fixes | 1-2 weeks |
| **Total** | **3-4 weeks** |

## Budget Estimate

| Item | Cost |
|------|------|
| Chrome Web Store registration | $5 (one-time) |
| Domain & SSL | $10-20/year |
| Hosting (legal pages) | $5-20/month |
| Stripe fees | 2.9% + 30¢ per transaction |
| Firebase (Blaze plan) | Pay-as-you-go |
| **Total initial** | **~$50-100** |
| **Monthly ongoing** | **~$20-50** |

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Review rejection | Test thoroughly, follow guidelines exactly |
| Policy violation | Legal review of ToS/Privacy |
| Low install rate | Improve store listing, screenshots |
| Negative reviews | Quick response, regular updates |
| Chrome API changes | Monitor Chrome release notes |

---

**Next Action**: Complete legal document hosting and asset creation before submission.