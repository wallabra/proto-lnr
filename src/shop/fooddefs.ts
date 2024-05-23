import { FoodArgs } from "../inventory";

interface ShopItemDef {
  shopRepeat?: number;
}

type ShopDef<A> = A & ShopItemDef;

export const FOODDEFS: ShopDef<FoodArgs>[] = [
  {
    name: "pancake",
    cost: 3,
    amount: 3,
    spoilDays: 4,
    shopRepeat: 2,
    weight: 0.2,
  },
  {
    name: "potato",
    cost: 5,
    amount: 6,
    spoilDays: 7,
    shopRepeat: 3,
    weight: 0.5,
  },
  { name: "cake", cost: 2.5, amount: 9, spoilDays: 2, weight: 0.8 },
  {
    name: "bread",
    cost: 1.5,
    amount: 8,
    spoilDays: 3,
    shopRepeat: 4,
    weight: 1.5,
  },
  {
    name: "crackers",
    cost: 2,
    amount: 4,
    spoilDays: 5,
    shopRepeat: 4,
    weight: 1,
  },
  {
    name: "tuna",
    cost: 2.8,
    amount: 6,
    spoilDays: 6,
    shopRepeat: 3,
    weight: 0.6,
  },
  {
    name: "sardines",
    cost: 2.3,
    amount: 4,
    spoilDays: 5,
    shopRepeat: 2,
    weight: 0.5,
  },
];
