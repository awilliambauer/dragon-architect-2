// Overview: This file contains code that displays the dragon and cubes

import { SSL_OP_COOKIE_EXCHANGE } from 'constants';
import { stringify } from 'querystring';
import React, { useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import * as THREE from 'three';
import { IncrementalSimulator, SimulatorState } from './Simulator';
import { mapHasVector3 } from './Util';
import WorldState, { UP } from './WorldState';

type DisplayState = {
    world: WorldState,
    simulator: IncrementalSimulator
}

type DisplayProps = {
    world: WorldState,
    simulator: IncrementalSimulator
}

type ClockParameter = {
    clock: THREE.Clock,
    time: number
}

type GoalPositions = {
    dragPos: THREE.Vector3,
    dragDir: THREE.ArrowHelper,
    dragOffset: THREE.Vector3,
    cubeOffset: THREE.Vector3
}

// All constant values
type Constants = {
    WOBBLE_PERIOD: number,
    WOBBLE_MAGNITUDE: number,
    TRANSLATION_SMOOTHNESS: number, // The relative speed at which the camera will catch up.
    ROTATION_SMOOTHNESS: number, // The relative speed at which the camera will catch up.
    MAX_ANIMATION_TIME: number, // if animation would take longer than this, take this time and then just sit idle
    MIN_ANIMATION_TIME: number, // if animation would take less than this, just don't bother animating anything
    cubeColors: string[],
    loader: THREE.TextureLoader,
    // Map where each key is a color and each value is a list of meshes
    cubes: Map<string, THREE.Mesh[]>,
    cubeMats: THREE.MeshLambertMaterial[]
}

// All variables that store information about the camera
type CameraPos = {
    // Camera positioning
    relativeCamPos: THREE.Vector3,
    // Offsets are needed to make dragon appear above the placement of the cubes, and to appear in the center of the plane
    dragonOffset: THREE.Vector3, // How much the dragon is offSet from center of position
    cubeOffset: THREE.Vector3 // How much cubes are offset from center of position
}

// The camera, scene, and renderer variables
type Main = {
    // Defines the three main elements of a threejs window: scene, camera, and renderer
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    //renderer.setSize(window.innerWidth / 2, window.innerHeight / 2); // Makes renderer half the size of the window
}

type ClockStuff = {
    // Defines clock (used for animation), final bot position/quaternion (rotation direction)
    clock: THREE.Clock;
    oldTime: number;
    finalBotPos: THREE.Vector3;
    finalBotQ: THREE.Quaternion,
    time: number
}

type GeometryLight = {
    // Cube geometry, materials, and mesh
    cubeGeo: THREE.BoxGeometry,
    targetGeo: THREE.BoxGeometry,
    cubeTargetMat: THREE.MeshLambertMaterial,
    dragonTarget: THREE.Mesh,
    targetShadow: THREE.Mesh,
    
    // Light
    light: THREE.DirectionalLight,

    // Plane geometry, material, and mesh
    planeGeometry: THREE.PlaneBufferGeometry,
    planeMaterial: THREE.MeshBasicMaterial,
    plane: THREE.Mesh,

    // Dragon
    dragonGeometry: THREE.SphereGeometry,
    dragon: THREE.Mesh,
    dragonDir: THREE.ArrowHelper,
    geometry: THREE.PlaneBufferGeometry,
    material: THREE.MeshBasicMaterial,
    zCuePlane: THREE.Mesh
}

export default class Display extends React.Component<DisplayProps, DisplayState> {
    divRef: React.RefObject<HTMLDivElement>;
    constantValues!: Constants;
    mainStuff!: Main;
    cameraPos!: CameraPos;
    clockStuff!: ClockStuff;
    geometryAndLights!: GeometryLight;
    positionZCue: () => void;


    constructor(props: DisplayProps) {
        console.log("1");
        super(props);
        let constantValues: Constants = {
            WOBBLE_PERIOD: 4,
            WOBBLE_MAGNITUDE: 0.05,
            TRANSLATION_SMOOTHNESS: 1.5, // The relative speed at which the camera will catch up.
            ROTATION_SMOOTHNESS: 5.0, // The relative speed at which the camera will catch up.
            MAX_ANIMATION_TIME: 0.2, // if animation would take longer than this, take this time and then just sit idle
            MIN_ANIMATION_TIME: 0.1, // if animation would take less than this, just don't bother animating anything
            cubeColors: ["#1ca84f", "#a870b7", "#ff1a6d", "#00bcf4", "#ffc911", "#ff6e3d", "#000000", "#ffffff"],
            loader: new THREE.TextureLoader(),
            cubes: new Map<string, THREE.Mesh[]>(),
            cubeMats: []
        }
        // This is the texture of the cubes
        let tex1 = constantValues.loader.load("media/canvas_cube.png");
        // For loop to create the meshes of each cube
        constantValues.cubeColors.forEach(function (color: string) {
            constantValues.cubeMats.push(new THREE.MeshLambertMaterial({ color: color, map: tex1 }));
            constantValues.cubes.set(color, []);
        });

        let cameraPos: CameraPos = {
            // Camera positioning
            relativeCamPos: new THREE.Vector3(-15, 0, 12),
            // Offsets are needed to make dragon appear above the placement of the cubes, and to appear in the center of the plane
            dragonOffset: new THREE.Vector3(0.5, 0.5, 1.5), // How much the dragon is offSet from center of position
            cubeOffset: new THREE.Vector3(0.5, 0.5, 0.5) // How much cubes are offset from center of position
        }
        let relativeCamPosMag = cameraPos.relativeCamPos.length() - 0.5; // -0.5 is an undocumented part of unity version, preserving it here

        // Main stuff
        let mainStuff: Main = {
            scene: new THREE.Scene(),
            camera: new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1500),
            renderer: new THREE.WebGLRenderer({ antialias: true }),
        }
        mainStuff.renderer.setSize(window.innerWidth / 2, window.innerHeight / 2) // Makes renderer half the size of the window

        // Camera: initial values
        mainStuff.camera.position.copy(cameraPos.relativeCamPos);
        mainStuff.camera.lookAt(new THREE.Vector3(0, 0, 0));
        mainStuff.camera.up.set(0, 0, 1);
        mainStuff.camera.aspect = window.innerWidth / window.innerHeight;
        mainStuff.camera.updateProjectionMatrix();

        // Defines clock (used for animation), final bot position/quaternion (rotation direction)
        let clockStuff: ClockStuff = {
            clock: new THREE.Clock(),
            oldTime: 0,
            finalBotPos: new THREE.Vector3(),
            finalBotQ: new THREE.Quaternion(),
            time: 0
        }

        // GEOLIGHTS
        let geometryAndLights: GeometryLight = {
            // Cube geometry, materials, and mesh
            cubeGeo: new THREE.BoxGeometry(1, 1, 1),
            targetGeo: new THREE.BoxGeometry(1.1, 1.1, 1.1),
            cubeTargetMat: new THREE.MeshLambertMaterial({ color: "#4078E6", transparent: true, opacity: 0.5 }),
            dragonTarget: new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.1, 1.1), new THREE.MeshLambertMaterial({ color: "#df67be", transparent: true, opacity: 0.5 })),
            targetShadow: new THREE.Mesh(new THREE.PlaneBufferGeometry(1, 1, 32),
                new THREE.MeshBasicMaterial({ color: "#686868", transparent: true, opacity: 0.31, side: THREE.DoubleSide })),
            
            // Light
            light: new THREE.DirectionalLight("#ffffff", 1.74),

            // Plane geometry, material, and mesh
            planeGeometry: new THREE.PlaneBufferGeometry(100, 100, 32),
            planeMaterial: new THREE.MeshBasicMaterial(),
            plane: new THREE.Mesh(),

            // Dragon
            dragonGeometry: new THREE.SphereGeometry(0.5, 32, 32),
            dragon: new THREE.Mesh(new THREE.SphereGeometry(0.5, 32, 32), new THREE.MeshLambertMaterial({ color: "#f56e90" })),
            dragonDir: new THREE.ArrowHelper(new THREE.Vector3(-1, 0, 0), new THREE.Vector3(0, 0, 0), 1, "#ff0000", 0.5, 0.2),
            geometry: new THREE.PlaneBufferGeometry(1, 1, 32),
            material: new THREE.MeshBasicMaterial(),
            zCuePlane: new THREE.Mesh(new THREE.PlaneBufferGeometry(1, 1, 32), new THREE.MeshBasicMaterial({ color: "#686868", transparent: true, opacity: 0.8, side: THREE.DoubleSide }))
        }
        // light.position.set(0.32,0.77,-0.56), // rotating 0,0,-1 by 50 about x then 330 about y
        geometryAndLights.light.position.set(-0.56, -0.32, 0.77);
        mainStuff.scene.add(geometryAndLights.light);
        mainStuff.scene.add(new THREE.AmbientLight("#404040"));

        let tex = constantValues.loader.load("media/outlined_cube.png");
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(100, 100);
        geometryAndLights.planeMaterial.setValues({ map: tex, side: THREE.DoubleSide });
        geometryAndLights.plane = new THREE.Mesh(geometryAndLights.planeGeometry, geometryAndLights.planeMaterial);
        mainStuff.scene.add(geometryAndLights.plane);

        geometryAndLights.dragon.add(geometryAndLights.dragonDir);
        // tex: constantValues.loader.load("media/y-cue.png");
        mainStuff.scene.add(geometryAndLights.zCuePlane);
        mainStuff.scene.add(geometryAndLights.dragon);

        // Position the shadow underneath the dragon
        this.positionZCue = () => {
            // Find nearest filled cell below dragon
            // Use dragon.position (instead of this.state.dragon_pos), so zOffset is correct when animating
            // Use Math.floor to compensate for dragonOffset
            let zOffset = geometryAndLights.dragon.position.z;
            let vec = new THREE.Vector3();
            for (let z = Math.floor(geometryAndLights.dragon.position.z); z >= 0; z--) {
                if (mapHasVector3(this.state.world.cube_map, vec.set(Math.floor(geometryAndLights.dragon.position.x), Math.floor(geometryAndLights.dragon.position.y), z))) {
                    zOffset -= z + (cameraPos.dragonOffset.z - cameraPos.cubeOffset.z);
                    geometryAndLights.zCuePlane.position.copy(geometryAndLights.dragon.position);
                    geometryAndLights.zCuePlane.translateZ(-zOffset + 0.1); // offset a bit to avoid z-fighting
                    return;
                }
            }
            // position when there's no cube below
            geometryAndLights.zCuePlane.position.copy(geometryAndLights.dragon.position);
            geometryAndLights.zCuePlane.translateZ(-zOffset + 0.1); // offset a bit to avoid z-fighting
        };
        
        // Skybox
        let path = "media/skybox/";
        let format = ".jpg";
        // It's not clear to me three js does what it says it does with the six images, but I've got everything lining
        // up via trial and error
        let texes = [path + "px" + format, path + "nx" + format,
        path + "py" + format, path + "ny" + format,
        path + "pz" + format, path + "nz" + format];
        let cubeLoader = new THREE.CubeTextureLoader();
        mainStuff.scene.background = cubeLoader.load(texes);

        // Create new clock for animation
        let clockStuff1: ClockParameter = {
            clock: new THREE.Clock(),
            time: 0
        }
        console.log("2");
        //super(props);
        this.divRef = React.createRef();
        // Without this, the image doesn't show
        this.divRef.current?.appendChild(mainStuff.renderer.domElement);
        this.state = {
            world: props.world,
            simulator: props.simulator
        }
        console.log("3");
        //let z = constantValues.WOBBLE_MAGNITUDE * Math.sin(clockStuff.clock.elapsedTime * 4 * Math.PI / constantValues.WOBBLE_PERIOD);
    }

    // simulate function
    // This function will incorporate the simulation every X seconds
    simulate() {
        console.log("5");
        // Checks to see if the simulator is running (if there are still animations left to do)
        if (this.state.simulator.is_running()) {
            console.log("6");
            let delta = this.clockStuff.clock.getDelta(); // delta represents the amount of time between each iteration
            this.clockStuff.time += delta; // Add delta to time variable (total time between each time entering second if statement below)
            let animationPerSec = 1.9; // This is the amount of time you want between each animation movement!
            if (this.clockStuff.time>animationPerSec) { // If the total time is greater than the time you want...
                console.log("7");
                this.state.simulator.execute_to_command(); // The command is executed
                this.clockStuff.time = 0; // Reset time to 0
            }
        }
    }
    // update state function
    // This function will update the state using the this.dirty flag
    // Cubes and final dragon position
    updateDisplay() {
        // update goal values (dragon position/rotation and cube placements)
        //onsole.log("Position: " + JSON.stringify(this.state.world.dragon_pos));
        // let finalDragPos = this.state.world.dragon_pos.add(goalPositions.dragOffset);


        // The "available" and "filled" maps are solely for efficiency. Cubes can be reused so we don't have to keep creating them
        // A map where the keys are colors and the values are cube meshes
        // This map shows all of the available meshes, or the meshes that don't have a position
        let available = new Map<string, THREE.Mesh[]>();
        // A map whose keys are positions and values are booleans
        // Represents if a position is filled (true) or not (false)
        let filled = new Map<THREE.Vector3, boolean>();

        // This for loop checks for cubes that are no longer in the cube_map and should be removed
        this.constantValues.cubeColors.forEach((color: string) => { // Iterate over each color
            available.set(color, []); // Set each color in available map to an empty array
            this.constantValues.cubes.get(color)!.forEach((cube) => { // For each cube (mesh with material and position) in the specified color
                if (!mapHasVector3(this.state.world.cube_map, cube.position)) { // If the cube doesn't have a position property
                    this.mainStuff.scene.remove(cube); // Remove from scene
                    available.get(color)!.push(cube);
                } else { // If the cube has a position property
                    filled.set(cube.position, true); // Set the filled object at that cube object to true
                }
            });
        });

        // Loop over all cubes in cube map
        // This loop will add a cube to the display if the cube doesn't have a position
        for (let [cubePosition, colorInd] of this.state.world.cube_map) {
            let color: string = this.constantValues.cubeColors[colorInd];
            if (!mapHasVector3(filled, cubePosition)) { // If this cube position does not exist (is undefined) in filled
                let existing_cube = available.get(color)?.pop(); // Remove the last cube mesh from available list
                if (existing_cube) { // If there is a cube available....
                    existing_cube.position.copy(cubePosition).add(this.cameraPos.cubeOffset); // ...Give it the position of the current cube
                    this.mainStuff.scene.add(existing_cube);
                } else { // If there isn't a cube mesh available....
                    let new_cube: THREE.Mesh = new THREE.Mesh(this.geometryAndLights.cubeGeo, this.constantValues.cubeMats[colorInd]) // ...Create a new cube mesh
                    new_cube.position.copy(cubePosition).add(this.cameraPos.cubeOffset);
                    this.constantValues.cubes.get(color)!.push(new_cube);
                    filled.set(new_cube.position, true);
                    this.mainStuff.scene.add(new_cube);
                }
            }
        };

        // Draws the dragon's end position along with the arrowhelper
        // THIS IS WHERE WE MAKE THE ANIMATION SMOOTHER. LOOK AT OLD CODE!!!
        this.geometryAndLights.dragon.position.copy(this.state.world.dragon_pos).add(this.cameraPos.dragonOffset);
        this.geometryAndLights.dragonDir.setDirection(this.state.world.dragon_dir);
        // zCuePlane.position.set(this.state.world.dragon_pos.x, this.state.world.dragon_pos.y, 0);
        this.positionZCue();

        let z = this.constantValues.WOBBLE_MAGNITUDE * Math.sin(this.clockStuff.clock.elapsedTime * 4 * Math.PI / this.constantValues.WOBBLE_PERIOD);
        let y = this.constantValues.WOBBLE_MAGNITUDE * Math.cos(this.clockStuff.clock.elapsedTime * 2 * Math.PI / this.constantValues.WOBBLE_PERIOD);
        let v = new THREE.Vector3(0, y, z);
        let tDelta = this.clockStuff.clock.getDelta();

        // Smoothly move the camera towards its position relative to the dragon
        let newCamPos = v.add(this.cameraPos.relativeCamPos).add(this.geometryAndLights.dragon.position);
        this.mainStuff.camera.position.lerp(newCamPos, this.constantValues.TRANSLATION_SMOOTHNESS * tDelta);

        // Smoothly rotate the camera to look at the dragon
        let oldCamQ = this.mainStuff.camera.quaternion.clone();
        this.mainStuff.camera.lookAt(this.geometryAndLights.dragon.position);
        let newCamQ = this.mainStuff.camera.quaternion.clone();
        this.mainStuff.camera.quaternion.copy(oldCamQ);
        this.mainStuff.camera.quaternion.slerp(newCamQ, this.constantValues.ROTATION_SMOOTHNESS * tDelta);

        this.mainStuff.renderer.render(this.mainStuff.scene, this.mainStuff.camera);

        //let finalDragDir = this.state.world.dragon_dir;
        this.state.world.dirty = false;
    }

    // Function that displays things after program "did mount"
    componentDidMount() {
        // // Animation
        // let animStatus = "";
        // let animTime, waitTime, finalBotPos: THREE.Vector3, finalBotQ: THREE.Quaternion;
        // let dirty = false;

        // // Constants
        // const WOBBLE_PERIOD = 4.0;
        // const WOBBLE_MAGNITUDE = 0.05;
        // const TRANSLATION_SMOOTHNESS = 1.5; // The relative speed at which the camera will catch up.
        // const ROTATION_SMOOTHNESS = 5.0; // The relative speed at which the camera will catch up.
        // const MAX_ANIMATION_TIME = 0.2; // if animation would take longer than this, take this time and then just sit idle
        // const MIN_ANIMATION_TIME = 0.1; // if animation would take less than this, just don't bother animating anything
        // const cubeColors = ["#1ca84f", "#a870b7", "#ff1a6d", "#00bcf4", "#ffc911", "#ff6e3d", "#000000", "#ffffff"];
        // let loader = new THREE.TextureLoader();
        // // Map where each key is a color and each value is a list of meshes
        // let cubes = new Map<string, THREE.Mesh[]>();
        // let cubeMats: THREE.MeshLambertMaterial[] = [];
        // let tex1 = loader.load("media/canvas_cube.png");
        // cubeColors.forEach(function (color: string) {
        //     cubeMats.push(new THREE.MeshLambertMaterial({ color: color, map: tex1 }));
        //     cubes.set(color, []);
        // });

        // // Camera positioning
        // let relativeCamPos = new THREE.Vector3(-15, 0, 12);
        // let relativeCamPosMag = relativeCamPos.length() - 0.5; // -0.5 is an undocumented part of unity version, preserving it here
        // // Offsets are needed to make dragon appear above the placement of the cubes, and to appear in the center of the plane
        // let dragonOffset = new THREE.Vector3(0.5, 0.5, 1.5); // How much the dragon is offSet from center of position
        // let cubeOffset = new THREE.Vector3(0.5, 0.5, 0.5); // How much cubes are offset from center of position

        // // Defines the three main elements of a threejs window: scene, camera, and renderer
        // let scene = new THREE.Scene();
        // let camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1500);
        // let renderer = new THREE.WebGLRenderer({ antialias: true });
        // renderer.setSize(window.innerWidth / 2, window.innerHeight / 2); // Makes renderer half the size of the window

        // // Camera: initial values
        // camera.position.copy(relativeCamPos);
        // camera.lookAt(new THREE.Vector3(0, 0, 0));
        // camera.up.set(0, 0, 1);
        // camera.aspect = window.innerWidth / window.innerHeight;
        // camera.updateProjectionMatrix();

        // // Defines clock (used for animation), final bot position/quaternion (rotation direction)
        // let clock = new THREE.Clock();
        // let oldTime = 0;
        // finalBotPos = new THREE.Vector3();
        // finalBotQ = new THREE.Quaternion();

        // //Without this, the image doesn't show
        // this.divRef.current?.appendChild(renderer.domElement);

        // // Cube geometry, materials, and mesh
        // let cubeGeo = new THREE.BoxGeometry(1, 1, 1);
        // let targetGeo = new THREE.BoxGeometry(1.1, 1.1, 1.1);
        // let cubeTargetMat = new THREE.MeshLambertMaterial({ color: "#4078E6", transparent: true, opacity: 0.5 });
        // let dragonTarget = new THREE.Mesh(targetGeo, new THREE.MeshLambertMaterial({ color: "#df67be", transparent: true, opacity: 0.5 }));
        // let targetShadow = new THREE.Mesh(new THREE.PlaneBufferGeometry(1, 1, 32),
        //     new THREE.MeshBasicMaterial({ color: "#686868", transparent: true, opacity: 0.31, side: THREE.DoubleSide }));

        // // Light
        // const light = new THREE.DirectionalLight("#ffffff", 1.74);
        // // light.position.set(0.32,0.77,-0.56); // rotating 0,0,-1 by 50 about x then 330 about y
        // light.position.set(-0.56, -0.32, 0.77);
        // scene.add(light);
        // scene.add(new THREE.AmbientLight("#404040"));

        // // Plane geometry, material, and mesh
        // let geometry = new THREE.PlaneBufferGeometry(100, 100, 32);
        // let tex = loader.load("media/outlined_cube.png");
        // tex.wrapS = THREE.RepeatWrapping;
        // tex.wrapT = THREE.RepeatWrapping;
        // tex.repeat.set(100, 100);
        // let material = new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide });
        // let plane = new THREE.Mesh(geometry, material);
        // scene.add(plane);

        // // Dragon
        // let dragonGeometry = new THREE.SphereGeometry(0.5, 32, 32);
        // let dragon = new THREE.Mesh(dragonGeometry, new THREE.MeshLambertMaterial({ color: "#f56e90" }));
        // let dragonDir = new THREE.ArrowHelper(new THREE.Vector3(-1, 0, 0), new THREE.Vector3(0, 0, 0), 1, "#ff0000", 0.5, 0.2);
        // dragon.add(dragonDir);
        // geometry = new THREE.PlaneBufferGeometry(1, 1, 32);
        // tex = loader.load("media/y-cue.png");
        // material = new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide });
        // let zCuePlane = new THREE.Mesh(new THREE.PlaneBufferGeometry(1, 1, 32), new THREE.MeshBasicMaterial({ color: "#686868", transparent: true, opacity: 0.8, side: THREE.DoubleSide }));
        // scene.add(zCuePlane);
        // scene.add(dragon);

        // // Position the shadow underneath the dragon
        // let positionZCue = () => {
        //     // Find nearest filled cell below dragon
        //     // Use dragon.position (instead of this.state.dragon_pos), so zOffset is correct when animating
        //     // Use Math.floor to compensate for dragonOffset
        //     let zOffset = dragon.position.z;
        //     let vec = new THREE.Vector3();
        //     for (let z = Math.floor(dragon.position.z); z >= 0; z--) {
        //         if (mapHasVector3(this.state.world.cube_map, vec.set(Math.floor(dragon.position.x), Math.floor(dragon.position.y), z))) {
        //             zOffset -= z + (dragonOffset.z - cubeOffset.z);
        //             zCuePlane.position.copy(dragon.position);
        //             zCuePlane.translateZ(-zOffset + 0.1); // offset a bit to avoid z-fighting
        //             return;
        //         }
        //     }
        //     // position when there's no cube below
        //     zCuePlane.position.copy(dragon.position);
        //     zCuePlane.translateZ(-zOffset + 0.1); // offset a bit to avoid z-fighting
        // }

        // // Skybox
        // let path = "media/skybox/";
        // let format = ".jpg";
        // // It's not clear to me three js does what it says it does with the six images, but I've got everything lining
        // // up via trial and error
        // let texes = [path + "px" + format, path + "nx" + format,
        // path + "py" + format, path + "ny" + format,
        // path + "pz" + format, path + "nz" + format];
        // let cubeLoader = new THREE.CubeTextureLoader();
        // scene.background = cubeLoader.load(texes);

        // // Create new clock for animation
        // let clockStuff: ClockParameter = {
        //     clock: new THREE.Clock(),
        //     time: 0
        // }

        // let goalPositions: GoalPositions = {
        //     dragPos: this.state.world.dragon_pos.add(dragonOffset),
        //     dragDir: dragonDir,
        //     dragOffset: dragonOffset,
        //     cubeOffset: cubeOffset
        // }
        // // let animClock = new THREE.Clock();
        // let time = 0; // Time starts at 0, will increase every iteration through the animation section

        // This animates the scene. In the animate function, the scene and camera are rendered
        let animate = () => {
            requestAnimationFrame(animate);

            // let z = this.constantValues.WOBBLE_MAGNITUDE * Math.sin(this.clockStuff.clock.elapsedTime * 4 * Math.PI / this.constantValues.WOBBLE_PERIOD);
            // let y = this.constantValues.WOBBLE_MAGNITUDE * Math.cos(this.clockStuff.clock.elapsedTime * 2 * Math.PI / this.constantValues.WOBBLE_PERIOD);
            // let v = new THREE.Vector3(0, y, z);
            // let tDelta = this.clockStuff.clock.getDelta();

            // Animation :)
            console.log("4");
            this.simulate();
            // Update world state

            if (this.state.world.dirty) {
                //console.log("DIRTY = True");
                this.updateDisplay();
            }
        };
        animate();

    }
    render() {
        return (
            <div id="three-js" ref={this.divRef} />
        );
    }
}

