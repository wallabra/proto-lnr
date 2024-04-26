function renderShips(drawCtx, game) {
  let color = '#331100';
  let baseX = drawCtx.width / 2;
  let baseY = drawCtx.height / 2;
  
  game.ships.forEach((ship) => {
    let x = baseX + ship.pos.x;
    let y = baseY + ship.pos.y;

    drawCtx.beginPath();
    drawCtx.arc(x, y, ship.size * 4, 0, 2 * Math.PI);
    drawCtx.fillStyle = color;
    drawCtx.fill();
  })
}

function renderBackground(drawCtx, game) {
  let bgColor = '#55aaff';
  drawCtx.fillStyle = bgColor;
  
  drawCtx.fillRect(0, 0, drawCtx.width, drawCtx.height);
}

export function render(drawCtx, game) {
  renderBackground(drawCtx, game);
  renderShips(drawCtx, game);
}