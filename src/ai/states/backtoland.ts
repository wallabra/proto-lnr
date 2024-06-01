import { AIHandler, AIStartArgs, AITickArgs, AIJump } from "../defs";

export class BackToLandState implements AIHandler<AIStartArgs, AITickArgs> {
  name: string = "backToLand";

  aiTick(args: AITickArgs): void | AIJump<AIStartArgs> {
    const { ship, deltaTime } = args;

    if (ship.pos.length() <= 1500 || ship.lastInstigator != null)
      return { next: "start" };

    // steer toward 0,0
    ship.steer(deltaTime * 0.25, ship.pos.clone().invert().angle());
  }
}
