/**
 * Helper to convert hex color to rgba for dynamic neon shadows and backgrounds
 */
export function hexToRgba(hex: string, alpha: number): string {
  if (!hex || !hex.startsWith('#') || hex.length !== 7) {
    return `rgba(244, 63, 94, ${alpha})`; // fallback to rose
  }
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
