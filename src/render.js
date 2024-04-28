//@flow
function renderShips(game) {
  let ctx = game.drawCtx;
  
  let color = '#331100';
  let baseX = game.width / 2;
  let baseY = game.height / 2;
  
  game.ships.forEach((ship: Ship) => {
    let x = baseX + ship.pos.x;
    let y = baseY + ship.pos.y;
    
    ctx.beginPath();
    ctx.arc(x, y, ship.size, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill();
  })
}

function renderBackground(game: Game) {
  let ctx = game.drawCtx;
  
  let bgColor = '#3377aa';
  ctx.fillStyle = bgColor;
  
  ctx.fillRect(0, 0, game.width, game.height);
}

export function render(game: Game) {
  renderBackground(game);
  renderShips(game);
}