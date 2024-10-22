import type { Game } from "./game";

let lastTime: number | null = null;
const frameDuration = 1000 / 30;
let errored = false;

export function tickLoop(game: Game, current: number) {
  if (errored) return;

  if (lastTime == null) {
    requestAnimationFrame(
      tickLoop.bind(null, game) as (current: number) => void,
    );
    lastTime = current;
    return;
  }

  let deltaTime = (+current - +lastTime) / 1000;
  lastTime = current;

  requestAnimationFrame(tickLoop.bind(null, game) as (current: number) => void);

  if (deltaTime > frameDuration * 2) {
    console.warn(`Skipping tick due to lagspike: ${deltaTime.toFixed(0)}ms`);
    return;
  } else if (deltaTime > frameDuration) {
    console.warn(
      `Compensating for lag: ${(deltaTime - frameDuration).toFixed(0)}ms behind target framerate!`,
    );
  }

  while (deltaTime > frameDuration) {
    const timeA = Date.now();
    processTick(game, frameDuration);
    const timeB = Date.now();
    const duration = timeB - timeA;
    if (duration > frameDuration) {
      console.warn(
        `Cannot compensate for lag - tick took ${duration.toFixed(0)}ms, ${(duration - frameDuration).toFixed(0)}ms more than the target framerate!`,
      );
      deltaTime = 0;
      break;
    }
    deltaTime -= frameDuration;
  }

  try {
    if (deltaTime > 0) processTick(game, deltaTime);
  } catch (e) {
    errored = true;
    throw e;
  }
}

function processTick(game: Game, deltaTime: number) {
  game.tick(deltaTime);
  game.render();
}
