import { Ship } from "../../objects/ship";
import type { ObjectRenderInfo } from "../../render";
import { randomChance } from "../../util";
import type { Damageable } from "../damageable";
import type { Projectile, ProjectileModifier } from "../projectile";
import random from "random";
import Victor from "victor";

const KILL_CHANCE = 0.4;

class NoxiousGasModifier implements ProjectileModifier {
  infoString = "anti-personnel noxious gas";

  onDestroy(): void {}

  onHit(_projectile: Projectile, target: Damageable): void {
    if (!(target instanceof Ship)) return;

    for (const crew of target.makeup.crew) {
      // small chance
      if (!randomChance(KILL_CHANCE)) continue;

      target.makeup.killCrew(crew);
    }
  }

  // draw flashing noxious particles
  render(info: ObjectRenderInfo, projectile: Projectile): void {
    const { ctx, toScreen } = info;

    const pos = toScreen(projectile.phys.pos);

    pos.add(
      new Victor(
        random.uniform(projectile.phys.size, projectile.phys.size * 1.5)(),
        0,
      ).rotate(Math.random() * Math.PI * 2),
    );

    ctx.fillStyle = "#2B09";
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

export const NOXIOUS_GAS = new NoxiousGasModifier();
