import { rwc } from "../util";

export interface Rarity {
  rarity: number | "always";
}

interface GuaranteedRarity {
  rarity: number;
}

export function pickByRarity<T extends Rarity>(
  defs: T[],
  points: number | null = null,
  temperature = 0,
): T {
  const newDefs: (T & GuaranteedRarity)[] = defs.filter(
    (d) => d.rarity !== "always" && (points == null || d.rarity < points),
  ) as (T & GuaranteedRarity)[];
  const max = Math.max(...newDefs.map((d) => d.rarity));
  return newDefs[
    rwc(
      newDefs.map((d, i) => {
        return { item: i, weight: max / d.rarity };
      }),
      temperature,
    )
  ];
}
