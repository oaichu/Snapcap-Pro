# Legal Document Hosting Guide for SnapCap

## Overview

This guide covers hosting your legal documents (Terms of Service, Privacy Policy) for Chrome Web Store compliance and legal compliance.

## Requirements

- **Privacy Policy URL** - REQUIRED by Chrome Web Store
- **Terms of Service URL** - REQUIRED for commercial use

## Option 1: Static Site Hosting (Recommended)

### Option 1a: GitHub Pages (Free)

```bash
# 1. Create a new repo: snapcap-legal
# 2. Add legal documents
# 3. Enable GitHub Pages
# 4. URLs will be:
#    https://yourusername.github.io/snapcap-legal/terms.html
#    https://yourusername.github.io/snapcap-legal/privacy.html
```

### Option 1b: Netlify (Free)

```bash
# 1. Connect GitHub repo to Netlify
# 2. Build command: none (static)
# 3. Publish directory: .
# 4. Custom domain: legal.snapcap.com
```

### Option 1c: Vercel (Free)

```bash
# 1. Connect GitHub repo to Vercel
# 2. Framework: Other
# 3. Output directory: .
```

### Option 1d: Firebase Hosting (If using Firebase)

```bash
# In your Firebase project:
firebase init hosting
# Public directory: legal
firebase deploy --only hosting
```

## Option 2: Your Main Website

If you have a marketing site (snapcap.com):

```
/legal/
  ├── terms.html
  └── privacy.html
```

## Required HTML Structure

Each legal page must have:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Terms of Service - SnapCap</title>
    <meta name="description" content="SnapCap Terms of Service" />
    <link rel="stylesheet" href="styles.css" />
  </head>
  <body>
    <header>
      <nav>
        <a href="/">SnapCap</a>
        <a href="/terms.html">Terms</a>
        <a href="/privacy.html">Privacy</a>
      </nav>
    </header>
    <main>
      <article>
        <h1>Terms of Service</h1>
        <p class="last-updated">Last Updated: January 15, 2025</p>
        <!-- Content here -->
      </article>
    </main>
    <footer>
      <p>&copy; 2025 SnapCap. All rights reserved.</p>
      <p><a href="mailto:legal@snapcap.com">Contact Legal</a></p>
    </footer>
  </body>
</html>
```

## SEO & Accessibility

### Meta Tags (Required)

```html
<meta name="robots" content="index, follow" />
<meta
  name="description"
  content="SnapCap Terms of Service - Screenshot & Screen Recorder Extension"
/>
<link rel="canonical" href="https://legal.snapcap.com/terms.html" />
```

### Open Graph (For social sharing)

```html
<meta property="og:title" content="Terms of Service - SnapCap" />
<meta
  property="og:description"
  content="Terms of Service for SnapCap Screenshot & Screen Recorder Extension"
/>
<meta property="og:type" content="website" />
<meta property="og:url" content="https://legal.snapcap.com/terms.html" />
```

## Deployment Checklist

### Pre-deployment

- [ ] Convert Markdown to HTML
- [ ] Add CSS styling
- [ ] Add navigation between pages
- [ ] Test on mobile/desktop
- [ ] Validate HTML (W3C validator)
- [ ] Check accessibility (WAVE tool)
- [ ] Verify all links work

### DNS Configuration

```
# For custom domain legal.snapcap.com
CNAME legal.snapcap.com → your-hosting-provider.netlify.app
# OR
CNAME legal.snapcap.com → yourusername.github.io
```

### SSL Certificate

- Enable HTTPS (required)
- Most hosts provide free Let's Encrypt
- Force HTTPS redirect

### robots.txt

```
User-agent: *
Allow: /
Sitemap: https://legal.snapcap.com/sitemap.xml
```

### sitemap.xml

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://legal.snapcap.com/</loc>
    <lastmod>2025-01-15</lastmod>
  </url>
  <url>
    <loc>https://legal.snapcap.com/terms.html</loc>
    <lastmod>2025-01-15</lastmod>
  </url>
  <url>
    <loc>https://legal.snapcap.com/privacy.html</loc>
    <lastmod>2025-01-15</lastmod>
  </url>
</urlset>
```

## Chrome Web Store URLs

Update your extension manifest and store listing:

```json
// In store listing
"privacy_policy_url": "https://legal.snapcap.com/privacy.html",
"terms_of_service_url": "https://legal.snapcap.com/terms.html"
```

## Testing Checklist

- [ ] All pages load over HTTPS
- [ ] All internal links work
- [ ] Mobile responsive
- [ ] Print stylesheet works
- [ ] Contact email links work
- [ ] Last updated date visible
- [ ] Version history accessible
- [ ] Language selector (if multi-language)
- [ ] Cookie policy link (if applicable)

## Monitoring

### Uptime Monitoring

- UptimeRobot (free): Monitor legal.snapcap.com
- Alert on downtime > 5 minutes

### Analytics

- Google Analytics / Plausible
- Track page views
- Monitor for errors

## Version Control

### Git History

```bash
git log --oneline --legal/
# Track all changes to legal docs
```

### Change Log

```
## Legal Documents Changelog

### v1.0.0 (2025-01-15)
- Initial release of Terms of Service
- Initial release of Privacy Policy

### v1.1.0 (2025-02-01)
- Updated Terms & Privacy Policy: SnapCap is free of charge; removed all
  payment-processor and paid-tier wording
```

## Legal Review Checklist

Before publishing:

- [ ] Reviewed by attorney
- [ ] GDPR compliance verified
- [ ] CCPA compliance verified
- [ ] Firebase data processing disclosed (optional self-hosted backend only)
- [ ] Cookie policy included
- [ ] Age restrictions specified (16+)
- [ ] Jurisdiction specified
- [ ] Dispute resolution clause
- [ ] Limitation of liability

## Emergency Updates

### Process for urgent legal changes:

1. Make changes in Git
2. Legal review (expedited)
3. Deploy to staging
4. Legal sign-off
5. Deploy to production
6. Notify users (if material change)
7. Update version number

## Contact

For legal document updates:

- Email: legal@snapcap.com
- GitHub: snapcap/legal
- Slack: #legal-updates
