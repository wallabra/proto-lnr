export const umod = (a: number, b: number): number => ((a % b) + b) % b;
export const angDiff = (from: number, to: number): number =>
  umod(to - from + Math.PI, Math.PI * 2) - Math.PI;
export const lerp = (a: number, b: number, alpha: number): number =>
  (b - a) * alpha + a * (1 - alpha);

export function rgbString(rgb: [number, number, number]): string {
  return `rgb(${rgb.join(", ")})`;
}

export function interpColor(
  from: [number, number, number],
  to: [number, number, number],
  alpha: number,
): [number, number, number] {
  return <[number, number, number]>from.map((f, i) => lerp(f, to[i], alpha));
}
