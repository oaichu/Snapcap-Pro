# Post-Launch Monitoring Setup for SnapCap

## Overview
Comprehensive monitoring strategy for post-launch operations.

## 1. Infrastructure Monitoring

### Prometheus + Grafana (Already Configured)
- API latency (p50, p95, p99)
- Error rates (4xx, 5xx)
- Throughput (req/s)
- System resources (CPU, Memory, Disk)
- Database query performance
- Queue depths

### Uptime Monitoring
- **UptimeRobot** (Free): 50 monitors, 5-min intervals
  - API health endpoint
  - Extension download page
  - Legal document pages
  - Payment webhook endpoint

### SSL Certificate Monitoring
- **Certbot auto-renewal** (configured)
- **SSL Labs** grade monitoring
- Alert 30 days before expiry

## 2. Application Monitoring

### Error Tracking - Sentry
```bash
# Backend
npm install @sentry/node @sentry/profiling-node

# Frontend (Extension)
npm install @sentry/browser
```

```javascript
// backend/src/server.js
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
  profilesSampleRate: 1.0,
});

app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.errorHandler());
```

### Performance Monitoring
- **Frontend**: Chrome Extension APIs + custom metrics
- **Backend**: Prometheus metrics + Sentry transactions
- **Core Web Vitals**: For extension pages

## 3. Business Metrics Monitoring

### Key Metrics Dashboard (Grafana)
| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| Daily Active Users | Growing | < 10% week-over-week |
| Capture Success Rate | > 99% | < 95% |
| Recording Success Rate | > 98% | < 95% |
| Free → Pro Conversion | > 2% | < 1% |
| Monthly Churn | < 5% | > 10% |
| Payment Success Rate | > 99% | < 97% |
| Avg Capture Time | < 2s | > 5s |
| Avg Recording Start Time | < 1s | > 3s |

### Revenue Metrics
- MRR (Monthly Recurring Revenue)
- ARR (Annual Recurring Revenue)
- LTV (Lifetime Value)
- CAC (Customer Acquisition Cost)
- Payback Period

## 4. Alerting Configuration

### Critical Alerts (Page Immediately)
| Alert | Condition | Channel |
|-------|-----------|---------|
| API Down | Health check fails 3x | PagerDuty + Slack |
| Error Rate > 5% | 5-min window | PagerDuty + Slack |
| Payment Failure Rate > 10% | 15-min window | PagerDuty + Slack |
| Database Unavailable | Connection fails | PagerDuty |
| SSL Expiry < 30 days | Certificate check | Email + Slack |

### Warning Alerts (Notify Within 1 Hour)
| Alert | Condition | Channel |
|-------|-----------|---------|
| API Latency p95 > 2s | 10-min window | Slack |
| Error Rate > 1% | 15-min window | Slack |
| Disk Usage > 80% | Continuous | Slack |
| Memory Usage > 85% | 10-min window | Slack |
| CPU > 80% | 15-min window | Slack |
| Queue Depth > 1000 | Continuous | Slack |

### Info Alerts (Daily Digest)
| Alert | Condition | Channel |
|-------|-----------|---------|
| New User Signups | Daily count | Email |
| Revenue Summary | Daily MRR | Email |
| Error Summary | Top 10 errors | Email |
| Performance Summary | p50/p95/p99 | Email |

## 4. Logging Strategy

### Structured Logging (JSON)
```json
{
  "timestamp": "2025-01-15T10:30:00.000Z",
  "level": "info",
  "service": "snapcap-api",
  "traceId": "abc123",
  "spanId": "def456",
  "userId": "user123",
  "action": "capture_created",
  "metadata": {
    "type": "image",
    "sizeMB": 1.5,
    "durationMs": 150
  }
}
```

### Log Levels
- **DEBUG**: Detailed diagnostic info
- **INFO**: General operational info
- **WARN**: Potential issues
- **ERROR**: Handled errors
- **CRITICAL**: Unhandled exceptions, system failures

### Log Retention
- **DEBUG/INFO**: 30 days
- **WARN/ERROR**: 90 days
- **CRITICAL**: 1 year
- **Audit logs**: 7 years (compliance)

## 5. Security Monitoring

### Threat Detection
- Failed login attempts > 10/min → Alert
- Unusual API usage patterns → Alert
- Geographic anomalies → Alert
- Rate limit exceeded → Log + Alert

### Vulnerability Scanning
- **Dependabot**: Automated dependency updates
- **Trivy**: Container scanning in CI/CD
- **Snyk**: Code vulnerability scanning
- **Monthly**: Manual penetration testing

### Compliance Monitoring
- GDPR data request tracking
- Data retention policy enforcement
- Encryption verification
- Access control audits

## 6. Incident Response

### Runbook Template
```markdown
## Incident: [Title]

### Summary
- **Severity**: SEV-1/SEV-2/SEV-3
- **Status**: Investigating/Identified/Monitoring/Resolved
- **Start Time**: YYYY-MM-DD HH:MM UTC
- **Commander**: @username

### Impact
- Users affected: X%
- Features impacted: [list]
- Revenue impact: $X/hour

### Timeline
- HH:MM - Detected via [alert source]
- HH:MM - Commander assigned
- HH:MM - Root cause identified
- HH:MM - Fix deployed
- HH:MM - Verified resolved

### Root Cause
[Description]

### Resolution
[Steps taken]

### Prevention
- [ ] Action item 1
- [ ] Action item 2
```

### Post-Mortem Process
1. **Within 24h**: Blameless post-mortem
2. **Within 48h**: Action items created
3. **Within 1 week**: Action items completed
4. **Monthly**: Incident review meeting

## 7. User Feedback Monitoring

### In-Extension Feedback
```javascript
// Extension feedback button
chrome.runtime.sendMessage({
  action: 'SUBMIT_FEEDBACK',
  type: 'bug|feature|general',
  message: '...',
  screenshot: true
});
```

### Channels
- **In-extension**: Feedback button
- **Email**: support@snapcap.com
- **Chrome Web Store**: Reviews
- **GitHub**: Issues
- **Discord/Slack**: Community

### Sentiment Analysis
- Weekly sentiment report
- Feature request prioritization
- Bug triage automation

## 8. Backup & Disaster Recovery

### Backup Strategy
| Data | Frequency | Retention | Location |
|------|-----------|-----------|----------|
| Firestore | Daily | 30 days | Firebase + GCS |
| Firebase Auth | Daily | 30 days | GCS |
| Stripe Data | Real-time | 7 years | Stripe |
| Config/Secrets | On change | 1 year | Vault/GCS |
| Extension Builds | On release | Forever | GitHub Releases |

### Recovery Procedures
| Scenario | RTO | RPO | Procedure |
|----------|-----|-----|-----------|
| API Down | 15 min | 0 | Auto-restart / Failover |
| Database Corruption | 1 hour | 24h | Restore from backup |
| Region Outage | 30 min | 0 | Multi-region failover |
| Data Breach | 4 hours | 0 | Incident response |

### DR Testing
- **Quarterly**: Full DR drill
- **Monthly**: Backup restore test
- **Weekly**: Health check validation

## 8. Cost Monitoring

### Budget Alerts
| Resource | Monthly Budget | Alert at |
|----------|----------------|----------|
| Firebase | $100 | 80% |
| Cloud Run | $200 | 80% |
| Stripe Fees | 3% revenue | N/A |
| Monitoring | $50 | 80% |
| **Total** | **$350** | **80%** |

## 9. Runbook: Common Issues

### High Error Rate
1. Check Sentry for error patterns
2. Check recent deployments
3. Check external dependencies (Firebase, Stripe)
4. Rollback if recent deploy

### High Latency
1. Check database query performance
2. Check external API latency
3. Check resource utilization
4. Scale horizontally

### Payment Failures
1. Check Stripe Dashboard
2. Check webhook delivery
3. Check Firestore subscription sync
4. Contact Stripe support if needed

### High Churn
1. Analyze cancellation reasons
2. Check recent changes
3. Survey cancelled users
3. Implement retention campaigns

## 9. On-Call Schedule

### Rotation
- **Primary**: 1 week on, 1 week off
- **Secondary**: Backup for primary
- **Escalation**: Engineering lead → CTO

### Handoff Checklist
- [ ] Active incidents
- [ ] Upcoming deployments
- [ ] Known issues
- [ ] Recent alerts

## 10. Monthly Review

### Review Meeting Agenda
1. **Metrics Review** (15 min)
   - Key metrics vs targets
   - Trends analysis
2. **Incident Review** (15 min)
   - Incident count/severity
   - Action item status
3. **Capacity Planning** (10 min)
   - Resource utilization
   - Scaling needs
4. **Security Review** (10 min)
   - Vulnerabilities
   - Access audits
5. **Action Items** (10 min)
   - New items
   - Owners & deadlines

## 10. Tools Stack Summary

| Category | Tool | Cost |
|----------|------|------|
| APM | Sentry | $26/mo |
| Infrastructure | Prometheus + Grafana | Self-hosted |
| Uptime | UptimeRobot | Free/Pro |
| Logs | Loki (Grafana) | Self-hosted |
| Alerting | AlertManager + PagerDuty | $21/user |
| Error Tracking | Sentry | Included |
| Analytics | Plausible/GA | Free/$9 |

---

**Next Steps**: Configure all monitoring tools before launch, run fire drills, and establish on-call rotation.