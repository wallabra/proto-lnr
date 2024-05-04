import { Cannonball, CannonballParams } from "./objects/cannonball.js";
import { Ship } from "./objects/ship.js";
import { PhysicsSimulation, PhysicsParams } from "./objects/physics.js";
import { Terrain, TerraDef } from "./terrain.js";

import Vec2 from "victor";
import { AIController } from "./ai.js";
import { Player } from "./player.js";
import { Renderable, Renderer } from "./render.js";

export interface Tickable {
  tick: (deltaTime: number) => void;
  dying: boolean;
}

export class Game {
  canvas: HTMLCanvasElement;
  drawCtx: CanvasRenderingContext2D;
  physics: PhysicsSimulation;
  player: Player | null;
  terrain: Terrain | null;
  tickables: Array<Tickable>;
  renderables: Array<Renderable>;
  renderer: Renderer;

  constructor(canvas: HTMLCanvasElement, terraDef: TerraDef) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d");
    if (ctx == null)
      throw new Error("Couldn't get a drawing context from the game canvas!");
    this.drawCtx = ctx;
    this.setTerrain(new Terrain(terraDef));
    this.physics = new PhysicsSimulation(this);
    this.renderer = new Renderer(this);
    this.player = null;

    this.tickables = [];
    this.renderables = [];
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

  inputHandler(name: string, event) {
    if (this.player == null) {
      return;
    }

    this.player.inputEvent(name, event);
  }

  setTerrain(terrain: Terrain) {
    this.terrain = terrain;
  }

  get waterLevel() {
    return 0.1;
  }

  heightAt(x: number, y: number) {
    // from 0 to 1
    if (this.terrain == null) {
      return 0;
    } else {
      return this.terrain.heightAt(x, y);
    }
  }

  setPlayer(player: Player) {
    this.player = player;
  }

  addAI(ai: AIController) {
    this.tickables.push(ai);
  }

  spawn<A extends Tickable & Renderable, P extends PhysicsParams>(
    objType: new (game: Game, pos: Vec2, params?: Partial<P>) => A,
    pos: Vec2,
    params: Partial<P>,
  ) {
    const res = new objType(this, pos, params);
    this.tickables.push(res);
    this.renderables.push(res);
    return res;
  }

  get width() {
    return this.canvas.getBoundingClientRect().width;
  }

  get height() {
    return this.canvas.getBoundingClientRect().height;
  }

  addShip(ship: Ship) {
    this.tickables.push(ship);
    this.renderables.push(ship);
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

  tickTickables(deltaTime: number) {
    this.tickables.forEach((obj) => {
      if (obj.dying) {
        return;
      }
      obj.tick(deltaTime);
    });
  }

  tickPlayer(deltaTime: number) {
    if (this.player != null) {
      this.player.tick(deltaTime);
    }
  }

  pruneDestroyedTickables() {
    this.tickables = this.tickables.filter((t) => !t.dying);
  }

  /// Order of tick operations
  tick(deltaTime: number) {
    this.tickPlayer(deltaTime);
    this.physics.tick(deltaTime);
    this.tickTickables(deltaTime);
    this.pruneDestroyedTickables();
  }

  render() {
    this.renderer.render();
  }
}
