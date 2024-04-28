function renderShips(game) {
  let ctx = game.drawCtx;
  
  let color = '#331100';
  let baseX = game.width / 2;
  let baseY = game.height / 2;
  
  game.ships.forEach((ship) => {
    let x = baseX + ship.pos.x;
    let y = baseY + ship.pos.y;

    ctx.beginPath();
    ctx.arc(x, y, ship.size * 4, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill();
  })
}

function renderBackground(game) {
  let bgColor = '#55aaff';
  game.drawCtx.fillStyle = bgColor;
  
  game.drawCtx.fillRect(0, 0, game.width, game.height);
}

export function render(game) {
  renderBackground(game);
  renderShips(game);
}