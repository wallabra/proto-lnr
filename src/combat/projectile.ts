import type Victor from "victor";
import type { Damageable } from "../combat/damageable";
import type { Game } from "../game";
import type { CannonballAmmo } from "../objects/shipmakeup";
import type { ObjectRenderInfo } from "../render";
import type { Physicable } from "../superstates/play";
import { PlayState } from "../superstates/play";
import { randomChance, rwc, type WeightedItem } from "../util";
import { EXPLOSIVES } from "./modifiers/explosive";
import { PROPELLER_GUM } from "./modifiers/gum";
import { HOMING } from "./modifiers/homing";
import { INCENDIARY } from "./modifiers/incendiary";
import { NOXIOUS_GAS } from "./modifiers/noxious";
import { REPULSION_DISC } from "./modifiers/repulsion";
import { SPIN_CHARGE } from "./modifiers/spincharge";
import { BLACKHOLE } from "./modifiers/blackhole";

export interface Projectile extends Physicable {
  projectileFlag: null;

  game: Game | PlayState;
  modifiers: Set<ProjectileModifier>;
  instigator?: Physicable & Damageable;

  airtime(): number;
  predictFall?(): Victor;
}

export function isProjectile(obj: Physicable): obj is Projectile {
  return (
    "airtime" in obj &&
    typeof obj.airtime === "function" &&
    "modifiers" in obj &&
    obj.modifiers instanceof Set &&
    "projectileFlag" in obj &&
    obj.projectileFlag === null
  );
}

export function getPlayStateFromProj(proj: Projectile): PlayState {
  return proj.game instanceof PlayState
    ? proj.game
    : (proj.game.state as PlayState);
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

export function projTickModifiers(deltaTime: number, projectile: Projectile) {
  projectile.modifiers.forEach((mod) => {
    if (mod.tick != null) {
      mod.tick(deltaTime, projectile);
    }
  });
}

export interface ProjectileModifier {
  name: string;
  onDestroy(projectile: Projectile): void;
  onHit(projectile: Projectile, target: Damageable): void;
  tick?(deltaTime: number, projectile: Projectile): void;
  render?(info: ObjectRenderInfo, projectile: Projectile): void;
  infoString: string;
}

export const ALL_MODIFIERS: WeightedItem<ProjectileModifier>[] = [
  { item: PROPELLER_GUM, weight: 4 },
  { item: NOXIOUS_GAS, weight: 1.5 },
  { item: REPULSION_DISC, weight: 3 },
  { item: SPIN_CHARGE, weight: 2.5 },
  { item: EXPLOSIVES, weight: 2 },
  { item: INCENDIARY, weight: 2 },
  { item: HOMING, weight: 1 },
  { item: BLACKHOLE, weight: 0.3 },
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
