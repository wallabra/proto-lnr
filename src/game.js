//@flow
export class Game {
  constructor(canvas: Canvas) {
    this.canvas = canvas;
    this.drawCtx = canvas.getContext('2d');
    this.player = null;
    this.terrain = null;
    
    this.ships = [];
    this.ais = [];
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
    this.ships.forEach((ship) => {
      ship.tick(this, deltaTime);
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
  
  /// Order of tick operations
  tick(deltaTime: number) {
    this.tickPlayer(deltaTime);
    this.tickAIs(deltaTime);
    this.tickShips(deltaTime);
  }
}