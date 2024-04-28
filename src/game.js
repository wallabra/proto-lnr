//@flow
export class Game {
  constructor(canvas: Canvas) {
    this.canvas = canvas;
    this.drawCtx = canvas.getContext('2d');
    this.player = null;
    this.terrain = null;
    
    this.ships = []
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
      ship.tick(deltaTime);
    })
  }
  
  tickPlayer(deltaTime) {
    if (this.player != null) {
      this.player.tick(deltaTime);
    }
  }
  
  /// Order of tick operations
  tick(deltaTime: number) {
    this.tickPlayer(deltaTime);
    this.tickShips(deltaTime);
  }
}