import type { Damageable } from "../combat/damageable";
import type { CannonballAmmo } from "../objects/shipmakeup";
import type { ObjectRenderInfo } from "../render";
import type { Physicable } from "../superstates/play";
import { randomChance, rwc, type WeightedItem } from "../util";
import { PROPELLER_GUM } from "./modifiers/gum";
import { NOXIOUS_GAS } from "./modifiers/noxious";

export interface Projectile extends Physicable {
  modifiers: Set<ProjectileModifier>;
}

export function projApplyDestroyModifiers(projectile: Projectile) {
  projectile.modifiers.forEach((mod) => {
    mod.onDestroy(projectile);
  });
}

export function projApplyHitModifiers(
  projectile: Projectile,
  target: Damageable,
) {
  projectile.modifiers.forEach((mod) => {
    mod.onHit(projectile, target);
  });
}

export function projRenderModifiers(
  info: ObjectRenderInfo,
  projectile: Projectile,
) {
  projectile.modifiers.forEach((mod) => {
    if (mod.render != null) {
      mod.render(info, projectile);
    }
  });
}

export interface ProjectileModifier {
  onDestroy(projectile: Projectile): void;
  onHit(projectile: Projectile, target: Damageable): void;
  render?(info: ObjectRenderInfo, projectile: Projectile): void;
  infoString: string;
}

export const ALL_MODIFIERS: WeightedItem<ProjectileModifier>[] = [
  { item: PROPELLER_GUM, weight: 4 },
  { item: NOXIOUS_GAS, weight: 1.5 },
];

const MAX_MODIFIERS = 3;
const MODIFIER_CHANCE = 0.3;

export function randomModifier(): ProjectileModifier {
  return rwc(ALL_MODIFIERS);
}

export function addModifiersToAmmo(ammo: CannonballAmmo) {
  let remaining = ALL_MODIFIERS.filter(
    (item) => !ammo.modifiers.has(item.item),
  );

  while (
    randomChance(MODIFIER_CHANCE) &&
    ammo.modifiers.size < MAX_MODIFIERS &&
    remaining.length > 0
  ) {
    const choice = rwc(remaining);
    ammo.modifiers.add(choice);
    remaining = remaining.filter((item) => item.item !== choice);
  }
}
