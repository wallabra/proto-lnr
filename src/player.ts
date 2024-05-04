import Vec2 from "victor";
import { Ship } from "./objects/ship";
import MouseHandler from "./mouse";
import { Game } from "./game";

export type PlayerAction = (deltaTime: number) => void;

export class Player {
  possessed: Ship;
  inputState: string | null;
  actions: Array<PlayerAction>;
  mouse: MouseHandler;

  constructor(game: Game, ship: Ship) {
    this.possessed = ship;
    this.inputState = null;
    this.actions = [];
    this.registerActions();
    this.mouse = new MouseHandler(game);
    this.mouse.registerMouseListener();
  }

  steer(offs: Vec2, deltaTime: number) {
    const targ = offs.angle();
    this.possessed.steer(deltaTime, targ);
  }

  approach(offs: Vec2, deltaTime: number) {
    const dot = Vec2(1, 0).rotateBy(this.possessed.angle).dot(offs.norm());
    this.possessed.thrustForward(deltaTime, dot + 1 / 2);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  inputEvent(name: string, event: KeyboardEvent) {
    if (name == "shoot") {
      this.inputState = "shoot";
    }
  }

  registerAction(name: string, callback: (deltaTime: number) => void) {
    this.actions.push((deltaTime) => {
      if (this.inputState == name) {
        this.inputState = null;
        callback(deltaTime);
      }
    });
  }

  registerActions() {
    this.registerAction("shoot", (/*deltaTime*/) => {
      this.possessed.tryShoot(this.mouse.pos.length());
    });
  }

  doAction(deltaTime: number) {
    this.actions.forEach((act) => act(deltaTime));
  }

  doSteer(deltaTime: number) {
    if (!this.mouse.steering) {
      return;
    }

    const offs = this.mouse.pos.clone();

    if (
      offs.length() <
      this.possessed.size * this.possessed.lateralCrossSection * 2
    ) {
      // close enough
      return;
    }

    this.steer(offs, deltaTime);
    this.approach(offs, deltaTime);
  }

  tick(deltaTime: number) {
    if (this.possessed.dying) {
      return;
    }

    this.doSteer(deltaTime);
    this.doAction(deltaTime);
  }
}
