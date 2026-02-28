// Vertex Shader
var VSHADER_SOURCE = `
  attribute vec4 a_Position;
  attribute vec2 a_UV;
  attribute vec3 a_Normal;
  varying vec2 v_UV;
  varying vec3 v_Normal;
  varying vec3 v_Position; 
  uniform mat4 u_ModelMatrix;
  uniform mat4 u_GlobalRotationMatrix;
  uniform mat4 u_ViewMatrix;       
  uniform mat4 u_ProjectionMatrix; 
  uniform mat4 u_NormalMatrix; // To handle rotated/scaled object normals

  void main() {
    gl_Position = u_ProjectionMatrix * u_ViewMatrix * u_GlobalRotationMatrix * u_ModelMatrix * a_Position;
    v_UV = a_UV;
    
    // Transform normal to world coordinates correctly
    v_Normal = normalize(vec3(u_NormalMatrix * vec4(a_Normal, 0.0))); 
    v_Position = vec3(u_ModelMatrix * a_Position);
  }`;

// Fragment Shader
var FSHADER_SOURCE = `
  precision mediump float;
  varying vec2 v_UV;
  varying vec3 v_Normal;
  varying vec3 v_Position; 
  
  uniform vec4 u_FragColor;
  uniform sampler2D u_Sampler0;
  uniform sampler2D u_Sampler1;
  uniform sampler2D u_Sampler2; 
  uniform int u_whichTexture;
  
  uniform vec3 u_LightPos; 
  uniform vec3 u_cameraPos; 
  uniform vec3 u_lightColor; 
  uniform int u_lightOn; 

  void main() {
    vec4 baseColor;
    if (u_whichTexture == -3) {
        baseColor = vec4((v_Normal + 1.0) / 2.0, 1.0);                  
    } else if (u_whichTexture == -2 || u_whichTexture == -4) {
        baseColor = u_FragColor;                  
    } else if (u_whichTexture == -1) {
        baseColor = vec4(v_UV, 1.0, 1.0);         
    } else if (u_whichTexture == 0) {
        baseColor = texture2D(u_Sampler0, v_UV);  
    } else if (u_whichTexture == 1) {
        baseColor = texture2D(u_Sampler1, v_UV);  
    } else if (u_whichTexture == 2) {
        baseColor = texture2D(u_Sampler2, v_UV);  
    } else {
        baseColor = vec4(1, 0.2, 0.2, 1);         
    }

    // Bypass lighting for normal visualizer (-3) and light indicator (-4)
    if (u_whichTexture == -3 || u_whichTexture == -4) {
        gl_FragColor = baseColor;
        return;
    }

    // --- PHONG LIGHTING ---
    vec3 N = normalize(v_Normal);
    vec3 L = normalize(u_LightPos - v_Position);
    vec3 V = normalize(u_cameraPos - v_Position);
    vec3 R = reflect(-L, N); 

    vec3 ambient = vec3(baseColor) * u_lightColor * 0.3; 

    float nDotL = max(dot(N, L), 0.0);
    vec3 diffuse = vec3(baseColor) * u_lightColor * nDotL;

    float specular = 0.0;
    if (nDotL > 0.0) {
        float rDotV = max(dot(R, V), 0.0);
        specular = pow(rDotV, 10.0); 
    }
    vec3 specularLight = u_lightColor * specular * 0.8; 

    vec3 finalColor = ambient + diffuse + specularLight;
    
    // Toggle lighting
    if (u_lightOn == 1) {
        gl_FragColor = vec4(finalColor, baseColor.a);
    } else {
        gl_FragColor = baseColor;
    }
  }`;

// Global Variables
let canvas, gl, a_Position, a_UV, a_Normal;
let u_FragColor, u_ModelMatrix, u_GlobalRotationMatrix, u_ViewMatrix, u_ProjectionMatrix, u_NormalMatrix;
let u_Sampler0, u_Sampler1, u_Sampler2, u_whichTexture;
let u_LightPos, u_cameraPos, u_lightColor, u_lightOn;

let g_camera;
let g_normalBuffer = null;
let g_vertexBuffer = null;
let g_uvBuffer = null;

// UI State
let g_globalAngle = 0;
let g_globalAngleX = 0;
let g_normalOn = false;
let g_lightOn = true;
let g_lightAnimation = true;
let g_lightPos = [0, 1, -0.5];
let g_lightColor = [1.0, 1.0, 1.0];

function setupWebGL() {
    canvas = document.getElementById('webgl');
    gl = canvas.getContext("webgl", { preserveDrawingBuffer: true });
    if (!gl) { console.log('Failed to get context'); return; }
    gl.enable(gl.DEPTH_TEST);
}

function connectVariablesToGLSL() {
    if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) return;

    a_Position = gl.getAttribLocation(gl.program, 'a_Position');
    a_UV = gl.getAttribLocation(gl.program, 'a_UV');
    a_Normal = gl.getAttribLocation(gl.program, 'a_Normal');

    u_FragColor = gl.getUniformLocation(gl.program, 'u_FragColor');
    u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
    u_NormalMatrix = gl.getUniformLocation(gl.program, 'u_NormalMatrix');
    u_GlobalRotationMatrix = gl.getUniformLocation(gl.program, 'u_GlobalRotationMatrix');
    u_ViewMatrix = gl.getUniformLocation(gl.program, 'u_ViewMatrix');
    u_ProjectionMatrix = gl.getUniformLocation(gl.program, 'u_ProjectionMatrix');

    u_Sampler0 = gl.getUniformLocation(gl.program, 'u_Sampler0');
    u_Sampler1 = gl.getUniformLocation(gl.program, 'u_Sampler1');
    u_Sampler2 = gl.getUniformLocation(gl.program, 'u_Sampler2');
    u_whichTexture = gl.getUniformLocation(gl.program, 'u_whichTexture');

    u_LightPos = gl.getUniformLocation(gl.program, 'u_LightPos');
    u_cameraPos = gl.getUniformLocation(gl.program, 'u_cameraPos');
    u_lightColor = gl.getUniformLocation(gl.program, 'u_lightColor');
    u_lightOn = gl.getUniformLocation(gl.program, 'u_lightOn');
}

function addActionsForHtmlUI() {
    document.getElementById('normalOn').onclick = function () { g_normalOn = true; renderScene(); };
    document.getElementById('normalOff').onclick = function () { g_normalOn = false; renderScene(); };

    document.getElementById('lightOnBtn').onclick = function () { g_lightOn = true; renderScene(); };
    document.getElementById('lightOffBtn').onclick = function () { g_lightOn = false; renderScene(); };

    document.getElementById('lightAnimOn').onclick = function () { g_lightAnimation = true; };
    document.getElementById('lightAnimOff').onclick = function () { g_lightAnimation = false; };

    document.getElementById('lightColor').addEventListener('input', function () {
        let hex = this.value;
        g_lightColor[0] = parseInt(hex.substring(1, 3), 16) / 255.0;
        g_lightColor[1] = parseInt(hex.substring(3, 5), 16) / 255.0;
        g_lightColor[2] = parseInt(hex.substring(5, 7), 16) / 255.0;
        renderScene();
    });

    document.getElementById('lightSlideX').oninput = function () { g_lightPos[0] = this.value / 100; renderScene(); };
    document.getElementById('lightSlideY').oninput = function () { g_lightPos[1] = this.value / 100; renderScene(); };
    document.getElementById('lightSlideZ').oninput = function () { g_lightPos[2] = this.value / 100; renderScene(); };
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
    if (g_lightAnimation) {
        g_lightPos[0] = Math.cos(g_seconds) * 2.5;
    }
}

function renderScene() {
    var startTime = performance.now();
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.uniformMatrix4fv(u_ProjectionMatrix, false, g_camera.projectionMatrix.elements);
    gl.uniformMatrix4fv(u_ViewMatrix, false, g_camera.viewMatrix.elements);

    var globalRotMat = new Matrix4().rotate(g_globalAngle, 0, 1, 0);
    globalRotMat.rotate(g_globalAngleX, 1, 0, 0);
    gl.uniformMatrix4fv(u_GlobalRotationMatrix, false, globalRotMat.elements);

    // Pass Light Data
    gl.uniform3f(u_LightPos, g_lightPos[0], g_lightPos[1], g_lightPos[2]);
    gl.uniform3f(u_cameraPos, g_camera.eye.elements[0], g_camera.eye.elements[1], g_camera.eye.elements[2]);
    gl.uniform3f(u_lightColor, g_lightColor[0], g_lightColor[1], g_lightColor[2]);
    gl.uniform1i(u_lightOn, g_lightOn ? 1 : 0);

    // --- SKY BOX ---
    var sky = new Cube();
    sky.color = [1.0, 1.0, 1.0, 1.0];
    sky.textureNum = g_normalOn ? -3 : 0;
    sky.matrix.scale(-50, -50, -50);
    sky.matrix.translate(-0.5, -0.5, -0.5);
    sky.renderFast();

    // --- GROUND PLANE ---
    var ground = new Cube();
    ground.color = [1.0, 1.0, 1.0, 1.0];
    ground.textureNum = g_normalOn ? -3 : 2;
    ground.matrix.translate(0, -0.75, 0);
    ground.matrix.scale(50, 0.01, 50);
    ground.matrix.translate(-0.5, 0, -0.5);
    ground.renderFast();

    // --- TEST CUBE ---
    var testCube = new Cube();
    testCube.color = [1.0, 0.0, 0.0, 1.0];
    testCube.textureNum = g_normalOn ? -3 : -2;
    testCube.matrix.translate(-0.5, -0.7, -0.5);
    testCube.matrix.scale(1, 1, 1);
    testCube.renderFast();

    // --- TEST SPHERE ---
    var sphere = new Sphere();
    sphere.color = [0.0, 0.0, 1.0, 1.0];
    sphere.textureNum = g_normalOn ? -3 : -2;
    sphere.matrix.translate(1.0, -0.2, -0.5);
    sphere.matrix.scale(0.5, 0.5, 0.5);
    sphere.renderFast();

    // --- LIGHT INDICATOR ---
    var light = new Cube();
    light.color = [g_lightColor[0], g_lightColor[1], g_lightColor[2], 1.0];
    light.textureNum = -4; // Unlit mode
    light.matrix.translate(g_lightPos[0], g_lightPos[1], g_lightPos[2]);
    light.matrix.scale(-0.1, -0.1, -0.1);
    light.matrix.translate(-0.5, -0.5, -0.5);
    light.renderFast();

    var duration = performance.now() - startTime;
    sendTextToHTML("FPS: " + Math.floor(10000 / duration) / 10, "numdot");
}

function sendTextToHTML(text, htmlID) {
    var htmlElm = document.getElementById(htmlID);
    if (!htmlElm) return;
    htmlElm.innerHTML = text;
}

// --- TEXTURE LOADING ---
function initTextures() {
    var image0 = new Image();
    image0.onload = function () { sendTextureToGLSL(image0, u_Sampler0, 0); };
    image0.src = 'sky.png';

    var image1 = new Image();
    image1.onload = function () { sendTextureToGLSL(image1, u_Sampler1, 1); };
    image1.src = 'ground.png';

    var image2 = new Image();
    image2.onload = function () { sendTextureToGLSL(image2, u_Sampler2, 2); };
    image2.src = 'floor.png';

    return true;
}

function sendTextureToGLSL(image, u_Sampler, texUnit) {
    var texture = gl.createTexture();
    if (!texture) return false;

    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
    if (texUnit == 0) gl.activeTexture(gl.TEXTURE0);
    else if (texUnit == 1) gl.activeTexture(gl.TEXTURE1);
    else if (texUnit == 2) gl.activeTexture(gl.TEXTURE2);

    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
    gl.uniform1i(u_Sampler, texUnit);
}

function keydown(ev) {
    if (ev.keyCode == 87) g_camera.moveForward();
    else if (ev.keyCode == 83) g_camera.moveBackwards();
    else if (ev.keyCode == 65) g_camera.moveLeft();
    else if (ev.keyCode == 68) g_camera.moveRight();
    else if (ev.keyCode == 82) g_camera.moveUp();
    else if (ev.keyCode == 84) g_camera.moveDown();
    else if (ev.keyCode == 81) g_camera.panLeft(5);
    else if (ev.keyCode == 69) g_camera.panRight(5);

    renderScene();
}

function onMove(ev) {
    if (document.pointerLockElement === canvas) {
        let deltaX = ev.movementX;
        let deltaY = ev.movementY;
        let sensitivity = 0.3;

        if (deltaX > 0) g_camera.panRight(deltaX * sensitivity);
        else if (deltaX < 0) g_camera.panLeft(Math.abs(deltaX) * sensitivity);
        if (deltaY > 0) g_camera.panDown(deltaY * sensitivity);
        else if (deltaY < 0) g_camera.panUp(Math.abs(deltaY) * sensitivity);

        renderScene();
    }
}

function drawGeometryFast(vertices, uvs, normals) {
    if (g_vertexBuffer == null) g_vertexBuffer = gl.createBuffer();
    if (g_uvBuffer == null) g_uvBuffer = gl.createBuffer();
    if (g_normalBuffer == null) g_normalBuffer = gl.createBuffer();

    gl.bindBuffer(gl.ARRAY_BUFFER, g_vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.DYNAMIC_DRAW);
    gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_Position);

    gl.bindBuffer(gl.ARRAY_BUFFER, g_uvBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, uvs, gl.DYNAMIC_DRAW);
    gl.vertexAttribPointer(a_UV, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_UV);

    gl.bindBuffer(gl.ARRAY_BUFFER, g_normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, normals, gl.DYNAMIC_DRAW);
    gl.vertexAttribPointer(a_Normal, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_Normal);

    let n = vertices.length / 3;
    gl.drawArrays(gl.TRIANGLES, 0, n);
}

function main() {
    setupWebGL();
    connectVariablesToGLSL();
    addActionsForHtmlUI();

    g_camera = new Camera();
    g_camera.eye = new Vector3([0, 0.5, 3]);
    g_camera.at = new Vector3([0, 0, -100]);
    g_camera.updateView();

    document.onkeydown = keydown;

    canvas.onclick = function () { canvas.requestPointerLock(); };
    canvas.onmousemove = onMove;

    initTextures();

    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    requestAnimationFrame(tick);
}