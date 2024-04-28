//@flow
const Vec2 = require('victor');

function renderShips(game) {
  let ctx = game.drawCtx;
  let baseX = game.width / 2;
  let baseY = game.height / 2;
  
  ctx.fillStyle = '#331100';
  ctx.strokeStyle = '#005500';
  ctx.lineWidth = 2;
  
  // set camera
  let cam = Vec2(0, 0);
  
  if (game.player != null && game.player.possessed != null) {
    cam = game.player.possessed.pos.clone();
  }
  
  game.ships.forEach((ship: Ship) => {
    let x = baseX + ship.pos.x - cam.x;
    let y = baseY + ship.pos.y - cam.y;
    
    // Draw body
    ctx.beginPath();
    ctx.ellipse(x, y, ship.size * ship.lateralCrossSection, ship.size, ship.angle, 0, 2 * Math.PI);
    ctx.fill();
    
    // Draw forward direction
    ctx.beginPath();
    ctx.moveTo(x, y);
    let to = Vec2(ship.size * ship.lateralCrossSection).rotateBy(ship.angle).add(Vec2(x, y));
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
  })
}

function renderBackground(game: Game) {
  let ctx = game.drawCtx;
  
  let bgColor = '#3377aa';
  ctx.fillStyle = bgColor;
  
  ctx.fillRect(0, 0, game.width, game.height);
}

export function render(game: Game) {
  game.canvas.width = game.width;
  game.canvas.height = game.height;
  
  renderBackground(game);
  renderShips(game);
}