export function intensityColor(value: number, max: number, hue = 205) {
  const ratio = max > 0 ? Math.max(0.08, Math.min(1, value / max)) : 0.08;
  return `hsl(${hue} 78% ${92 - ratio * 48}%)`;
}

export function divergingColor(value: number, min: number, max: number) {
  if (max === min) return 'hsl(205 35% 86%)';
  const ratio = (value - min) / (max - min);
  const hue = 18 + ratio * 180;
  return `hsl(${hue} 70% ${88 - Math.abs(ratio - 0.5) * 46}%)`;
}

export function formatNumber(value: number | undefined, digits = 0) {
  if (value === undefined || Number.isNaN(value)) return '';
  return value.toLocaleString(undefined, { maximumFractionDigits: digits });
}
