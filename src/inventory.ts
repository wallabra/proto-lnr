import { ShipMakeup } from "./objects/shipmakeup";
import { Player } from "./player";

export interface InventoryItem {
  name: string;
  cost: number;
  postBuy?: (player: Player) => void;
  endOfDay?: () => void;
}

export interface ShipItem extends InventoryItem {
  applyToShip: (shipMakeup: ShipMakeup) => void;
}

export class FuelItem implements InventoryItem {
  name: string;
  cost: number;
  amount: number;

  constructor(name: string, cost: number, amount: number) {
    this.name = name;
    this.cost = cost;
    this.amount = amount;
  }
}

export class FoodItem implements InventoryItem {
  name: string;
  cost: number;
  amount: number;
  spoilDays: number;

  constructor(name, cost = 25, amount = 10, spoilDays = 3) {
    this.name = name;
    this.cost = cost;
    this.amount = amount;
    this.spoilDays = spoilDays;
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
}
