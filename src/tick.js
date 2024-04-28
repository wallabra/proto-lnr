// @flow
const m_render = require('./render.js');

let lastTime = null;

export function tick(game: Game, current: Date) {
  requestAnimationFrame(tick.bind(null, game));
  
  if (lastTime == null) {
    lastTime = current;
    return;
  }
  
  let deltaTime = (current - lastTime) / 1000;
  lastTime = current;

  processTick(game, deltaTime);
}

function processTick(game: Game, deltaTime: Dates) {
  m_render.render(game);
  game.tick(deltaTime);
}