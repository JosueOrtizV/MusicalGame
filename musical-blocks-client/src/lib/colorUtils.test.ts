import { describe, test, expect } from 'vitest';
import { hexToRgba } from './colorUtils';

describe('colorUtils - hexToRgba', () => {
  test('converts basic hex colors to rgba correctly', () => {
    expect(hexToRgba('#ffffff', 1)).toBe('rgba(255, 255, 255, 1)');
    expect(hexToRgba('#000000', 0.5)).toBe('rgba(0, 0, 0, 0.5)');
    expect(hexToRgba('#ff0000', 0.25)).toBe('rgba(255, 0, 0, 0.25)');
  });

  test('converts lowercase and mixed case hex colors', () => {
    expect(hexToRgba('#abcdef', 0.8)).toBe('rgba(171, 205, 239, 0.8)');
    expect(hexToRgba('#aBcDeF', 0.1)).toBe('rgba(171, 205, 239, 0.1)');
  });

  test('falls back to rose color for invalid hex values', () => {
    // Empty hex
    expect(hexToRgba('', 0.5)).toBe('rgba(244, 63, 94, 0.5)');
    // Hex without hash symbol
    expect(hexToRgba('ffffff', 0.5)).toBe('rgba(244, 63, 94, 0.5)');
    // Short hex format (not supported by this helper, should fallback)
    expect(hexToRgba('#fff', 0.5)).toBe('rgba(244, 63, 94, 0.5)');
    // Invalid length
    expect(hexToRgba('#ffffff12', 0.5)).toBe('rgba(244, 63, 94, 0.5)');
  });
});
