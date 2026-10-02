import { describe, expect, it } from 'vitest';
import { analyticsAvailable } from './analytics';

const nav = (extra: Record<string, unknown> = {}) =>
  ({ webdriver: false, doNotTrack: null, ...extra }) as unknown as Navigator;

describe('analyticsAvailable', () => {
  it('only on the production hosts', () => {
    expect(analyticsAvailable('inbunden.com', nav())).toBe(true);
    expect(analyticsAvailable('www.inbunden.com', nav())).toBe(true);
    expect(analyticsAvailable('localhost', nav())).toBe(false);
    expect(
      analyticsAvailable('green-glacier-0dadae803-12.westeurope.5.azurestaticapps.net', nav()),
    ).toBe(false);
  });

  it('never in automated browsers (prerender, e2e)', () => {
    expect(analyticsAvailable('inbunden.com', nav({ webdriver: true }))).toBe(false);
  });

  it('treats Global Privacy Control and Do Not Track as declined', () => {
    expect(analyticsAvailable('inbunden.com', nav({ globalPrivacyControl: true }))).toBe(false);
    expect(analyticsAvailable('inbunden.com', nav({ doNotTrack: '1' }))).toBe(false);
  });
});
