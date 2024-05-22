import { FoodArgs } from "../inventory";

interface ShopItemDef {
  shopRepeat?: number;
}

type ShopDef<A> = A & ShopItemDef;

export const FOODDEFS: ShopDef<FoodArgs>[] = [
  { name: "pancake", cost: 3, amount: 6, spoilDays: 4, shopRepeat: 2 },
  { name: "potato", cost: 5, amount: 3, spoilDays: 7, shopRepeat: 3 },
  { name: "cake", cost: 2.5, amount: 9, spoilDays: 2 },
  { name: "bread", cost: 1.5, amount: 3, spoilDays: 3, shopRepeat: 4 },
  { name: "crackers", cost: 2, amount: 4, spoilDays: 5, shopRepeat: 4 },
  { name: "bread", cost: 1.5, amount: 5, spoilDays: 3 },
  { name: "tuna", cost: 2.8, amount: 4, spoilDays: 6, shopRepeat: 2 },
  { name: "sardines", cost: 2.3, amount: 3, spoilDays: 5 },
];
