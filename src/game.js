export class Game {
  constructor() {
    this.ships = []
  }
  
  addShip(ship) {
    this.ships.push(ship)
  }
  
  tickShips(deltaTime)  {
    this.ships.forEach((ship) => {
      ship.tick(deltaTime);
    })
  }
}