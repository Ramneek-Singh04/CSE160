import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const scene = new THREE.Scene();

// 1. SKYBOX
const cubeTextureLoader = new THREE.CubeTextureLoader();
const skyboxTexture = cubeTextureLoader.load([
    'px.png', 'nx.png', 'py.png', 'ny.png', 'pz.png', 'nz.png'
]);
scene.background = skyboxTexture;

// 2. CAMERA & RENDERER
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
// Start camera a bit further back so the ocean is obvious
camera.position.set(0, 8, 18);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// 3. CONTROLS
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 2, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.05;

// 4. LIGHTS
const dirLight = new THREE.DirectionalLight(0xffffff, 2.8);
dirLight.position.set(5, 12, 5);
dirLight.castShadow = true;
dirLight.shadow.camera.top = 10;
dirLight.shadow.camera.bottom = -10;
dirLight.shadow.camera.left = -10;
dirLight.shadow.camera.right = 10;
scene.add(dirLight);

const ambientLight = new THREE.AmbientLight(0xfffacd, 1.2);
scene.add(ambientLight);

// Global variables for UI
let lighthouseBeamGroup;
let lighthouseSpotLight;

// 5. TEXTURES
const textureLoader = new THREE.TextureLoader();
const sandTexture = textureLoader.load('sand.png');
sandTexture.wrapS = THREE.RepeatWrapping;
sandTexture.wrapT = THREE.RepeatWrapping;
sandTexture.repeat.set(12, 12);
sandTexture.magFilter = THREE.NearestFilter;

const cocoTexture = textureLoader.load('coco.png');

// 6. WOW POINT: THE OCEAN
const oceanGeo = new THREE.PlaneGeometry(200, 200);
const oceanMat = new THREE.MeshPhongMaterial({
    color: 0x006994,
    transparent: true,
    opacity: 0.85,
    shininess: 100
});
const ocean = new THREE.Mesh(oceanGeo, oceanMat);
ocean.rotation.x = -Math.PI / 2; // Lay it flat
ocean.position.y = -0.3; // Just below the sand
scene.add(ocean);


// 7. MODELS
const gltfLoader = new GLTFLoader();

gltfLoader.load('Beach Bro.glb', (gltf) => {
    const beachBro1 = gltf.scene;
    beachBro1.scale.set(0.12, 0.12, 0.12);
    beachBro1.position.set(1.5, 0.85, 2.5);
    beachBro1.rotation.y = -Math.PI / 4;
    beachBro1.traverse((object) => {
        if (object.isMesh) {
            object.castShadow = true;
            object.receiveShadow = true;
        }
    });
    scene.add(beachBro1);

    const beachBro2 = beachBro1.clone();
    beachBro2.position.set(-2, 0.85, 1.5);
    beachBro2.rotation.y = Math.PI * 0.8;
    scene.add(beachBro2);

    const beachBro3 = beachBro1.clone();
    beachBro3.position.set(3.5, 0.85, -2);
    beachBro3.rotation.y = Math.PI;
    scene.add(beachBro3);

    const beachBro4 = beachBro1.clone();
    beachBro4.position.set(-4, 0.85, -1);
    beachBro4.rotation.y = Math.PI / 2;
    scene.add(beachBro4);
});

const seagulls = [];
gltfLoader.load('Flying seagull.glb', (gltf) => {
    const baseSeagull = gltf.scene;
    baseSeagull.scale.set(0.008, 0.008, 0.008);

    const sg1 = baseSeagull;
    scene.add(sg1);
    seagulls.push({ model: sg1, radius: 5.0, speed: 1.5, height: 7.0, phase: 0, direction: 1 });

    const sg2 = baseSeagull.clone();
    scene.add(sg2);
    seagulls.push({ model: sg2, radius: 7.0, speed: 1.1, height: 8.5, phase: Math.PI, direction: -1 });

    const sg3 = baseSeagull.clone();
    scene.add(sg3);
    seagulls.push({ model: sg3, radius: 3.0, speed: 2.2, height: 6.5, phase: Math.PI / 2, direction: 1 });
});


// 8. PRIMITIVES
const matBrown = new THREE.MeshPhongMaterial({ color: 0x5c4033 });
const matCoco = new THREE.MeshPhongMaterial({ map: cocoTexture });
const matGreen = new THREE.MeshPhongMaterial({ color: 0x228b22 });
const matWhite = new THREE.MeshPhongMaterial({ color: 0xf0f0f0 });
const matRoof = new THREE.MeshPhongMaterial({ color: 0xcc0000 });
const matGray = new THREE.MeshPhongMaterial({ color: 0x333333 });
const matLight = new THREE.MeshBasicMaterial({ color: 0xffea00 });
const groundMat = new THREE.MeshPhongMaterial({ map: sandTexture });

function createBasicLighthouse() {
    const lighthouseGroup = new THREE.Group();

    const towerGeo = new THREE.CylinderGeometry(0.8, 1.2, 4.0, 32);
    const towerMesh = new THREE.Mesh(towerGeo, matWhite);
    towerMesh.position.y = 2.0;
    towerMesh.castShadow = true;
    towerMesh.receiveShadow = true;
    lighthouseGroup.add(towerMesh);

    const doorGeo = new THREE.BoxGeometry(0.5, 1.0, 0.2);
    const doorMesh = new THREE.Mesh(doorGeo, matBrown);
    doorMesh.position.set(0, 0.5, 1.15);
    lighthouseGroup.add(doorMesh);

    const catwalkGeo = new THREE.CylinderGeometry(1.1, 1.1, 0.15, 32);
    const catwalkMesh = new THREE.Mesh(catwalkGeo, matGray);
    catwalkMesh.position.y = 4.0;
    catwalkMesh.castShadow = true;
    lighthouseGroup.add(catwalkMesh);

    // --- NEW SPINNING BEAM SETUP ---
    lighthouseBeamGroup = new THREE.Group();
    lighthouseBeamGroup.position.y = 4.5;

    // The glowing bulb
    const lightGeo = new THREE.CylinderGeometry(0.6, 0.6, 0.8, 16);
    const lightMesh = new THREE.Mesh(lightGeo, matLight);
    lighthouseBeamGroup.add(lightMesh);

    // The SpotLight (shines in a cone, making the spin visible on the sand)
    lighthouseSpotLight = new THREE.SpotLight(0xffea00, 8, 30, Math.PI / 6, 0.5, 1);
    lighthouseSpotLight.position.set(0, 0, 0);
    lighthouseSpotLight.castShadow = true;

    // Spotlight needs a target to point at
    const targetObject = new THREE.Object3D();
    targetObject.position.set(0, -2, 10); // Aim it slightly downward and out
    lighthouseBeamGroup.add(targetObject);
    lighthouseSpotLight.target = targetObject;

    lighthouseBeamGroup.add(lighthouseSpotLight);
    lighthouseGroup.add(lighthouseBeamGroup);
    // --------------------------------

    const roofGeo = new THREE.ConeGeometry(0.9, 1.0, 16);
    const roofMesh = new THREE.Mesh(roofGeo, matRoof);
    roofMesh.position.y = 5.4;
    lighthouseGroup.add(roofMesh);

    return lighthouseGroup;
}

function createDetailedPalmTree() {
    const palmTreeGroup = new THREE.Group();
    const trunkHeight = 0.6;
    for (let i = 0; i < 5; i++) {
        const diamTop = 0.25 - (i * 0.02);
        const diamBot = 0.30 - (i * 0.02);
        const trunkGeo = new THREE.CylinderGeometry(diamTop, diamBot, trunkHeight, 12);
        const trunkMesh = new THREE.Mesh(trunkGeo, matBrown);
        trunkMesh.position.y = (trunkHeight / 2) + (i * trunkHeight);
        trunkMesh.castShadow = true;
        trunkMesh.receiveShadow = true;
        palmTreeGroup.add(trunkMesh);
    }

    const topOfTrunk = 5 * trunkHeight;

    const leafGeo = new THREE.SphereGeometry(1, 16, 16);
    for (let i = 0; i < 8; i++) {
        const leaf = new THREE.Mesh(leafGeo, matGreen);
        leaf.scale.set(0.3, 0.05, 1.8);
        leaf.position.y = topOfTrunk;
        const angle = (i / 8) * Math.PI * 2;
        leaf.rotation.y = angle;
        leaf.rotation.x = 0.3;
        leaf.translateZ(1.0);
        leaf.castShadow = true;
        palmTreeGroup.add(leaf);
    }

    const cocoGeo = new THREE.SphereGeometry(0.18);
    for (let i = 0; i < 3; i++) {
        const coco = new THREE.Mesh(cocoGeo, matCoco);
        const angle = (i / 3) * Math.PI * 2;
        coco.position.set(Math.cos(angle) * 0.35, topOfTrunk - 0.2, Math.sin(angle) * 0.35);
        palmTreeGroup.add(coco);
    }
    return palmTreeGroup;
}

const groundGeo = new THREE.BoxGeometry(15, 0.5, 15);
const groundMesh = new THREE.Mesh(groundGeo, groundMat);
groundMesh.position.y = -0.25;
groundMesh.receiveShadow = true;
scene.add(groundMesh);

const myLighthouse = createBasicLighthouse();
scene.add(myLighthouse);
myLighthouse.position.set(-2, 0, 0);

const trees = [];
const palmTree1 = createDetailedPalmTree();
scene.add(palmTree1);
palmTree1.position.set(3, 0, 1);
trees.push(palmTree1);

const palmTree2 = createDetailedPalmTree();
scene.add(palmTree2);
palmTree2.position.set(4.5, 0, -2.5);
palmTree2.rotation.y = Math.PI / 4;
trees.push(palmTree2);

const sunGeo = new THREE.SphereGeometry(0.8);
const sunMat = new THREE.MeshBasicMaterial({ color: 0xffd700 });
const sunMesh = new THREE.Mesh(sunGeo, sunMat);
scene.add(sunMesh);

// ==========================================
// 9. UI EVENT LISTENERS
// ==========================================
let isSunAnimated = true;
let isBirdsAnimated = true;
let isLighthouseAnimated = true;
let isSeagullCam = false;

document.getElementById('animSun').addEventListener('change', (e) => { isSunAnimated = e.target.checked; });
document.getElementById('animBirds').addEventListener('change', (e) => { isBirdsAnimated = e.target.checked; });
document.getElementById('animLighthouse').addEventListener('change', (e) => { isLighthouseAnimated = e.target.checked; });

document.getElementById('toggleSun').addEventListener('change', (e) => { dirLight.visible = e.target.checked; });
document.getElementById('toggleAmb').addEventListener('change', (e) => { ambientLight.visible = e.target.checked; });
document.getElementById('toggleLh').addEventListener('change', (e) => { if (lighthouseSpotLight) lighthouseSpotLight.visible = e.target.checked; });

document.getElementById('colorSun').addEventListener('input', (e) => { dirLight.color.set(e.target.value); });
document.getElementById('colorAmb').addEventListener('input', (e) => { ambientLight.color.set(e.target.value); });
document.getElementById('colorLh').addEventListener('input', (e) => {
    if (lighthouseSpotLight) {
        lighthouseSpotLight.color.set(e.target.value);
        matLight.color.set(e.target.value); // Change bulb color too
    }
});

const camButton = document.getElementById('camButton');
camButton.addEventListener('click', () => {
    isSeagullCam = !isSeagullCam;
    if (isSeagullCam) {
        camButton.innerText = "🛑 Exit Seagull POV";
        camButton.classList.add('active');
        controls.enabled = false; // Turn off mouse controls
    } else {
        camButton.innerText = "🎥 Ride Seagull (POV)";
        camButton.classList.remove('active');
        controls.enabled = true; // Turn mouse controls back on

        // Reset camera to standard view
        camera.position.set(0, 8, 18);
        camera.lookAt(0, 2, 0);
    }
});


// ==========================================
// 10. ANIMATION LOOP
// ==========================================
let previousTime = 0;
let sunTime = 0;
let birdTime = 0;
let lhTime = 0;

function animate(time) {
    time *= 0.001;
    const deltaTime = time - previousTime;
    previousTime = time;

    requestAnimationFrame(animate);

    // Animate Ocean Tide
    ocean.position.y = -0.3 + Math.sin(time * 1.5) * 0.08;

    if (isSunAnimated) {
        sunTime += deltaTime;
        sunMesh.position.x = Math.cos(sunTime * 0.7) * 7;
        sunMesh.position.y = 8 + Math.sin(sunTime * 0.7) * 4;
        sunMesh.position.z = -5;
    }

    if (isLighthouseAnimated && lighthouseBeamGroup) {
        lhTime += deltaTime;
        // Spin the beam around the Y axis
        lighthouseBeamGroup.rotation.y = lhTime * 2.0;
    }

    if (isBirdsAnimated) {
        birdTime += deltaTime;

        trees.forEach((tree, index) => {
            const timeOffset = birdTime + (index * 2);
            tree.rotation.z = Math.sin(timeOffset * 1.5) * 0.06;
            tree.rotation.x = Math.sin(timeOffset * 1.2) * 0.04;
        });

        seagulls.forEach((bird) => {
            const orbitAngle = (birdTime * bird.speed * bird.direction) + bird.phase;
            bird.model.position.x = Math.cos(orbitAngle) * bird.radius;
            bird.model.position.z = Math.sin(orbitAngle) * bird.radius;
            bird.model.position.y = bird.height + Math.sin(birdTime * 3 + bird.phase) * 0.4;

            const dx = -Math.sin(orbitAngle) * bird.direction;
            const dz = Math.cos(orbitAngle) * bird.direction;
            bird.model.rotation.y = Math.atan2(dx, dz) - Math.PI / 2;
        });
    }

    // --- WOW POINT: SEAGULL POV CAM ---
    if (isSeagullCam && seagulls.length > 0) {
        const leadBird = seagulls[0].model;

        // Use matrix math to position the camera behind and slightly above the bird
        const relativeOffset = new THREE.Vector3(0, 1.5, -4);
        const cameraPos = relativeOffset.applyMatrix4(leadBird.matrixWorld);

        camera.position.copy(cameraPos);
        // Tell the camera to look slightly ahead of the bird
        const lookTarget = new THREE.Vector3(0, 0, 5).applyMatrix4(leadBird.matrixWorld);
        camera.lookAt(lookTarget);
    } else {
        controls.update();
    }

    renderer.render(scene, camera);
}

requestAnimationFrame(animate);