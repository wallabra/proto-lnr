//@flow
const m_cannonball = require('./objects/cannonball.js');
const m_ship = require('./objects/ship.js');
const m_physics = require('./objects/physics.js');
const m_terrain = require('./terrain.js');

export class Game {
  constructor(canvas: Canvas, terraDef) {
    this.canvas = canvas;
    this.drawCtx = canvas.getContext('2d');
    this.physics = new m_physics.PhysicsSimulation(this);
    this.player = null;
    this.terrain = null;
    
    this.setTerrain(new m_terrain.Terrain(terraDef));
    
    this.ships = [];
    this.ais = [];
    this.cannonballs = [];
  }
  
  makePhysObj(pos, params) {
    return this.physics.makePhysObj(pos, params);
  }
  
  spawnCannonball(ship, timeDelta) {
    //this.cannonballs.push(new m_cannonball.Cannonball(this, ship));
  }
  
  inputHandler(name, event) {
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
  
  heightAt(x, y) {
    // from 0 to 1
    if (!this.terrain) {
      return 0;
    }
    
    else {
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
  
  addShip(ship) {
    this.ships.push(ship)
  }
  
  makeShip(pos, params) {
    let res = new m_ship.Ship(this, pos, params);
    this.addShip(res);
    return res;
  }
  
  tickShips(deltaTime) {
    this.ships.forEach((ship, i) => {
      if (ship.dying) {
        return;
      }
      ship.tick(this, deltaTime);
    });
  }
  
  tickCannonballs(deltaTime) {
    this.cannonballs.forEach((c) => {
      c.tick(deltaTime);
    })
  }
  
  tickPlayer(deltaTime) {
    if (this.player != null) {
      this.player.tick(deltaTime);
    }
  }
  
  tickAIs(deltaTime) {
    this.ais.forEach((ai) => {
      ai.tick(this, deltaTime);
    })
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