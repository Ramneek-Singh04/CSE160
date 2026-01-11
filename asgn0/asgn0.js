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

function handleDrawOperationEvent() {
  var canvas = document.getElementById('example');
  var ctx = canvas.getContext('2d');

  // 1. Clear the canvas
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 2. Read v1 and v2 from the text boxes and draw them
  var v1x = parseFloat(document.getElementById('v1x').value) || 0;
  var v1y = parseFloat(document.getElementById('v1y').value) || 0;
  var v1 = new Vector3([v1x, v1y, 0]);
  drawVector(v1, "red");

  var v2x = parseFloat(document.getElementById('v2x').value) || 0;
  var v2y = parseFloat(document.getElementById('v2y').value) || 0;
  var v2 = new Vector3([v2x, v2y, 0]);
  drawVector(v2, "blue");

  // 3. Read the operation type and the scalar value
  var operation = document.getElementById('op-select').value;
  var scalar = parseFloat(document.getElementById('scalar').value) || 0;

  // 4. Perform the selected operation
  if (operation === "add") {
    // v3 = v1 + v2
    var v3 = new Vector3(v1.elements); // Copy v1 so we don't modify the original
    v3.add(v2);
    drawVector(v3, "green");
  }
  else if (operation === "sub") {
    // v3 = v1 - v2
    var v3 = new Vector3(v1.elements);
    v3.sub(v2);
    drawVector(v3, "green");
  }
  else if (operation === "mul") {
    // v3 = v1 * s and v4 = v2 * s
    var v3 = new Vector3(v1.elements);
    var v4 = new Vector3(v2.elements);
    v3.mul(scalar);
    v4.mul(scalar);
    drawVector(v3, "green");
    drawVector(v4, "green");
  }
  else if (operation === "div") {
    // v3 = v1 / s and v4 = v2 / s
    var v3 = new Vector3(v1.elements);
    var v4 = new Vector3(v2.elements);
    v3.div(scalar);
    v4.div(scalar);
    drawVector(v3, "green");
    drawVector(v4, "green");
  }

  else if (operation === "magnitude") {
        console.log("v1 Magnitude: " + v1.magnitude());
        console.log("v2 Magnitude: " + v2.magnitude());
    }

  else if (operation === "normalize") {
        // Create copies to normalize so we don't destroy the original red/blue lines
        var v3 = new Vector3(v1.elements);
        var v4 = new Vector3(v2.elements);
        
        v3.normalize();
        v4.normalize();
        
        drawVector(v3, "green");
        drawVector(v4, "green");
    }
  else if (operation === "angle") {
        angleBetween(v1, v2);
    }
  else if (operation === "area") {
        areaTriangle(v1, v2);
    }
}

/**
 * Calculates and logs the angle between two vectors in degrees.
 */
function angleBetween(v1, v2) {
  // 1. Calculate the dot product
  let d = Vector3.dot(v1, v2);

  // 2. Calculate magnitudes
  let m1 = v1.magnitude();
  let m2 = v2.magnitude();

  // 3. Calculate cosine of the angle: cos(alpha) = dot / (mag1 * mag2)
  // We use Math.acos to get the angle in radians
  let cosAlpha = d / (m1 * m2);

  // Clamp value to handle floating point errors (between -1 and 1)
  cosAlpha = Math.min(Math.max(cosAlpha, -1), 1);

  let alphaRadians = Math.acos(cosAlpha);

  // 4. Convert radians to degrees
  let alphaDegrees = alphaRadians * (180 / Math.PI);

  console.log("Angle: " + alphaDegrees.toFixed(2));
}

function areaTriangle(v1, v2) {
    // 1. Calculate the cross product (v1 x v2)
    // This returns a new Vector3
    let v3 = Vector3.cross(v1, v2);
    
    // 2. The magnitude of the cross product is the area of the parallelogram
    let areaParallelogram = v3.magnitude();
    
    // 3. The area of the triangle is half of the parallelogram's area
    let areaTriangle = areaParallelogram / 2;
    
    console.log("Area of the triangle: " + areaTriangle);
}