export class Game {
  constructor(canvas) {
    this.canvas =   canvas;
    
    let drawCtx = canvas.getContext('2d');
    this.drawCtx = drawCtx;
    
    this.ships = []
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
  
  /// Order of tick operations
  tick(deltaTime) {
    this.tickShips(deltaTime);
  }
}