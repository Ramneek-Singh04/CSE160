// Vertex Shader
// Vertex Shader
var VSHADER_SOURCE = `
  attribute vec4 a_Position;
  attribute vec2 a_UV;
  varying vec2 v_UV;
  uniform mat4 u_ModelMatrix;
  uniform mat4 u_GlobalRotationMatrix;
  uniform mat4 u_ViewMatrix;       // NEW
  uniform mat4 u_ProjectionMatrix; // NEW
  void main() {
    gl_Position = u_ProjectionMatrix * u_ViewMatrix * u_GlobalRotationMatrix * u_ModelMatrix * a_Position;
    v_UV = a_UV;
  }`;

// Fragment Shader
var FSHADER_SOURCE = `
  precision mediump float;
  varying vec2 v_UV;
  uniform vec4 u_FragColor;
  uniform sampler2D u_Sampler0;
  uniform sampler2D u_Sampler1;
  uniform sampler2D u_Sampler2; // NEW: Third texture sampler
  uniform int u_whichTexture;
  void main() {
    if (u_whichTexture == -2) {
        gl_FragColor = u_FragColor;                  
    } else if (u_whichTexture == -1) {
        gl_FragColor = vec4(v_UV, 1.0, 1.0);         
    } else if (u_whichTexture == 0) {
        gl_FragColor = texture2D(u_Sampler0, v_UV);  // Sky
    } else if (u_whichTexture == 1) {
        gl_FragColor = texture2D(u_Sampler1, v_UV);  // Wall Blocks
    } else if (u_whichTexture == 2) {
        gl_FragColor = texture2D(u_Sampler2, v_UV);  // NEW: Floor
    } else {
        gl_FragColor = vec4(1, 0.2, 0.2, 1);         
    }
  }`;

// Global Variables
let canvas;
let gl;
let a_Position;
let a_UV;
let u_FragColor;
let u_ModelMatrix;
let u_GlobalRotationMatrix;
let u_ViewMatrix;
let u_ProjectionMatrix;
let u_Sampler0;
let u_Sampler1; // NEW
let u_whichTexture;
let g_camera;
var g_map = [];
var g_vertexBuffer = null;
var g_uvBuffer = null;
let u_Sampler2;

// Global UI Variables
let g_globalAngle = 0;
let g_globalAngleX = 0;
let g_yellowAngle = 0;
let g_magentaAngle = 0;
let g_clawAngle = 0;
let g_headAngle = 0;
let g_bodyAngle = 0;

// Animation Flags
let g_yellowAnimation = false;
let g_magentaAnimation = false;
let g_walkAnimation = false;
let g_pokeAnimation = false;
let g_pokeStartTime = 0;

// Optimization: Vertex Buffer
var g_vertexBuffer = null;

function setupWebGL() {
    canvas = document.getElementById('webgl');
    gl = canvas.getContext("webgl", { preserveDrawingBuffer: true });
    if (!gl) {
        console.log('Failed to get the rendering context for WebGL');
        return;
    }
    gl.enable(gl.DEPTH_TEST);
}

function connectVariablesToGLSL() {
    if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) return;

    a_Position = gl.getAttribLocation(gl.program, 'a_Position');
    if (a_Position < 0) { console.log('Failed to get a_Position'); return; }

    a_UV = gl.getAttribLocation(gl.program, 'a_UV');
    if (a_UV < 0) { console.log('Failed to get a_UV'); return; }

    u_FragColor = gl.getUniformLocation(gl.program, 'u_FragColor');
    u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
    u_GlobalRotationMatrix = gl.getUniformLocation(gl.program, 'u_GlobalRotationMatrix');

    // NEW: Connect View and Projection matrices
    u_ViewMatrix = gl.getUniformLocation(gl.program, 'u_ViewMatrix');
    if (!u_ViewMatrix) { console.log('Failed to get u_ViewMatrix'); return; }

    u_ProjectionMatrix = gl.getUniformLocation(gl.program, 'u_ProjectionMatrix');
    if (!u_ProjectionMatrix) { console.log('Failed to get u_ProjectionMatrix'); return; }

    u_Sampler0 = gl.getUniformLocation(gl.program, 'u_Sampler0');
    if (!u_Sampler0) { console.log('Failed to get u_Sampler0'); return false; }

    // NEW: Connect the second sampler
    u_Sampler1 = gl.getUniformLocation(gl.program, 'u_Sampler1');
    if (!u_Sampler1) { console.log('Failed to get u_Sampler1'); return false; }

    u_whichTexture = gl.getUniformLocation(gl.program, 'u_whichTexture');
    if (!u_whichTexture) { console.log('Failed to get u_whichTexture'); return false; }
    

    u_Sampler2 = gl.getUniformLocation(gl.program, 'u_Sampler2');
    if (!u_Sampler2) { console.log('Failed to get u_Sampler2'); return false; }
}

function addActionsForHtmlUI() {
    document.getElementById('walkOn').onclick = function () { g_walkAnimation = true; };
    document.getElementById('walkOff').onclick = function () { g_walkAnimation = false; };

    document.getElementById('resetButton').onclick = function () {
        g_globalAngle = 0;
        g_globalAngleX = 0;
        g_yellowAngle = 0;
        g_magentaAngle = 0;
        g_clawAngle = 0;
        g_headAngle = 0;
        g_bodyAngle = 0;
        g_walkAnimation = false;
        g_pokeAnimation = false;

        document.getElementById('angleSlide').value = 0;
        document.getElementById('yellowSlide').value = 0;
        document.getElementById('magentaSlide').value = 0;
        document.getElementById('clawSlide').value = 0;

        renderScene();
    };

    document.getElementById('angleSlide').addEventListener('mousemove', function () {
        g_globalAngle = parseInt(this.value);
        renderScene();
    });

    document.getElementById('yellowSlide').addEventListener('mousemove', function () {
        g_yellowAngle = this.value; renderScene();
    });
    document.getElementById('magentaSlide').addEventListener('mousemove', function () {
        g_magentaAngle = this.value; renderScene();
    });
    document.getElementById('clawSlide').addEventListener('mousemove', function () {
        g_clawAngle = this.value; renderScene();
    });

    initEventHandlers(canvas, g_globalAngle, g_globalAngleX);
}

function initEventHandlers(canvas, currentAngle, currentAngleX) {
    var dragging = false;
    var lastX = -1, lastY = -1;

    canvas.onmousedown = function (ev) {
        if (ev.shiftKey) {
            g_pokeAnimation = true;
            g_pokeStartTime = g_seconds;
            return;
        }

        var x = ev.clientX, y = ev.clientY;
        var rect = ev.target.getBoundingClientRect();
        if (rect.left <= x && x < rect.right && rect.top <= y && y < rect.bottom) {
            lastX = x; lastY = y;
            dragging = true;
        }
    };

    canvas.onmouseup = function (ev) { dragging = false; };

    canvas.onmousemove = function (ev) {
        var x = ev.clientX, y = ev.clientY;
        if (dragging) {
            var factor = 100 / canvas.height;
            var dx = factor * (x - lastX);
            var dy = factor * (y - lastY);

            g_globalAngle = g_globalAngle + dx;
            g_globalAngleX = g_globalAngleX + dy;

            document.getElementById('angleSlide').value = g_globalAngle % 360;

            lastX = x;
            lastY = y;
        }
    };
}

function initTriangle3D() {
    g_vertexBuffer = gl.createBuffer();
    if (!g_vertexBuffer) {
        console.log('Failed to create the buffer object');
        return -1;
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, g_vertexBuffer);
    gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_Position);
}

function drawTriangle3D(vertices) {
    var n = 3;
    if (g_vertexBuffer == null) initTriangle3D();
    gl.bindBuffer(gl.ARRAY_BUFFER, g_vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.DYNAMIC_DRAW);
    gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_Position);
    gl.drawArrays(gl.TRIANGLES, 0, n);
}

// NEW FUNCTION FOR UV MAPPING
function drawTriangle3DUV(vertices, uv) {
    var n = 3;

    // Create a buffer object for positions
    var vertexBuffer = gl.createBuffer();
    if (!vertexBuffer) {
        console.log('Failed to create the buffer object');
        return -1;
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.DYNAMIC_DRAW);
    gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_Position);

    // Create a buffer object for UVs
    var uvBuffer = gl.createBuffer();
    if (!uvBuffer) {
        console.log('Failed to create the buffer object');
        return -1;
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(uv), gl.DYNAMIC_DRAW);
    gl.vertexAttribPointer(a_UV, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_UV);

    // Draw the triangle
    gl.drawArrays(gl.TRIANGLES, 0, n);
}

var g_startTime = performance.now();
var g_seconds = performance.now() / 1000.0;

function tick() {
    g_seconds = (performance.now() - g_startTime) / 1000.0;
    updateAnimationAngles();
    renderScene();
    requestAnimationFrame(tick);
}

function updateAnimationAngles() {
    if (g_pokeAnimation) {
        var timePassed = g_seconds - g_pokeStartTime;
        if (timePassed > 1.0) {
            g_pokeAnimation = false;
        } else {
            g_bodyAngle = 360 * timePassed;
            g_headAngle = -30;
            g_yellowAngle = -45;
            g_magentaAngle = -45;
        }
    }
    else if (g_walkAnimation) {
        g_yellowAngle = 45 * Math.sin(g_seconds * 3);
        g_magentaAngle = 20 * Math.sin(g_seconds * 3 + Math.PI / 2);
        g_clawAngle = 15 + (15 * Math.sin(g_seconds * 6));
        g_headAngle = 10 * Math.sin(g_seconds * 6);
        g_bodyAngle = 5 * Math.sin(g_seconds * 3);
    }
    else {
        if (g_yellowAnimation) g_yellowAngle = (45 * Math.sin(g_seconds * 3));
        if (g_magentaAnimation) g_magentaAngle = (45 * Math.sin(g_seconds * 3));
        g_bodyAngle = 0;
        g_headAngle = 5 * Math.sin(g_seconds * 2);
    }
}

function drawClaws(matrix, extensionValue) {
    var clawColor = [0.9, 0.85, 0.8, 1.0];
    var extensionDistance = extensionValue * 0.001;
    var currentY = -0.22 - extensionDistance;

    for (var i = -1; i <= 1; i++) {
        var claw = new Cone();
        claw.color = clawColor;
        claw.matrix = new Matrix4(matrix);

        claw.matrix.translate(0, currentY, i * 0.02);
        claw.matrix.rotate(180, 1, 0, 0);
        claw.matrix.scale(0.04, 0.12, 0.04);
        claw.matrix.translate(0, 0, 0);
        claw.render();
    }
}


function renderScene() {
    var startTime = performance.now();
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Use the camera's projection matrix
    gl.uniformMatrix4fv(u_ProjectionMatrix, false, g_camera.projectionMatrix.elements);

    // Use the camera's view matrix
    gl.uniformMatrix4fv(u_ViewMatrix, false, g_camera.viewMatrix.elements);

    var globalRotMat = new Matrix4().rotate(g_globalAngle, 0, 1, 0);
    globalRotMat.rotate(g_globalAngleX, 1, 0, 0);
    gl.uniformMatrix4fv(u_GlobalRotationMatrix, false, globalRotMat.elements);

    // --- STEP 9: SKY BOX ---
    var sky = new Cube();
    sky.color = [1.0, 1.0, 1.0, 1.0];
    sky.textureNum = 0; // Use texture0 (Sky)
    sky.matrix.scale(50, 50, 50); // Scale it to be gigantic
    sky.matrix.translate(-0.5, -0.5, -0.5); // Center it around the camera
    sky.render();

    // --- STEP 8: GROUND PLANE ---
    var ground = new Cube();
    ground.color = [1.0, 1.0, 1.0, 1.0];
    ground.textureNum = 2; // Use texture1 (Ground)
    ground.matrix.translate(0, -0.75, 0); // Move it down below the camera
    ground.matrix.scale(50, 0.01, 50); // Flatten it on the Y axis and stretch it on X and Z
    ground.matrix.translate(-0.5, 0, -0.5); // Center it
    ground.render();

    drawMap();

    var duration = performance.now() - startTime;
    sendTextToHTML("FPS: " + Math.floor(10000 / duration) / 10, "numdot");
}

function sendTextToHTML(text, htmlID) {
    var htmlElm = document.getElementById(htmlID);
    if (!htmlElm) {
        console.log("Failed to get " + htmlID + " from HTML");
        return;
    }
    htmlElm.innerHTML = text;
}

// NEW: Create the map wall object ONCE outside the loop
var g_mapWall = new Cube();
g_mapWall.textureNum = 1;

function drawMap() {
    for (let x = 0; x < 32; x++) {
        for (let z = 0; z < 32; z++) {
            let height = g_map[x][z];

            for (let y = 0; y < height; y++) {
                // REUSE the same cube, just change its matrix
                g_mapWall.matrix.setIdentity(); // Reset the matrix
                g_mapWall.matrix.translate(x - 16, y - 0.75, z - 16);
                g_mapWall.renderFast(); // Call the new fast render method!
            }
        }
    }
}


// --- TEXTURE LOADING ---
function initTextures() {
    var image0 = new Image();
    if (!image0) { console.log('Failed to create image0'); return false; }
    image0.onload = function () { sendTextureToGLSL(image0, u_Sampler0, 0); };
    image0.src = 'sky.png';

    var image1 = new Image();
    if (!image1) { console.log('Failed to create image1'); return false; }
    image1.onload = function () { sendTextureToGLSL(image1, u_Sampler1, 1); };
    image1.src = 'ground.png';

    // NEW: Load Texture 2 (Floor)
    var image2 = new Image();
    if (!image2) { console.log('Failed to create image2'); return false; }
    image2.onload = function () { sendTextureToGLSL(image2, u_Sampler2, 2); };
    image2.src = 'floor.png';

    return true;
}

function sendTextureToGLSL(image, u_Sampler, texUnit) {
    var texture = gl.createTexture();
    if (!texture) { console.log('Failed to create texture object'); return false; }

    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);

    // Activate the correct texture unit
    if (texUnit == 0) {
        gl.activeTexture(gl.TEXTURE0);
    } else if (texUnit == 1) {
        gl.activeTexture(gl.TEXTURE1);
    } else if (texUnit == 2) {
        gl.activeTexture(gl.TEXTURE2); // NEW: Unit 2
    }

    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
    gl.uniform1i(u_Sampler, texUnit);

    console.log('Texture ' + texUnit + ' loaded successfully!');
}


class Cone {
    constructor() {
        this.type = 'cone';
        this.color = [1.0, 1.0, 1.0, 1.0];
        this.matrix = new Matrix4();
    }

    render() {
        var rgba = this.color;
        gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);
        gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);

        var segments = 10;
        var step = 360 / segments;

        for (var angle = 0; angle < 360; angle += step) {
            var angle1 = angle;
            var angle2 = angle + step;

            var vec1 = [Math.cos(angle1 * Math.PI / 180) * 0.5, Math.sin(angle1 * Math.PI / 180) * 0.5];
            var vec2 = [Math.cos(angle2 * Math.PI / 180) * 0.5, Math.sin(angle2 * Math.PI / 180) * 0.5];

            var pt1 = [0, 1, 0];
            var pt2 = [vec1[0], 0, vec1[1]];
            var pt3 = [vec2[0], 0, vec2[1]];

            drawTriangle3D([pt1[0], pt1[1], pt1[2], pt2[0], pt2[1], pt2[2], pt3[0], pt3[1], pt3[2]]);
            drawTriangle3D([0, 0, 0, pt3[0], pt3[1], pt3[2], pt2[0], pt2[1], pt2[2]]);
        }
    }
}


function keydown(ev) {
    if (ev.keyCode == 39 || ev.keyCode == 68) { // D
        g_camera.moveRight();
    } else if (ev.keyCode == 37 || ev.keyCode == 65) { // A
        g_camera.moveLeft();
    } else if (ev.keyCode == 38 || ev.keyCode == 87) { // W
        g_camera.moveForward();
    } else if (ev.keyCode == 40 || ev.keyCode == 83) { // S
        g_camera.moveBackwards();
    } else if (ev.keyCode == 82) { // R
        g_camera.moveUp();
    } else if (ev.keyCode == 84) { // T
        g_camera.moveDown();
    }

    // --- SIMPLE MINECRAFT ---
    else if (ev.keyCode == 90) { // Z: Place a Block
        let target = getBlockInFront();
        if (target.x >= 0 && target.x < 32 && target.z >= 0 && target.z < 32) {
            g_map[target.x][target.z] += 1;
        }
    } else if (ev.keyCode == 88) { // X: Break a Block
        let target = getBlockInFront();
        if (target.x >= 0 && target.x < 32 && target.z >= 0 && target.z < 32) {
            if (g_map[target.x][target.z] > 0) {
                g_map[target.x][target.z] -= 1;
            }
        }
    }

    renderScene(); // Redraw the scene to show the updated map
}


// Keep track of the old mouse location
let g_lastX = -1;

function onMove(ev) {
    // Only rotate the camera if the mouse is locked to the canvas
    if (document.pointerLockElement === canvas) {
        let deltaX = ev.movementX;
        let deltaY = ev.movementY; // NEW: Get vertical mouse movement

        let sensitivity = 0.3; // Lowered slightly for smoother FPS controls

        // Horizontal Rotation (Yaw)
        if (deltaX > 0) {
            g_camera.panRight(deltaX * sensitivity);
        } else if (deltaX < 0) {
            g_camera.panLeft(Math.abs(deltaX) * sensitivity);
        }

        // Vertical Rotation (Pitch)
        if (deltaY > 0) {
            g_camera.panDown(deltaY * sensitivity); // Mouse moved down
        } else if (deltaY < 0) {
            g_camera.panUp(Math.abs(deltaY) * sensitivity); // Mouse moved up
        }

        renderScene();
    }
}

function initMap() {
    // Loop through all 32x32 coordinates
    for (let x = 0; x < 32; x++) {
        g_map[x] = [];
        for (let z = 0; z < 32; z++) {
            // Check if we are on the outer edge of the map
            if (x === 0 || x === 31 || z === 0 || z === 31) {
                g_map[x][z] = 10; // Wall is 10 blocks high
            } else {
                g_map[x][z] = 0;  // Inside is empty space
            }
        }
    }
}



function drawCubeFast(vertices, uvs) {
    // 1. Initialize buffers ONLY if they don't exist yet
    if (g_vertexBuffer == null) {
        g_vertexBuffer = gl.createBuffer();
        if (!g_vertexBuffer) { console.log('Failed to create buffer'); return -1; }
    }
    if (g_uvBuffer == null) {
        g_uvBuffer = gl.createBuffer();
        if (!g_uvBuffer) { console.log('Failed to create buffer'); return -1; }
    }

    // 2. Bind and send Vertex Data
    gl.bindBuffer(gl.ARRAY_BUFFER, g_vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.DYNAMIC_DRAW);
    gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_Position);

    // 3. Bind and send UV Data
    gl.bindBuffer(gl.ARRAY_BUFFER, g_uvBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, uvs, gl.DYNAMIC_DRAW);
    gl.vertexAttribPointer(a_UV, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_UV);

    // 4. Draw all 36 vertices (12 triangles) in ONE call!
    gl.drawArrays(gl.TRIANGLES, 0, 36);
}



function getBlockInFront() {
    // 1. Calculate the forward direction vector
    let f = new Vector3();
    f.set(g_camera.at);
    f.sub(g_camera.eye);
    f.normalize();

    // 2. Scale it to project "2 units" in front of the camera
    f.mul(2);

    // 3. Add this forward vector to our eye position to find the target point
    let target = new Vector3();
    target.set(g_camera.eye);
    target.add(f);

    // 4. Convert the 3D world coordinates back into 2D map array indices
    // Since we translated our map by (x - 16, z - 16) when drawing, we reverse it by adding 16!
    let mapX = Math.floor(target.elements[0] + 16);
    let mapZ = Math.floor(target.elements[2] + 16);

    return { x: mapX, z: mapZ };
}


function main() {
    setupWebGL();
    connectVariablesToGLSL();
    addActionsForHtmlUI();

    g_camera = new Camera();
    document.onkeydown = keydown;

    // NEW: Request Pointer Lock when you click the canvas
    canvas.onclick = function () {
        canvas.requestPointerLock();
    };

    // Listen for mouse movement
    canvas.onmousemove = onMove;

    initMap();
    initTextures();

    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    requestAnimationFrame(tick);
}


