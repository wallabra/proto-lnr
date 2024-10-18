import random from "random";

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
  let cashStr = "$" + Math.abs(cash).toFixed(2);
  if (cash < 0) cashStr = "-" + cashStr;

  return cashStr;
}

export function weightString(weight: number) {
  if (weight < 10) return `${(weight * 1000).toFixed(0)}g`;
  if (weight > 1000) return `${(weight / 1000).toFixed(1)}t`;

  return `${weight.toFixed(1)}kg`;
}

export interface WeightedItem<T> {
  item: T;
  weight: number;
}

export function stripWeights<T>(items: WeightedItem<T>[]): T[] {
  return items.map((item) => item.item);
}

export function rwc<T>(items: WeightedItem<T>[], temperature: number = 0): T {
  const candidates = items.map((item) => item.item);
  const weights = items.map((item) => item.weight);

  // Interpolate weights toward mean depending on temperature
  // (0 = original weights, 1 = full random)
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  const averageWeight = totalWeight / weights.length;
  const thermalWeights = weights.map((weight) =>
    lerp(weight, averageWeight, temperature),
  );
  const totalThermalWeight = thermalWeights.reduce((a, b) => a + b, 0);

  let selection = random.uniform(0, totalThermalWeight)();

  for (const item of candidates) {
    const weight = thermalWeights.shift();

    if (weight == null) {
      throw new Error("weight and candidate array length mismatch");
    }

    if (selection < weight) {
      return item;
    }

    selection -= weight;
  }

  throw new Error("random weighted choice error");
}

export function randomChance(chance: number): boolean {
  return random.uniform(0, 1)() <= chance;
}

export function arrayCounter<T>(arr: T[]): Map<T, number> {
  const counted: Map<T, number> = new Map();

  for (const item of arr) {
    const count = counted.get(item);

    if (count === undefined) {
      counted.set(item, 1);
    } else {
      counted.set(item, count + 1);
    }
  }

  return counted;
}

export function maybeWeighted<A extends object>(
  from: A | WeightedItem<A>[],
): A {
  return from.constructor === Array ? rwc(from) : (from as A);
}

export interface RandomRange {
  min: number;
  max: number;
}

export function maybeRange(val: number | RandomRange): number {
  return typeof val === "number" ? val : random.uniformInt(val.min, val.max)();
}
