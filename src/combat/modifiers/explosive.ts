import type { ObjectRenderInfo } from "../../render";
import { aoeExplosion } from "../explosion";
import {
  getPlayStateFromProj,
  type Projectile,
  type ProjectileModifier,
} from "../projectile";

class ExplosiveModifier implements ProjectileModifier {
  infoString = "explosives";

  onDestroy(projectile: Projectile): void {
    console.log("Doing repulsion");
    aoeExplosion(
      getPlayStateFromProj(projectile),
      projectile.phys.pos,
      400,
      1000,
      500,
      (obj) => obj !== projectile && obj !== projectile.instigator,
      (obj) => Math.pow(obj.phys.weight, 0.3),
    );
  }

  onHit(): void {}

  render(info: ObjectRenderInfo, projectile: Projectile): void {
    const { ctx, toScreen } = info;

    const pos = toScreen(projectile.phys.pos);
    const size = projectile.phys.size + 10;

    ctx.lineWidth = 1.5;
    ctx.strokeStyle = "#FA08";

    for (const angle of [1, 3, 5, 7].map((fac) => (fac * Math.PI) / 4)) {
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
      ctx.lineTo(
        pos.x + Math.cos(angle) * size * 2,
        pos.y * Math.sin(angle) * size * 2,
      );
      ctx.stroke();
    }
  }
}

export const EXPLOSIVES = new ExplosiveModifier();
