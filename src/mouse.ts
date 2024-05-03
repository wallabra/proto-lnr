export const mouseState = {
  x: 0,
  y: 0,
  steering: false,
  attack: false,
};

export function registerMouseListener() {
  // Adapted from https://stackoverflow.com/a/22986867/5129091
  document.addEventListener("mousemove", onMouseUpdate, false);
  document.addEventListener("mousedown", onMouseDown, false);
  document.addEventListener("mouseup", onMouseUp, false);

  function onMouseUpdate(e: MouseEvent) {
    mouseState.x = e.clientX - window.innerWidth / 2;
    mouseState.y = e.clientY - window.innerHeight / 2;
  }

  function onMouseDown() {
    mouseState.steering = true;
  }

  function onMouseUp() {
    mouseState.steering = false;
  }
}
