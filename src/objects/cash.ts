import Vec2 from "victor";
import Pickup from "./pickup";
import { PhysicsParams } from "./physics";
import { Ship } from "./ship";
import { PlayState } from "../superstates/play";

export interface CashPickupParams extends PhysicsParams {
  cash: number;
}

export default class CashPickup extends Pickup {
  cash: number;

  constructor(game: PlayState, pos: Vec2, params?: Partial<CashPickupParams>) {
    if (params == null) params = {};
    super(game, pos, params);
    this.cash = params.cash != null ? params.cash : 10;
  }

  collect(ship: Ship): void {
    ship.money += this.cash;
  }
}
