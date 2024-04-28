export function registerMouseListener() {
  // Adapted from https://stackoverflow.com/a/22986867/5129091
  window.mouseX = null;
  window.mouseY = null;
  
  let mouseX = null;
  let mouseY = null;
  let tracking = false;
  
  document.addEventListener('mousemove', onMouseUpdate, false);
  document.addEventListener('mousedown', onMouseDown, false);
  document.addEventListener('mouseup', onMouseUp, false);
      
  function onMouseUpdate(e) {
    mouseX = e.clientX - window.innerWidth / 2;
    mouseY = e.clientY - window.innerHeight / 2;
    if (tracking) {
      window.mouseX = mouseX;
      window.mouseY = mouseY;
    }
  }
  
  function onMouseDown(e) {
    tracking = true;
    window.mouseX = mouseX;
    window.mouseY = mouseY;
  }
  
  function onMouseUp(e) {
    tracking = false;
    window.mouseX = null;
    window.mouseY = null;
  }
}