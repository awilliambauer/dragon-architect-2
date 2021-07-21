// Overview: This file contains code that displays the dragon and cubes

import { CONTROLS_IF_ELSE_TITLE_ELSE } from 'blockly/msg/en';
import { SSL_OP_COOKIE_EXCHANGE } from 'constants';
import { stringify } from 'querystring';
import React, { useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import * as THREE from 'three';
import { Material, Scene } from 'three';
import PuzzleState, { GoalInfo, GoalInfoType } from './PuzzleState';
import { IncrementalSimulator, SimulatorState } from './Simulator';
import { mapHasVector3 } from './Util';
import WorldState from './WorldState';

// This is the state for the entire program
// It's passed in from the App file with world and simulator objects
type DisplayProps = {
    world: WorldState,
    simulator: IncrementalSimulator,
    puzzle?: PuzzleState
}

// All constant variables
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
    targetCubes: Map<string, THREE.Mesh[]>,
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
    oldCamQ: THREE.Quaternion;
    renderer: THREE.WebGLRenderer;
    //renderer.setSize(window.innerWidth / 2, window.innerHeight / 2); // Makes renderer half the size of the window
}

// This type holds information about the clock (which is used for animation)
type ClockStuff = {
    // Defines clock (used for animation), final bot position/quaternion (rotation direction)
    clock: THREE.Clock;
    oldTime: number;
    time: number
}

// This type holds the dragon's final position and quaternion
type FinalValues = {
    finalDragPos: THREE.Vector3;
    finalDragQ: THREE.Quaternion,
}

// This type holds information about the geometries of the cubes, light, plane, and dragon
type Geometries = {
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
    dragonNose: THREE.ArrowHelper, // This is the "nose" on the dragon that points to where it's going
    geometry: THREE.PlaneBufferGeometry,
    material: THREE.MeshBasicMaterial,
    zCuePlane: THREE.Mesh
}

// This type holds information about the dragon's animation
type DragonAnimation = {
    animStatus: Animation,
    waitTime: number,
    animTime: number,
    transitionTime: number
}

// This type holds the available and filled optimization maps
type OptimizationMaps = {
    available: Map<string, THREE.Mesh[]>,
    filled: Map<THREE.Vector3, boolean>
}

// This enum represents what stage the animation is at (waiting, animating, done, null)
enum Animation {
    waiting = "waiting",
    animating = "animating",
    done = "done",
    null = "null"
}

// The Display.tsx function that does everything
export default class Display extends React.Component<DisplayProps> {
    divRef: React.RefObject<HTMLDivElement>;
    constantValues: Constants;
    mainStuff: Main;
    cameraPos: CameraPos;
    clockStuff: ClockStuff;
    geometries: Geometries;
    dragAnimation: DragonAnimation;
    finalValues: FinalValues;
    cubeOptMaps: OptimizationMaps;
    targetOptMaps: OptimizationMaps;
    puzzleInit: boolean;

    // The constructor sets up universal variables that hold types (which include "smaller" variables)
    constructor(props: DisplayProps) {
        super(props);
        this.constantValues = {
            WOBBLE_PERIOD: 4,
            WOBBLE_MAGNITUDE: 0.05,
            TRANSLATION_SMOOTHNESS: 1.5, // The relative speed at which the camera will catch up.
            ROTATION_SMOOTHNESS: 5.0, // The relative speed at which the camera will catch up.
            MAX_ANIMATION_TIME: 0.2, // if animation would take longer than this, take this time and then just sit idle
            MIN_ANIMATION_TIME: 0.1, // if animation would take less than this, just don't Dragher animating anything
            cubeColors: ["#1ca84f", "#a870b7", "#ff1a6d", "#00bcf4", "#ffc911", "#ff6e3d", "#000000", "#ffffff"],
            loader: new THREE.TextureLoader(),
            cubes: new Map<string, THREE.Mesh[]>(),
            targetCubes: new Map<string, THREE.Mesh[]>(),
            cubeMats: []
        }
        // This is the texture of the cubes
        let cubeTexture = this.constantValues.loader.load("media/canvas_cube.png");
        // For loop to create the meshes of each cube
        this.constantValues.cubeColors.forEach((color: string) => {
            this.constantValues.cubeMats.push(new THREE.MeshLambertMaterial({ color: color, map: cubeTexture }));
            this.constantValues.cubes.set(color, []);
        });

        this.constantValues.targetCubes.set("targetColor", []);

        this.cameraPos = {
            // Camera positioning
            relativeCamPos: new THREE.Vector3(-15, 0, 12),
            // Offsets are needed to make dragon appear above the placement of the cubes, and to appear in the center of the plane
            dragonOffset: new THREE.Vector3(0.5, 0.5, 1.5), // How much the dragon is offSet from center of position
            cubeOffset: new THREE.Vector3(0.5, 0.5, 0.5) // How much cubes are offset from center of position
        }

        // Main stuff
        this.mainStuff = {
            scene: new THREE.Scene(),
            camera: new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1500),
            oldCamQ: new THREE.Quaternion(),
            renderer: new THREE.WebGLRenderer({ antialias: true }),
        }
        this.mainStuff.renderer.setSize(window.innerWidth / 2, window.innerHeight / 2) // Makes renderer half the size of the window

        // Camera: initial values
        this.mainStuff.camera.position.copy(this.cameraPos.relativeCamPos);
        this.mainStuff.camera.lookAt(new THREE.Vector3(0, 0, 0));
        this.mainStuff.camera.up.set(0, 0, 1);
        this.mainStuff.camera.aspect = window.innerWidth / window.innerHeight;
        this.mainStuff.camera.updateProjectionMatrix();

        // Defines clock (used for animation), final Drag position/quaternion (rotation direction)
        this.clockStuff = {
            clock: new THREE.Clock(),
            oldTime: 0,
            time: 0
        }

        // Initializes values for final position and quaternion of dragon
        this.finalValues = {
            finalDragPos: new THREE.Vector3(),
            finalDragQ: new THREE.Quaternion()
        }

        // Initializes values for geometries and lights
        this.geometries = {
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
            dragonNose: new THREE.ArrowHelper(new THREE.Vector3(-1, 0, 0), new THREE.Vector3(0, 0, 0), 1, "#ff0000", 0.5, 0.2),
            geometry: new THREE.PlaneBufferGeometry(1, 1, 32),
            material: new THREE.MeshBasicMaterial(),
            zCuePlane: new THREE.Mesh(new THREE.PlaneBufferGeometry(1, 1, 32), new THREE.MeshBasicMaterial({ color: "#686868", transparent: true, opacity: 0.8, side: THREE.DoubleSide }))
        }

        // Set the dragon's starting position and nose position
        let startingPos = this.props.world.dragon_pos.add(this.cameraPos.dragonOffset);
        this.geometries.dragon.position.copy(startingPos);
        this.geometries.dragonNose.setDirection(this.props.world.dragon_dir);

        // Set starting values for the dragon's animation
        this.dragAnimation = {
            animStatus: Animation.null, // Indicates which stage of animation the dragon is at
            waitTime: 0, // Determined later, makes the dragon wait between movements
            animTime: 0, // Also determined later, this contains how fast the dragon animated
            transitionTime: .4 // This is where you change how fast the dragon is moving
        }

        this.cubeOptMaps = {
            available: new Map<string, THREE.Mesh[]>(),
            filled: new Map<THREE.Vector3, boolean>()
        }

        this.targetOptMaps = {
            available: new Map<string, THREE.Mesh[]>(),
            filled: new Map<THREE.Vector3, boolean>()
        }

        this.puzzleInit = false;

        // light.position.set(0.32,0.77,-0.56), // rotating 0,0,-1 by 50 about x then 330 about y
        this.geometries.light.position.set(-0.56, -0.32, 0.77);
        this.mainStuff.scene.add(this.geometries.light);
        this.mainStuff.scene.add(new THREE.AmbientLight("#404040"));

        let planeTexture = this.constantValues.loader.load("media/outlined_cube.png");
        planeTexture.wrapS = THREE.RepeatWrapping;
        planeTexture.wrapT = THREE.RepeatWrapping;
        planeTexture.repeat.set(100, 100);
        this.geometries.planeMaterial.setValues({ map: planeTexture, side: THREE.DoubleSide });
        this.geometries.plane = new THREE.Mesh(this.geometries.planeGeometry, this.geometries.planeMaterial);
        this.mainStuff.scene.add(this.geometries.plane);

        this.geometries.dragon.add(this.geometries.dragonNose);
        // texture: constantValues.loader.load("media/y-cue.png");
        this.mainStuff.scene.add(this.geometries.zCuePlane);
        this.mainStuff.scene.add(this.geometries.dragon);

        // Skybox
        let path = "media/skybox/";
        let format = ".jpg";
        // It's not clear to me three js does what it says it does with the six images, but I've got everything lining
        // up via trial and error
        let backgroundTexture = [path + "px" + format, path + "nx" + format,
        path + "py" + format, path + "ny" + format,
        path + "pz" + format, path + "nz" + format];
        let cubeLoader = new THREE.CubeTextureLoader();
        this.mainStuff.scene.background = cubeLoader.load(backgroundTexture);

        // Craete divRed
        this.divRef = React.createRef();
    }

    // Position the shadow underneath the dragon
    positionZCue() {
        // Find nearest filled cell below dragon
        // Use dragon.position (instead of this.props.dragon_pos), so zOffset is correct when animating
        // Use Math.floor to compensate for dragonOffset
        let zOffset = this.geometries.dragon.position.z;
        let vec = new THREE.Vector3();
        for (let z = Math.floor(this.geometries.dragon.position.z); z >= 0; z--) {
            if (mapHasVector3(this.props.world.cube_map, vec.set(Math.floor(this.geometries.dragon.position.x), Math.floor(this.geometries.dragon.position.y), z))) {
                zOffset -= z + (this.cameraPos.dragonOffset.z - this.cameraPos.cubeOffset.z);
                this.geometries.zCuePlane.position.copy(this.geometries.dragon.position);
                this.geometries.zCuePlane.translateZ(-zOffset + 0.1); // offset a bit to avoid z-fighting
                return;
            }
        }
        // position when there's no cube below
        this.geometries.zCuePlane.position.copy(this.geometries.dragon.position);
        this.geometries.zCuePlane.translateZ(-zOffset + 0.1); // offset a bit to avoid z-fighting
    };

    // Remove cube
    removeCube(optMaps: OptimizationMaps, cube: THREE.Mesh<THREE.BufferGeometry>, color: string) {
        if (!mapHasVector3(this.props.world.cube_map, cube.position)) { // If the cube doesn't have a position property
            this.mainStuff.scene.remove(cube); // Remove from scene
            optMaps.available.get(color)!.push(cube);
        } else { // If the cube has a position property
            optMaps.filled.set(cube.position, true); // Set the filled object at that cube object to true
        }
    }

    // Add cube
    addCube(optMaps: OptimizationMaps, cubePosition: THREE.Vector3, typeOfCube: Map<string, THREE.Mesh[]>, color: string, material: THREE.MeshLambertMaterial) {
        if (!mapHasVector3(optMaps.filled, cubePosition)) { // If this cube position does not exist (is undefined) in filled
            let existing_cube = optMaps.available.get(color)?.pop(); // Remove the last cube mesh from available list
            if (existing_cube) { // If there is a cube available....
                existing_cube.position.copy(cubePosition).add(this.cameraPos.cubeOffset); // ...Give it the position of the current cube
                this.mainStuff.scene.add(existing_cube);
            } else { // If there isn't a cube mesh available....
                let new_cube: THREE.Mesh = new THREE.Mesh(this.geometries.cubeGeo, material) // ...Create a new cube mesh
                new_cube.position.copy(cubePosition).add(this.cameraPos.cubeOffset);
                typeOfCube.get(color)!.push(new_cube);
                optMaps.filled.set(new_cube.position, true);
                this.mainStuff.scene.add(new_cube);
            }
        }
    }

    // Simulate function
    // This function will activate the simulation every X seconds
    simulate(delta: number) {
        // Checks to see if the simulator is running (if there are still animations left to do)
        if (this.props.simulator.is_running()) {
            this.clockStuff.time += delta; // Add delta to time variable (total time between each time entering second if statement below)
            if (this.clockStuff.time > this.dragAnimation.transitionTime) { // If the total time is greater than the time you want...
                this.props.simulator.execute_to_command(); // The command is executed
                this.clockStuff.time = 0; // Reset time to 0
            }
        }
    }

    // This function will update the display (what you see on the screen) using the this.dirty flag
    updateDisplay() {
        // Dragon final position and animation times
        this.finalValues.finalDragPos.copy(this.props.world.dragon_pos).add(this.cameraPos.dragonOffset);
        this.finalValues.finalDragQ.setFromUnitVectors(new THREE.Vector3(1, 0, 0), this.props.world.dragon_dir); // 1,0,0 is default direction
        // hack to avoid weird dip when rotating to face -x direction
        if (this.props.world.dragon_dir.x === -1) {
            this.finalValues.finalDragQ.set(0, 0, 1, 0);
        }

        // waitTime is determined by taking 10% of the transitionTime
        // animTime is determined by taking the other 90% of the transitionTime (or the maximum animation time if that value is too big)
        this.dragAnimation.waitTime = this.dragAnimation.transitionTime*0.1;
        this.dragAnimation.animTime = Math.min(this.dragAnimation.transitionTime*0.9, this.constantValues.MAX_ANIMATION_TIME);
        this.dragAnimation.animStatus = Animation.waiting;
        if (this.dragAnimation.animTime < this.constantValues.MIN_ANIMATION_TIME) { // If animTime is lower than min animTime...
            this.dragAnimation.animStatus = Animation.animating; // ...set Animation enum to animating
        }

        // Placing puzzle cubes!
        if (this.props.puzzle && !this.puzzleInit) { // If the state has a puzzle and it hasn't been initielized yet
            this.props.puzzle.goals.forEach((goal: GoalInfo) => { // Iterate through each cube that should be placed for the puzzle
                if (goal.kind === GoalInfoType.AddCube) { // If goal.kind is AddCube...
                    if (goal.position) { //  And if there is a goal.position...
                        this.addCube(this.targetOptMaps, goal.position, this.constantValues.targetCubes, "targetColor", this.geometries.cubeTargetMat); // Use addCube()
                    }
                }
            });
            this.puzzleInit = true; // Set puzzleInit to true to show that puzzle cubes have been placed
        } else if (!this.props.puzzle && this.puzzleInit){ // If there is no longer a puzzle in the state but the puzzle has been initialized
            this.targetOptMaps.filled.forEach((filled: boolean, position: THREE.Vector3) => { // For each cube.position in the targetFilled map
                let targetCube = new THREE.Mesh(this.geometries.targetGeo, this.geometries.cubeTargetMat);
                targetCube.position.copy(position);
                this.removeCube(this.targetOptMaps, targetCube, "targetColor"); // Remove the puzzle cube from the map
            });
        }

        // This for loop checks for cubes that are no longer in the cube_map and should be removed
        this.constantValues.cubeColors.forEach((color: string) => { // Iterate over each color
            this.cubeOptMaps.available.set(color, []); // Set each color in available map to an empty array
            this.constantValues.cubes.get(color)!.forEach((cube) => { // For each cube (mesh with material and position) in the specified color
                this.removeCube(this.cubeOptMaps, cube, color);
            });
        });

        // Loop over all cubes in cube map
        // This loop will add a cube to the display if the cube doesn't have a position
        for (let [cubePosition, colorInd] of this.props.world.cube_map) {
            let color: string = this.constantValues.cubeColors[colorInd];
            this.addCube(this.cubeOptMaps, cubePosition, this.constantValues.cubes, color, this.constantValues.cubeMats[this.constantValues.cubeColors.indexOf(color)]);
        }
        // After display is updated, the world state is no longer dirty
        this.props.world.mark_clean();
    }

    // Function that displays things after program "did mount"
    componentDidMount() {

        // Without this, the image doesn't show
        this.divRef.current?.appendChild(this.mainStuff.renderer.domElement);

        // This animates the scene. In the animate function, the scene and camera are rendered
        let animate = () => {
            requestAnimationFrame(animate);
            // tDelta represents the time that has passed since the last time getDelta() was called
            let tDelta = this.clockStuff.clock.getDelta();

            // Animation :)
            this.simulate(tDelta);

            // Update display
            if (this.props.world.dirty) {
                this.updateDisplay();
            };

            // Smoothen out the dragon
            // Draws the dragon's end position along with the arrowhelper
            // THIS IS WHERE WE MAKE THE ANIMATION SMOOTHER. LOOK AT OLD CODE!!!
            // this.geometries.dragon.position.copy(this.props.world.dragon_pos).add(this.cameraPos.dragonOffset);
            // this.geometries.dragonNose.setDirection(this.props.world.dragon_dir);
            // zCuePlane.position.set(this.props.world.dragon_pos.x, this.props.world.dragon_pos.y, 0);
            this.positionZCue();

            let z = this.constantValues.WOBBLE_MAGNITUDE * Math.sin(this.clockStuff.clock.elapsedTime * 4 * Math.PI / this.constantValues.WOBBLE_PERIOD);
            let y = this.constantValues.WOBBLE_MAGNITUDE * Math.cos(this.clockStuff.clock.elapsedTime * 2 * Math.PI / this.constantValues.WOBBLE_PERIOD);
            let v = new THREE.Vector3(0, y, z);

            // Smoothens out the dragon's movement and animation
            if (this.dragAnimation.animStatus === Animation.waiting) {
                this.dragAnimation.waitTime -= tDelta;
                if (this.dragAnimation.waitTime <= 0) {
                    tDelta += this.dragAnimation.waitTime; // wait time is negative, carry over into animating
                    this.dragAnimation.animStatus = Animation.animating;
                }
            }
            if (this.dragAnimation.animStatus === Animation.animating) {
                this.geometries.dragon.position.lerp(this.finalValues.finalDragPos, Math.min(tDelta / this.dragAnimation.animTime, 1));
                this.geometries.dragon.quaternion.slerp(this.finalValues.finalDragQ, Math.min(tDelta / this.dragAnimation.animTime, 1));
                this.dragAnimation.animTime -= tDelta;
                if (this.dragAnimation.animTime <= 0) {
                    this.geometries.dragon.position.copy(this.finalValues.finalDragPos);
                    this.geometries.dragon.quaternion.copy(this.finalValues.finalDragQ);
                    this.dragAnimation.animStatus = Animation.done;
                }
            }

            // Smoothly move the camera towards its position relative to the dragon
            let newCamPos = v.add(this.cameraPos.relativeCamPos).add(this.geometries.dragon.position);
            this.mainStuff.camera.position.lerp(newCamPos, this.constantValues.TRANSLATION_SMOOTHNESS * tDelta);

            // Smoothly rotate the camera to look at the dragon
            this.mainStuff.camera.lookAt(this.geometries.dragon.position);
            let newCamQ = this.mainStuff.camera.quaternion.clone();
            let oldCamQ = this.mainStuff.camera.quaternion.clone();
            this.mainStuff.camera.quaternion.copy(oldCamQ);
            this.mainStuff.camera.quaternion.slerp(newCamQ, this.constantValues.ROTATION_SMOOTHNESS * tDelta);

            this.mainStuff.renderer.render(this.mainStuff.scene, this.mainStuff.camera);
        };
        animate();
    }

    render() {
        return (
            <div id="three-js" ref={this.divRef} />
        );
    }
}