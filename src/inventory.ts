import { PhysicsParams } from "./objects/physics";
import Pickup from "./objects/pickup";
import { Ship } from "./objects/ship";
import { ShipMakeup } from "./objects/shipmakeup";
import { Player } from "./player";
import { PlayState } from "./superstates/play";
import Vec2 from 'victor';

export interface InventoryItem {
  name: string;
  cost: number;
  dying: boolean;
  postBuy?: (player: Player) => void;
  endOfDay?: () => void;
}

export interface ShipItem extends InventoryItem {
  type: string;
  getItemLabel: () => string;
}

export type ItemPickupParams<I extends ShipItem> = Partial<PhysicsParams> & { item: I };
export type ItemPickupParamType<I extends ShipItem> = PhysicsParams & { item: I };

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
  
  getItemsOf<I extends ShipItem>(type: string): Array<I> {
    return <I[]> this.inventory.filter((i) => i.type === type);
  }
  
  pruneItems() {
    this.inventory = this.inventory.filter((i) => !i.dying);
  }
}

export class ItemPickup<I extends ShipItem> extends Pickup {
  item: I;

  constructor(game: PlayState, pos: Vec2, params: ItemPickupParams<I>) {
    super(game, pos, params);
    this.item = params.item;
  }

  collect(ship: Ship): void {
    ship.makeup.inventory.addItem(this.item);
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
    this.type = 'fuel';
    this.dying = false;
  }
  
  getItemLabel() {
    return `fuel {this.name}`
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
    this.type = 'food';
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
    return `{this.name}`
  }
}
