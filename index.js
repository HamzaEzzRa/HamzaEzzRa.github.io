import { OrbitControls } from "https://rawgit.com/mrdoob/three.js/dev/examples/jsm/controls/OrbitControls.js";
import { DRACOLoader } from "https://rawgit.com/mrdoob/three.js/dev/examples/jsm/loaders/DRACOLoader.js";
import { GLTFLoader } from "https://rawgit.com/mrdoob/three.js/dev/examples/jsm/loaders/GLTFLoader.js";
import { EffectComposer } from "https://rawgit.com/mrdoob/three.js/dev/examples/jsm/postprocessing/EffectComposer.js";
import { OutlinePass } from "https://rawgit.com/mrdoob/three.js/dev/examples/jsm/postprocessing/OutlinePass.js";
import { RenderPass } from "https://rawgit.com/mrdoob/three.js/dev/examples/jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "https://rawgit.com/mrdoob/three.js/dev/examples/jsm/postprocessing/ShaderPass.js";
import { FXAAShader } from "https://rawgit.com/mrdoob/three.js/dev/examples/jsm/shaders/FXAAShader.js";
import { UnrealBloomPass } from "https://rawgit.com/mrdoob/three.js/dev/examples/jsm/postprocessing/UnrealBloomPass.js";
import { BokehPass } from "https://rawgit.com/mrdoob/three.js/dev/examples/jsm/postprocessing/BokehPass.js";
import { SMAAPass } from "https://rawgit.com/mrdoob/three.js/dev/examples/jsm/postprocessing/SMAAPass.js";
import * as dat from "https://rawgit.com/dataarts/dat.gui/tree/master/build/dat.gui.js";
import gsap from "https://rawgit.com/greensock/GSAP/tree/master/dist/gsap.js";

const components = {
    debugger: null,
    scene: null,
    renderer: null,
    camera: null,
    controls: null,
    cursor: new THREE.Vector2(),
    raycaster: null,
    composer: null,
    animationMixer: null
};

const lights = {
    directionalLight: {
        source: null,
        color: 0xffffff
    },
    secondDirectionalLight: {
        source: null,
        color: 0xffffff
    },
    ambientLight: {
        source: null,
        color: 0xffffff
    }
};

const loaders = {
    dracoLoader: null,
    gltfLoader: null,
    textureLoader: null,
    fontLoader: null
};

const passes = {
    outlinePassSkinned: null,
    outlinePassNonSkinned: null,
    params: {
        edgeStrength: 8,
        edgeGlow: 0.1,
        edgeThickness: 1.5,
        pulsePeriod: 0,
        usePatternTexture: false,
        visibleEdgeColor: 0xffffff,
        hiddenEdgeColor: 0x190a05,
        focus: 1.0,
        aperture: 0.1,
        maxblur: 0.0001
    },
    FXAAPass: null,
    bloomPass: null,
    bokehPass: null
};

const parameters = {
    lastTime: performance.now()
};

let clickables = new Map();

let animables = new Map();

let movable = null;

let deskAnimations = [];

let intersected = null;

let drag = false;

// Canvas
const canvas = document.querySelector('canvas.webgl')

const onWindowResize = () => {
    components.camera.aspect = window.innerWidth / window.innerHeight;
    components.camera.updateProjectionMatrix();

    components.renderer.setPixelRatio(window.devicePixelRatio);
    components.renderer.setSize(window.innerWidth, window.innerHeight);

    components.composer.setSize(window.innerWidth, window.innerHeight);
    components.composer.setPixelRatio(window.devicePixelRatio);
    passes.FXAAPass.uniforms["resolution"].value.set(1 / window.innerWidth, 1 / window.innerHeight);

    components.debugger.width = window.innerWidth * 0.25;
};

const updateMaterials = () => {
    components.scene.traverse((child) => {
        // Check if the object is clickable. This property is hardcoded in the desk model.
        if (child.userData.IsClickable === 1) {
            clickables.set(child.uuid, child);
            if (child instanceof THREE.SkinnedMesh)
                animables.set(child.name, { reverseFactor: 1 });
        }

        if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
            child.frustumCulled = false;
            child.castShadow = true;
            child.receiveShadow = true;
            child.material.needsUpdate = true;

            if (child.material.userData.IsEmissible > 0)
                child.material.emissiveIntensity = Number(child.material.userData.IsEmissible);
        }
    });

    // console.log(clickables);
};

const start = async () => {
    // Scene
    components.scene = new THREE.Scene();
    components.scene.background = new THREE.Color(0xcee1e4);

    // Lighting
    const d = 5;
    lights.directionalLight.source = new THREE.DirectionalLight(lights.directionalLight.color, 0.7);
    lights.directionalLight.source.shadow.mapSize.width = 2048;
    lights.directionalLight.source.shadow.mapSize.height = 2048;
    lights.directionalLight.source.shadow.radius = 4;
    lights.directionalLight.source.shadow.normalBias = 0.01;
    lights.directionalLight.source.position.set(0, 2, 1.5);
    lights.directionalLight.source.castShadow = true;
    lights.directionalLight.source.shadow.camera.left = -d;
    lights.directionalLight.source.shadow.camera.right = d;
    lights.directionalLight.source.shadow.camera.top = d;
    lights.directionalLight.source.shadow.camera.bottom = -d;
    lights.directionalLight.source.shadow.camera.far = d;
    components.scene.add(lights.directionalLight.source);

    // components.scene.add(new THREE.DirectionalLightHelper(lights.directionalLight.source, 2));
    // components.scene.add(new THREE.CameraHelper(lights.directionalLight.source.shadow.camera));

    lights.secondDirectionalLight.source = new THREE.DirectionalLight(lights.secondDirectionalLight.color, 0.5);
    lights.secondDirectionalLight.source.position.set(0, -0.8, 2.4);
    lights.secondDirectionalLight.source.rotation.set(0.8, 0, 0);
    components.scene.add(lights.secondDirectionalLight.source);

    // components.scene.add(new THREE.DirectionalLightHelper(lights.secondDirectionalLight.source, 2, 0xff0000));

    const thirdDirectionalLight = new THREE.DirectionalLight(lights.secondDirectionalLight.color, 0.5);
    thirdDirectionalLight.position.set(0, -0.8, -2.4);
    thirdDirectionalLight.rotation.set(3.2, 0, 0);
    components.scene.add(thirdDirectionalLight);

    // components.scene.add(new THREE.DirectionalLightHelper(thirdDirectionalLight, 2, 0xff0000));

    lights.ambientLight.source = new THREE.AmbientLight(lights.ambientLight.color, 2.7);
    components.scene.add(lights.ambientLight.source);

    // Raycaster
    components.raycaster = new THREE.Raycaster();

    // Renderer
    components.renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    components.renderer.physicallyCorrectLights = true;
    components.renderer.setPixelRatio(window.devicePixelRatio);
    components.renderer.setSize(window.innerWidth, window.innerHeight);
    components.renderer.shadowMap.enabled = true;
    components.renderer.outputEncoding = THREE.sRGBEncoding;
    components.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    components.renderer.toneMappingExposure = 1;
    components.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Texture Loader
    loaders.textureLoader = new THREE.TextureLoader();

    // Font Loader
    loaders.fontLoader = new THREE.FontLoader();

    // DRACO Loader
    loaders.dracoLoader = new DRACOLoader();
    loaders.dracoLoader.setDecoderPath("./draco/gltf/");

    // GLTF Loader
    loaders.gltfLoader = new GLTFLoader();
    loaders.gltfLoader.setDRACOLoader(loaders.dracoLoader);
    loaders.gltfLoader.load("./models/stylized_desk.glb", (gltf) => {
        components.animationMixer = new THREE.AnimationMixer(gltf.scene);
        deskAnimations = [...gltf.animations];
        gltf.scene.scale.set(0.6, 0.6, 0.6);
        components.scene.add(gltf.scene);
        updateMaterials();
    });

    // Camera
    components.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    components.camera.position.set(0, 2, 4);
    components.camera.lookAt(new THREE.Vector3(0, 0, 0));

    // Post Processing
    let RenderTargetClass = null;
    if (components.renderer.getPixelRatio() === 1 && components.renderer.capabilities.isWebGL2)
        RenderTargetClass = THREE.WebGLMultisampleRenderTarget;
    else
        RenderTargetClass = THREE.WebGLRenderTarget;

    const renderTarget = new RenderTargetClass(
        1920,
        1080,
        {
            minFilter: THREE.LinearFilter,
            magFilter: THREE.LinearFilter,
            format: THREE.RGBAFormat,
            encoding: THREE.sRGBEncoding
        }
    );

    components.composer = new EffectComposer(components.renderer, renderTarget);
    components.composer.setPixelRatio(window.devicePixelRatio);
    components.composer.setSize(window.innerWidth, window.innerHeight);

    const renderPass = new RenderPass(components.scene, components.camera);
    components.composer.addPass(renderPass);
    
    passes.outlinePassSkinned = new OutlinePass(new THREE.Vector2(window.innerWidth, window.innerHeight), components.scene, components.camera);
    passes.outlinePassSkinned.depthMaterial.skinning = true;
    passes.outlinePassSkinned.prepareMaskMaterial.skinning = true;
    passes.outlinePassSkinned.edgeStrength = passes.params.edgeStrength;
    passes.outlinePassSkinned.edgeGlow = passes.params.edgeGlow;
    passes.outlinePassSkinned.edgeThickness = passes.params.edgeThickness;
    passes.outlinePassSkinned.pulsePeriod = passes.params.pulsePeriod;
    components.composer.addPass(passes.outlinePassSkinned);

    passes.outlinePassNonSkinned = new OutlinePass(new THREE.Vector2(window.innerWidth, window.innerHeight), components.scene, components.camera);
    passes.outlinePassNonSkinned.edgeStrength = passes.params.edgeStrength;
    passes.outlinePassNonSkinned.edgeGlow = passes.params.edgeGlow;
    passes.outlinePassNonSkinned.edgeThickness = passes.params.edgeThickness;
    passes.outlinePassNonSkinned.pulsePeriod = passes.params.pulsePeriod;
    components.composer.addPass(passes.outlinePassNonSkinned);

    passes.FXAAPass = new ShaderPass(FXAAShader);
    passes.FXAAPass.uniforms["resolution"].value.set(1 / window.innerWidth, 1 / window.innerHeight);
    components.composer.addPass(passes.FXAAPass);

    passes.bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.15, 1, 0.6);
    components.composer.addPass(passes.bloomPass);

    passes.bokehPass = new BokehPass(
        components.scene,
        components.camera,
        {
            focus: passes.params.focus,
            aperture: passes.params.aperture,
            maxblur: passes.params.maxblur,

            width: window.innerWidth,
            height: window.innerHeight
        }
    );
    components.composer.addPass(passes.bokehPass);

    if (components.renderer.getPixelRatio() === 1 && !components.renderer.capabilities.isWebGL2) // Should always be the last pass to add
        components.composer.addPass(new SMAAPass());

    // Controls
    components.controls = new OrbitControls(components.camera, components.renderer.domElement);
    components.controls.minDistance = 2;
    components.controls.maxDistance = 6;
    components.controls.enableDamping = true;

    // Debugger
    components.debugger = new dat.GUI({ width: window.innerWidth * 0.25 });

    const rendererFolder = components.debugger.addFolder("Renderer");
    rendererFolder.add(components.renderer, "toneMapping", {
        None: THREE.NoToneMapping,
        Linear: THREE.LinearToneMapping,
        Reinhard: THREE.ReinhardToneMapping,
        Cineon: THREE.CineonToneMapping,
        ACESFilmic: THREE.ACESFilmicToneMapping
    }).onFinishChange(() => {
        components.renderer.toneMapping = Number(components.renderer.toneMapping);
        updateMaterials();
    });
    rendererFolder.add(components.renderer, "toneMappingExposure")
        .min(0)
        .max(10)
        .step(0.01);

    const lightFolder = components.debugger.addFolder("Lighting");
    const directionalLightFolder = lightFolder.addFolder("Directional Light");
    directionalLightFolder.addColor(lights.directionalLight, "color")
        .onChange(() => lights.directionalLight.source.color.set(lights.directionalLight.color));
    directionalLightFolder.add(lights.directionalLight.source, "intensity")
        .step(0.1);
    const directionalLightPositionFolder = directionalLightFolder.addFolder("position");
    directionalLightPositionFolder.add(lights.directionalLight.source.position, "x")
        .step(0.1);
    directionalLightPositionFolder.add(lights.directionalLight.source.position, "y")
        .step(0.1);
    directionalLightPositionFolder.add(lights.directionalLight.source.position, "z")
        .step(0.1);
    directionalLightFolder.add(lights.directionalLight.source.shadow, "bias")
        .step(0.001);
    directionalLightFolder.add(lights.directionalLight.source.shadow, "normalBias")
        .step(0.001);

    const secondDirectionalLightFolder = lightFolder.addFolder("Second Directional Light");
    secondDirectionalLightFolder.addColor(lights.secondDirectionalLight, "color")
        .onChange(() => lights.secondDirectionalLight.source.color.set(lights.secondDirectionalLight.color));
    secondDirectionalLightFolder.add(lights.secondDirectionalLight.source, "intensity")
        .step(0.1);
    const secondDirectionalLightPositionFolder = secondDirectionalLightFolder.addFolder("position");
    secondDirectionalLightPositionFolder.add(lights.secondDirectionalLight.source.position, "x")
        .step(0.1);
    secondDirectionalLightPositionFolder.add(lights.secondDirectionalLight.source.position, "y")
        .step(0.1);
    secondDirectionalLightPositionFolder.add(lights.secondDirectionalLight.source.position, "z")
        .step(0.1);
    const secondDirectionalLightRotationFolder = secondDirectionalLightFolder.addFolder("rotation");
    secondDirectionalLightRotationFolder.add(lights.secondDirectionalLight.source.rotation, "x")
        .step(0.1);
    secondDirectionalLightRotationFolder.add(lights.secondDirectionalLight.source.rotation, "y")
        .step(0.1);
    secondDirectionalLightRotationFolder.add(lights.secondDirectionalLight.source.rotation, "z")
        .step(0.1);

    const ambientLightFolder = lightFolder.addFolder("Ambient Light");
    ambientLightFolder.addColor(lights.ambientLight, "color")
        .onChange(() => lights.ambientLight.source.color.set(lights.ambientLight.color));
    ambientLightFolder.add(lights.ambientLight.source, "intensity")
        .step(0.1);

    const outlinePassFolder = components.debugger.addFolder("Outline Pass");
    outlinePassFolder.add(passes.params, "edgeStrength", 0.01, 10).onChange((value) => {
        passes.outlinePassSkinned.edgeStrength = Number(value);
        passes.outlinePassNonSkinned.edgeStrength = Number(value);
    });
    outlinePassFolder.add(passes.params, "edgeGlow", 0.0, 1).onChange((value) => {
        passes.outlinePassSkinned.edgeGlow = Number(value);
        passes.outlinePassNonSkinned.edgeGlow = Number(value);
    });
    outlinePassFolder.add(passes.params, "edgeThickness", 1, 4).onChange((value) => {
        passes.outlinePassSkinned.edgeThickness = Number(value);
        passes.outlinePassNonSkinned.edgeThickness = Number(value);
    });
    outlinePassFolder.add(passes.params, "pulsePeriod", 0.0, 5).onChange((value) => {
        passes.outlinePassSkinned.pulsePeriod = Number(value);
        passes.outlinePassNonSkinned.pulsePeriod = Number(value);
    });
    outlinePassFolder.add(passes.params, "usePatternTexture").onChange((value) => {
        passes.outlinePassSkinned.usePatternTexture = value;
        passes.outlinePassNonSkinned.usePatternTexture = value;
    });
    outlinePassFolder.addColor(passes.params, "visibleEdgeColor").onChange((value) => {
        passes.outlinePassSkinned.visibleEdgeColor.set(value);
        passes.outlinePassNonSkinned.visibleEdgeColor.set(value);
    });
    outlinePassFolder.addColor(passes.params, "hiddenEdgeColor").onChange((value) => {
        passes.outlinePassSkinned.hiddenEdgeColor.set(value);
        passes.outlinePassNonSkinned.hiddenEdgeColor.set(value);
    });

    const bloomPassFoler = components.debugger.addFolder("Bloom Pass");
    bloomPassFoler.add(passes.bloomPass, "enabled");
    bloomPassFoler.add(passes.bloomPass, "strength", 0, 2);
    bloomPassFoler.add(passes.bloomPass, "radius", 0, 2);
    bloomPassFoler.add(passes.bloomPass, "threshold", 0, 1);

    const bokehPassFolder = components.debugger.addFolder("Bokeh Pass");
    bokehPassFolder.add(passes.bokehPass, "enabled");
    bokehPassFolder.add(passes.params, "focus", 0, 5).onChange(() => passes.bokehPass.uniforms["focus"].value = passes.params.focus);
    bokehPassFolder.add(passes.params, "aperture", 0, 1).onChange(() => passes.bokehPass.uniforms["aperture"].value = passes.params.aperture);
    bokehPassFolder.add(passes.params, "maxblur", 0, 1).onChange(() => passes.bokehPass.uniforms["maxblur"].value = passes.params.maxblur);

    components.debugger.close();
    components.debugger.hide();

    // Pointer Movement
    window.addEventListener("pointermove", (event) => {
        drag = true;
        components.cursor.x = (event.clientX / window.innerWidth - 0.5) * 2;
        components.cursor.y = -((event.clientY / window.innerHeight - 0.5) * 2);

        checkIntersections();
    });

    // Pointer Down
    document.addEventListener("pointerdown", () => drag = false);  

    // Pointer Up
    window.addEventListener("pointerup", (event) => {
        if (drag === false && intersected !== null)
            handleClick();
    });

    // Resizing
    window.addEventListener("resize", onWindowResize);
};

const update = () =>
{
    const time = performance.now();
    const deltaTime = (time - parameters.lastTime) * 0.001;

    components.controls.update();
    components.animationMixer?.update(deltaTime);

    parameters.lastTime = time;
    components.composer.render();
    
    window.requestAnimationFrame(update)
};

const checkIntersections = () => {
    components.raycaster.setFromCamera(components.cursor, components.camera);

    const clickableIntersections = components.raycaster.intersectObjects(Array.from(clickables.values()), true);

    if (clickableIntersections.length > 0) {
        document.body.style.cursor = "pointer";
        const clickableIntersection = clickableIntersections[0];
        intersected = clickableIntersection.object;
        if (intersected instanceof THREE.SkinnedMesh) {
            passes.outlinePassSkinned.selectedObjects = [intersected];
            passes.outlinePassNonSkinned.selectedObjects = [];
        }
        else {
            passes.outlinePassNonSkinned.selectedObjects = [intersected];
            passes.outlinePassSkinned.selectedObjects = [];
        } 
    }
    else {
        document.body.style.cursor = "default";
        passes.outlinePassSkinned.selectedObjects = [];
        passes.outlinePassNonSkinned.selectedObjects = [];
        intersected = null;
    }
};

const handleClick = () => {
    if (intersected instanceof THREE.SkinnedMesh) {
        let action = null;
        switch (intersected.name) {
            case "Top_Drawer": {
                action = components.animationMixer.clipAction(deskAnimations[0]);
                break;
            };
            case "Bottom_Drawer": {
                action = components.animationMixer.clipAction(deskAnimations[1]);
                break;
            }
            case "Bottom_Desk": {
                action = components.animationMixer.clipAction(deskAnimations[2]);
                break;
            }
        }
        if (action !== null) {
            let reverseFactor = animables.get(intersected.name).reverseFactor;
            if (reverseFactor > 0) {
                action.reset();
                action.setLoop(THREE.LoopOnce, 1);
                action.clampWhenFinished = true;
                action.timeScale = 1;
                action.play();
            }
            else {
                action.timeScale = -1;
                action.paused = false;
            }
            animables.set(intersected.name, { reverseFactor: -reverseFactor });
        }
    }
    else {
        switch (intersected.name) {
            case "Paper_Holder": {
                movable = {
                    originalPosition: intersected.position,
                    originalRotation: intersected.rotation 
                };
                
                const distanceToCamera = 1.5;
                const target = new THREE.Vector3(0, 0, -distanceToCamera);
                target.applyMatrix4(components.camera.matrixWorld);

                intersected.lookAt(target);

                gsap.to(intersected.position, { duration: 2, x: target.x, y: target.y, z: target.z });
                gsap.to(intersected.rotation, { duration: 2, x: components.camera.rotation.x + Math.PI * 0.5 });
                break;
            }
        }
    }
};

start().then(() => { update() });
