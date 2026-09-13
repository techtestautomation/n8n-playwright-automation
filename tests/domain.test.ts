import test from 'node:test';
import assert from 'node:assert/strict';
import { validateAutomationRequest } from '../src/domain/automation.js';

test('validates a browser automation request', () => {
  assert.deepEqual(validateAutomationRequest({ url: 'https://example.com', captureScreenshot: true }), {
    url: 'https://example.com/', captureScreenshot: true, captureTrace: false
  });
});

test('rejects unsupported URL protocols', () => {
  assert.throws(() => validateAutomationRequest({ url: 'file:///etc/passwd' }), /http or https/);
});

test('rejects missing url', () => {
  assert.throws(() => validateAutomationRequest({}), /url is required/);
});
