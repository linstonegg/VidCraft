import { describe, expect, it } from 'vitest';

import { sanitizeCanvasPoint, sanitizeLayout } from '../presentation';

describe('presentation layout sanitize', () => {
  it('rejects NaN and Infinity', () => {
    expect(sanitizeCanvasPoint({ x: Number.NaN, y: Infinity })).toEqual({
      x: 0,
      y: 0,
    });
  });

  it('clamps coordinates into the private canvas range', () => {
    expect(sanitizeCanvasPoint({ x: 9999, y: -9999 })).toEqual({
      x: 200,
      y: -120,
    });
  });

  it('sanitizes every entry in a layout map', () => {
    expect(sanitizeLayout({ a: { x: 'abc', y: 20 } })).toEqual({
      a: { x: 0, y: 20 },
    });
  });
});
