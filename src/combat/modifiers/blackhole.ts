import type { Subtract } from "utility-types";
import type { BlackholeArgs, BlackholeParams } from "../../objects/blackhole";
import { Blackhole } from "../../objects/blackhole";
import type { ObjectRenderInfo } from "../../render";
import type { WeightedItem } from "../../util";
import { rwc } from "../../util";
import type { Projectile, ProjectileModifier } from "../projectile";
import { getPlayStateFromProj } from "../projectile";
import type { PhysicsParams } from "../../objects/physics";
import { Ship } from "../../objects/ship";

const DEFAULT_BLACKHOLE_PARAMS: WeightedItem<
  Subtract<Omit<BlackholeArgs, "instigator">, Partial<PhysicsParams>>
>[] = [
  {
    weight: 10,
    item: {
      attractRadius: 400,
      attractStrength: 80000,
      damageRadius: 200,
      damagePerSecond: 15000,
    },
  },
  {
    weight: 4,
    item: {
      attractRadius: 700,
      attractStrength: 140000,
      damageRadius: 400,
      damagePerSecond: 30000,
    },
  },
  {
    weight: 1,
    item: {},
  },
];

class BlackholeModifier implements ProjectileModifier {
  infoString = "black hole charge";
  name = "blackhole";

  onDestroy(projectile: Projectile): void {
    getPlayStateFromProj(projectile).spawn<
      Blackhole,
      BlackholeParams & PhysicsParams
    >(Blackhole, projectile.phys.pos, {
      instigator:
        projectile.instigator instanceof Ship
          ? projectile.instigator
          : undefined,
      ...rwc(DEFAULT_BLACKHOLE_PARAMS),
    });
  }

  onHit(): void {
    // hitless modifier
  }

  render(info: ObjectRenderInfo, projectile: Projectile): void {
    const { ctx, toScreen, scale } = info;
    const center = toScreen(projectile.phys.pos);
    const size = projectile.phys.size * scale * 3;

    // draw "event horizon"
    ctx.save();
    ctx.lineWidth = 1.2;
    ctx.globalAlpha = 0.8;
    ctx.globalCompositeOperation = "overlay";
    ctx.strokeStyle = "#802";
    ctx.beginPath();
    ctx.arc(center.x, center.y, size, 0, Math.PI);
    ctx.stroke();
    ctx.strokeStyle = "#30A";
    ctx.beginPath();
    ctx.arc(center.x, center.y, size + 1, 0, Math.PI);
    ctx.stroke();
    ctx.restore();

    // draw tentacles
    const numTentacles = 5;
    const angle = Math.PI * 0.8 * projectile.phys.age;
    ctx.save();
    ctx.translate(center.x, center.y);
    ctx.rotate(angle);

    for (let tentacle = 0; tentacle < numTentacles; tentacle++) {
      ctx.save();
      ctx.globalAlpha = 0.3;
      ctx.globalCompositeOperation = "hard-light";
      ctx.rotate((tentacle / numTentacles) * Math.PI * 2);

      for (let width = 1.0; width > 0.8; width -= 0.08) {
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

    ctx.restore();
  }
}

export const BLACKHOLE = new BlackholeModifier();
