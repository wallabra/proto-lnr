import { Cannonball, CannonballParams } from "../objects/cannonball";
import { Ship, ShipParams } from "../objects/ship";
import {
  PhysicsSimulation,
  PhysicsParams,
  PhysicsObject,
} from "../objects/physics";
import { Terrain, TerraDef } from "../terrain";
import Superstate from "./base";

import Vec2 from "victor";
import { AIController } from "../ai/ai";

import { GameRenderer, Renderable } from "../render";
import { Game } from "../game";
import { PlayMouseHandler } from "../mouse";
import { PlayKeyHandler } from "../keyinput";
import random from "random";
import { ShipMakeup } from "../objects/shipmakeup";
import { SoundEngine } from "../sfx";

export interface Tickable {
  tick: (deltaTime: number) => void;
  dying: boolean;
}

export interface Physicable {
  phys: PhysicsObject;
}

export class PlayState extends Superstate {
  terrain: Terrain | null;
  tickables: Array<Tickable>;
  renderables: Array<Renderable>;
  renderer: GameRenderer;
  physics: PhysicsSimulation;
  public sfx: SoundEngine | null;

  constructor(game: Game, terraDef: TerraDef) {
    super(game);
    this.physics = new PhysicsSimulation(this);
    this.setTerrain(new Terrain(terraDef));
    this.tickables = [];
    this.renderables = [];
    this.renderer = new GameRenderer(this);
    this.reloadSoundEngine();
  }

  reloadSoundEngine() {
    if (this.player == null || this.player.possessed == null) {
      this.sfx = null;
      return false;
    }

    const ship = this.player.possessed;

    if (this.sfx != null) {
      if (this.sfx.perspective !== ship.phys) {
        this.sfx.perspective = ship.phys;
        this.sfx.update();
      }
    } else {
      this.sfx = new SoundEngine(ship.phys);
    }

    return true;
  }

  addShip(ship: Ship) {
    this.tickables.push(ship);
    this.renderables.push(ship);
  }

  spawnPlayerFleet() {
    const player = this.game.player;

    if (player.possessed !== null) {
      this.removeObj(this.player.possessed);
    }

    const pos = new Vec2(1600, 0).rotateBy(Math.PI * 2 * Math.random());

    let playerShip = null;

    const addShip = (
      money: number,
      makeup: ShipMakeup,
      offs: Vec2 = null,
    ): Ship => {
      let spawnPos = pos;
      if (offs != null) spawnPos = spawnPos.clone().add(offs);

      const ship = this.makeShip(spawnPos, {
        money: money,
        makeup: makeup,
        angle: pos.clone().invert().angle(),
      });
      ship.vel = new Vec2(ship.maxEngineThrust() / ship.weight, 0).rotateBy(
        ship.angle,
      );

      if (playerShip != null) {
        ship.follow(playerShip);
        this.makeAIFor(ship);
      }

      return ship;
    };

    let money = player.money;
    playerShip = player.possessed = addShip(money / 2, player.makeup);
    money /= 2;
    const ships = [playerShip];
    const moneyPart = money / player.fleet.length;

    for (const member of player.fleet) {
      if (member.makeup.captain == null) continue;
      const offs = new Vec2(
        playerShip.size * playerShip.lateralCrossSection * 2 +
          random.uniform(30, 200)(),
        0,
      ).rotateBy(Math.PI * Math.random() * 2);

      const ship = addShip(moneyPart, member.makeup, offs);
      ships.push(ship);
      member.ship = ship;
    }

    this.reloadSoundEngine();

    return ships;
  }

  removeObj<T extends Tickable | Renderable | { phys: PhysicsObject }>(
    toRemove: T,
  ) {
    const it = this.tickables.indexOf(toRemove as Tickable);
    const ir = this.renderables.indexOf(toRemove as Renderable);

    if (it !== -1) {
      this.tickables.splice(it, 1);
    }

    if (ir !== -1) {
      this.renderables.splice(it, 1);
    }

    if ((toRemove as { phys: PhysicsObject }).phys != null) {
      this.physics.removePhysObj((toRemove as { phys: PhysicsObject }).phys);
    }
  }

  get width() {
    return this.game.width;
  }

  get height() {
    return this.game.height;
  }

  makeShip(pos: Vec2, params?: Partial<ShipParams>) {
    const res = new Ship(this.game, pos, params);
    this.addShip(res);
    return res;
  }

  makeAIFor(ship: Ship) {
    const res = new AIController(this, ship);
    this.addAI(res);
    return res;
  }

  get waterLevel() {
    return 0.1;
  }

  tickTickables(deltaTime: number) {
    this.tickables.forEach((obj) => {
      if (obj.dying) {
        return;
      }
      obj.tick(deltaTime);
    });
  }

  pruneDestroyedTickables() {
    this.tickables = this.tickables.filter((t) => !t.dying);
  }

  cameraPos(): Vec2 {
    if (this.player != null && this.player.possessed != null) {
      return this.player.possessed.pos.clone();
    } else {
      return new Vec2(0, 0);
    }
  }

  makePhysObj(pos: Vec2, params?: Partial<PhysicsParams>) {
    return this.physics.makePhysObj(pos, params);
  }

  render() {
    this.renderer.render();
  }

  /// Order of tick operations
  tick(deltaTime: number) {
    if (!this.game.paused) {
      this.physics.tick(deltaTime);
      this.tickTickables(deltaTime);
      this.pruneDestroyedTickables();
    }
    this.renderer.tick(deltaTime);
    if (this.sfx != null) {
      this.sfx.update();
    }
  }

  spawnCannonball(ship: Ship, params?: Partial<CannonballParams>) {
    if (params == null) params = {};
    if (params.speed == null) params.speed = 2;
    if (params.angle == null) params.angle = ship.angle;
    if (params.vel == null)
      params.vel = new Vec2(params.speed, 0)
        .rotateBy(params.angle)
        .add(ship.vel);
    if (params.size == null) params.size = 3.5;
    if (params.vspeed == null) params.vspeed = 2;
    if (params.height == null) params.height = ship.height + 0.2;
    if (params.buoyancy == null) params.buoyancy = 0;

    const cball = new Cannonball(this, ship, params);
    this.tickables.push(cball);
    this.renderables.push(cball);
    return cball;
  }

  setTerrain(terrain: Terrain) {
    this.terrain = terrain;
  }

  heightAt(x: number, y: number) {
    // from 0 to 1
    if (this.terrain == null) {
      return 0;
    } else {
      return this.terrain.heightAt(x, y);
    }
  }

  addAI(ai: AIController) {
    this.tickables.push(ai);
  }

  spawn<A extends Tickable & Renderable, P extends PhysicsParams>(
    objType: new (play: PlayState, pos: Vec2, params?: Partial<P>) => A,
    pos: Vec2,
    params: Partial<P>,
  ): A {
    const res = new objType(this, pos, params);
    this.tickables.push(res);
    this.renderables.push(res);
    return res;
  }

  init() {
    this.game.setMouseHandler(PlayMouseHandler);
    this.game.setKeyboardHandler(PlayKeyHandler);

    if (this.game.player != null && this.game.player.possessed != null) {
      this.addShip(this.game.player.possessed);
    }
  }

  spawnArgs<A, T extends Tickable & Renderable>(
    objType: new (play: PlayState, ...args: A[]) => T,
    ...args: A[]
  ): T {
    const res = new objType(this, ...args);
    this.tickables.push(res);
    this.renderables.push(res);
    return res;
  }
}
