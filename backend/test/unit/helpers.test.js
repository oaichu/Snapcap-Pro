import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  generateId,
  getCurrentTimestamp,
  addDays,
  bytesToMB,
  mbToBytes,
  sanitizeFilename,
  getFileTypeFromDataUrl,
  extractBase64FromDataUrl,
  isValidDataUrl,
  calculateStorageUsed,
  isExpired,
  getRemainingDays,
} from '../../src/utils/helpers.js';

describe('Helpers Utility Functions', () => {
  describe('generateId', () => {
    test('should generate a unique string ID', () => {
      const id1 = generateId();
      const id2 = generateId();

      assert.ok(typeof id1 === 'string');
      assert.ok(typeof id2 === 'string');
      assert.notEqual(id1, id2);
    });
  });

  describe('getCurrentTimestamp', () => {
    test('should return a valid ISO date string', () => {
      const timestamp = getCurrentTimestamp();

      assert.ok(typeof timestamp === 'string');
      assert.doesNotThrow(() => new Date(timestamp).toISOString());
    });
  });

  describe('addDays', () => {
    test('should add days to a date correctly', () => {
      const baseDate = new Date('2024-01-01');
      const result = addDays(baseDate, 5);
      const expectedDate = new Date('2024-01-06');

      assert.equal(
        new Date(result).toISOString().split('T')[0],
        expectedDate.toISOString().split('T')[0]
      );
    });
  });

  describe('bytesToMB', () => {
    test('should convert bytes to megabytes correctly', () => {
      assert.equal(bytesToMB(1048576), 1);
      assert.equal(bytesToMB(2097152), 2);
      assert.equal(bytesToMB(5242880), 5);
    });
  });

  describe('mbToBytes', () => {
    test('should convert megabytes to bytes correctly', () => {
      assert.equal(mbToBytes(1), 1048576);
      assert.equal(mbToBytes(2), 2097152);
      assert.equal(mbToBytes(5), 5242880);
    });
  });

  describe('sanitizeFilename', () => {
    test('should remove invalid characters from filename', () => {
      assert.equal(sanitizeFilename('test<file>.txt'), 'test_file_.txt');
      assert.equal(sanitizeFilename('my file (1).png'), 'my_file__1_.png');
      assert.equal(sanitizeFilename('valid-name_123.png'), 'valid-name_123.png');
    });
  });

  describe('getFileTypeFromDataUrl', () => {
    test('should extract MIME type from data URL', () => {
      assert.equal(getFileTypeFromDataUrl('data:image/png;base64,abc'), 'image/png');
      assert.equal(getFileTypeFromDataUrl('data:video/webm;base64,abc'), 'video/webm');
      assert.equal(getFileTypeFromDataUrl('invalid'), null);
    });
  });

  describe('extractBase64FromDataUrl', () => {
    test('should extract base64 data from data URL', () => {
      assert.equal(extractBase64FromDataUrl('data:image/png;base64,ABC123'), 'ABC123');
      assert.equal(extractBase64FromDataUrl('data:video/webm;base64,XYZ789'), 'XYZ789');
    });
  });

  describe('isValidDataUrl', () => {
    test('should validate data URL format', () => {
      assert.equal(isValidDataUrl('data:image/png;base64,abc'), true);
      assert.equal(isValidDataUrl('https://example.com/image.png'), false);
      assert.equal(isValidDataUrl(''), false);
      assert.equal(isValidDataUrl(null), false);
    });
  });

  describe('calculateStorageUsed', () => {
    test('should calculate total storage from captures', () => {
      const captures = [{ sizeMB: 1.5 }, { sizeMB: 2.3 }, { sizeMB: 0.8 }];

      assert.equal(calculateStorageUsed(captures), 4.6);
    });

    test('should return 0 for empty array', () => {
      assert.equal(calculateStorageUsed([]), 0);
    });
  });

  describe('isExpired', () => {
    test('should check if date is expired', () => {
      const pastDate = new Date(Date.now() - 86400000).toISOString();
      const futureDate = new Date(Date.now() + 86400000).toISOString();

      assert.equal(isExpired(pastDate), true);
      assert.equal(isExpired(futureDate), false);
    });
  });

  describe('getRemainingDays', () => {
    test('should calculate remaining days correctly', () => {
      const futureDate = new Date(Date.now() + 5 * 86400000).toISOString();
      const pastDate = new Date(Date.now() - 86400000).toISOString();

      assert.equal(getRemainingDays(futureDate), 5);
      assert.equal(getRemainingDays(pastDate), 0);
    });
  });
});
