import { Player } from "./player";

export interface InventoryItem {
  name: string;
  cost: number;
  dying: boolean;
  postBuy?: (player: Player) => void;
  endOfDay?: () => void;
}

export interface ShipItem extends InventoryItem {
  type: string;
  amount?: number;
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

  addItem(item: ShipItem | null): ShipItem | null {
    if (item == null) return null;
    this.inventory.push(item);
    return item;
  }

  removeItem(item: ShipItem) {
    const idx = this.inventory.indexOf(item);
    if (idx === -1) return;
    this.inventory.splice(idx, 1);
  }

  getItemsOf<I extends ShipItem>(type: string): Array<I> {
    return <I[]>this.inventory.filter((i) => i.type === type);
  }

  pruneItems() {
    this.inventory = this.inventory.filter((i) => !i.dying);
  }
}

export class FuelItem implements ShipItem {
  name: string;
  cost: number;
  amount: number;
  type: string;
  dying: boolean;

  constructor(name: string, cost: number, amount: number) {
    this.name = name;
    this.cost = cost;
    this.amount = amount;
    this.type = "fuel";
    this.dying = false;
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

  constructor(name, cost = 25, amount = 10, spoilDays = 3) {
    this.name = name;
    this.cost = cost;
    this.amount = amount;
    this.spoilDays = spoilDays;
    this.type = "food";
    this.dying = false;
  }

  private spoil() {
    this.amount = 0;
    this.name += " (spoiled)";
  }

  endOfDay() {
    if (this.spoilDays <= 0) {
      return;
    }
    this.spoilDays--;
    if (this.spoilDays <= 0) {
      this.spoil();
      return;
    }
  }

  getItemLabel() {
    return `food ${this.name}`;
  }
}
