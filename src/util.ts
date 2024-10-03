export const umod = (a: number, b: number): number => ((a % b) + b) % b;

export const angDiff = (from: number, to: number): number =>
  umod(to - from + Math.PI, Math.PI * 2) - Math.PI;

export const lerp = (a: number, b: number, alpha: number): number =>
  (b - a) * alpha + a;

export const unlerp = (a: number, b: number, val: number): number => {
  const clamped = Math.max(a, Math.min(b, val));
  return (clamped - a) / (b - a);
};

export function rgbString(rgb: [number, number, number]): string {
  return `rgb(${rgb.join(", ")})`;
}

export function interpColor(
  from: [number, number, number],
  to: [number, number, number],
  alpha: number,
): [number, number, number] {
  return from.map((f, i) => lerp(f, to[i], alpha)) as [number, number, number];
}

export function zeroPad(text: string, size: number) {
  return "0".repeat(size - text.length) + text;
}

export function moneyString(cash: number) {
  return "$" + cash.toFixed(2);
}

export function weightString(weight: number) {
  if (weight < 10) return `${(weight * 1000).toFixed(0)}g`;
  if (weight > 1000) return `${(weight / 1000).toFixed(1)}t`;

  return `${weight.toFixed(1)}kg`;
}
