import type Victor from "victor";
import type { PlayState } from "../superstates/play";
import { isDamageable } from "./damageable";

export function aoeExplosion(
  state: PlayState,
  at: Victor,
  radius: number,
  damage: number,
  knockback = 10000,
) {
  for (const { obj, offs } of state.objectsInRadius(at, radius)) {
    if (!isDamageable(obj)) continue;

    const dist = offs.length();
    const norm = offs.clone().norm();

    // inverse square damage relationship
    const power = 1 / (1 + Math.sqrt(dist));

    obj.takeDamage(damage * power);

    // deal knockback
    obj.phys.applyForce(null, norm.clone().multiplyScalar(power * knockback));
  }
}
