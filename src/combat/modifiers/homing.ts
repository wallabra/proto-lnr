import { Cannonball } from "../../objects/cannonball";
import { Ship } from "../../objects/ship";
import type { ObjectRenderInfo } from "../../render";
import type { Physicable } from "../../superstates/play";
import { angDiff } from "../../util";
import type { Damageable } from "../damageable";
import { isDamageable } from "../damageable";
import type { Projectile, ProjectileModifier } from "../projectile";
import { getPlayStateFromProj } from "../projectile";
import type Victor from "victor";

const HOMING_RANGE = 600;
const HOMING_TURN_PER_SEC = Math.PI / 8;
const HOMING_MAX_ANGLE_OFF = Math.PI / 1.5;
const HOMING_SLOWDOWN_PER_SEC = 20;

function getHomingTarget(
  proj: Projectile,
): { obj: Damageable & Physicable; angleOffs: number; offs: Victor } | null {
  const targets = getPlayStateFromProj(proj)
    .objectsInRadius(proj.phys.pos, HOMING_RANGE)
    .filter((obj) => isDamageable(obj.obj) && obj.obj !== proj.instigator)
    .map((item) => ({
      ...item,
      obj: item.obj as Damageable & Physicable,
      angleOffs: angDiff(
        item.obj.phys.pos
          .clone()
          .add(item.obj.phys.vel.clone().multiplyScalar(proj.airtime()))
          .subtract(proj.phys.pos)
          .angle(),
        proj.phys.vel.angle(),
      ),
    }))
    .sort((a, b) => Math.abs(a.angleOffs) - Math.abs(b.angleOffs));

  if (targets.length === 0 || targets[0].angleOffs > HOMING_MAX_ANGLE_OFF)
    return null;

  return targets[0];
}

class HomingModifier implements ProjectileModifier {
  infoString = "homing fins";

  onDestroy(): void {}

  onHit(): void {}

  render(info: ObjectRenderInfo, projectile: Projectile): void {
    const { ctx, toScreen } = info;
    const target = getHomingTarget(projectile);

    if (target == null) return;
    const to = target.obj;

    const targetPos = toScreen(to.phys.pos);
    let chSize = to.phys.size * 1.6;

    if (to instanceof Ship) chSize *= to.lateralCrossSection;

    ctx.globalCompositeOperation = "hard-light";
    ctx.strokeStyle = "#F204";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(targetPos.x, targetPos.y, chSize, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(targetPos.x, targetPos.y + chSize + 15);
    ctx.lineTo(targetPos.x, targetPos.y - chSize - 15);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(targetPos.x - chSize - 15, targetPos.y);
    ctx.lineTo(targetPos.x + chSize + 15, targetPos.y);
    ctx.stroke();
    ctx.globalCompositeOperation = "source-over";
  }

  tick(deltaTime: number, projectile: Projectile): void {
    const target = getHomingTarget(projectile);

    if (target == null) return;

    console.log(
      (HOMING_TURN_PER_SEC * deltaTime * Math.sign(target.angleOffs)) / Math.PI,
    );

    projectile.phys.vel = projectile.phys.vel
      .clone()
      .rotate(HOMING_TURN_PER_SEC * -Math.sign(target.angleOffs) * deltaTime);

    if (projectile instanceof Cannonball) {
      const fallAt = projectile.computePredictedFall();
      const fallDist = fallAt.clone().subtract(projectile.phys.pos).length();
      const to = target.obj;
      const beyond =
        fallDist -
        target.offs
          .add(to.phys.vel.clone().multiplyScalar(projectile.airtime()))
          .length() -
        to.phys.size * (to instanceof Ship ? to.lateralCrossSection : 1) -
        projectile.phys.size -
        20;

      if (beyond > 0) {
        projectile.phys.applyForce(
          deltaTime,
          projectile.vel
            .clone()
            .invert()
            .norm()
            .multiplyScalar(HOMING_SLOWDOWN_PER_SEC * projectile.phys.weight),
        );
      }
    }
  }
}

export const HOMING = new HomingModifier();
