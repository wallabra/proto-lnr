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
) {
  for (const { obj, offs } of state.objectsInRadius(at, radius)) {
    if (filter != null && !filter(obj)) continue;

    const dist = offs.length();
    const norm = offs.clone().norm();

    // inverse square damage relationship
    const power = 1 / (1 + Math.sqrt(dist));

    if (damage > 0 && isDamageable(obj)) {
      obj.takeDamage(damage * power);
      if (instigator != null && obj instanceof Ship) obj.aggro(instigator);
    }

    // deal knockback
    obj.phys.applyForce(
      null,
      norm
        .clone()
        .multiplyScalar(
          power *
            knockback *
            (knockbackModifier == null ? 1 : knockbackModifier(obj)),
        ),
    );
  }
}
