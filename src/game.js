//@flow
const m_cannonball = require('./cannonball.js');

export class Game {
  constructor(canvas: Canvas) {
    this.canvas = canvas;
    this.drawCtx = canvas.getContext('2d');
    this.player = null;
    this.terrain = null;
    
    this.ships = [];
    this.ais = [];
    this.cannonballs = [];
  }
  
  spawnCannonball(ship, timeDelta) {
    this.cannonballs.push(new m_cannonball.Cannonball(this, ship));
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
    this.tickShips(deltaTime);
    this.tickCannonballs(deltaTime);
    
    // prunes
    this.pruneDestroyedShips();
    this.pruneDestroyedCannonballs();
  }
}