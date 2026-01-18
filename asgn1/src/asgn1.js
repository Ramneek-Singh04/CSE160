// asgn1.js

// Vertex shader
var VSHADER_SOURCE =
    'attribute vec4 a_Position;\n' +
    'uniform float u_Size;\n' +
    'void main() {\n' +
    '  gl_Position = a_Position;\n' +
    '  gl_PointSize = u_Size;\n' +
    '}\n';

// Fragment shader
var FSHADER_SOURCE =
    'precision mediump float;\n' +
    'uniform vec4 u_FragColor;\n' +
    'void main() {\n' +
    '  gl_FragColor = u_FragColor;\n' +
    '}\n';

// --- GLOBAL VARIABLES ---
let canvas, gl, a_Position, u_FragColor, u_Size;
let g_selectedColor = [1.0, 0.0, 0.0, 1.0];
let g_selectedSize = 10;
let g_selectedType = 'POINT';
let g_selectedSegments = 10;
let g_shapesList = [];

// --- ANIMATION GLOBALS ---
let g_thwompX = 0;
let g_thwompY = 0;
let g_isAnimating = false;
let g_animPhase = 0; // 0: Idle, 1: Shake, 2: Fall, 3: Rise
let g_startTime = 0;

// --- SETUP & INIT ---
function setupWebGL() {
    canvas = document.getElementById('webgl');
    gl = canvas.getContext("webgl", { preserveDrawingBuffer: true });
    if (!gl) gl = canvas.getContext("experimental-webgl", { preserveDrawingBuffer: true });
    if (!gl) console.log('Failed to get WebGL context');
}

function connectVariablesToGLSL() {
    if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) return;
    a_Position = gl.getAttribLocation(gl.program, 'a_Position');
    u_FragColor = gl.getUniformLocation(gl.program, 'u_FragColor');
    u_Size = gl.getUniformLocation(gl.program, 'u_Size');
}

function addActionsForHtmlUI() {
    document.getElementById('clearButton').onclick = function () { g_shapesList = []; renderAllShapes(); };
    document.getElementById('pointButton').onclick = function () { g_selectedType = 'POINT'; };
    document.getElementById('triButton').onclick = function () { g_selectedType = 'TRIANGLE'; };
    document.getElementById('circleButton').onclick = function () { g_selectedType = 'CIRCLE'; };

    // Picture & Animation Buttons
    document.getElementById('pictureButton').onclick = function () {
        g_isAnimating = false;
        g_thwompX = 0;
        g_thwompY = 0;
        drawPicture();
    };
    document.getElementById('fallButton').onclick = function () { startFalling(); };

    // Sliders
    document.getElementById('redSlide').addEventListener('mouseup', function () { g_selectedColor[0] = this.value / 100; });
    document.getElementById('greenSlide').addEventListener('mouseup', function () { g_selectedColor[1] = this.value / 100; });
    document.getElementById('blueSlide').addEventListener('mouseup', function () { g_selectedColor[2] = this.value / 100; });
    document.getElementById('sizeSlide').addEventListener('mouseup', function () { g_selectedSize = this.value; });
    document.getElementById('segmentSlide').addEventListener('mouseup', function () { g_selectedSegments = this.value; });
}

function main() {
    setupWebGL();
    connectVariablesToGLSL();
    addActionsForHtmlUI();

    canvas.onmousedown = click;
    canvas.onmousemove = function (ev) { if (ev.buttons == 1) click(ev); };

    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
}

// --- CLASSES ---
class Point {
    constructor() {
        this.type = 'point';
        this.position = [0.0, 0.0, 0.0];
        this.color = [1.0, 1.0, 1.0, 1.0];
        this.size = 10.0;
    }
    render() {
        gl.disableVertexAttribArray(a_Position);
        gl.vertexAttrib3f(a_Position, this.position[0], this.position[1], 0.0);
        gl.uniform4f(u_FragColor, this.color[0], this.color[1], this.color[2], this.color[3]);
        gl.uniform1f(u_Size, this.size);
        gl.drawArrays(gl.POINTS, 0, 1);
    }
}

class Triangle {
    constructor() {
        this.type = 'triangle';
        this.position = [0.0, 0.0, 0.0];
        this.color = [1.0, 1.0, 1.0, 1.0];
        this.size = 10.0;
    }
    render() {
        gl.uniform4f(u_FragColor, this.color[0], this.color[1], this.color[2], this.color[3]);
        gl.uniform1f(u_Size, this.size);
        var d = this.size / 200.0;
        drawTriangle([this.position[0], this.position[1], this.position[0] + d, this.position[1], this.position[0], this.position[1] + d]);
    }
}

class Circle {
    constructor() {
        this.type = 'circle';
        this.position = [0.0, 0.0, 0.0];
        this.color = [1.0, 1.0, 1.0, 1.0];
        this.size = 10.0;
        this.segments = 10;
    }
    render() {
        gl.uniform4f(u_FragColor, this.color[0], this.color[1], this.color[2], this.color[3]);
        gl.uniform1f(u_Size, 0);
        var d = this.size / 200.0;
        let angleStep = 360 / this.segments;
        for (var angle = 0; angle < 360; angle += angleStep) {
            let centerPt = [this.position[0], this.position[1]];
            let angle1 = angle;
            let angle2 = angle + angleStep;
            let vec1 = [Math.cos(angle1 * Math.PI / 180) * d, Math.sin(angle1 * Math.PI / 180) * d];
            let vec2 = [Math.cos(angle2 * Math.PI / 180) * d, Math.sin(angle2 * Math.PI / 180) * d];
            let pt1 = [centerPt[0] + vec1[0], centerPt[1] + vec1[1]];
            let pt2 = [centerPt[0] + vec2[0], centerPt[1] + vec2[1]];
            drawTriangle([this.position[0], this.position[1], pt1[0], pt1[1], pt2[0], pt2[1]]);
        }
    }
}

// --- HELPERS ---
function drawTriangle(vertices) {
    var n = 3;
    var vertexBuffer = gl.createBuffer();
    if (!vertexBuffer) return -1;
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.DYNAMIC_DRAW);
    gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_Position);
    gl.drawArrays(gl.TRIANGLES, 0, n);
}

function click(ev) {
    let x = ev.clientX;
    let y = ev.clientY;
    let rect = ev.target.getBoundingClientRect();

    x = ((x - rect.left) - canvas.width / 2) / (canvas.width / 2);
    y = (canvas.height / 2 - (y - rect.top)) / (canvas.height / 2);

    let point;
    if (g_selectedType === 'POINT') point = new Point();
    else if (g_selectedType === 'TRIANGLE') point = new Triangle();
    else {
        point = new Circle();
        point.segments = g_selectedSegments;
    }

    point.position = [x, y];
    point.color = g_selectedColor.slice();
    point.size = g_selectedSize;
    g_shapesList.push(point);
    renderAllShapes();
}

function renderAllShapes() {
    gl.clear(gl.COLOR_BUFFER_BIT);
    for (var i = 0; i < g_shapesList.length; i++) {
        g_shapesList[i].render();
    }
}

// --- ANIMATION LOGIC ---
function startFalling() {
    g_isAnimating = true;
    g_animPhase = 1; // Start Shaking
    g_startTime = performance.now();
    g_thwompX = 0;
    g_thwompY = 0;
    tick();
}

function tick() {
    if (!g_isAnimating) return;

    let now = performance.now();

    // PHASE 1: SHAKE
    if (g_animPhase === 1) {
        let elapsed = now - g_startTime;
        if (elapsed < 800) {
            g_thwompX = Math.sin(elapsed / 20) * 0.05;
        } else {
            g_thwompX = 0;
            g_animPhase = 2; // Switch to Falling
        }
    }
    // PHASE 2: FALL
    else if (g_animPhase === 2) {
        g_thwompY -= 0.06;
        if (g_thwompY < -1.8) {
            g_animPhase = 3; // Switch to Rising
        }
    }
    // PHASE 3: RISE
    else if (g_animPhase === 3) {
        g_thwompY += 0.015;
        if (g_thwompY >= 0) {
            g_thwompY = 0;
            g_isAnimating = false; // Stop
            g_animPhase = 0;
        }
    }

    drawPicture();

    if (g_isAnimating) {
        requestAnimationFrame(tick);
    }
}

// --- DRAW PICTURE ---
function drawPicture() {
    g_shapesList = [];
    gl.clear(gl.COLOR_BUFFER_BIT);

    // ===================================
    // 1. WATERMARK (Static 'R' & 'S')
    // ===================================
    gl.uniform4f(u_FragColor, 0.2, 0.2, 0.2, 1.0);

    // 'R' (Left)
    drawTriangle([-0.7, -0.6, -0.5, -0.6, -0.7, 0.6]);
    drawTriangle([-0.5, -0.6, -0.5, 0.6, -0.7, 0.6]);
    drawTriangle([-0.5, 0.6, -0.2, 0.6, -0.5, 0.4]);
    drawTriangle([-0.2, 0.6, -0.2, 0.1, -0.35, 0.1]);
    drawTriangle([-0.2, 0.1, -0.5, 0.1, -0.5, 0.3]);
    drawTriangle([-0.5, 0.1, -0.2, -0.6, -0.4, -0.6]);

    // 'S' (Right)
    drawTriangle([0.2, 0.6, 0.7, 0.6, 0.2, 0.4]);
    drawTriangle([0.2, 0.6, 0.2, 0.0, 0.35, 0.0]);
    drawTriangle([0.2, 0.1, 0.7, -0.1, 0.3, 0.0]);
    drawTriangle([0.2, 0.1, 0.7, -0.1, 0.6, 0.0]);
    drawTriangle([0.7, 0.0, 0.7, -0.6, 0.55, -0.6]);
    drawTriangle([0.7, -0.6, 0.2, -0.6, 0.7, -0.4]);

    // ===================================
    // 2. THWOMP (Dynamic)
    // ===================================
    function drawPart(v) {
        drawTriangle([
            v[0] + g_thwompX, v[1] + g_thwompY,
            v[2] + g_thwompX, v[3] + g_thwompY,
            v[4] + g_thwompX, v[5] + g_thwompY
        ]);
    }

    // Body
    gl.uniform4f(u_FragColor, 0.6, 0.6, 0.7, 1.0);
    drawPart([-0.4, -0.4, -0.4, 0.4, 0.4, 0.4]);
    drawPart([-0.4, -0.4, 0.4, -0.4, 0.4, 0.4]);

    // Spikes
    gl.uniform4f(u_FragColor, 0.4, 0.4, 0.5, 1.0);
    drawPart([-0.35, 0.4, -0.15, 0.4, -0.25, 0.6]);
    drawPart([-0.1, 0.4, 0.1, 0.4, 0.0, 0.6]);
    drawPart([0.15, 0.4, 0.35, 0.4, 0.25, 0.6]);
    drawPart([-0.35, -0.4, -0.15, -0.4, -0.25, -0.6]);
    drawPart([-0.1, -0.4, 0.1, -0.4, 0.0, -0.6]);
    drawPart([0.15, -0.4, 0.35, -0.4, 0.25, -0.6]);
    drawPart([-0.4, 0.35, -0.4, 0.15, -0.6, 0.25]);
    drawPart([-0.4, 0.1, -0.4, -0.1, -0.6, 0.0]);
    drawPart([-0.4, -0.15, -0.4, -0.35, -0.6, -0.25]);
    drawPart([0.4, 0.35, 0.4, 0.15, 0.6, 0.25]);
    drawPart([0.4, 0.1, 0.4, -0.1, 0.6, 0.0]);
    drawPart([0.4, -0.15, 0.4, -0.35, 0.6, -0.25]);

    // Sockets
    gl.uniform4f(u_FragColor, 0.0, 0.0, 0.0, 1.0);
    drawPart([-0.3, 0.1, -0.05, 0.1, -0.3, 0.3]);
    drawPart([-0.3, 0.3, -0.05, 0.1, -0.05, 0.3]);
    drawPart([0.05, 0.1, 0.3, 0.1, 0.05, 0.3]);
    drawPart([0.05, 0.3, 0.3, 0.1, 0.3, 0.3]);

    // Pupils
    gl.uniform4f(u_FragColor, 1.0, 0.0, 0.0, 1.0);
    drawPart([-0.12, 0.1, -0.05, 0.1, -0.12, 0.17]);
    drawPart([-0.12, 0.17, -0.05, 0.1, -0.05, 0.17]);
    drawPart([0.05, 0.1, 0.12, 0.1, 0.05, 0.17]);
    drawPart([0.05, 0.17, 0.12, 0.1, 0.12, 0.17]);

    // Brows
    gl.uniform4f(u_FragColor, 0.6, 0.6, 0.7, 1.0);
    drawPart([-0.3, 0.35, -0.05, 0.25, -0.05, 0.35]);
    drawPart([0.3, 0.35, 0.05, 0.25, 0.05, 0.35]);

    // Mouth Gap
    gl.uniform4f(u_FragColor, 0.0, 0.0, 0.0, 1.0);
    drawPart([-0.25, -0.12, 0.25, -0.12, -0.25, -0.18]);
    drawPart([-0.25, -0.18, 0.25, -0.12, 0.25, -0.18]);

    // Teeth
    gl.uniform4f(u_FragColor, 1.0, 1.0, 1.0, 1.0);
    let yTop = -0.12;
    drawPart([-0.2, yTop, -0.1, yTop, -0.15, yTop - 0.05]);
    drawPart([-0.1, yTop, 0.0, yTop, -0.05, yTop - 0.05]);
    drawPart([0.0, yTop, 0.1, yTop, 0.05, yTop - 0.05]);
    drawPart([0.1, yTop, 0.2, yTop, 0.15, yTop - 0.05]);
    let yBot = -0.18;
    drawPart([-0.2, yBot, -0.1, yBot, -0.15, yBot + 0.05]);
    drawPart([-0.1, yBot, 0.0, yBot, -0.05, yBot + 0.05]);
    drawPart([0.0, yBot, 0.1, yBot, 0.05, yBot + 0.05]);
    drawPart([0.1, yBot, 0.2, yBot, 0.15, yBot + 0.05]);
}