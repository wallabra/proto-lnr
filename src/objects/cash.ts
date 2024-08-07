import Vec2 from "victor";
import { Pickup } from "./pickup";
import { PhysicsParams } from "./physics";
import { Ship } from "./ship";
import { PlayState } from "../superstates/play";

export interface CashPickupParams extends PhysicsParams {
  cash: number;
}

export class CashPickup extends Pickup<CashPickupParams> {
  cash: number;

  constructor(game: PlayState, pos: Vec2, params?: Partial<CashPickupParams>) {
    if (params == null) params = {};
    super(game, pos, params);
    this.cash = params.cash ?? 10;
  }

  collect(ship: Ship): void {
    ship.giveMoney(this.cash);
  }
}
