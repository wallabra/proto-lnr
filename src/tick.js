const m_game = require('./game.js');
const m_render = require('./render.js');
const m_player = require('./player.js');
const m_ship = require('./ship.js');

let lastTime = null;

export function tick(game) {
  requestAnimationFrame(tick, game);
  let current = Date.now();
  
  if (lastTime == null) {
    lastTime = current;
    return;
  }
  
  let deltaTime = current - lastTime;
  lastTime = current;
  
  processTick(game, deltaTime);
}

function processTick(game, deltaTime) {
  m_render.render(game);
  game.tick(deltaTime);
}