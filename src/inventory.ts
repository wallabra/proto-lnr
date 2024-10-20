import { Engine, type ShipMakeup } from "./objects/shipmakeup";
import type { Player } from "./player";
import { DEFAULT_RESELL_FACTOR } from "./superstates/shop";
import {
  translateFoodName,
  translateFuelType,
  translateItemType,
} from "./internationalization";

export interface InventoryItem {
  name: string;
  cost: number;
  dying: boolean;
  integerAmounts?: boolean;
  amount?: number;
  weight: number;
  dropChance?: number;
  shopChance?: number | null;
  onRemove?(): void;
  shopInfo?(makeup?: ShipMakeup): string[];
  postBuy?(player: Player): void;
  endLevelUpdate?(player: Player): void;
  canConsolidate?(other: InventoryItem): boolean;
  getInventoryLabel?(makeup: ShipMakeup): string;
}

export interface ShipItem extends InventoryItem {
  type: string;
  getItemLabel: () => string;
  autoResell?(makeup: ShipMakeup): boolean;
}

export class ShipInventory {
  private inventory: ShipItem[];

  get items() {
    return this.inventory;
  }

  constructor() {
    this.inventory = [];
  }

  consolidateInventory() {
    let idx = 0;
    for (const item of this.inventory) {
      if (item.dying) continue;
      for (const otherItem of this.inventory.slice(idx + 1)) {
        if (otherItem.dying) continue;
        if (item.type !== otherItem.type) continue;
        if (item.canConsolidate == null) continue;
        if (!item.canConsolidate(otherItem)) continue;
        if (item.amount == null) item.amount = 1;
        item.amount += otherItem.amount ?? 1;
        otherItem.dying = true;
      }
      idx++;
    }
    this.pruneItems();
  }

  addItem(item: ShipItem | null): ShipItem | null {
    if (item == null) return null;
    this.inventory.push(item);
    this.consolidateInventory();
    return item;
  }

  removeItem(item: ShipItem) {
    if (item.onRemove) item.onRemove();
    const idx = this.inventory.indexOf(item);
    if (idx === -1) return false;
    this.inventory.splice(idx, 1);
    return true;
  }

  getItemsOf<I extends ShipItem>(type: string): I[] {
    return this.inventory.filter((i) => i.type === type) as I[];
  }

  pruneItems() {
    this.inventory = this.inventory.filter((i) => !i.dying);
  }

  endLevelUpdate(player: Player) {
    for (const item of this.inventory) {
      if (item.endLevelUpdate != null) item.endLevelUpdate(player);
    }
    this.pruneItems();
  }
}

export interface FuelItemArgs {
  name: string;
  cost: number;
  amount: number;
  weight: number;
}

export function computeResellCost(
  item: ShipItem,
  resellFactor = DEFAULT_RESELL_FACTOR,
): number {
  let repairFactor = 0;
  const damageableItem = item as ShipItem & {
    damage?: number;
    maxDamage: number;
    repairCostScale: number;
  };
  if (damageableItem.damage != null) {
    repairFactor = Math.min(
      item.cost * 0.9 /* leaving only the scraps! */,
      (damageableItem.damage / damageableItem.maxDamage) *
        damageableItem.repairCostScale *
        damageableItem.cost,
    );
  }
  return (item.cost - repairFactor) * (item.amount || 1) * resellFactor;
}

export class FuelItem implements ShipItem {
  name: string;
  cost: number;
  amount: number;
  type: string;
  dying: boolean;
  integerAmounts: boolean;
  weight: number;
  dropChance = 0.6;
  shopChance = 0.3;

  canConsolidate(other: FuelItem): boolean {
    return other.cost === this.cost && other.name === this.name;
  }

  constructor(args: FuelItemArgs) {
    this.name = args.name;
    this.cost = args.cost;
    this.amount = args.amount;
    this.type = "fuel";
    this.dying = false;
    this.integerAmounts = false;
    this.weight = args.weight;
  }

  getItemLabel() {
    return `${translateItemType("fuel")} ${translateFuelType(this.name)}`;
  }

  autoResell(makeup: ShipMakeup): boolean {
    return (
      makeup.parts.filter(
        (p) =>
          p instanceof Engine && p.fuelType != null && p.fuelType === this.name,
      ).length === 0
    );
  }
}

export interface FoodArgs {
  name: string;
  cost: number;
  amount: number;
  spoilDays: number;
  weight: number;
}

export class FoodItem implements ShipItem {
  name: string;
  cost: number;
  amount: number;
  spoilDays: number;
  type = "food";
  dying = false;
  integerAmounts = false;
  weight: number;
  dropChance = 0.5;
  shopChance = 0.7;

  canConsolidate(other: FoodItem): boolean {
    return other.spoilDays === this.spoilDays && other.name === this.name;
  }

  constructor(args: FoodArgs) {
    this.name = args.name;
    this.cost = args.cost;
    this.amount = args.amount;
    this.weight = args.weight;
    this.spoilDays = args.spoilDays;
  }

  private spoil() {
    this.amount = 0;
    this.name += " (spoiled)";
    this.dying = true;
  }

  endLevelUpdate(_player: Player) {
    if (this.spoilDays <= 0) {
      return;
    }
    this.spoilDays--;
    if (this.spoilDays <= 0) {
      this.spoil();
      return;
    }
  }

  shopInfo(): string[] {
    return ["days until spoiled: " + Math.ceil(this.spoilDays).toString()];
  }

  getItemLabel() {
    return `${translateItemType("food")} ${translateFoodName(this)}`;
  }

  autoResell(makeup: ShipMakeup): boolean {
    return makeup.crew.length === 0;
  }
}
