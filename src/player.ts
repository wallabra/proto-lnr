import Victor from "victor";
import { Ship } from "./objects/ship";
import { PlayMouseHandler } from "./mouse";
import { Game } from "./game";
import IntermissionState from "./superstates/shop";
import { PlayState } from "./superstates/play";
import { ShipMakeup } from "./objects/shipmakeup";
import { lerp } from "./util";

export type PlayerAction = (deltaTime: number) => void;

export interface FleetMember {
  makeup: ShipMakeup;
  ship?: Ship;
}

export class Player {
  possessed: Ship | null;
  inputState: string | null;
  actions: PlayerAction[];
  game: Game;
  money: number;
  makeup: ShipMakeup;
  fleet: FleetMember[];
  kills = 0;

  constructor(game: Game, ship: Ship, money = 0) {
    this.game = game;
    this.possessed = ship;
    this.inputState = null;
    this.actions = [];
    this.money = money;
    this.makeup = ship.makeup;
    this.fleet = [{ makeup: ship.makeup, ship: this.possessed }];
    this.registerActions();
    console.log(this.makeup);
  }

  public updateMoneyFromFleet() {
    this.money = this.fleet
      .filter((m) => m.ship != null)
      .reduce((a, b) => a + b.ship.money, 0);
  }

  public totalSalary() {
    return this.fleet.reduce(
      (accum, member) => accum + member.makeup.totalSalary(),
      0,
    );
  }

  public totalHullRepairCost() {
    return this.fleet.reduce(
      (accum, member) => accum + member.makeup.hullRepairCost(),
      0,
    );
  }

  public totalRepairCost() {
    return this.fleet.reduce(
      (accum, member) => accum + member.makeup.totalRepairCost(),
      0,
    );
  }

  public totalInventoryValue() {
    return this.fleet.reduce(
      (accum, member) => accum + member.makeup.inventoryValue(),
      0,
    );
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

  steer(offs: Victor, deltaTime: number) {
    const targ = offs.angle();
    this.possessed.steer(deltaTime, targ);
  }

  approach(offs: Victor, deltaTime: number, throttle = 1.0) {
    const dot = new Victor(1, 0)
      .rotateBy(this.possessed.angle)
      .dot(offs.norm());
    this.possessed.thrustForward(deltaTime, (dot + 1 / 2) * throttle);
  }

  inShopRange() {
    return !this.possessed.dying && this.possessed.pos.length() >= 2500;
  }

  canShop() {
    return this.inShopRange() && !this.possessed.inDanger();
  }

  inputEvent(name: string, _event: KeyboardEvent) {
    if (this.possessed.dying) {
      return;
    }

    if (name == "shoot") {
      this.inputState = "shoot";
    }

    if (name == "hud") {
      const state = this.game.state as PlayState;
      const renderer = state.renderer;
      renderer.toggleHud();
    }

    if (name == "pause") {
      this.game.togglePaused();
    }

    if (name == "shop") {
      if (!this.canShop()) {
        return;
      }

      for (const member of this.fleet) {
        member.makeup.endLevelUpdate(this);
      }
      this.game.setState(IntermissionState);
    }

    if (name === "steerLeft") {
      this.possessed.nextTick((deltaTime) =>
        { this.possessed.steer(
          deltaTime,
          this.possessed.angle + this.possessed.phys.angVel - Math.PI / 2,
        ); },
      );
    }

    if (name === "steerRight") {
      this.possessed.nextTick((deltaTime) =>
        { this.possessed.steer(
          deltaTime,
          this.possessed.angle + this.possessed.phys.angVel + Math.PI / 2,
        ); },
      );
    }

    if (name === "thrustForward") {
      this.possessed.nextTick((deltaTime) =>
        { this.possessed.thrustForward(deltaTime, 1.0); },
      );
    }

    if (name === "thrustBackward") {
      this.possessed.nextTick((deltaTime) =>
        { this.possessed.thrustForward(deltaTime, -1.0); },
      );
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
    this.actions.forEach((act) => { act(deltaTime); });
  }

  doMouseShoot(_deltaTime: number) {
    const mouse = this.mouse as PlayMouseHandler;

    if (!mouse.shooting) return;

    this.possessed.tryShoot(this.mouse.pos.length());
  }

  doSteer(deltaTime: number) {
    if (!(this.mouse as PlayMouseHandler).steering) {
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
    this.doMouseShoot(deltaTime);
    this.doAction(deltaTime);
  }
}
