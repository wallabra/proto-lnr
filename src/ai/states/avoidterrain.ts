import { AIHandler, AIJump, AIStartArgs, AITickArgs } from "../defs";

export class AvoidTerrainState implements AIHandler<AIStartArgs, AITickArgs> {
  name = "avoidTerrain";

  aiTick(args: AITickArgs): void | AIJump<AIStartArgs> {
    const { play, soonPos } = args;

    if (
      play.terrain == null ||
      play.terrain.heightAt(soonPos.x, soonPos.y) < play.waterLevel * 0.4
    )
      return { next: "start" };

    const { ship, deltaTime } = args;
    ship.steer(deltaTime * 0.25, ship.pos.clone().invert().angle());
  }
}
