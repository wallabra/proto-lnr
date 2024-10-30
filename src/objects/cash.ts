import type Victor from "victor";
import { Pickup } from "./pickup";
import type { PhysicsParams } from "./physics";
import type { Ship } from "./ship";
import type { PlayState } from "../superstates/play";

export interface CashPickupParams extends PhysicsParams {
  cash: number;
}

export class CashPickup extends Pickup<CashPickupParams> {
  cash: number;
  override mainColor = "#406220";

  constructor(
    game: PlayState,
    pos: Victor,
    params?: Partial<CashPickupParams>,
  ) {
    if (params == null) params = {};
    params = {
      weight: 5,
      buoyancy: 0.2,
      size: 3,
      ...params,
    };
    super(game, pos, params);
    this.cash = params.cash ?? 10;
  }

  protected override collect(ship: Ship): void {
    ship.giveMoney(this.cash);
  }

  protected override doCollectMessage(ship: Ship): void {
    ship.play.addTickerMessage(
      {
        amount: this.cash,
        color: "#0F0",
      },
      8,
    );
  }
}
