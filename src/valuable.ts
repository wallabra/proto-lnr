import type { ShipItem } from "./inventory";
import type { RandomRange, WeightedItem } from "./util";
import { maybeRangeInt, rwc } from "./util";
import random from "random";

export interface ValuableArgs {
  name: string;
  cost: number;
  amount?: number | RandomRange;
  weight?: number;
}

export class ValuableItem implements ShipItem {
  name: string;
  cost: number;
  amount: number;
  type = "valuable";
  integerAmounts = true;
  dying = false;
  weight: number;

  constructor(args: ValuableArgs) {
    this.name = args.name;
    this.cost = args.cost;
    this.amount = Math.round(maybeRangeInt(args.amount ?? 1));
    this.weight = args.weight ?? 20;
  }

  getItemLabel() {
    return `loot ${this.name}`;
  }
}

export const VALUABLE_DEFS: WeightedItem<ValuableArgs>[] = [
  {
    item: {
      cost: 200,
      name: "Royal Vase",
      weight: 3,
      amount: { min: 1, max: 3 },
    },
    weight: 3,
  },
  {
    item: {
      cost: 1000,
      name: "Gold Bar",
      weight: 0.1,
      amount: { min: 1, max: 25 },
    },
    weight: 2,
  },
  {
    item: {
      cost: 60,
      name: "Spice Jar",
      weight: 3,
      amount: { min: 2, max: 8 },
    },
    weight: 6,
  },
  {
    item: {
      cost: 30,
      name: "Mineral Ores",
      weight: 90,
      amount: { min: 3, max: 30 },
    },
    weight: 4,
  },
  {
    item: {
      cost: 130,
      name: "Golden Lamp",
      weight: 0.3,
    },
    weight: 3,
  },
  {
    item: {
      cost: 90,
      name: "Tribal Flutes",
      weight: 0.03,
      amount: { min: 1, max: 3 },
    },
    weight: 3,
  },
  {
    item: {
      cost: 350,
      name: "Golden Chalice",
      weight: 0.1,
      amount: { min: 1, max: 3 },
    },
    weight: 2.5,
  },
  {
    item: {
      cost: 800,
      name: "Golden Statuette",
      weight: 2,
    },
    weight: 6,
  },
  {
    item: {
      cost: 500,
      name: "Tribal Statue",
      weight: 7,
      amount: { min: 1, max: 2 },
    },
    weight: 3,
  },
];

export function randomValuable(): ValuableItem {
  return new ValuableItem(rwc(VALUABLE_DEFS));
}

export function makeBonusValuables(extraLoot: number): ValuableItem[] {
  const res: ValuableItem[] = [];
  let totalValue = random.uniform(300, 1500)() * extraLoot;

  while (totalValue > 0) {
    const valuable = randomValuable();
    res.push(valuable);
    totalValue -= valuable.cost * valuable.amount;
  }

  return res;
}
