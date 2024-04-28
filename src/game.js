//@flow
export class Game {
  constructor(canvas: Canvas) {
    this.canvas = canvas;
    this.drawCtx = canvas.getContext('2d');
    
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
  tick(deltaTime: number) {
    this.tickShips(deltaTime);
  }
}