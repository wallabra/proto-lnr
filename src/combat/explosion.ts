import type Victor from "victor";
import type { Physicable, PlayState } from "../superstates/play";
import { isDamageable } from "./damageable";
import { Ship } from "../objects/ship";

export function aoeExplosion(
  state: PlayState,
  at: Victor,
  radius: number,
  damage: number,
  knockback = 10000,
  filter: null | ((obj: Physicable) => boolean) = null,
  knockbackModifier: null | ((obj: Physicable) => number) = null,
  instigator: Ship | null = null,
  atHeight: number | null = null,
) {
  for (const { obj } of state.objectsInRadius(at, radius)) {
    if (filter != null && !filter(obj)) continue;

    const expInfo = { pos: at, height: atHeight ?? state.waterLevel + 0.001 };

    const rel3D = obj.phys.rel3DInfo(expInfo);
    const dist = rel3D.dist;
    const normXY = rel3D.normXY;
    const normZ = rel3D.normZ;

    // inverse square root damage relationship
    const power = 1 / (1 + Math.sqrt(dist));
    const myKnockback =
      power *
      knockback *
      (knockbackModifier == null ? 1 : knockbackModifier(obj));

    if (damage > 0 && isDamageable(obj)) {
      obj.takeDamage(damage * power);
      if (instigator != null && obj instanceof Ship) obj.aggro(instigator);
    }

    // deal knockback
    obj.phys.applyForce(null, normXY.clone().multiplyScalar(myKnockback));

    obj.phys.applyForceVert(null, normZ * myKnockback);

    obj.phys.applyForceVert(
      null,
      (power * knockback * Math.sqrt(obj.phys.weight)) / 100,
    );
  }
}
