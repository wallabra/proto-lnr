import Vec2 from "victor";
import { Ship } from "./objects/ship";
import { PlayMouseHandler } from "./mouse";
import { Game } from "./game";
import IntermissionState from "./superstates/shop";
import { PlayState } from "./superstates/play";
import { ShipMakeup } from "./objects/shipmakeup";
import { lerp } from "./util";

export type PlayerAction = (deltaTime: number) => void;

export class Player {
  possessed: Ship;
  inputState: string | null;
  actions: Array<PlayerAction>;
  game: Game;
  money: number;
  makeup: ShipMakeup;

  constructor(game: Game, ship: Ship, money: number = 0) {
    this.game = game;
    this.possessed = ship;
    this.inputState = null;
    this.actions = [];
    this.money = money;
    this.makeup = ship.makeup;
    this.registerActions();
  }

  get damage() {
    return this.makeup.hullDamage;
  }

  set damage(damage) {
    this.makeup.hullDamage = damage;
  }

  get mouse() {
    return this.game.mouse;
  }

  steer(offs: Vec2, deltaTime: number) {
    const targ = offs.angle();
    this.possessed.steer(deltaTime, targ);
  }

  approach(offs: Vec2, deltaTime: number, throttle: number = 1.0) {
    const dot = Vec2(1, 0).rotateBy(this.possessed.angle).dot(offs.norm());
    this.possessed.thrustForward(deltaTime, (dot + 1 / 2) * throttle);
  }

  canShop() {
    return this.possessed.pos.length() >= 2500;
  }

  inputEvent(name: string, _event: KeyboardEvent) {
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

      this.makeup.endLevelUpdate(this);
      this.game.setState(IntermissionState);
    }

    if (name == "repair") {
      const state = this.game.state;
      if (state instanceof IntermissionState) {
        state.doHullRepair();
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
      this.possessed.size * this.possessed.lateralCrossSection
    ) {
      // close enough
      return;
    } else if (
      offs.length() <
      this.possessed.size * this.possessed.lateralCrossSection * 3
    ) {
      this.approach(
        offs,
        deltaTime,
        lerp(
          0,
          1,
          (offs.length() -
            this.possessed.size * this.possessed.lateralCrossSection) /
            (this.possessed.size * this.possessed.lateralCrossSection * 2),
        ),
      );
    } else {
      this.approach(offs, deltaTime);
    }

    this.steer(offs, deltaTime);
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
