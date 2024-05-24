import { ShipMakeup } from "./objects/shipmakeup";
import { Player } from "./player";

export interface InventoryItem {
  name: string;
  cost: number;
  dying: boolean;
  integerAmounts?: boolean;
  amount?: number;
  weight: number;
  dropChance?: number;
  onRemove?(): void;
  shopInfo?(makeup?: ShipMakeup): string[];
  postBuy?(player: Player): void;
  endLevelUpdate?(player: Player): void;
  canConsolidate?(other: unknown & InventoryItem): boolean;
  getInventoryLabel?(makeup: ShipMakeup): string;
}

export interface ShipItem extends InventoryItem {
  type: string;
  getItemLabel: () => string;
}

export class ShipInventory {
  private inventory: Array<ShipItem>;

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
        console.log(`Consolidated ${otherItem.getItemLabel()} into ${item.getItemLabel()}`);
        item.amount += otherItem.amount;
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

  getItemsOf<I extends ShipItem>(type: string): Array<I> {
    return <I[]>this.inventory.filter((i) => i.type === type);
  }

  pruneItems() {
    this.inventory = this.inventory.filter((i) => !i.dying && i.amount > 0);
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

export class FuelItem implements ShipItem {
  name: string;
  cost: number;
  amount: number;
  type: string;
  dying: boolean;
  integerAmounts: boolean;
  weight: number;
  dropChance: number = 0.6;

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
    return `fuel ${this.name}`;
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
  type: string;
  dying: boolean;
  integerAmounts: boolean;
  weight: number;
  dropChance: number = 0.5;

  canConsolidate(other: FoodItem): boolean {
    return other.spoilDays === this.spoilDays && other.name === this.name;
  }

  constructor(args: FoodArgs) {
    this.name = args.name;
    this.cost = args.cost;
    this.amount = args.amount;
    this.weight = args.weight;
    this.spoilDays = args.spoilDays;
    this.type = "food";
    this.dying = false;
    this.integerAmounts = false;
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
    return ["days until spoiled: " + Math.ceil(this.spoilDays)];
  }

  getItemLabel() {
    return `food ${this.name}`;
  }
}
