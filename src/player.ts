import Vec2 from "victor";
import { Ship } from "./objects/ship";
import { PlayMouseHandler } from "./mouse";
import { Game } from "./game";
import IntermissionState from "./superstates/shop";
import { PlayState } from "./superstates/play";

export type PlayerAction = (deltaTime: number) => void;

export class Player {
  possessed: Ship;
  inputState: string | null;
  actions: Array<PlayerAction>;
  game: Game;
  money: number;
  damage: number;

  constructor(game: Game, ship: Ship, money: number = 0) {
    this.game = game;
    this.possessed = ship;
    this.inputState = null;
    this.actions = [];
    this.money = money;
    this.damage = ship.damage;
    this.registerActions();
  }

  get mouse() {
    return this.game.mouse;
  }

  steer(offs: Vec2, deltaTime: number) {
    const targ = offs.angle();
    this.possessed.steer(deltaTime, targ);
  }

  approach(offs: Vec2, deltaTime: number) {
    const dot = Vec2(1, 0).rotateBy(this.possessed.angle).dot(offs.norm());
    this.possessed.thrustForward(deltaTime, dot + 1 / 2);
  }

  canShop() {
    return this.possessed.pos.length() >= 2000;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  inputEvent(name: string, event: KeyboardEvent) {
    if (this.possessed.dying) {
      return;
    }

    if (name == "shoot") {
      this.inputState = "shoot";
    }

    if (name == "shop") {
      if (!this.canShop()) {
        return;
      }

      this.game.setState(IntermissionState);
    }

    if (name == "repair") {
      const state = this.game.state;
      if (state instanceof IntermissionState) {
        state.doRepair();
      }
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
    this.registerAction("shoot", () => {
      this.possessed.tryShoot(this.mouse.pos.length());
    });
  }

  doAction(deltaTime: number) {
    this.actions.forEach((act) => act(deltaTime));
  }

  doSteer(deltaTime: number) {
    if (!(<PlayMouseHandler>this.mouse).steering) {
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
    if (!(this.game.state instanceof PlayState)) {
      return;
    }

    if (this.possessed.dying) {
      return;
    }

    this.doSteer(deltaTime);
    this.doAction(deltaTime);
  }
}
