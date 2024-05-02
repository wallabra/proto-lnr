import { Cannonball } from "./objects/cannonball.js";
import { Ship } from "./objects/ship.js";
import { PhysicsSimulation, PhysicsParams } from "./objects/physics.js";
import { Terrain, TerraDef } from "./terrain.js";

import Vec2 from "victor";

export interface CannonballParams extends PhysicsParams {
  speed: number;
}

export class Game {
  constructor(canvas: Canvas, terraDef: TerraDef) {
    this.canvas = canvas;
    this.drawCtx = canvas.getContext("2d");
    this.physics = new PhysicsSimulation(this);
    this.player = null;
    this.terrain = null;

    this.setTerrain(new Terrain(terraDef));

    this.ships = [];
    this.ais = [];
    this.cannonballs = [];
  }

  makePhysObj(pos: Vec2, params?: PhysicsParams) {
    return this.physics.makePhysObj(pos, params);
  }

  spawnCannonball(ship: Ship, params?: CannonballParams) {
    if (params == null) params = {};
    if (params.speed == null) params.speed = 2;
    if (params.angle == null) params.angle = ship.angle;
    if (params.vel == null)
      params.vel = Vec2(params.speed, 0).rotateBy(params.angle).add(ship.vel);
    if (params.size == null) params.size = 3.5;
    if (params.vspeed == null) params.vspeed = 1.3;
    if (params.height == null) params.height = ship.height + 0.2;
    if (params.buoyancy == null) params.buoyancy = 0;

    const cball = new Cannonball(this, ship, params);
    this.cannonballs.push(cball);
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

  addAI(ai: AI) {
    this.ais.push(ai);
  }

  get width() {
    return this.canvas.getBoundingClientRect().width;
  }

  get height() {
    return this.canvas.getBoundingClientRect().height;
  }

  addShip(ship: Ship) {
    this.ships.push(ship);
  }

  makeShip(pos: Vec2, params) {
    const res = new Ship(this, pos, params);
    this.addShip(res);
    return res;
  }

  tickShips(deltaTime: float) {
    this.ships.forEach((ship, i) => {
      if (ship.dying) {
        return;
      }
      ship.tick(deltaTime);
    });
  }

  tickCannonballs(deltaTime: float) {
    this.cannonballs.forEach((c) => {
      c.tick(deltaTime);
    });
  }

  tickPlayer(deltaTime: number) {
    if (this.player != null) {
      this.player.tick(deltaTime);
    }
  }

  tickAIs(deltaTime: number) {
    this.ais.forEach((ai) => {
      ai.tick(this, deltaTime);
    });
  }

  pruneDestroyedCannonballs() {
    this.cannonballs = this.cannonballs.filter((c) => !c.dying);
  }

  pruneDestroyedShips() {
    this.ships = this.ships.filter((s) => !s.dying);
  }

  /// Order of tick operations
  tick(deltaTime: number) {
    this.tickPlayer(deltaTime);
    this.tickAIs(deltaTime);
    this.physics.tick(deltaTime);
    this.tickShips(deltaTime);
    this.tickCannonballs(deltaTime);

    // prunes
    this.pruneDestroyedShips();
    this.pruneDestroyedCannonballs();
  }
}
