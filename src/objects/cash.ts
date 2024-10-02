import Victor from "victor";
import { Pickup } from "./pickup";
import { PhysicsParams } from "./physics";
import { Ship } from "./ship";
import { PlayState } from "../superstates/play";

export interface CashPickupParams extends PhysicsParams {
  cash: number;
}

export class CashPickup extends Pickup<CashPickupParams> {
  cash: number;
  mainColor = "#406220";

  constructor(game: PlayState, pos: Victor, params?: Partial<CashPickupParams>) {
    if (params == null) params = {};
    super(game, pos, params);
    this.cash = params.cash ?? 10;
  }

  collect(ship: Ship): void {
    console.log(`${ship.makeup.name} is collecting cash: $${this.cash}`);
    ship.giveMoney(this.cash);
  }
}
