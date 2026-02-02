// Vertex and Fragment Shaders
var VSHADER_SOURCE = `
  attribute vec4 a_Position;
  uniform mat4 u_ModelMatrix;
  uniform mat4 u_GlobalRotationMatrix;
  void main() {
    gl_Position = u_GlobalRotationMatrix * u_ModelMatrix * a_Position;
  }`;

var FSHADER_SOURCE = `
  precision mediump float;
  uniform vec4 u_FragColor;
  void main() {
    gl_FragColor = u_FragColor;
  }`;

// Global Variables
let canvas;
let gl;
let a_Position;
let u_FragColor;
let u_ModelMatrix;
let u_GlobalRotationMatrix;

// Global UI Variables
let g_globalAngle = 0;   // Y-axis rotation (Horizontal)
let g_globalAngleX = 0;  // X-axis rotation (Vertical) -- NEW
let g_yellowAngle = 0;
let g_magentaAngle = 0;
let g_clawAngle = 0;  // Extension
let g_headAngle = 0;
let g_bodyAngle = 0;  // Body sway angle

// Animation Flags
let g_yellowAnimation = false;
let g_magentaAnimation = false;
let g_walkAnimation = false;

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
    u_FragColor = gl.getUniformLocation(gl.program, 'u_FragColor');
    u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
    u_GlobalRotationMatrix = gl.getUniformLocation(gl.program, 'u_GlobalRotationMatrix');
}

function addActionsForHtmlUI() {
    // Walk Animation Buttons
    document.getElementById('walkOn').onclick = function () { g_walkAnimation = true; };
    document.getElementById('walkOff').onclick = function () { g_walkAnimation = false; };

    // Individual Joint Buttons
    document.getElementById('yellowOnButton').onclick = function () { g_yellowAnimation = true; };
    document.getElementById('yellowOffButton').onclick = function () { g_yellowAnimation = false; };
    document.getElementById('magentaOnButton').onclick = function () { g_magentaAnimation = true; };
    document.getElementById('magentaOffButton').onclick = function () { g_magentaAnimation = false; };

    // Sliders
    document.getElementById('angleSlide').addEventListener('mousemove', function () {
        g_globalAngle = this.value; renderScene();
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

    // --- MOUSE CONTROL ---
    initEventHandlers(canvas, g_globalAngle, g_globalAngleX);
}

// NEW FUNCTION: Handle Mouse Click and Drag
function initEventHandlers(canvas, currentAngle, currentAngleX) {
    var dragging = false;         // Dragging or not
    var lastX = -1, lastY = -1;   // Last position of the mouse

    canvas.onmousedown = function (ev) {   // Mouse is pressed
        var x = ev.clientX, y = ev.clientY;
        // Start dragging if a mouse is in <canvas>
        var rect = ev.target.getBoundingClientRect();
        if (rect.left <= x && x < rect.right && rect.top <= y && y < rect.bottom) {
            lastX = x; lastY = y;
            dragging = true;
        }
    };

    canvas.onmouseup = function (ev) { dragging = false; }; // Mouse is released

    canvas.onmousemove = function (ev) { // Mouse is moved
        var x = ev.clientX, y = ev.clientY;
        if (dragging) {
            var factor = 100 / canvas.height; // The rotation ratio
            var dx = factor * (x - lastX);
            var dy = factor * (y - lastY);

            // Update the global angles based on mouse movement
            g_globalAngle = g_globalAngle + dx;
            g_globalAngleX = g_globalAngleX + dy; // Update vertical rotation

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
    if (g_walkAnimation) {
        // --- COORDINATED NATURAL WALK ---

        // 1. Shoulders: 45 degree swing
        g_yellowAngle = 45 * Math.sin(g_seconds * 3);

        // 2. Elbows: Offset phase so they drag slightly behind the shoulder
        g_magentaAngle = 20 * Math.sin(g_seconds * 3 + Math.PI / 2);

        // 3. Claws: Piston motion pops out rhythmically
        g_clawAngle = 15 + (15 * Math.sin(g_seconds * 6));

        // 4. Head Bob: Nods up and down twice per full walk cycle
        g_headAngle = 10 * Math.sin(g_seconds * 6);

        // 5. Body Sway: Rocks left and right slightly to shift weight
        g_bodyAngle = 5 * Math.sin(g_seconds * 3);
    }
    else {
        // Manual / Single Joint Animation
        if (g_yellowAnimation) {
            g_yellowAngle = (45 * Math.sin(g_seconds * 3));
        }
        if (g_magentaAnimation) {
            g_magentaAngle = (45 * Math.sin(g_seconds * 3));
        }
        // Reset body sway in idle
        g_bodyAngle = 0;
        // Idle head bob
        g_headAngle = 5 * Math.sin(g_seconds * 2);
    }
}

// --- HELPER: CLAWS (Using Cones) ---
function drawClaws(matrix, extensionValue) {
    var clawColor = [0.9, 0.85, 0.8, 1.0]; // Bone/Nail color

    var extensionDistance = extensionValue * 0.001;

    // Base position
    var currentY = -0.22 - extensionDistance;

    for (var i = -1; i <= 1; i++) {
        var claw = new Cone();
        claw.color = clawColor;
        claw.matrix = new Matrix4(matrix);

        // Reduced spacing from 0.035 to 0.02 so they are closer together
        claw.matrix.translate(0, currentY, i * 0.02);

        claw.matrix.rotate(180, 1, 0, 0);

        // Scale: Made them smaller
        claw.matrix.scale(0.04, 0.12, 0.04);

        claw.matrix.translate(0, 0, 0);

        claw.render();
    }
}

function renderScene() {
    var startTime = performance.now();
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    var globalRotMat = new Matrix4().rotate(g_globalAngle, 0, 1, 0);
    // NEW: Apply the Vertical Rotation (X-Axis) here
    globalRotMat.rotate(g_globalAngleX, 1, 0, 0);

    gl.uniformMatrix4fv(u_GlobalRotationMatrix, false, globalRotMat.elements);

    // --- COLOR PALETTE ---
    var furColor = [0.6, 0.45, 0.3, 1.0];
    var limbColor = [0.55, 0.4, 0.25, 1.0];
    var headColor = [0.7, 0.55, 0.4, 1.0];
    var maskColor = [0.85, 0.8, 0.7, 1.0];
    var snoutColor = [0.35, 0.25, 0.2, 1.0];
    var noseColor = [0.1, 0.1, 0.1, 1.0];
    var eyeColor = [0.1, 0.05, 0.05, 1.0];
    var tailColor = [0.5, 0.35, 0.25, 1.0];

    // --- SLOTH BODY (Root) ---
    var body = new Cube();
    body.color = furColor;
    body.matrix.translate(-0.2, -0.2, 0.0);
    body.matrix.rotate(g_bodyAngle, 0, 0, 1);

    var bodyCoordinatesMat = new Matrix4(body.matrix);

    var breathScale = 0.2 + (0.005 * Math.sin(g_seconds * 2));
    body.matrix.scale(0.4, breathScale, 0.6);
    body.matrix.translate(-0.5, 0, -0.5);
    body.render();


    // ===========================================
    // TAIL (2 Segments: Base -> Tip)
    // ===========================================

    // --- TAIL BASE ---
    var tailBase = new Cube();
    tailBase.color = tailColor;
    tailBase.matrix = new Matrix4(bodyCoordinatesMat);

    // Position on TOP of the back
    tailBase.matrix.translate(0, 0.18, 0.3);

    // Rotate downwards so it droops nicely from the top
    tailBase.matrix.rotate(-60, 1, 0, 0);

    // Wag the tail!
    if (g_walkAnimation) {
        tailBase.matrix.rotate(15 * Math.sin(g_seconds * 8), 0, 1, 0);
    }

    var tailCoordinates = new Matrix4(tailBase.matrix);

    tailBase.matrix.scale(0.1, 0.1, 0.1);
    tailBase.matrix.translate(-0.5, 0, -0.5);
    tailBase.render();

    // --- TAIL TIP ---
    var tailTip = new Cone();
    tailTip.color = tailColor;
    tailTip.matrix = new Matrix4(tailCoordinates);
    tailTip.matrix.translate(0, 0.08, 0);
    // Bend tip slightly
    tailTip.matrix.rotate(-10, 1, 0, 0);
    // Wiggle tip
    if (g_walkAnimation) {
        tailTip.matrix.rotate(10 * Math.sin(g_seconds * 8 + 1), 0, 1, 0);
    }

    tailTip.matrix.scale(0.08, 0.12, 0.08);
    tailTip.matrix.translate(0, 0, 0);
    tailTip.render();


    // --- HEAD ---
    var head = new Cube();
    head.color = headColor;
    head.matrix = new Matrix4(bodyCoordinatesMat);
    head.matrix.translate(0, 0.15, -0.3);
    head.matrix.rotate(g_headAngle, 1, 0, 0);
    var headCoords = new Matrix4(head.matrix);

    head.matrix.scale(0.2, 0.2, 0.2);
    head.matrix.translate(-0.5, 0, -0.5);
    head.render();

    // --- FACE MASK ---
    var mask = new Cube();
    mask.color = maskColor;
    mask.matrix = new Matrix4(headCoords);
    mask.matrix.translate(0, 0.0, -0.101);
    mask.matrix.scale(0.18, 0.14, 0.01);
    mask.matrix.translate(-0.5, 0, -0.5);
    mask.render();

    // --- SNOUT ---
    var snout = new Cube();
    snout.color = snoutColor;
    snout.matrix = new Matrix4(headCoords);
    snout.matrix.translate(0, -0.02, -0.11);
    snout.matrix.scale(0.1, 0.08, 0.04);
    snout.matrix.translate(-0.5, 0, -0.5);
    snout.render();

    // --- NOSE TIP ---
    var nose = new Cube();
    nose.color = noseColor;
    nose.matrix = new Matrix4(headCoords);
    nose.matrix.translate(0, -0.02, -0.131);
    nose.matrix.scale(0.04, 0.03, 0.01);
    nose.matrix.translate(-0.5, 0, -0.5);
    nose.render();

    // --- EYES ---
    var leftEye = new Cube();
    leftEye.color = eyeColor;
    leftEye.matrix = new Matrix4(headCoords);
    leftEye.matrix.translate(-0.05, 0.03, -0.111);
    leftEye.matrix.scale(0.03, 0.03, 0.02);
    leftEye.matrix.translate(-0.5, 0, -0.5);
    leftEye.render();

    var rightEye = new Cube();
    rightEye.color = eyeColor;
    rightEye.matrix = new Matrix4(headCoords);
    rightEye.matrix.translate(0.05, 0.03, -0.111);
    rightEye.matrix.scale(0.03, 0.03, 0.02);
    rightEye.matrix.translate(-0.5, 0, -0.5);
    rightEye.render();


    // ===========================================
    // GROUP A: Front-Left and Back-Right (In Sync)
    // ===========================================

    // --- FRONT LEFT LEG (UPPER) ---
    var leftArm = new Cube();
    leftArm.color = limbColor;
    leftArm.matrix = new Matrix4(bodyCoordinatesMat);
    leftArm.matrix.translate(-0.22, 0.08, -0.25);
    leftArm.matrix.rotate(g_yellowAngle, 1, 0, 0);
    var leftArmCoords = new Matrix4(leftArm.matrix);
    leftArm.matrix.scale(0.06, 0.28, 0.15);
    leftArm.matrix.translate(-0.5, -0.85, -0.5);
    leftArm.render();

    // --- FRONT LEFT LEG (LOWER) ---
    var leftForearm = new Cube();
    leftForearm.color = limbColor;
    leftForearm.matrix = new Matrix4(leftArmCoords);
    leftForearm.matrix.translate(0, -0.2, 0);
    leftForearm.matrix.rotate(g_magentaAngle * 0.5, 1, 0, 0);
    var leftForearmCoords = new Matrix4(leftForearm.matrix);
    leftForearm.matrix.scale(0.05, 0.3, 0.14);
    leftForearm.matrix.translate(-0.5, -0.85, -0.5);
    leftForearm.render();

    // --- FRONT LEFT CLAWS ---
    drawClaws(leftForearmCoords, g_clawAngle);


    // --- BACK RIGHT LEG (UPPER) ---
    var backRightLeg = new Cube();
    backRightLeg.color = limbColor;
    backRightLeg.matrix = new Matrix4(bodyCoordinatesMat);
    backRightLeg.matrix.translate(0.22, 0.08, 0.25);
    backRightLeg.matrix.rotate(g_yellowAngle, 1, 0, 0);
    var backRightCoords = new Matrix4(backRightLeg.matrix);
    backRightLeg.matrix.scale(0.06, 0.28, 0.15);
    backRightLeg.matrix.translate(-0.5, -0.85, -0.5);
    backRightLeg.render();

    // --- BACK RIGHT LEG (LOWER) ---
    var brForearm = new Cube();
    brForearm.color = limbColor;
    brForearm.matrix = new Matrix4(backRightCoords);
    brForearm.matrix.translate(0, -0.2, 0);
    brForearm.matrix.rotate(g_magentaAngle * 0.5, 1, 0, 0);
    var brForearmCoords = new Matrix4(brForearm.matrix);
    brForearm.matrix.scale(0.05, 0.3, 0.14);
    brForearm.matrix.translate(-0.5, -0.85, -0.5);
    brForearm.render();

    // --- BACK RIGHT CLAWS ---
    drawClaws(brForearmCoords, g_clawAngle);


    // ===========================================
    // GROUP B: Front-Right and Back-Left (Opposite Sync)
    // ===========================================

    // --- FRONT RIGHT LEG (UPPER) ---
    var rightArm = new Cube();
    rightArm.color = limbColor;
    rightArm.matrix = new Matrix4(bodyCoordinatesMat);
    rightArm.matrix.translate(0.22, 0.08, -0.25);
    rightArm.matrix.rotate(-g_yellowAngle, 1, 0, 0);
    var rightArmCoords = new Matrix4(rightArm.matrix);
    rightArm.matrix.scale(0.06, 0.28, 0.15);
    rightArm.matrix.translate(-0.5, -0.85, -0.5);
    rightArm.render();

    // --- FRONT RIGHT LEG (LOWER) ---
    var frForearm = new Cube();
    frForearm.color = limbColor;
    frForearm.matrix = new Matrix4(rightArmCoords);
    frForearm.matrix.translate(0, -0.2, 0);
    frForearm.matrix.rotate(-g_magentaAngle * 0.5, 1, 0, 0);
    var frForearmCoords = new Matrix4(frForearm.matrix);
    frForearm.matrix.scale(0.05, 0.3, 0.14);
    frForearm.matrix.translate(-0.5, -0.85, -0.5);
    frForearm.render();

    // --- FRONT RIGHT CLAWS ---
    drawClaws(frForearmCoords, g_clawAngle);


    // --- BACK LEFT LEG (UPPER) ---
    var backLeftLeg = new Cube();
    backLeftLeg.color = limbColor;
    backLeftLeg.matrix = new Matrix4(bodyCoordinatesMat);
    backLeftLeg.matrix.translate(-0.22, 0.08, 0.25);
    backLeftLeg.matrix.rotate(-g_yellowAngle, 1, 0, 0);
    var backLeftCoords = new Matrix4(backLeftLeg.matrix);
    backLeftLeg.matrix.scale(0.06, 0.28, 0.15);
    backLeftLeg.matrix.translate(-0.5, -0.85, -0.5);
    backLeftLeg.render();

    // --- BACK LEFT LEG (LOWER) ---
    var blForearm = new Cube();
    blForearm.color = limbColor;
    blForearm.matrix = new Matrix4(backLeftCoords);
    blForearm.matrix.translate(0, -0.2, 0);
    blForearm.matrix.rotate(-g_magentaAngle * 0.5, 1, 0, 0);
    var blForearmCoords = new Matrix4(blForearm.matrix);
    blForearm.matrix.scale(0.05, 0.3, 0.14);
    blForearm.matrix.translate(-0.5, -0.85, -0.5);
    blForearm.render();

    // --- BACK LEFT CLAWS ---
    drawClaws(blForearmCoords, g_clawAngle);

    // Performance Stats
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

function main() {
    setupWebGL();
    connectVariablesToGLSL();
    addActionsForHtmlUI();
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    requestAnimationFrame(tick);
}

// Define a Cone class to satisfy the "Non-Cube Primitive" requirement
class Cone {
    constructor() {
        this.type = 'cone';
        this.color = [1.0, 1.0, 1.0, 1.0];
        this.matrix = new Matrix4();
    }

    render() {
        var rgba = this.color;
        // Pass the color of a point to u_FragColor variable
        gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);

        // Pass the matrix to u_ModelMatrix attribute
        gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);

        var segments = 10; // Number of sides
        var step = 360 / segments;

        // Iterate through angles to create the cone sides
        for (var angle = 0; angle < 360; angle += step) {
            var centerPt = [0, 0, 0];
            var angle1 = angle;
            var angle2 = angle + step;

            // Calculate two points on the base circle
            var vec1 = [Math.cos(angle1 * Math.PI / 180) * 0.5, Math.sin(angle1 * Math.PI / 180) * 0.5];
            var vec2 = [Math.cos(angle2 * Math.PI / 180) * 0.5, Math.sin(angle2 * Math.PI / 180) * 0.5];

            // Tip of the cone is at (0, 1, 0)
            // Base is at y=0, radius 0.5

            var pt1 = [0, 1, 0]; // Tip
            var pt2 = [vec1[0], 0, vec1[1]]; // Base point 1
            var pt3 = [vec2[0], 0, vec2[1]]; // Base point 2

            // Draw the triangular face
            drawTriangle3D([pt1[0], pt1[1], pt1[2], pt2[0], pt2[1], pt2[2], pt3[0], pt3[1], pt3[2]]);

            // Draw the base (circle cap)
            drawTriangle3D([0, 0, 0, pt3[0], pt3[1], pt3[2], pt2[0], pt2[1], pt2[2]]);
        }
    }
}