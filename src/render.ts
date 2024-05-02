import Vec2 from 'victor';
import { Terrain, TerraSector, SECTOR_AREA, SECTOR_SIZE, SECTOR_REAL_SIZE, SECTOR_RES } from './terrain.js';
import { lerp } from './util.ts';


function renderDeathScreen(game: Game) {
  // render death screen
  let ctx = game.drawCtx;
  
  if (game.player != null && game.player.possessed != null && game.player.possessed.dying) {
    ctx.fillStyle = '#22222240';
    ctx.fillRect(0, 0, game.width, game.height);
  
    ctx.fillStyle = '#ffff00';
    ctx.font = '60px Verdana serif';
    ctx.textBaseline = 'center';
    ctx.textAlign = 'center';
    ctx.fillText('rip', game.width / 2, game.height / 2);
  }
}

function renderKillScore(game: Game) {
  // render kill score
  let ctx = game.drawCtx;
  
  if (game.player != null && game.player.possessed != null) {
    ctx.fillStyle = '#0099ff';
    ctx.font = '30px Verdana serif';
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    ctx.fillText(`K: ${game.player.possessed.killScore}`, 40, 40);
  }
}

function renderCannonballs(game: Game) {
  let ctx = game.drawCtx;
  let baseX = game.width / 2;
  let baseY = game.height / 2;
  
  // set camera
  let cam = Vec2(0, 0);
  
  if (game.player != null && game.player.possessed != null) {
    cam = game.player.possessed.pos.clone();
  }
  
  // render cannonballs
  
  game.cannonballs.forEach((cball: Cannonball) => {
    let x = baseX + cball.pos.x - cam.x;
    let y = baseY + cball.pos.y - cam.y;
    let camheight = 4;
    let cdist = Vec2(x, y).subtract(Vec2(game.width / 2, game.height / 2)).length() / Math.min(game.width, game.height) * 0.5;
    let hdist = camheight - cball.height/2;
    let proximityScale = camheight / Vec2(hdist + cdist).length();
    let size = cball.size * proximityScale;
    
    if (hdist < 0.02) {
      return;
    }
    
    let hoffs = cball.height * 20 + 5;
    let shoffs = Math.max(0, hoffs - Math.max(cball.phys.floor, game.waterLevel) * 20);
    
    // draw shadow
    ctx.fillStyle = '#0008';
    ctx.beginPath();
    ctx.arc(x, y + shoffs, cball.size * proximityScale, 0, 2 * Math.PI);
    ctx.fill();
    
    // draw cball
    ctx.fillStyle = '#877';
    ctx.beginPath();
    ctx.arc(x, y, cball.size * proximityScale, 0, 2 * Math.PI);
    ctx.fill();
  })
}

function renderShips(game: Game) {
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
    let camheight = 4;
    let hdist = camheight - ship.height/2;
    let proximityScale = camheight / hdist;
    let size = ship.size * proximityScale;
      
    if (hdist < 0.1) {
      return;
    }
      
    let hoffs = (ship.height * 20) + 10;
    let shoffs = Math.max(0, hoffs - Math.max(ship.phys.floor, game.waterLevel) * 20);
    
    // Draw shadow
    ctx.fillStyle = '#0008';
    ctx.beginPath();
    ctx.ellipse(x, y + shoffs, size * ship.lateralCrossSection, size, ship.angle, 0, 2 * Math.PI);
    ctx.fill();
      
    // Draw body
    ctx.fillStyle = isPlayer ? '#227766' : '#4a1800';
    ctx.beginPath();
    ctx.ellipse(x, y, size * ship.lateralCrossSection, size, ship.angle, 0, 2 * Math.PI);
    ctx.fill();
      
    ctx.fillStyle = isPlayer ? '#115533' : '#331100';
    ctx.beginPath();
    ctx.ellipse(x, y, size * ship.lateralCrossSection * 0.8, size * 0.8, ship.angle, 0, 2 * Math.PI);
    ctx.fill();
      
    // Draw forward direction
    ctx.beginPath();
    ctx.moveTo(x, y);
    let to = Vec2(ship.size * ship.lateralCrossSection).rotateBy(ship.angle).add(Vec2(x, y));
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
    
    // Draw height
    /*
    ctx.font = '12px Arial';
    ctx.fillStyle = '#220000';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.strokeText(Math.round((ship.height - ship.floor) * 10)+'m', x - 15, y - 15);
    ctx.fillText(Math.round((ship.height - ship.floor) * 10)+'m', x - 15, y - 15);
    */
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
    
    dmgAlpha = 1 - dmgAlpha;
    
    ctx.fillStyle = '#33AA0088';
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

function interpTerrainColor(game: Game, height: number) {
  // below waterLevel
  let rgb1 = [0, 10, 45];
  let rgb2 = [30, 60, 70]; 
  // above waterLevel
  let rgb3 = [50, 90, 30]; 
  let rgb4 = [180, 182, 197];
  
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
  let rgbFinal = interpColor(from, to, alpha);
  
  return rgbFinal;
}

function rgbString(rgb: [number, number, number]) {
  return `rgb(${rgb.join(', ')})`
}

function interpColor(from: [number, number, number], to: [number, number, number], alpha: number) {
  return from.map((f, i) => lerp(f, to[i], alpha));
}

window.interpTerrainColor = interpTerrainColor; //DEBUG

let renderedSectors = new Map();

function renderTerrainSector(ctx: CanvasRenderingContext2D, cx: number, cy: number, game: Game, sector: TerraSector) {
  for (let tileIdx = 0; tileIdx < SECTOR_AREA; tileIdx++) {
    let tx = tileIdx % SECTOR_SIZE;
    let ty = (tileIdx - tx) / SECTOR_SIZE;
    
    let height = sector.heights[tileIdx];
    let drawX = tx * SECTOR_RES;
    let drawY = ty * SECTOR_RES;
    
    let gradient = game.terrain.gradientAt(cx + tx * SECTOR_RES, cy + ty * SECTOR_RES);
    let shadowness = height < game.waterLevel ? 0 : Math.max(0, 30 * gradient.dot(Vec2(0, -1)));

    ctx.lineWidth = 0;
    ctx.fillStyle = rgbString(interpColor(interpTerrainColor(game, height), [12, 12, 12], shadowness));
    ctx.fillRect(drawX, drawY, SECTOR_RES + 1, SECTOR_RES + 1);
  }
}

function drawTerrainSector(ctx: CanvasRenderingContext2D, sx: number, sy: number, game: Game, sdlef: number, sdtop: number, sector: TerraSector) {
  let key = `${sx},${sy}`;
  let image = 0;
  
  if (!renderedSectors.has(key)) {
    let x = sx * SECTOR_REAL_SIZE;
    let y = sx * SECTOR_REAL_SIZE;
    
    let renderCanvas = document.createElement('canvas');
    renderCanvas.width = SECTOR_REAL_SIZE;
    renderCanvas.height = SECTOR_REAL_SIZE;
    let renderCtx = renderCanvas.getContext('2d');
    renderCtx.imageSmoothingEnabled = false;
    
    renderTerrainSector(renderCtx, x, y, game, sector);
    
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
  ctx.drawImage(image, sdlef, sdtop, SECTOR_REAL_SIZE + 1, SECTOR_REAL_SIZE + 1);
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

  let minSectorX = Math.floor(minX / SECTOR_REAL_SIZE);
  let minSectorY = Math.floor(minY / SECTOR_REAL_SIZE);
  let maxSectorX = Math.ceil (maxX / SECTOR_REAL_SIZE);
  let maxSectorY = Math.ceil (maxY / SECTOR_REAL_SIZE);
  let minDrawX = minSectorX * SECTOR_REAL_SIZE + (game.width  / 2);
  let minDrawY = minSectorY * SECTOR_REAL_SIZE + (game.height / 2);
  let maxDrawX = maxSectorX * SECTOR_REAL_SIZE + (game.width  / 2);
  let maxDrawY = maxSectorY * SECTOR_REAL_SIZE + (game.height / 2);
  
  // draw sectors as diversely coloured squares
  let sectorW = maxSectorX - minSectorX;
  let sectorH = maxSectorY - minSectorY;
  let sectorArea = sectorW * sectorH;
  
  for (let si = 0; si < sectorArea; si++) {
    let sx = si % sectorW;
    let sy = (si - sx) / sectorW;
    let sdlef = minDrawX - camX + sx * SECTOR_REAL_SIZE;
    let sdtop = minDrawY - camY + sy * SECTOR_REAL_SIZE;
    
    let sector = game.terrain.getSector(minSectorX + sx, minSectorY + sy);
    
    drawTerrainSector(ctx, minSectorX + sx, minSectorY + sy, game, sdlef, sdtop, sector);
    
    /*ctx.strokeStyle = '#ffff00';
    ctx.lineWidth = 3;
    ctx.strokeRect(
      sdlef,
      sdtop,
      SECTOR_REAL_SIZE,
      SECTOR_REAL_SIZE
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

function renderUI(game: Game) {
  renderKillScore(game);
  renderDeathScreen(game);
}

export function render(game: Game) {
  game.canvas.width = game.width;
  game.canvas.height = game.height;
  
  //game.drawCtx.clearRect(0, 0, game.width, game.height);
  renderBackground(game);
  renderTerrain(game);
  renderShips(game);
  renderCannonballs(game);
  renderUI(game);
}