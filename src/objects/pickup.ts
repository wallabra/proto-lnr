import Victor from "victor";
import type { ObjectRenderInfo } from "../render";
import type { PhysicsObject, PhysicsParams } from "./physics";
import type { Ship } from "./ship";
import type { PlayState, Tickable } from "../superstates/play";
import type { ShipItem } from "../inventory";

export function isPickup<T extends Partial<PhysicsParams>>(
  item: Tickable,
): item is Pickup<T> {
  return item.type === "pickup";
}

export abstract class Pickup<P extends Partial<PhysicsParams>> {
  play: PlayState;
  dying: boolean;
  phys: PhysicsObject;
  mainColor = "#6a4000";
  type = "pickup";
  private shrink = 0;

  constructor(play: PlayState, pos?: Victor, params?: Partial<P>) {
    if (params == null) params = {} as P;
    if (params.size == null) params.size = 4;
    if (params.angle == null) params.angle = Math.random() * Math.PI * 2;

    this.play = play;
    this.phys = this.play.makePhysObj(pos || new Victor(0, 0), {
      weight: 100,
      baseDrag: 8,
      buoyancy: 1.5,
      ...params,
    });
    this.dying = false;
  }

  /// Callback for when this crate item is collected.
  protected abstract collect(ship: Ship): void;

  public init(_ship: Ship): void {}

  private drawBox(
    ctx: CanvasRenderingContext2D,
    drawPos: Victor,
    size: number,
    offs: number,
  ) {
    ctx.beginPath();
    ctx.translate(drawPos.x, drawPos.y + offs);
    ctx.rotate(this.phys.angle);

    ctx.fillRect(-size, -size, size * 2, size * 2);

    ctx.resetTransform();
  }

  public render(info: ObjectRenderInfo) {
    const ctx = info.ctx;

    const drawPos = info.base
      .clone()
      .add(this.phys.pos.clone().subtract(info.cam).multiply(info.scaleVec));
    const camheight = 4;
    const cdist =
      (drawPos.clone().subtract(info.base).length() / info.largeEdge) * 0.5;
    const hdist = camheight - this.phys.height / 2;
    const proximityScale = camheight / new Victor(hdist, cdist).length();
    const size =
      ((1 - this.shrink) * (this.phys.size * proximityScale * info.scale)) /
      Math.pow(2, 1 / 4);

    if (hdist < 0.1) {
      return;
    }

    const hoffs = this.phys.height * 20 + this.phys.size / 2;
    const shoffs = Math.max(
      0,
      hoffs - Math.max(this.phys.floor, this.play.waterLevel) * 20,
    );

    // Draw shadow
    ctx.fillStyle = "#0008";
    this.drawBox(ctx, drawPos, size, shoffs);

    // Draw body
    ctx.fillStyle = this.mainColor;
    this.drawBox(ctx, drawPos, size, 0);
    ctx.fillStyle = "#00000048";
    this.drawBox(ctx, drawPos, size - 4, 0);
  }

  public destroy() {
    this.dying = true;
    this.phys.dying = true;
  }

  private checkShipCollision(_deltaTime: number, ship: Ship): boolean {
    const closeness = this.phys.touchingShip(ship);
    if (closeness <= this.phys.size) {
      return false;
    }

    this.phys.playSound("pickup", 0.2);
    this.collect(ship);
    this.destroy();
    return true;
  }

  protected checkShipCollisions(deltaTime: number) {
    for (const ship of this.play.tickables) {
      if (ship.type !== "ship") {
        continue;
      }

      if (ship.dying) {
        return;
      }

      if (this.checkShipCollision(deltaTime, ship as Ship)) {
        break;
      }
    }
  }

  protected bob(deltaTime: number) {
    if (!this.phys.inWater()) return;

    this.phys.applyForce(
      deltaTime,
      new Victor(Math.random() * 1, 0)
        .rotateBy(Math.random() * Math.PI * 2)
        .add(this.phys.vel.multiplyScalar(0.3)),
    );

    this.phys.angVel += ((Math.random() * Math.PI) / 4) * deltaTime;
  }

  public tick(deltaTime: number) {
    if (this.phys.age > 300) {
      this.destroy();
      return;
    }
    if (this.phys.age > 285) {
      this.shrink = (this.phys.age - 285) / 15;
    }
    if (this.phys.tickAge === 1) {
      this.phys.immovable = false;
    }
    this.bob(deltaTime);
    this.checkShipCollisions(deltaTime);
  }
}

export class DebugPickup extends Pickup<PhysicsParams> {
  protected override checkShipCollisions() {
    // not pickuppable
  }

  protected override collect(): void {
    // do nothing
  }
}

export type ItemPickupParams<I extends ShipItem> = Partial<PhysicsParams> & {
  item: I;
};
export type ItemPickupParamType<I extends ShipItem> = PhysicsParams & {
  item: I;
};

export class ItemPickup<I extends ShipItem> extends Pickup<
  ItemPickupParams<I>
> {
  item: I;

  constructor(game: PlayState, pos: Victor, params: ItemPickupParams<I>) {
    super(game, pos, params);
    this.item = params.item;
  }

  public override init(): void {
    this.phys.weight += this.item.weight * (this.item.amount ?? 1);
  }

  protected override collect(ship: Ship): void {
    ship.makeup.inventory.addItem(this.item);
  }
}
