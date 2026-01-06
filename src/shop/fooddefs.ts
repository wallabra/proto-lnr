import type { FoodArgs } from "../inventory";

interface ShopItemDef {
	shopRepeat?: number;
}

type ShopDef<A> = A & ShopItemDef;

export const FOODDEFS: ShopDef<FoodArgs>[] = [
	{
		name: "pancake",
		cost: 3,
		amount: 12,
		spoilDays: 4,
		shopRepeat: 2,
		weight: 0.2,
	},
	{
		name: "potato",
		cost: 5,
		amount: 20,
		spoilDays: 7,
		shopRepeat: 3,
		weight: 0.5,
	},
	{ name: "cake", cost: 2.5, amount: 9, spoilDays: 2, weight: 0.8 },
	{
		name: "bread",
		cost: 1.5,
		amount: 12,
		spoilDays: 3,
		shopRepeat: 5,
		weight: 1.5,
	},
	{
		name: "crackers",
		cost: 2,
		amount: 8,
		spoilDays: 7,
		shopRepeat: 3,
		weight: 1,
	},
	{
		name: "tuna",
		cost: 2.8,
		amount: 7,
		spoilDays: 6,
		shopRepeat: 3,
		weight: 0.6,
	},
	{
		name: "sardines",
		cost: 2.3,
		amount: 5,
		spoilDays: 5,
		shopRepeat: 2,
		weight: 0.5,
	},
];
