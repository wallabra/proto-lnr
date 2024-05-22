import { Player } from "./player";

export interface InventoryItem {
  name: string;
  cost: number;
  dying: boolean;
  integerAmounts?: boolean;
  amount?: number;
  shopInfo?(): string[];
  postBuy?(player: Player): void;
  endOfDay?(player: Player): void;
  canConsolidate?(other: unknown & InventoryItem): boolean;
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
    const idx = this.inventory.indexOf(item);
    if (idx === -1) return false;
    this.inventory.splice(idx, 1);
    return true;
  }

  getItemsOf<I extends ShipItem>(type: string): Array<I> {
    return <I[]>this.inventory.filter((i) => i.type === type);
  }

  pruneItems() {
    this.inventory = this.inventory.filter((i) => !i.dying);
  }

  endOfDay(player: Player) {
    for (const item of this.inventory) {
      item.endOfDay(player);
    }
  }
}

export class FuelItem implements ShipItem {
  name: string;
  cost: number;
  amount: number;
  type: string;
  dying: boolean;
  integerAmounts: boolean;

  canConsolidate(other: FuelItem): boolean {
    return other.cost === this.cost && other.name === this.name;
  }

  constructor(name: string, cost: number, amount: number) {
    this.name = name;
    this.cost = cost;
    this.amount = amount;
    this.type = "fuel";
    this.dying = false;
    this.integerAmounts = false;
  }

  getItemLabel() {
    return `fuel ${this.name}`;
  }
}

export class FoodItem implements ShipItem {
  name: string;
  cost: number;
  amount: number;
  spoilDays: number;
  type: string;
  dying: boolean;
  integerAmounts: boolean;

  canConsolidate(other: FoodItem): boolean {
    return other.spoilDays === this.spoilDays && other.name === this.name;
  }

  constructor(name, cost = 25, amount = 10, spoilDays = 3) {
    this.name = name;
    this.cost = cost;
    this.amount = amount;
    this.spoilDays = spoilDays;
    this.type = "food";
    this.dying = false;
    this.integerAmounts = false;
  }

  private spoil() {
    this.amount = 0;
    this.name += " (spoiled)";
    this.dying = true;
  }

  endOfDay(_player: Player) {
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
