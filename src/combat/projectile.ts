import type { Damageable } from "../combat/damageable";
import type { ObjectRenderInfo } from "../render";
import type { Physicable } from "../superstates/play";
import type { WeightedItem } from "../util";
import { PROPELLER_GUM } from "./modifiers/gum";
import { NOXIOUS_GAS } from "./modifiers/noxious";

export interface Projectile extends Physicable {
  modifiers: Set<ProjectileModifier>;
}

export function projApplyDestroyModifiers(projectile: Projectile) {
  for (const mod of projectile.modifiers) {
    mod.onDestroy(projectile);
  }
}

export function projApplyHitModifiers(
  projectile: Projectile,
  target: Damageable,
) {
  for (const mod of projectile.modifiers) {
    mod.onHit(projectile, target);
  }
}

export function projRenderModifiers(
  info: ObjectRenderInfo,
  projectile: Projectile,
) {
  for (const mod of projectile.modifiers) {
    if (mod.render != null) {
      mod.render(info, projectile);
    }
  }
}

export interface ProjectileModifier {
  onDestroy(projectile: Projectile): void;
  onHit(projectile: Projectile, target: Damageable): void;
  render?(info: ObjectRenderInfo, projectile: Projectile): void;
}

export const ALL_MODIFIERS: WeightedItem<ProjectileModifier>[] = [
  { item: PROPELLER_GUM, weight: 4 },
  { item: NOXIOUS_GAS, weight: 1.5 },
];
