import { Cannonball, CannonballParams } from "../objects/cannonball";
import { Ship, ShipParams } from "../objects/ship";
import { PhysicsSimulation, PhysicsParams } from "../objects/physics";
import { Terrain, TerraDef } from "../terrain";
import Superstate from "./base";

import Vec2 from "victor";
import { AIController } from "../ai";

import { GameRenderer, Renderable } from "../render";
import { Game } from "../game";
import { PlayMouseHandler } from "../mouse";
import { PlayKeyHandler } from "../keyinput";

export interface Tickable {
  tick: (deltaTime: number) => void;
  dying: boolean;
}

export class PlayState extends Superstate {
  terrain: Terrain | null;
  tickables: Array<Tickable>;
  renderables: Array<Renderable>;
  renderer: GameRenderer;
  physics: PhysicsSimulation;

  constructor(game: Game, terraDef: TerraDef) {
    super(game);
    this.physics = new PhysicsSimulation(this);
    this.setTerrain(new Terrain(terraDef));
    this.tickables = [];
    this.renderables = [];
    this.renderer = new GameRenderer(this);
  }

  addShip(ship: Ship) {
    this.tickables.push(ship);
    this.renderables.push(ship);
  }

  resetPlayerShip(args?: Partial<ShipParams>) {
    if (args == null) args = {};

    if (this.game.player.possessed !== null) {
      this.removeObj(this.game.player.possessed);
    }

    const pos = Vec2(1600, 0).rotateBy(Math.PI * 2 * Math.random());
    const ship = (this.game.player.possessed = this.makeShip(pos, {
      money: this.game.player.money,
      makeup: this.game.player.makeup,
      angle: pos.clone().invert().angle(),
      ...args,
    }));
    ship.vel = Vec2(ship.maxEngineThrust(), 0).rotateBy(ship.angle);

    return ship;
  }

  removeObj(toRemove) {
    const it = this.tickables.indexOf(toRemove);
    const ir = this.renderables.indexOf(toRemove);

    if (it !== -1) {
      this.tickables.splice(it, 1);
    }

    if (ir !== -1) {
      this.renderables.splice(it, 1);
    }

    if (toRemove.phys != null) {
      this.physics.removePhysObj(toRemove.phys);
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
      return Vec2(0, 0);
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
    this.physics.tick(deltaTime);
    this.tickTickables(deltaTime);
    this.pruneDestroyedTickables();
    this.renderer.tick(deltaTime);
  }

  spawnCannonball(ship: Ship, params?: Partial<CannonballParams>) {
    if (params == null) params = {};
    if (params.speed == null) params.speed = 2;
    if (params.angle == null) params.angle = ship.angle;
    if (params.vel == null)
      params.vel = Vec2(params.speed, 0).rotateBy(params.angle).add(ship.vel);
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
}
