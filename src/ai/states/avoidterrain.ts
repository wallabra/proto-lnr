import { AIHandler, AIJump, AIStartArgs, AITickArgs } from "../defs";

export class AvoidTerrainState implements AIHandler<AIStartArgs, AITickArgs> {
  name = "avoidTerrain";

  aiTick(args: AITickArgs): void | AIJump<AIStartArgs> {
    const { ship, deltaTime } = args;
    ship.steer(deltaTime * 0.25, ship.pos.clone().invert().angle());
  }
}
