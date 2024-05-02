export const umod = (a: number, b: number): number => ((a % b) + b) % b;
export const angDiff = (from: number, to: number): number =>
  umod(to - from + Math.PI, Math.PI * 2) - Math.PI;
export const lerp = (a: number, b: number, alpha: number): number =>
  (b - a) * alpha + a * (1 - alpha);
