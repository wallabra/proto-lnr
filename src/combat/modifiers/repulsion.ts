import type { ObjectRenderInfo } from "../../render";
import { aoeExplosion } from "../explosion";
import {
  getPlayStateFromProj,
  type Projectile,
  type ProjectileModifier,
} from "../projectile";

class RepulsionDiscModifier implements ProjectileModifier {
  infoString = "repulsion disc";

  onDestroy(projectile: Projectile): void {
    console.log("Doing repulsion");
    aoeExplosion(
      getPlayStateFromProj(projectile),
      projectile.phys.pos,
      400,
      0,
      1000,
      (obj) => obj !== projectile && obj !== projectile.instigator,
      (obj) => Math.pow(obj.phys.weight, 0.9),
    );
  }

  onHit(): void {}

  render(info: ObjectRenderInfo, projectile: Projectile): void {
    const { ctx, toScreen } = info;

    const pos = toScreen(projectile.phys.pos);
    const size = projectile.phys.size + 10;

    ctx.lineWidth = 1.5;
    ctx.strokeStyle = "#F004";
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y + size);
    ctx.lineTo(pos.x + size, pos.y);
    ctx.lineTo(pos.x, pos.y - size);
    ctx.lineTo(pos.x - size, pos.y);
    ctx.lineTo(pos.x, pos.y + size);
    ctx.stroke();
  }
}

export const REPULSION_DISC = new RepulsionDiscModifier();
