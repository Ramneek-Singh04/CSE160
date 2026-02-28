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
  
  // Point Light
  uniform vec3 u_LightPos; 
  uniform vec3 u_lightColor; 
  uniform int u_lightOn; 

  // Spotlight (NEW)
  uniform vec3 u_spotLightPos;
  uniform vec3 u_spotLightDir;
  uniform float u_spotLightCutoff;
  uniform int u_spotLightOn;

  uniform vec3 u_cameraPos; 

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

    if (u_whichTexture == -3 || u_whichTexture == -4) {
        gl_FragColor = baseColor;
        return;
    }

    vec3 N = normalize(v_Normal);
    vec3 V = normalize(u_cameraPos - v_Position);
    vec3 finalColor = vec3(0.0);

    // 1. BASE AMBIENT LIGHT (Always exists slightly)
    vec3 ambient = vec3(baseColor) * 0.2; 

    // 2. POINT LIGHT CALCULATION
    if (u_lightOn == 1) {
        vec3 L = normalize(u_LightPos - v_Position);
        vec3 R = reflect(-L, N); 
        float nDotL = max(dot(N, L), 0.0);
        vec3 diffuse = vec3(baseColor) * u_lightColor * nDotL;
        float specular = 0.0;
        if (nDotL > 0.0) {
            specular = pow(max(dot(R, V), 0.0), 10.0); 
        }
        vec3 specularLight = u_lightColor * specular * 0.8; 
        finalColor += diffuse + specularLight;
    }

    // 3. SPOTLIGHT CALCULATION (NEW)
    if (u_spotLightOn == 1) {
        vec3 L_spot = normalize(u_spotLightPos - v_Position);
        vec3 D_spot = normalize(u_spotLightDir);
        
        // Find the angle between the light ray and the spotlight direction
        float spotCosine = dot(-L_spot, D_spot);
        // Convert cutoff angle to cosine for fast comparison
        float cutoffCosine = cos(u_spotLightCutoff * 3.14159 / 180.0);

        // If the fragment is inside the cone, light it up!
        if (spotCosine > cutoffCosine) {
            vec3 R_spot = reflect(-L_spot, N);
            float nDotL_spot = max(dot(N, L_spot), 0.0);
            
            // Soften the edge of the spotlight beam
            float spotFactor = smoothstep(cutoffCosine, cutoffCosine + 0.05, spotCosine);

            vec3 diffuse_spot = vec3(baseColor) * nDotL_spot;
            float spec_spot = 0.0;
            if (nDotL_spot > 0.0) {
                spec_spot = pow(max(dot(R_spot, V), 0.0), 10.0);
            }
            vec3 specular_spot = vec3(1.0) * spec_spot * 0.8; // White specular

            finalColor += (diffuse_spot + specular_spot) * spotFactor;
        }
    }

    // Add ambient at the very end
    finalColor += ambient;
    
    // If BOTH lights are off, fallback to unlit color (assignment requirement)
    if (u_lightOn == 0 && u_spotLightOn == 0) {
        gl_FragColor = baseColor;
    } else {
        gl_FragColor = vec4(finalColor, baseColor.a);
    }
  }`;

// Global Variables
let canvas, gl, a_Position, a_UV, a_Normal;
let u_FragColor, u_ModelMatrix, u_GlobalRotationMatrix, u_ViewMatrix, u_ProjectionMatrix, u_NormalMatrix;
let u_Sampler0, u_Sampler1, u_Sampler2, u_whichTexture;
let u_LightPos, u_cameraPos, u_lightColor, u_lightOn;
let g_bunny;


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

// --- Spotlight State ---
let u_spotLightPos, u_spotLightDir, u_spotLightCutoff, u_spotLightOn;
let g_spotLightPos = [0, 2.0, 0];
let g_spotLightDir = [0, -1.0, 0]; // Points straight down
let g_spotLightCutoff = 30.0; // 30 degree cone
let g_spotLightOn = true;

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

    u_spotLightPos = gl.getUniformLocation(gl.program, 'u_spotLightPos');
    u_spotLightDir = gl.getUniformLocation(gl.program, 'u_spotLightDir');
    u_spotLightCutoff = gl.getUniformLocation(gl.program, 'u_spotLightCutoff');
    u_spotLightOn = gl.getUniformLocation(gl.program, 'u_spotLightOn');
}

function addActionsForHtmlUI() {

    // NEW: Helper function to swap the active/inactive classes
    function selectButton(activeId, inactiveId) {
        document.getElementById(activeId).className = 'btn-active';
        document.getElementById(inactiveId).className = 'btn-inactive';
    }

    // 1. Normal Visualization
    document.getElementById('normalOn').onclick = function () {
        g_normalOn = true;
        selectButton('normalOn', 'normalOff');
        renderScene();
    };
    document.getElementById('normalOff').onclick = function () {
        g_normalOn = false;
        selectButton('normalOff', 'normalOn');
        renderScene();
    };

    // 2. Point Light ON/OFF
    document.getElementById('pointLightOnBtn').onclick = function () {
        g_lightOn = true;
        selectButton('pointLightOnBtn', 'pointLightOffBtn');
        renderScene();
    };
    document.getElementById('pointLightOffBtn').onclick = function () {
        g_lightOn = false;
        selectButton('pointLightOffBtn', 'pointLightOnBtn');
        renderScene();
    };

    // 3. Spotlight ON/OFF
    document.getElementById('spotLightOnBtn').onclick = function () {
        g_spotLightOn = true;
        selectButton('spotLightOnBtn', 'spotLightOffBtn');
        renderScene();
    };
    document.getElementById('spotLightOffBtn').onclick = function () {
        g_spotLightOn = false;
        selectButton('spotLightOffBtn', 'spotLightOnBtn');
        renderScene();
    };

    // 4. Light Animation
    document.getElementById('lightAnimOn').onclick = function () {
        g_lightAnimation = true;
        selectButton('lightAnimOn', 'lightAnimOff');
    };
    document.getElementById('lightAnimOff').onclick = function () {
        g_lightAnimation = false;
        selectButton('lightAnimOff', 'lightAnimOn');
    };

    // 5. Light Color Picker
    document.getElementById('lightColor').addEventListener('input', function () {
        let hex = this.value;
        g_lightColor[0] = parseInt(hex.substring(1, 3), 16) / 255.0;
        g_lightColor[1] = parseInt(hex.substring(3, 5), 16) / 255.0;
        g_lightColor[2] = parseInt(hex.substring(5, 7), 16) / 255.0;
        renderScene();
    });

    // 6. Point Light Position Sliders
    document.getElementById('lightSlideX').oninput = function () { g_lightPos[0] = this.value / 100; renderScene(); };
    document.getElementById('lightSlideY').oninput = function () { g_lightPos[1] = this.value / 100; renderScene(); };
    document.getElementById('lightSlideZ').oninput = function () { g_lightPos[2] = this.value / 100; renderScene(); };

    // 7. Spotlight Position Sliders
    document.getElementById('spotLightX').oninput = function () { g_spotLightPos[0] = this.value / 100; renderScene(); };
    document.getElementById('spotLightY').oninput = function () { g_spotLightPos[1] = this.value / 100; renderScene(); };
    document.getElementById('spotLightZ').oninput = function () { g_spotLightPos[2] = this.value / 100; renderScene(); };

    // 8. Spotlight Direction Sliders
    document.getElementById('spotDirX').oninput = function () { g_spotLightDir[0] = this.value / 100; renderScene(); };
    document.getElementById('spotDirY').oninput = function () { g_spotLightDir[1] = this.value / 100; renderScene(); };
    document.getElementById('spotDirZ').oninput = function () { g_spotLightDir[2] = this.value / 100; renderScene(); };

    // 9. Spotlight Cutoff Slider
    document.getElementById('spotCutoff').oninput = function () { g_spotLightCutoff = this.value; renderScene(); };
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

    // --- Pass Spotlight Data ---
    gl.uniform3f(u_spotLightPos, g_spotLightPos[0], g_spotLightPos[1], g_spotLightPos[2]);
    gl.uniform3f(u_spotLightDir, g_spotLightDir[0], g_spotLightDir[1], g_spotLightDir[2]);
    gl.uniform1f(u_spotLightCutoff, g_spotLightCutoff);
    gl.uniform1i(u_spotLightOn, g_spotLightOn ? 1 : 0);

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

    drawMap();

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


    // --- OBJ MODEL (STANFORD BUNNY) ---
    // The Stanford Bunny model is usually very large, so we scale it down heavily
    if (g_bunny) {
        if (g_normalOn) {
            g_bunny.textureNum = -3;
        } else {
            g_bunny.textureNum = -2; // Solid color mode
        }
        g_bunny.matrix.setIdentity();
        g_bunny.matrix.translate(-1.5, -0.75, -0.5); // Place it to the left of the cube
        g_bunny.matrix.scale(0.25, 0.25, 0.25); // Scale it down (adjust based on actual model size)
        g_bunny.renderFast();
    }

    // --- LIGHT INDICATOR ---
    var light = new Cube();
    light.color = [g_lightColor[0], g_lightColor[1], g_lightColor[2], 1.0];
    light.textureNum = -4; // Unlit mode
    light.matrix.translate(g_lightPos[0], g_lightPos[1], g_lightPos[2]);
    light.matrix.scale(-0.1, -0.1, -0.1);
    light.matrix.translate(-0.5, -0.5, -0.5);
    light.renderFast();


    // --- SPOTLIGHT INDICATOR ---
    var spotLightNode = new Cube();
    spotLightNode.color = [0.0, 1.0, 0.0, 1.0]; // Bright Green
    spotLightNode.textureNum = -4; // Unlit
    spotLightNode.matrix.translate(g_spotLightPos[0], g_spotLightPos[1], g_spotLightPos[2]);
    spotLightNode.matrix.scale(-0.1, -0.1, -0.1);
    spotLightNode.matrix.translate(-0.5, -0.5, -0.5);
    spotLightNode.renderFast();

    var duration = performance.now() - startTime;
    sendTextToHTML("FPS: " + Math.floor(10000 / duration) / 10, "numdot");
}


function drawMap() {
    var wall = new Cube();
    if (g_normalOn) {
        wall.textureNum = -3;
    } else {
        wall.textureNum = 1; // Assuming 1 is your wall texture
    }

    // Loop through the 32x32 grid edges
    for (let x = 0; x < 32; x++) {
        for (let z = 0; z < 32; z++) {
            if (x === 0 || x === 31 || z === 0 || z === 31) {
                // NEW: Loop to stack the blocks 3 high!
                for (let y = 0; y < 3; y++) {
                    wall.matrix.setIdentity();
                    // Place the block, stacking it up on the Y axis
                    wall.matrix.translate(x - 16, y - 0.75, z - 16);
                    wall.renderFast();
                }
            }
        }
    }
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
    g_bunny = new Model('bunny.obj', [0.26, 0.15, 0.09, 1.0]);
    requestAnimationFrame(tick);
}