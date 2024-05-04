import { Cannonball, CannonballParams } from "../objects/cannonball.js";
import { Ship } from "../objects/ship.js";
import { PhysicsSimulation, PhysicsParams } from "../objects/physics.js";
import { Terrain, TerraDef } from "../terrain.js";
import Superstate from "./base.js";

import Vec2 from "victor";
import { AIController } from "../ai.js";

import { GameRenderer, Renderable } from "../render.ts";
import { Game } from "../game.ts";

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

  get width() {
    return this.game.width;
  }

  get height() {
    return this.game.height;
  }

  makeShip(pos: Vec2, params?: Partial<PhysicsParams>) {
    const res = new Ship(this, pos, params);
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
    if (this.game.player != null && this.game.player.possessed != null) {
      this.addShip(game.player.possessed);
    }
  }
}
