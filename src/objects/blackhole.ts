import type Victor from "victor";
import type { ObjectRenderInfo, Renderable } from "../render";
import type { Physicable, PlayState, Tickable } from "../superstates/play";
import type { PhysicsObject, PhysicsParams } from "./physics";
import type { Optional } from "utility-types";
import { unlerp } from "../util";
import { aoeExplosion } from "../combat/explosion";
import type { Ship } from "./ship";

export interface BlackholeParams {
  /*
   * The maximum strength of attraction, at the "event horizon" - similar to [Vacuum.suckStrength].
   */
  attractStrength: number;

  /*
   * The maximum amount of damage that [[Damageable]] objects receive at the "event horizon".
   */
  damagePerSecond: number;

  /*
   * The radius of attraction, beyond which objects are not affected by the attraction.
   */
  attractRadius: number;

  /*
   * The radius of damage, beyond which [[Damageable]] objects receive no damage.
   */
  damageRadius: number;

  /*
   * The exponent to apply to objects.
   *
   * This allows, for instance, to apply more attraction to heavy objects, to
   * smooth out the difference between those and small objects. Otherwise,
   * [[Ship]]s get sucked in very weakly and [[Pickup]] crates very strongly, or
   * ships not at all.
   *
   * Defaults to 0.5 (a square root).
   */
  objectWeightExponent: number;

  /**
   * The maximum amount of time this black hole may last in seconds.
   */
  maxDuration: number;

  /**
   * The instigator who can be held responsible for creating this black hole.
   */
  instigator: Ship | null;
}

export type BlackholeArgs = Optional<
  BlackholeParams,
  | "objectWeightExponent"
  | "attractStrength"
  | "attractRadius"
  | "damagePerSecond"
  | "damageRadius"
  | "maxDuration"
  | "instigator"
> &
  Partial<PhysicsParams>;

export class Blackhole
  implements Tickable, Renderable, Physicable, BlackholeParams
{
  state: PlayState;
  dying: boolean = false;
  phys: PhysicsObject;
  renderOrder = 1;
  type = "blackhole";

  // Blackhole parameters
  attractStrength: number;
  damagePerSecond: number;
  attractRadius: number;
  damageRadius: number;
  objectWeightExponent: number;
  maxDuration: number;
  instigator: Ship | null;

  constructor(state: PlayState, pos: Victor, args: BlackholeArgs) {
    this.attractRadius = args.attractRadius ?? 800;
    this.damageRadius = args.damageRadius ?? 200;
    this.attractStrength = args.attractStrength ?? 20000;
    this.damagePerSecond = args.damagePerSecond ?? 2000;
    this.maxDuration = args.maxDuration ?? 30;
    this.objectWeightExponent = args.objectWeightExponent ?? 0.5;
    this.instigator = args.instigator ?? null;
    this.phys = state.makePhysObj(pos, {
      size: this.damageRadius * 0.95,
      frozen: true,
      ...args,
    });
  }

  /**
   * The scale to apply to self rendering, affected by 'waning' (shrinkage
   * when approaching end of lifetime).
   */
  private ageWane(): number {
    if (this.phys.age < this.maxDuration * 0.8) {
      return 1;
    }

    return unlerp(this.maxDuration, this.maxDuration * 0.8, this.phys.age);
  }

  public render(info: ObjectRenderInfo): void {
    const { ctx, toScreen, scale } = info;
    const center = toScreen(this.phys.pos);
    const size = this.phys.size * scale * this.ageWane();

    // draw body
    ctx.fillStyle = "#508";
    ctx.save();
    ctx.globalAlpha = 0.1;
    ctx.globalCompositeOperation = "color-burn";
    for (let width = 1.0; width > 0.7; width -= 0.02) {
      ctx.beginPath();
      ctx.arc(center.x, center.y, width * size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // draw tentacles
    const numTentacles = 5;
    const angle = Math.PI * 0.25 * this.phys.age;

    for (let tentacle = 0; tentacle < numTentacles; tentacle++) {
      ctx.save();
      ctx.globalAlpha = 0.04;
      ctx.globalCompositeOperation = "color-burn";
      ctx.translate(center.x, center.y);
      ctx.rotate(angle + (tentacle / numTentacles) * Math.PI * 2);

      for (let width = 1.0; width > 0.8; width -= 0.04) {
        ctx.lineWidth = (width * size * 0.6) / numTentacles;
        ctx.strokeStyle = "#A9D";

        ctx.beginPath();
        ctx.moveTo(size * 0.5, 0);
        ctx.bezierCurveTo(
          // cp 1
          size * 1.2, // x
          -size * 0.2, // y

          // cp 2
          size * 2, // x
          size * 0.5, // y

          // end
          size * 2.5, // x
          size * 0.5, // y
        );
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  /**
   * Despawn once maxDuration is reached.
   */
  private checkAge(): void {
    if (this.phys.age > this.maxDuration) {
      this.dying = true;
    }
  }

  /**
   * Black hole interactions with the surrounding objects.
   *
   * Uses the [[aoeExplosion]] utility under the hood.
   */
  private objectInteractions(deltaTime: number): void {
    aoeExplosion(
      this.state,
      this.phys.pos,
      this.attractRadius,
      this.damagePerSecond,
      this.attractStrength,
      (obj) => obj !== this.instigator,
      (obj) => (obj === this.instigator ? 0 : 1),
      this.instigator,
      this.phys.height,
      this.objectWeightExponent,
      deltaTime,
    );
  }

  public tick(deltaTime: number): void {
    this.checkAge();
    if (this.dying) return;
    this.objectInteractions(deltaTime);
  }
}
