import { Game } from "./game";

let lastTime: number | null = null;
const frameDuration = 1000 / 30;

export function tickLoop(game: Game, current: number) {
  if (lastTime == null) {
    requestAnimationFrame(
      tickLoop.bind(null, game) as (current: number) => void,
    );
    lastTime = current;
    return;
  }

  let deltaTime = (+current - +lastTime) / 1000;
  lastTime = current;

  if (deltaTime > frameDuration * 20) {
    console.warn(
      `Skipping tick due to huge lagspike: ${deltaTime.toFixed(0)}ms`,
    );
  } else if (deltaTime > frameDuration) {
    console.warn(
      `Compensating for lag: ${(deltaTime - frameDuration).toFixed(0)}ms behind target framerate!`,
    );
  }

  while (deltaTime > frameDuration) {
    processTick(game, frameDuration);
    deltaTime -= frameDuration;
  }

  requestAnimationFrame(tickLoop.bind(null, game) as (current: number) => void);

  processTick(game, deltaTime);
}

function processTick(game: Game, deltaTime: number) {
  game.tick(deltaTime);
  game.render();
}
