import { test } from 'node:test';
import assert from 'node:assert/strict';
import config from '../../src/config.js';

// SnapCap is 100% free for the community: the "free" tier must expose the same
// features and limits as the legacy "pro" tier (kept as a label only).
test('free and pro tiers expose identical feature sets', () => {
  const freeFeatures = [...config.subscription.free.features].sort();
  const proFeatures = [...config.subscription.pro.features].sort();
  assert.deepEqual(freeFeatures, proFeatures);
});

test('every planned feature is unlocked on the free (community) tier', () => {
  const expected = [
    'screenshot',
    'recording',
    'basic_editing',
    'full_page_capture',
    'screen_recording',
    'blur_redaction',
    'cloud_sync',
    'priority_support',
  ];
  for (const feature of expected) {
    assert.ok(
      config.subscription.free.features.includes(feature),
      `free tier should include "${feature}"`
    );
  }
});

test('free limits are generous enough to never gate real usage', () => {
  assert.ok(config.subscription.free.maxCaptures >= 10000);
  assert.ok(config.subscription.free.maxStorageMB >= 1000);
  assert.ok(config.subscription.free.maxRecordingSeconds >= 600);
});
