import { describe, expect, it, vi } from 'vitest';
import type * as AzureFunctions from '@azure/functions';

vi.mock('@azure/functions', async (orig) => {
  const mod = await orig<typeof AzureFunctions>();
  return { ...mod, app: { ...mod.app, http: () => undefined } };
});

const { cleanPath, deviceOf, refHost } = await import('../src/functions/visits.js');

describe('visit beacon helpers', () => {
  it('cleanPath drops query, hash, trailing slash and api paths; masks tokens', () => {
    expect(cleanPath('/guides/print/?utm=1#x')).toBe('/guides/print');
    expect(cleanPath('/')).toBe('/');
    expect(cleanPath('/api/me')).toBeNull();
    expect(cleanPath('https://evil.example/')).toBeNull();
    expect(cleanPath('/s/abc123')).toBe('/s/:token');
    expect(cleanPath('/r/abc123')).toBe('/r/:token');
    expect(cleanPath('/reset/abc123')).toBe('/reset/:token');
    expect(cleanPath('/done/01abc')).toBe('/done/:orderId');
    expect(cleanPath('/' + 'a'.repeat(300))).toBeNull();
    expect(cleanPath(42)).toBeNull();
  });

  it('refHost keeps only external hosts', () => {
    expect(refHost('https://www.google.com/search?q=x', 'inbunden.com')).toBe('google.com');
    expect(refHost('https://inbunden.com/sv', 'inbunden.com')).toBe('');
    expect(refHost('https://www.inbunden.com/', 'inbunden.com')).toBe('');
    expect(refHost('not a url', 'inbunden.com')).toBe('');
    expect(refHost('', 'inbunden.com')).toBe('');
  });

  it('deviceOf classifies common user agents', () => {
    expect(deviceOf('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Mobile/15E148')).toBe(
      'mobile',
    );
    expect(deviceOf('Mozilla/5.0 (Linux; Android 14; Pixel 8) Mobile Safari/537.36')).toBe(
      'mobile',
    );
    expect(deviceOf('Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)')).toBe('tablet');
    expect(deviceOf('Mozilla/5.0 (Linux; Android 14; SM-X710) Safari/537.36')).toBe('tablet');
    expect(deviceOf('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/140.0')).toBe('desktop');
  });
});
