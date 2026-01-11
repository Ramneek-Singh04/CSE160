function main() {
  var canvas = document.getElementById('example');
  if (!canvas) return;

  var ctx = canvas.getContext('2d');
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, 400, 400);

  // Initial draw of v1 (matching the PDF example)
  var v1 = new Vector3([2.25, 2.25, 0]);
  drawVector(v1, "red");
}

function drawVector(v, color) {
  var canvas = document.getElementById('example');
  var ctx = canvas.getContext('2d');

  var cx = canvas.width / 2;
  var cy = canvas.height / 2;

  ctx.strokeStyle = color;
  ctx.beginPath();
  ctx.moveTo(cx, cy);

  // Math: center + (coordinate * scale)
  var endX = cx + v.elements[0] * 20;
  var endY = cy - v.elements[1] * 20;

  ctx.lineTo(endX, endY);
  ctx.stroke();
}

function handleDrawEvent() {
  var canvas = document.getElementById('example');
  var ctx = canvas.getContext('2d');

  // 1. Clear the canvas before redrawing
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 2. Read and draw v1 (Red)
  var v1x = document.getElementById('v1x').value;
  var v1y = document.getElementById('v1y').value;
  var v1 = new Vector3([parseFloat(v1x), parseFloat(v1y), 0]);
  drawVector(v1, "red");

  // 3. Read and draw v2 (Blue)
  var v2x = document.getElementById('v2x').value;
  var v2y = document.getElementById('v2y').value;
  var v2 = new Vector3([parseFloat(v2x), parseFloat(v2y), 0]);
  drawVector(v2, "blue");
}