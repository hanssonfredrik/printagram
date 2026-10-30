import { describe, expect, it } from 'vitest';
import { photoSourceFromId } from '../src/index.js';

describe('photoSourceFromId', () => {
  it('reads the source from the id prefix', () => {
    expect(photoSourceFromId('ig_17895695668004550')).toBe('instagram');
    expect(photoSourceFromId('ex_a1b2c3')).toBe('export');
    expect(photoSourceFromId('gp_AbC-photo_1')).toBe('googlephotos');
  });

  it('is null for unknown prefixes and missing ids', () => {
    expect(photoSourceFromId('zzz_1')).toBeNull();
    expect(photoSourceFromId('ig')).toBeNull();
    expect(photoSourceFromId('')).toBeNull();
    expect(photoSourceFromId(null)).toBeNull();
    expect(photoSourceFromId(undefined)).toBeNull();
  });
});
