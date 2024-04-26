const canvas = document.querySelector("#game-canvas");
const drawCtx = canvas.getContext('2d');

let fillColor = '#55aaff';
drawCtx.fillStyle = fillColor;

drawCtx.fillRect(0, 0, canvas.width, canvas.height);