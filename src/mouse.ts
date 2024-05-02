export function registerMouseListener() {
  // Adapted from https://stackoverflow.com/a/22986867/5129091
  const mouseState = {
    x: null,
    y: null,
    steering: false,
    attack: false,
  };
  window.mouseState = mouseState;

  document.addEventListener("mousemove", onMouseUpdate, false);
  document.addEventListener("mousedown", onMouseDown, false);
  document.addEventListener("mouseup", onMouseUp, false);

  function onMouseUpdate(e: MouseEvent) {
    mouseState.x = e.clientX - window.innerWidth / 2;
    mouseState.y = e.clientY - window.innerHeight / 2;
  }

  function onMouseDown(e: MouseEvent) {
    mouseState.steering = true;
  }

  function onMouseUp(e: MouseEvent) {
    mouseState.steering = false;
  }
}
