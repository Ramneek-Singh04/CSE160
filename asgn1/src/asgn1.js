// asgn1.js

// Vertex shader program
var VSHADER_SOURCE =
    'attribute vec4 a_Position;\n' +
    'uniform float u_Size;\n' +
    'void main() {\n' +
    '  gl_Position = a_Position;\n' +
    '  gl_PointSize = u_Size;\n' +
    '}\n';

// Fragment shader program
var FSHADER_SOURCE =
    'precision mediump float;\n' +
    'uniform vec4 u_FragColor;\n' +
    'void main() {\n' +
    '  gl_FragColor = u_FragColor;\n' +
    '}\n';

// --- GLOBAL VARIABLES ---
let canvas;
let gl;
let a_Position;
let u_FragColor;
let u_Size;

// --- 1. SETUP WEBGL ---
function setupWebGL() {
    canvas = document.getElementById('webgl');
    gl = canvas.getContext("webgl", { preserveDrawingBuffer: true });
    if (!gl) {
        gl = canvas.getContext("experimental-webgl", { preserveDrawingBuffer: true });
    }
    if (!gl) {
        console.log('Failed to get the rendering context for WebGL');
        return;
    }
}

// --- 2. CONNECT VARIABLES TO GLSL ---
function connectVariablesToGLSL() {
    if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
        console.log('Failed to intialize shaders.');
        return;
    }

    a_Position = gl.getAttribLocation(gl.program, 'a_Position');
    if (a_Position < 0) {
        console.log('Failed to get the storage location of a_Position');
        return;
    }

    u_FragColor = gl.getUniformLocation(gl.program, 'u_FragColor');
    if (!u_FragColor) {
        console.log('Failed to get the storage location of u_FragColor');
        return;
    }

    u_Size = gl.getUniformLocation(gl.program, 'u_Size');
    if (!u_Size) {
        console.log('Failed to get the storage location of u_Size');
        return;
    }
}

// --- CLASS DEFINITION: POINT ---
class Point {
    constructor() {
        this.type = 'point';
        this.position = [0.0, 0.0, 0.0];
        this.color = [1.0, 1.0, 1.0, 1.0];
        this.size = 10.0;
    }

    render() {
        var xy = this.position;
        var rgba = this.color;
        var size = this.size;

        gl.disableVertexAttribArray(a_Position);
        gl.vertexAttrib3f(a_Position, xy[0], xy[1], 0.0);
        gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);
        gl.uniform1f(u_Size, size);
        gl.drawArrays(gl.POINTS, 0, 1);
    }
}

// --- CLASS DEFINITION: TRIANGLE ---
class Triangle {
    constructor() {
        this.type = 'triangle';
        this.position = [0.0, 0.0, 0.0];
        this.color = [1.0, 1.0, 1.0, 1.0];
        this.size = 10.0;
    }

    render() {
        var xy = this.position;
        var rgba = this.color;
        var size = this.size;

        gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);
        gl.uniform1f(u_Size, size);

        var d = this.size / 200.0;
        drawTriangle([xy[0], xy[1], xy[0] + d, xy[1], xy[0], xy[1] + d]);
    }
}

// --- CLASS DEFINITION: CIRCLE ---
class Circle {
    constructor() {
        this.type = 'circle';
        this.position = [0.0, 0.0, 0.0];
        this.color = [1.0, 1.0, 1.0, 1.0];
        this.size = 10.0;
        this.segments = 10;
    }

    render() {
        var xy = this.position;
        var rgba = this.color;
        var size = this.size;

        gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);
        gl.uniform1f(u_Size, 0); // Size not used for manual vertices

        var d = size / 200.0;
        let angleStep = 360 / this.segments;

        for (var angle = 0; angle < 360; angle += angleStep) {
            let centerPt = [xy[0], xy[1]];
            let angle1 = angle;
            let angle2 = angle + angleStep;

            let vec1 = [Math.cos(angle1 * Math.PI / 180) * d, Math.sin(angle1 * Math.PI / 180) * d];
            let vec2 = [Math.cos(angle2 * Math.PI / 180) * d, Math.sin(angle2 * Math.PI / 180) * d];

            let pt1 = [centerPt[0] + vec1[0], centerPt[1] + vec1[1]];
            let pt2 = [centerPt[0] + vec2[0], centerPt[1] + vec2[1]];

            drawTriangle([xy[0], xy[1], pt1[0], pt1[1], pt2[0], pt2[1]]);
        }
    }
}

function drawTriangle(vertices) {
    var n = 3;
    var vertexBuffer = gl.createBuffer();
    if (!vertexBuffer) {
        console.log('Failed to create the buffer object');
        return -1;
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.DYNAMIC_DRAW);
    gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_Position);
    gl.drawArrays(gl.TRIANGLES, 0, n);
}


// --- UI GLOBALS ---
let g_selectedColor = [1.0, 0.0, 0.0, 1.0];
let g_selectedSize = 10;
let g_selectedType = 'POINT';
let g_selectedSegments = 10;

function addActionsForHtmlUI() {
    // Buttons
    document.getElementById('clearButton').onclick = function () { g_shapesList = []; renderAllShapes(); };

    document.getElementById('pointButton').onclick = function () { g_selectedType = 'POINT'; };
    document.getElementById('triButton').onclick = function () { g_selectedType = 'TRIANGLE'; };
    document.getElementById('circleButton').onclick = function () { g_selectedType = 'CIRCLE'; };

    // NEW: Picture Button
    document.getElementById('pictureButton').onclick = function () { drawPicture(); };

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
    canvas.onmousemove = function (ev) { if (ev.buttons == 1) { click(ev); } };

    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
}

var g_shapesList = [];

function click(ev) {
    let x = ev.clientX;
    let y = ev.clientY;
    let rect = ev.target.getBoundingClientRect();

    x = ((x - rect.left) - canvas.width / 2) / (canvas.width / 2);
    y = (canvas.height / 2 - (y - rect.top)) / (canvas.height / 2);

    let point;
    if (g_selectedType === 'POINT') {
        point = new Point();
    } else if (g_selectedType === 'TRIANGLE') {
        point = new Triangle();
    } else {
        point = new Circle();
        point.segments = g_selectedSegments;
    }

    point.position = [x, y];
    point.color = [g_selectedColor[0], g_selectedColor[1], g_selectedColor[2], g_selectedColor[3]];
    point.size = g_selectedSize;

    g_shapesList.push(point);
    renderAllShapes();
}

function renderAllShapes() {
    gl.clear(gl.COLOR_BUFFER_BIT);
    var len = g_shapesList.length;
    for (var i = 0; i < len; i++) {
        g_shapesList[i].render();
    }
}

// --- 12. DRAW PICTURE (Thwomp) ---
function drawPicture() {
    // Clear list and screen
    g_shapesList = [];
    gl.clear(gl.COLOR_BUFFER_BIT);

    // --- 1. BODY (Grey Box) ---
    gl.uniform4f(u_FragColor, 0.6, 0.6, 0.7, 1.0);
    drawTriangle([-0.4, -0.4, -0.4, 0.4, 0.4, 0.4]);
    drawTriangle([-0.4, -0.4, 0.4, -0.4, 0.4, 0.4]);

    // --- 2. SPIKES (Darker Grey) ---
    gl.uniform4f(u_FragColor, 0.4, 0.4, 0.5, 1.0);
    // Top
    drawTriangle([-0.35, 0.4, -0.15, 0.4, -0.25, 0.6]);
    drawTriangle([-0.1, 0.4, 0.1, 0.4, 0.0, 0.6]);
    drawTriangle([0.15, 0.4, 0.35, 0.4, 0.25, 0.6]);
    // Bottom
    drawTriangle([-0.35, -0.4, -0.15, -0.4, -0.25, -0.6]);
    drawTriangle([-0.1, -0.4, 0.1, -0.4, 0.0, -0.6]);
    drawTriangle([0.15, -0.4, 0.35, -0.4, 0.25, -0.6]);
    // Left
    drawTriangle([-0.4, 0.35, -0.4, 0.15, -0.6, 0.25]);
    drawTriangle([-0.4, 0.1, -0.4, -0.1, -0.6, 0.0]);
    drawTriangle([-0.4, -0.15, -0.4, -0.35, -0.6, -0.25]);
    // Right
    drawTriangle([0.4, 0.35, 0.4, 0.15, 0.6, 0.25]);
    drawTriangle([0.4, 0.1, 0.4, -0.1, 0.6, 0.0]);
    drawTriangle([0.4, -0.15, 0.4, -0.35, 0.6, -0.25]);

    // --- 3. EYE SOCKETS (Black Voids) ---
    gl.uniform4f(u_FragColor, 0.0, 0.0, 0.0, 1.0);
    drawTriangle([-0.3, 0.1, -0.05, 0.1, -0.3, 0.3]); 
    drawTriangle([-0.3, 0.3, -0.05, 0.1, -0.05, 0.3]);

    drawTriangle([0.05, 0.1, 0.3, 0.1, 0.05, 0.3]);   
    drawTriangle([0.05, 0.3, 0.3, 0.1, 0.3, 0.3]);


    gl.uniform4f(u_FragColor, 1.0, 0.0, 0.0, 1.0);


    drawTriangle([-0.12, 0.1, -0.05, 0.1, -0.12, 0.17]);
    drawTriangle([-0.12, 0.17, -0.05, 0.1, -0.05, 0.17]);


    drawTriangle([0.05, 0.1, 0.12, 0.1, 0.05, 0.17]);
    drawTriangle([0.05, 0.17, 0.12, 0.1, 0.12, 0.17]);


    gl.uniform4f(u_FragColor, 0.6, 0.6, 0.7, 1.0);
    drawTriangle([-0.3, 0.35, -0.05, 0.25, -0.05, 0.35]); // Left
    drawTriangle([0.3, 0.35, 0.05, 0.25, 0.05, 0.35]); // Right


    gl.uniform4f(u_FragColor, 0.0, 0.0, 0.0, 1.0);
    drawTriangle([-0.25, -0.12, 0.25, -0.12, -0.25, -0.18]);
    drawTriangle([-0.25, -0.18, 0.25, -0.12, 0.25, -0.18]);


    gl.uniform4f(u_FragColor, 1.0, 1.0, 1.0, 1.0);


    let yTop = -0.12;
    drawTriangle([-0.2, yTop, -0.1, yTop, -0.15, yTop - 0.05]);
    drawTriangle([-0.1, yTop, 0.0, yTop, -0.05, yTop - 0.05]);
    drawTriangle([0.0, yTop, 0.1, yTop, 0.05, yTop - 0.05]);
    drawTriangle([0.1, yTop, 0.2, yTop, 0.15, yTop - 0.05]);


    let yBot = -0.18;
    drawTriangle([-0.2, yBot, -0.1, yBot, -0.15, yBot + 0.05]);
    drawTriangle([-0.1, yBot, 0.0, yBot, -0.05, yBot + 0.05]);
    drawTriangle([0.0, yBot, 0.1, yBot, 0.05, yBot + 0.05]);
    drawTriangle([0.1, yBot, 0.2, yBot, 0.15, yBot + 0.05]);
}