# Stripe Production Setup Guide for SnapCap

## Overview
This guide walks through setting up Stripe for SnapCap's freemium subscription model.

## Prerequisites
- Stripe account (https://stripe.com)
- Business verified with Stripe
- Domain verified with Stripe

## Step 1: Create Products & Prices

### In Stripe Dashboard → Products

#### Free Plan (No Stripe product needed)
- Handled in application logic
- Limits enforced server-side

#### Pro Plan - Monthly
1. **Create Product:**
   - Name: "SnapCap Pro Monthly"
   - Description: "Unlimited captures, 5GB storage, cloud sync, priority support"
   - Type: Service (Recurring)

2. **Create Price:**
   - Pricing model: Standard pricing
   - Amount: $4.99 (or your pricing)
   - Currency: USD (or your currency)
   - Billing period: Monthly
   - Usage type: Licensed
   - **Copy Price ID:** `price_pro_monthly_xxx`

#### Pro Plan - Yearly (Optional)
1. **Create Product:**
   - Name: "SnapCap Pro Yearly"
   - Description: "Unlimited captures, 5GB storage, cloud sync, priority support - Save 20%"
   - Type: Service (Recurring)

2. **Create Price:**
   - Pricing model: Standard pricing
   - Amount: $47.99 (or your pricing)
   - Currency: USD
   - Billing period: Yearly
   - Usage type: Licensed
   - **Copy Price ID:** `price_pro_yearly_xxx`

## Step 2: Configure Webhooks

### In Stripe Dashboard → Developers → Webhooks

1. **Add Endpoint:**
   - URL: `https://your-domain.com/api/payment/webhook`
   - Events to select:
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`
     - `customer.created`
     - `customer.updated`

2. **Copy Signing Secret:**
   - Format: `whsec_xxxxxxxxxxxx`
   - Add to `.env.production`: `STRIPE_WEBHOOK_SECRET=whsec_xxx`

## Step 3: Configure API Keys

### In Stripe Dashboard → Developers → API Keys

**Test Mode (Development):**
- Publishable Key: `pk_test_xxx`
- Secret Key: `sk_test_xxx`

**Live Mode (Production):**
- Publishable Key: `pk_live_xxx`
- Secret Key: `sk_live_xxx`

Add to `.env.production`:
```bash
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_PRICE_ID=price_pro_monthly_xxx
```

## Step 4: Configure Customer Portal (Optional)

For self-service subscription management:

1. Dashboard → Settings → Billing → Customer portal
2. Enable: "Allow customers to update payment method"
2. Enable: "Allow customers to cancel subscription"
3. Enable: "Allow customers to download invoices"
4. Add link in extension settings: "Manage Subscription"

## Step 5: Configure Tax (If Required)

If you need to collect tax:
1. Dashboard → Settings → Tax
2. Enable automatic tax calculation
3. Add tax registrations for your jurisdictions

## Step 6: Test Mode Checklist

Before going live:

- [ ] Create test subscription with test card `4242 4242 4242 4242`
- [ ] Verify webhook receives events
- [ ] Test subscription creation via extension
- [ ] Test subscription cancellation
- [ ] Test webhook updates Firestore correctly
- [ ] Verify email receipts sent
- [ ] Test with expired card `4000 0000 0000 0069`

## Step 7: Go Live Checklist

- [ ] Switch to Live API keys
- [ ] Update webhook endpoint to production URL
- [ ] Verify webhook signing secret
- [ ] Test with real card (small amount)
- [ ] Enable "Send email receipts" in Stripe settings
- [ ] Configure branding in Stripe Dashboard
- [ ] Set up email domain for receipts
- [ ] Configure refund policy

## Step 8: Monitoring & Alerts

### Recommended Alerts (Stripe Dashboard → Settings → Alerts)
- [ ] Failed payments > 5% in 1 hour
- [ ] Dispute rate > 0.5%
- [ ] Refund rate > 5%
- [ ] Subscription cancellation rate > 10%

## Step 9: Compliance

### PCI DSS
- Stripe handles PCI compliance
- Your extension never touches card data
- Ensure HTTPS on all payment pages

### GDPR/CCPA
- Stripe processes data as processor
- Include Stripe in your Privacy Policy
- DPA with Stripe (included in Stripe terms)

## Step 10: Revenue Recognition (Optional)

For proper accounting:
1. Dashboard → Settings → Revenue recognition
2. Configure based on your accounting standards

## Environment Variables Summary

```bash
# .env.production
STRIPE_SECRET_KEY=sk_live_xxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxx
STRIPE_PRICE_ID=price_pro_monthly_xxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxxxxxxx  # For extension if needed
```

## Testing Commands

```bash
# Test webhook locally with Stripe CLI
stripe listen --forward-to localhost:3000/api/payment/webhook

# Trigger test events
stripe trigger customer.subscription.created
stripe trigger invoice.payment_succeeded
stripe trigger invoice.payment_failed

# List webhooks
stripe webhook_endpoints list
```

## Support Links

- Stripe Docs: https://stripe.com/docs
- Stripe Subscriptions: https://stripe.com/docs/billing/subscriptions
- Stripe Webhooks: https://stripe.com/docs/webhooks
- Stripe Testing: https://stripe.com/docs/testing
- Stripe Support: https://support.stripe.com