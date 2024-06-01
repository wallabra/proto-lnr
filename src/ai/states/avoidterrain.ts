import { commonPaths } from "../commonpaths";
import { AIHandler, AIJump, AIStartArgs, AITickArgs } from "../defs";

export class AvoidTerrainState implements AIHandler<AIStartArgs, AITickArgs> {
  name = "avoidTerrain";

  aiTick(args: AITickArgs): Nullish | AIJump<AIStartArgs> {
    const { play, soonPos } = args;

    const commonNext = commonPaths(args);
    if (commonNext != null && commonNext.next != this.name) return commonNext;

    if (
      play.terrain == null ||
      play.terrain.heightAt(soonPos.x, soonPos.y) < play.waterLevel * 0.4
    )
      return { next: "start" };

    const { ship, deltaTime } = args;
    ship.steer(deltaTime * 0.25, ship.pos.clone().invert().angle());
  }
}
