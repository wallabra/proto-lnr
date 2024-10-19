import Victor from "victor";
import type { Ship } from "./objects/ship";
import type { PlayMouseHandler } from "./mouse";
import type { Game } from "./game";
import { IntermissionState } from "./superstates/shop";
import { PlayState } from "./superstates/play";
import { ShipMakeup } from "./objects/shipmakeup";
import { lerp } from "./util";
import { DEFAULT_MAKE } from "./shop/makedefs";

export type PlayerAction = (deltaTime: number) => void;

export interface FleetMember {
  makeup: ShipMakeup;
  ship?: Ship;
}

export type InputEvent =
  | ({ type: "keyboard" } & KeyboardEvent)
  | ({ type: "mouse" } & MouseEvent)
  | ({ type: "ui" } & UIEvent);

export class Player {
  possessed: Ship | null;
  inputState: string | null;
  actions: PlayerAction[];
  game: Game;
  money: number;
  makeup: ShipMakeup;
  fleet: FleetMember[];
  kills = 0;

  constructor(game: Game, makeup: ShipMakeup | null = null, money = 0) {
    makeup ??= ShipMakeup.defaultMakeup({ make: DEFAULT_MAKE });
    this.game = game;
    this.possessed = null;
    this.inputState = null;
    this.actions = [];
    this.money = money;
    this.makeup = makeup;
    this.fleet = [{ makeup: this.makeup }];
    this.registerActions();
    console.log(this.makeup);
  }

  public updateMoneyFromFleet() {
    this.money = this.fleet
      .filter((m): m is FleetMember & { ship: Ship } => m.ship != null)
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

  steer(offs: Victor) {
    if (this.possessed == null) throw new Error("Player has no ship");
    const targ = ((offs.angle() - this.possessed.phys.angle) * 2) / Math.PI;
    this.possessed.trySteer(targ);
  }

  approach(offs: Victor, throttle = 1.0) {
    if (this.possessed == null) throw new Error("Player has no ship");
    const dot = new Victor(1, 0)
      .rotateBy(this.possessed.angle)
      .dot(offs.norm());
    this.possessed.tryThrustForward((dot + 1 / 2) * throttle);
  }

  inShopRange() {
    if (this.possessed == null) throw new Error("Player has no ship");
    return !this.possessed.dying && this.possessed.pos.length() >= 2500;
  }

  canShop() {
    if (this.possessed == null) throw new Error("Player has no ship");
    return this.inShopRange() && !this.possessed.inDanger();
  }

  inputEvent(name: string, _event: InputEvent) {
    if (this.possessed == null || this.possessed.dying) {
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
      this.possessed.trySteer(-1);
    }

    if (name === "steerRight") {
      this.possessed.trySteer(1);
    }

    if (name === "thrustForward") {
      this.possessed.tryThrustForward(1.0);
    }

    if (name === "thrustBackward") {
      this.possessed.tryThrustForward(-1.0);
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
      if (this.possessed == null || this.mouse == null) return;
      this.possessed.tryShoot(this.mouse.pos.length());
    });
  }

  doAction(deltaTime: number) {
    this.actions.forEach((act) => {
      act(deltaTime);
    });
  }

  doMouseShoot(_deltaTime: number) {
    if (this.possessed == null || this.mouse == null) return;

    const mouse = this.mouse as PlayMouseHandler;

    if (!mouse.shooting) return;

    this.possessed.tryShoot(this.mouse.pos.length());
  }

  doSteer(_deltaTime: number) {
    if (
      this.possessed == null ||
      this.mouse == null ||
      !(this.mouse as PlayMouseHandler).steering
    ) {
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
        lerp(
          0,
          1,
          (offs.length() -
            this.possessed.size * this.possessed.lateralCrossSection) /
            (this.possessed.size * this.possessed.lateralCrossSection * 2),
        ),
      );
    } else {
      this.approach(offs);
    }

    this.steer(offs);
  }

  tick(deltaTime: number) {
    if (!(this.game.state instanceof PlayState)) {
      return;
    }

    if (this.possessed == null || this.possessed.dying) {
      return;
    }

    this.doSteer(deltaTime);
    this.doMouseShoot(deltaTime);
    this.doAction(deltaTime);
  }
}
