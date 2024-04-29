//@flow
const Vec2 = require('victor');
const m_terrain = require('./terrain.js');


function renderDeathScreen(game) {
  // render death screen
  if (game.player != null && game.player.possessed != null) {
    if (game.player.possessed.dying) {
      ctx.fillStyle = '#22222210';
      ctx.fillRect(0, 0, game.width, game.height);
      
      ctx.fillStyle = '#ffff00';
      ctx.font = '60px Verdana serif';
      ctx.textBaseline = 'center';
      ctx.textAlign = 'center';
      ctx.fillText('rip', game.width / 2, game.height / 2);
    }
  }
}

function renderCannonballs(game) {
  let ctx = game.drawCtx;
  let baseX = game.width / 2;
  let baseY = game.height / 2;
  
  // set camera
  let cam = Vec2(0, 0);
  
  if (game.player != null && game.player.possessed != null) {
    cam = game.player.possessed.pos.clone();
  }
  
  // render cannonballs
  ctx.fillStyle = '#877';
  
  game.cannonballs.forEach((cball: Cannonball) => {
    let x = baseX + cball.pos.x - cam.x;
    let y = baseY + cball.pos.y - cam.y;
    let proximityScale = 1 + Math.min(0, Math.log(1 + 0.1 + cball.height - game.waterLevel));
    
    ctx.beginPath();
    ctx.arc(x, y, cball.size * proximityScale, 0, 2 * Math.PI);
    ctx.fill();
  })
}

function renderShips(game) {
  let ctx = game.drawCtx;
  let baseX = game.width / 2;
  let baseY = game.height / 2;

  ctx.strokeStyle = '#005500';
  ctx.lineWidth = 2;
  
  // set camera
  let cam = Vec2(0, 0);
  
  if (game.player != null && game.player.possessed != null) {
    cam = game.player.possessed.pos.clone();
  }
  
  // render ships
  game.ships.forEach((ship: Ship) => {
    let x = baseX + ship.pos.x - cam.x;
    let y = baseY + ship.pos.y - cam.y;
    let isPlayer = game.player != null && game.player.possessed === ship;
      
    // Draw body
    ctx.fillStyle = isPlayer ? '#227766' : '#4a1800';
    ctx.beginPath();
    ctx.ellipse(x, y, ship.size * ship.lateralCrossSection, ship.size, ship.angle, 0, 2 * Math.PI);
    ctx.fill();
      
    ctx.fillStyle = isPlayer ? '#115533' : '#331100';
    ctx.beginPath();
    ctx.ellipse(x, y, ship.size * ship.lateralCrossSection * 0.8, ship.size * 0.8, ship.angle, 0, 2 * Math.PI);
    ctx.fill();
      
    // Draw forward direction
    ctx.beginPath();
    ctx.moveTo(x, y);
    let to = Vec2(ship.size * ship.lateralCrossSection).rotateBy(ship.angle).add(Vec2(x, y));
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
  })
  
  game.ships.forEach((ship: Ship) => {
    let x = baseX + ship.pos.x - cam.x;
    let y = baseY + ship.pos.y - cam.y;
    
    // Draw damage bar
    let maxDmg = ship.maxDmg;
    let dmgAlpha = ship.damage / maxDmg;
    
    if (dmgAlpha > 1) {
      dmgAlpha = 1;
    }
    
    ctx.fillStyle = '#FF330088';
    ctx.fillRect(x - 50, y - ship.size - 30, 100 * dmgAlpha, 3)
    ctx.fillStyle = '#00000088';
    ctx.fillRect(x - 50 + 100 * dmgAlpha, y - ship.size - 30, 100 * (1 - dmgAlpha), 3)
    
    // Draw terrain gradient vector
    ctx.strokeStyle = '#88008860';
    ctx.strokeWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    let to = ship.heightGradient(game).multiply(Vec2(5000, 5000)).add(Vec2(x, y));
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

function interpTerrainColor(game, height) {
  // below waterLevel
  let rgb1 = [0, 10, 45];
  let rgb2 = [30, 60, 70]; 
  // above waterLevel
  let rgb3 = [80, 140, 40]; 
  let rgb4 = [200, 200, 200];
  
  let from = null;
  let to = null;
  let alpha = null;
  
  if (height < game.waterLevel) {
    from = rgb1;
    to = rgb2;
    alpha = height / game.waterLevel;
  }
  
  else {
    from = rgb3;
    to = rgb4;
    alpha = (height - game.waterLevel) / (1 - game.waterLevel)
  }
  
  // lerp color
  let rgbFinal = from.map((f, i) => f * (1 - alpha) + to[i] * alpha);
  
  return `rgb(${rgbFinal.join(', ')})`;
}
window.interpTerrainColor = interpTerrainColor; //DEBUG

let renderedSectors = new Map();

function renderTerrainSector(ctx, sector) {
  for (let tileIdx = 0; tileIdx < m_terrain.SECTOR_AREA; tileIdx++) {
    let tx = tileIdx % m_terrain.SECTOR_SIZE;
    let ty = (tileIdx - tx) / m_terrain.SECTOR_SIZE;
    
    let height = sector.heights[tileIdx];
    let drawX = tx * m_terrain.SECTOR_RES;
    let drawY = ty * m_terrain.SECTOR_RES;

    ctx.lineWidth = 0;
    ctx.fillStyle = interpTerrainColor(game, height);
    ctx.fillRect(drawX, drawY, m_terrain.SECTOR_RES + 1, m_terrain.SECTOR_RES + 1);
  }
}

function drawTerrainSector(ctx, sx, sy, sdlef, sdtop, sector) {
  let key = `${sx},${sy}`;
  let image = 0;
  
  if (!renderedSectors.has(key)) {
    let renderCanvas = document.createElement('canvas');
    renderCanvas.width = m_terrain.SECTOR_REAL_SIZE;
    renderCanvas.height = m_terrain.SECTOR_REAL_SIZE;
    let renderCtx = renderCanvas.getContext('2d');
    renderCtx.imageSmoothingEnabled = false;
    renderTerrainSector(renderCtx, sector);
    let imgData = renderCanvas.toDataURL('image/png', 'image/octet-scream');
    let imgEl = document.createElement('img');
    imgEl.src = imgData;
    renderedSectors.set(key, imgEl);
    image = imgEl;
    renderCanvas.remove();
  }
  
  else {
    image = renderedSectors.get(key);
  }
  
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(image, sdlef, sdtop, m_terrain.SECTOR_REAL_SIZE + 1, m_terrain.SECTOR_REAL_SIZE + 1);
  ctx.imageSmoothingEnabled = true;
}

function renderTerrain(game: Game) {
  let ctx = game.drawCtx;

  if (game.terrain == null) {
    return;
  }
  
  let camX = 0;
  let camY = 0;
  
  if (game.player != null && game.player.possessed != null) {
    camX = game.player.possessed.pos.x;
    camY = game.player.possessed.pos.y;
  }
  
  let minX = -(game.width  / 2) + camX;
  let minY = -(game.height / 2) + camY;
  let maxX =  (game.width  / 2) + camX;
  let maxY =  (game.height / 2) + camY;

  let minSectorX = Math.floor(minX / m_terrain.SECTOR_REAL_SIZE);
  let minSectorY = Math.floor(minY / m_terrain.SECTOR_REAL_SIZE);
  let maxSectorX = Math.ceil (maxX / m_terrain.SECTOR_REAL_SIZE);
  let maxSectorY = Math.ceil (maxY / m_terrain.SECTOR_REAL_SIZE);
  let minDrawX = minSectorX * m_terrain.SECTOR_REAL_SIZE + (game.width  / 2);
  let minDrawY = minSectorY * m_terrain.SECTOR_REAL_SIZE + (game.height / 2);
  let maxDrawX = maxSectorX * m_terrain.SECTOR_REAL_SIZE + (game.width  / 2);
  let maxDrawY = maxSectorY * m_terrain.SECTOR_REAL_SIZE + (game.height / 2);
  
  // draw sectors as diversely coloured squares
  let sectorW = maxSectorX - minSectorX;
  let sectorH = maxSectorY - minSectorY;
  let sectorArea = sectorW * sectorH;
  
  for (si = 0; si < sectorArea; si++) {
    let sx = si % sectorW;
    let sy = (si - sx) / sectorW;
    let sdlef = minDrawX - camX + sx * m_terrain.SECTOR_REAL_SIZE;
    let sdtop = minDrawY - camY + sy * m_terrain.SECTOR_REAL_SIZE;
    
    let sector = game.terrain.getSector(minSectorX + sx, minSectorY + sy);
    
    drawTerrainSector(ctx, minSectorX + sx, minSectorY + sy, sdlef, sdtop, sector);
    
    /*ctx.strokeStyle = '#ffff00';
    ctx.lineWidth = 3;
    ctx.strokeRect(
      sdlef,
      sdtop,
      m_terrain.SECTOR_REAL_SIZE,
      m_terrain.SECTOR_REAL_SIZE
    );
    ctx.fillStyle = '#ffff44';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 4;
    ctx.font = "15px Arial";
    ctx.textBaseline = 'top';
    ctx.strokeText(
      `(${sx + minSectorX}, ${sy + minSectorY})`,
      sdlef + 25,
      sdtop + 25
    );
    ctx.fillText(
      `(${sx + minSectorX}, ${sy + minSectorY})`,
      sdlef + 25,
      sdtop + 25
    );*/
  }
}

function renderUI(game) {
  renderDeathScreen(game);
}

export function render(game: Game) {
  game.canvas.width = game.width;
  game.canvas.height = game.height;
  
  game.drawCtx.clearRect(0, 0, game.width, game.height);
  renderBackground(game);
  renderTerrain(game);
  renderShips(game);
  renderCannonballs(game);
  renderUI(game);
}