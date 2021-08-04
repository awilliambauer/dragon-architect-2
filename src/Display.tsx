// Overview: This file contains code that displays the dragon and cubes
import React, { ButtonHTMLAttributes, ChangeEvent, DetailedHTMLProps } from 'react';
import * as THREE from 'three';
import { GameState } from './App';
import { Material } from 'three';
import { GoalInfo, GoalInfoType } from './PuzzleState';
import { mapHasVector3 } from './Util';
import Blockly from 'blockly';
import Slider from './Slider';
import { CameraZoomIn, CameraZoomOut, CameraRotateRight, CameraRotateLeft, CameraTiltDown, CameraTiltUp } from './CameraPositioning';

// All constant variables
type Constants = {
    WOBBLE_PERIOD: number,
    WOBBLE_MAGNITUDE: number,
    TRANSLATION_SMOOTHNESS: number, // relative speed at which the camera will catch up.
    ROTATION_SMOOTHNESS: number, // The relative speed at which the camera will catch up.
    MAX_ANIMATION_TIME: number, // if animation would take longer than this, take this time and then just sit idle
    MIN_ANIMATION_TIME: number, // if animation would take less than this, just don't bother animating anything
    loader: THREE.TextureLoader, // Allows us to load in textures (plane, cubes, etc.)
}

// Maps and arrays that contain information about cubes, goalCubes, colors, and materials
type StorageMaps = {
    cubeColors: string[], // These are all the possible colors of the cubes placed by the dragon
    cubes: Map<string, THREE.Mesh[]>, // Map that holds all placed cubes categorized by color
    goalCubes: Map<string, THREE.Mesh[]>, // Map that holds all placed goal cubes (or puzzle cubes) categorized by color
    cubeMats: Map<string, THREE.MeshLambertMaterial>, // List containing the materials of each cube "in order" of color
}

// All variables that store information about the camera
type CameraPos = {
    relativeCamPos: THREE.Vector3,
    // Offsets are needed to make dragon appear above the placement of the cubes, and to appear in the center of the plane
    dragonOffset: THREE.Vector3, // How much the dragon is offSet from center of position
    cubeOffset: THREE.Vector3, // How much cubes are offset from center of position
    relativeCamPosMag: number,
    upVector: THREE.Vector3
}

// The camera, scene, and renderer variables
type Main = {
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    oldCamQ: THREE.Quaternion,
    renderer: THREE.WebGLRenderer
}

// This type holds information about the clock (which is used for animation)
type ClockStuff = {
    clock: THREE.Clock,
    time: number
}

// This type holds the dragon's final position and quaternion
type FinalValues = {
    finalDragPos: THREE.Vector3,
    finalDragQ: THREE.Quaternion,
}

// This type holds information about the geometries of the cubes, light, plane, and dragon
type Geometries = {
    // Cube geometry, materials, and mesh
    cubeGeo: THREE.BoxGeometry,
    goalGeo: THREE.BoxGeometry,
    cubeGoalMat: THREE.MeshLambertMaterial,
    dragonGoalMat: THREE.MeshLambertMaterial,
    goalShadow: THREE.Mesh,

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

    // zCue plane (indicates which square the dragon is on if its z-value is higher than 0)
    zCuePlane: THREE.Mesh
}

// This type holds information about the dragon's animation
type DragonAnimation = {
    animStatus: Animation,
    waitTime: number,
    animTime: number,
    animPerSec: number
}

// This type holds the available and filled optimization maps
type OptimizationMaps = {
    available: Map<string, THREE.Mesh[]>, // Map that contains all cubes that don't currently have positions
    filled: Map<THREE.Vector3, THREE.Mesh>// Map that contains all positions on the display that are currently filled
}

// This enum represents what stage the animation is at (waiting, animating, done, null) and is used by the animStatus variable
enum Animation {
    waiting = "waiting",
    animating = "animating",
    done = "done",
    null = "null"
}

// The Display.tsx function that does everything
export default class Display extends React.Component<GameState> {
    divRef: React.RefObject<HTMLDivElement>;
    // Initialize all types + enums in constructor
    constantValues: Constants;
    storageMaps: StorageMaps;
    mainStuff: Main;
    cameraPos: CameraPos;
    clockStuff: ClockStuff;
    geometries: Geometries;
    dragAnimation: DragonAnimation;
    finalValues: FinalValues;
    cubeOptMaps: OptimizationMaps;
    goalOptMaps: OptimizationMaps;
    puzzleInit: string;

    // Constructor method!
    constructor(props: GameState) {
        super(props);
        this.constantValues = {
            WOBBLE_PERIOD: 4,
            WOBBLE_MAGNITUDE: 0.05,
            TRANSLATION_SMOOTHNESS: 1.5,
            ROTATION_SMOOTHNESS: 5.0,
            MAX_ANIMATION_TIME: .4,
            MIN_ANIMATION_TIME: 0.1,
            loader: new THREE.TextureLoader(),
        }

        this.storageMaps = {
            cubeColors: Blockly.FieldColour.COLOURS,
            cubes: new Map<string, THREE.Mesh[]>(),
            goalCubes: new Map<string, THREE.Mesh[]>(),
            cubeMats: new Map<string, THREE.MeshLambertMaterial>()
        }

        this.cameraPos = {
            // Camera positioning
            relativeCamPos: new THREE.Vector3(-15, 0, 12),
            // Offsets are needed to make dragon appear above the placement of the cubes, and to appear in the center of the plane
            dragonOffset: new THREE.Vector3(0.5, 0.5, 1.5), // How much the dragon is offSet from center of position
            cubeOffset: new THREE.Vector3(0.5, 0.5, 0.5), // How much cubes are offset from center of position
            relativeCamPosMag: 0,
            upVector: new THREE.Vector3(0, 0, 1)
        }

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

        // Defines clock (used for animation) and sets time to 0
        this.clockStuff = {
            clock: new THREE.Clock(),
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
            goalGeo: new THREE.BoxGeometry(1.1, 1.1, 1.1),
            cubeGoalMat: new THREE.MeshLambertMaterial({ color: "#4078E6", transparent: true, opacity: 0.5 }),
            dragonGoalMat: new THREE.MeshLambertMaterial({ color: "#df67be", transparent: true, opacity: 0.5 }),
            goalShadow: new THREE.Mesh(new THREE.PlaneBufferGeometry(1, 1, 32),
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
            dragonNose: new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 0), 1, "#ff0000", 0.5, 0.2),
            geometry: new THREE.PlaneBufferGeometry(1, 1, 32),

            // zCue plane
            zCuePlane: new THREE.Mesh(new THREE.PlaneBufferGeometry(1, 1, 32), new THREE.MeshBasicMaterial({ color: "#686868", transparent: true, opacity: 0.8, side: THREE.DoubleSide }))
        }

        // Set the dragon's starting position and nose position from the world props
        this.geometries.dragon.position.copy(this.props.world.dragon_pos).add(this.cameraPos.dragonOffset);

        // Set starting values for the dragon's animation
        this.dragAnimation = {
            animStatus: Animation.null,
            waitTime: 0,
            animTime: 0,
            animPerSec: .4
        }

        // OptimizationMaps for cubes that the dragon places
        this.cubeOptMaps = {
            available: new Map<string, THREE.Mesh[]>(),
            filled: new Map<THREE.Vector3, THREE.Mesh>()
        }

        // OptimizationMaps for goal cubes defined by puzzleState
        this.goalOptMaps = {
            available: new Map<string, THREE.Mesh[]>(),
            filled: new Map<THREE.Vector3, THREE.Mesh>()
        }

        // This is the texture of the cubes that are placed by the dragon
        let cubeTexture = this.constantValues.loader.load("media/canvas_cube.png");

        // For loop to create the meshes of each cube and store them in cubeMats (array) and cubes (map)
        this.storageMaps.cubeColors.forEach((color: string) => {
            this.storageMaps.cubeMats.set(color, new THREE.MeshLambertMaterial({ color: color, map: cubeTexture }));
            this.storageMaps.cubes.set(color, []);
        });

        // Sets the goal cubes map. Will contain all goal cubes in the game, like the "cubes" variable (map)
        this.storageMaps.goalCubes.set(`#${this.geometries.cubeGoalMat.color.getHexString()}`, []);
        this.storageMaps.goalCubes.set(`#${this.geometries.dragonGoalMat.color.getHexString()}`, []);

        // Set puzzle initialization = false. This means that a puzzle has not been drawn on the display
        this.puzzleInit = "";

        this.cameraPos.relativeCamPosMag = this.cameraPos.relativeCamPos.length() - 0.5;

        // Setting up light
        this.geometries.light.position.set(-0.56, -0.32, 0.77);
        this.mainStuff.scene.add(this.geometries.light);
        this.mainStuff.scene.add(new THREE.AmbientLight("#404040"));

        // Setting up plane texture
        let planeTexture = this.constantValues.loader.load("media/grass_texture.png");
        planeTexture.wrapS = THREE.RepeatWrapping;
        planeTexture.wrapT = THREE.RepeatWrapping;
        planeTexture.repeat.set(100, 100);
        this.geometries.planeMaterial.setValues({ map: planeTexture, side: THREE.DoubleSide });
        this.geometries.plane = new THREE.Mesh(this.geometries.planeGeometry, this.geometries.planeMaterial);
        this.mainStuff.scene.add(this.geometries.plane);

        // Adding dragon, dragon nose, and zCuePlane to scene
        this.geometries.dragon.add(this.geometries.dragonNose);
        this.mainStuff.scene.add(this.geometries.dragon);
        this.mainStuff.scene.add(this.geometries.zCuePlane);

        // Skybox + background texture
        let path = "media/skybox/";
        let format = ".jpg";
        // It's not clear to me three js does what it says it does with the six images, but I've got everything lining
        // up via trial and error
        let backgroundTexture = [path + "px" + format, path + "nx" + format,
        path + "py" + format, path + "ny" + format,
        path + "pz" + format, path + "nz" + format];
        let cubeLoader = new THREE.CubeTextureLoader();
        this.mainStuff.scene.background = cubeLoader.load(backgroundTexture);

        // Initialize available maps for cubes, goal cubes, and dragon goal cubes
        this.storageMaps.cubeColors.forEach((color: string) => {
            this.cubeOptMaps.available.set(color, []); // Set each color in available map to an empty array
        });
        this.goalOptMaps.available.set(`#${this.geometries.cubeGoalMat.color.getHexString()}`, []);
        this.goalOptMaps.available.set(`#${this.geometries.dragonGoalMat.color.getHexString()}`, []);

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
        // Position when there's no cube below
        this.geometries.zCuePlane.position.copy(this.geometries.dragon.position);
        this.geometries.zCuePlane.translateZ(-zOffset + 0.1); // offset a bit to avoid z-fighting
    };

    // Turns degrees to radians (useful for camera rotations and tilts)
    degreesToRadians(deg: number) {
        return deg / 180 * Math.PI;
    };

    // Remove cube
    removeCube(optMaps: OptimizationMaps, cube: THREE.Mesh<THREE.BufferGeometry>, color: string) {
        if (!mapHasVector3(this.props.world.cube_map, cube.position)) { // If the cube doesn't have a position property
            this.mainStuff.scene.remove(cube); // Remove from scene
            if (cube !== undefined) {
                optMaps.available.get(color)!.push(cube);
            }
        } else { // If the cube has a position property
            optMaps.filled.set(cube.position, cube); // Set the filled object at that cube object to true
        }
    }

    // Removes puzzle cube
    removePuzzleCube(optMaps: OptimizationMaps, cube: THREE.Mesh<THREE.BufferGeometry>, color: string) {
        if (!mapHasVector3(this.props.world.cube_map, cube.position)) { // If the cube doesn't have a position property
            this.mainStuff.scene.remove(cube); // Remove from scene
            if (cube !== undefined) {
                optMaps.available.get(color)!.push(cube);
            }
        } else { // If the cube has a position property
            optMaps.filled.set(cube.position, cube); // Set the filled object at that cube object to true
        }
    }

    // Add cube
    addCube(optMaps: OptimizationMaps, cubePosition: THREE.Vector3, typeOfCube: Map<string, THREE.Mesh[]>, material: THREE.MeshLambertMaterial) {
        if (!mapHasVector3(optMaps.filled, cubePosition)) { // If this cube position does not exist (is undefined) in filled
            let existingCube = optMaps.available.get(`#${material.color.getHexString()}`)?.pop(); // Remove the last cube mesh from available list
            if (existingCube) { // If there is a cube available....
                existingCube.position.copy(cubePosition).add(this.cameraPos.cubeOffset); // ...Give it the position of the current cube
                this.mainStuff.scene.add(existingCube);
            } else { // If there isn't a cube mesh available....
                let newCube: THREE.Mesh = new THREE.Mesh(this.geometries.cubeGeo, material) // ...Create a new cube mesh
                newCube.position.copy(cubePosition).add(this.cameraPos.cubeOffset);
                typeOfCube.get(`#${material.color.getHexString()}`)!.push(newCube);
                optMaps.filled.set(newCube.position, newCube);
                this.mainStuff.scene.add(newCube);
            }
        }
    }

    // This adds a dragon position cube (only difference is the offSet - it's 1 z-value higher for the dragon)
    addDragonCube(optMaps: OptimizationMaps, cubePosition: THREE.Vector3, typeOfCube: Map<string, THREE.Mesh[]>, material: THREE.MeshLambertMaterial) {
        if (!mapHasVector3(optMaps.filled, cubePosition)) { // If this cube position does not exist (is undefined) in filled
            let existingCube = optMaps.available.get(`#${material.color.getHexString()}`)?.pop(); // Remove the last cube mesh from available list
            if (existingCube) { // If there is a cube available....
                existingCube.position.copy(cubePosition).add(this.cameraPos.cubeOffset); // ...Give it the position of the current cube
                this.mainStuff.scene.add(existingCube);
            } else { // If there isn't a cube mesh available....
                let newCube: THREE.Mesh = new THREE.Mesh(this.geometries.cubeGeo, material) // ...Create a new cube mesh
                newCube.position.copy(cubePosition).add(this.cameraPos.dragonOffset);
                typeOfCube.get(`#${material.color.getHexString()}`)!.push(newCube);
                optMaps.filled.set(newCube.position, newCube);
                this.mainStuff.scene.add(newCube);
            }
        }
    }

    // Simulate function
    // This function will activate the simulation every X seconds
    simulate(delta: number) {
        // Checks to see if the simulator is running (if there are still animations left to do)
        if (this.props.simulator.is_running()) {
            this.clockStuff.time += delta; // Add delta to time variable (total time between each time entering second if statement below)
            if (this.clockStuff.time > this.dragAnimation.animPerSec) { // If the total time is greater than the time you want...
                this.props.simulator.execute_to_command(); // The command is executed
                this.clockStuff.time = 0; // Reset time to 0
                if (this.props.simulator.is_finished()) {
                    console.log("puzzleState defined: " + this.props.puzzle !== undefined);
                    this.props.puzzle?.check_completed(this.props);
                }
            }
        }
    }

    // This function will update the display (what you see on the screen) using the this.dirty flag
    updateDisplay() {
        // Dragon final position and animation times
        this.finalValues.finalDragPos.copy(this.props.world.dragon_pos).add(this.cameraPos.dragonOffset);
        this.finalValues.finalDragQ.setFromUnitVectors(new THREE.Vector3(1, 0, 0), this.props.world.dragon_dir); // 1,0,0 is default direction
        // Hack to avoid weird dip when rotating to face -x direction
        if (this.props.world.dragon_dir.x === -1) {
            this.finalValues.finalDragQ.set(0, 0, 1, 0);
        }

        // waitTime is determined by taking 10% of the animPerSec
        // animTime is determined by taking the other 90% of the animPerSec (or the maximum animation time if that value is too big)
        this.dragAnimation.waitTime = this.dragAnimation.animPerSec * 0.1;
        this.dragAnimation.animTime = Math.min(this.dragAnimation.animPerSec * 0.9, this.constantValues.MAX_ANIMATION_TIME);
        this.dragAnimation.animStatus = Animation.waiting;
        if (this.dragAnimation.animTime < this.constantValues.MIN_ANIMATION_TIME) { // If animTime is lower than min animTime...
            this.dragAnimation.animStatus = Animation.animating; // ...set Animation enum to animating
        }

        // Placing puzzle cubes!
        if (this.props.puzzle && this.puzzleInit !== this.props.puzzle.name) { // If the state has a puzzle and it hasn't been initielized yet

            // First remove goal cubes already placed...
            this.goalOptMaps.filled.forEach((cube: THREE.Mesh, position: THREE.Vector3) => { // For each cube.position in the targetFilled map
                this.removePuzzleCube(this.goalOptMaps, cube, `#${this.geometries.cubeGoalMat.color.getHexString()}`); // Remove the puzzle cube from the map
                this.removePuzzleCube(this.goalOptMaps, cube, `#${this.geometries.dragonGoalMat.color.getHexString()}`); // Remove dragon puzzle cubes
            });

            // ...then start adding in the goal cubes depending on goal type
            this.props.puzzle.goals.forEach((goal: GoalInfo) => { // Iterate through each cube that should be placed for the puzzle
                if (goal.kind === GoalInfoType.AddCube) { // If goal.kind is AddCube...
                    if (goal.position) { //  And if there is a goal.position...
                        this.addCube(this.goalOptMaps, goal.position, this.storageMaps.goalCubes, this.geometries.cubeGoalMat); // Use addCube()
                    }
                }
                if (goal.kind === GoalInfoType.DragonPos) {
                    if (goal.position) {
                        console.log(JSON.stringify(goal.position));
                        this.addDragonCube(this.goalOptMaps, goal.position, this.storageMaps.goalCubes, this.geometries.dragonGoalMat);
                        console.log(JSON.stringify(this.storageMaps.goalCubes));
                    }
                }
            });
            this.puzzleInit = this.props.puzzle.name; // Set puzzleInit to true to show that puzzle cubes have been placed

        }

        // This for loop checks for cubes that are no longer in the cube_map and should be removed
        this.storageMaps.cubeColors.forEach((color: string) => { // Iterate over each color
            this.storageMaps.cubes.get(color)!.forEach((cube) => { // For each cube (mesh with material and position) in the specified color
                this.removeCube(this.cubeOptMaps, cube, color);
            });
        });

        // Loop over all cubes in cube map
        // This loop will add a cube to the display if the cube doesn't have a position
        for (let [cubePosition, colorInd] of this.props.world.cube_map) {
            let color: string = this.storageMaps.cubeColors[colorInd];
            this.addCube(this.cubeOptMaps, cubePosition, this.storageMaps.cubes, this.storageMaps.cubeMats.get(color)!);
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

            this.positionZCue();

            let z = this.constantValues.WOBBLE_MAGNITUDE * Math.sin(this.clockStuff.clock.elapsedTime * 4 * Math.PI / this.constantValues.WOBBLE_PERIOD);
            let y = this.constantValues.WOBBLE_MAGNITUDE * Math.cos(this.clockStuff.clock.elapsedTime * 2 * Math.PI / this.constantValues.WOBBLE_PERIOD);
            let v = new THREE.Vector3(0, y, z);

            // Smoothens out the dragon's movement and animation
            // Waiting...
            if (this.dragAnimation.animStatus === Animation.waiting) { // If animStatus is waiting...
                this.dragAnimation.waitTime -= tDelta; // Substract time since last iteration
                if (this.dragAnimation.waitTime <= 0) { // If waitTime gets below 0...
                    tDelta += this.dragAnimation.waitTime; // Substract waitTime from tDelta
                    this.dragAnimation.animStatus = Animation.animating; // animSatus is animating!
                }
            }
            // Animating...
            if (this.dragAnimation.animStatus === Animation.animating) {
                // lerp and slerp gradually towards the dragon final position and direction
                this.geometries.dragon.position.lerp(this.finalValues.finalDragPos, Math.min(tDelta / this.dragAnimation.animTime, 1));
                this.geometries.dragon.quaternion.slerp(this.finalValues.finalDragQ, Math.min(tDelta / this.dragAnimation.animTime, 1));
                this.dragAnimation.animTime -= tDelta; // Subtract tDelta from animTime to animate on time
                if (this.dragAnimation.animTime <= 0) { // If animTime < 0...
                    this.geometries.dragon.position.copy(this.finalValues.finalDragPos); // End the animation, send dragon to final positions
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

            // Render everything
            this.mainStuff.renderer.render(this.mainStuff.scene, this.mainStuff.camera);
        };
        animate();
    }

    // This method is passed into the Slider file. Each time it's called, the animPerSec changes
    handleSlideChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        // use value from event to set animations per second
        this.dragAnimation.animPerSec = parseFloat(e.target.value);
    }

    // ZoomIn method passed to cameraPositioning file. Manipulates relativeCamPos by .8
    zoomInCamera = (e: React.MouseEvent<HTMLElement>) => {
        if (this.cameraPos.relativeCamPosMag > 5) { // Ensures that the camera doesn't zoom in too far
            this.cameraPos.relativeCamPos.multiplyScalar(.8);
            this.cameraPos.relativeCamPosMag = this.cameraPos.relativeCamPos.length() - 0.5; // Updates realtiveCamPosMag
        }
    }

    // ZoomOut method passed to cameraPositioning file. Manipulates relativeCamPos by 1.2
    zoomOutCamera = (e: React.MouseEvent<HTMLElement>) => {
        if (this.cameraPos.relativeCamPosMag < 100) { // Ensures the camera doesn't zoom out too far
            this.cameraPos.relativeCamPos.multiplyScalar(1.2);
            this.cameraPos.relativeCamPosMag = this.cameraPos.relativeCamPos.length() - 0.5; // Updates realtiveCamPosMag
        }
    }

    // RotateRight method passed into cameraPositioning
    rotateCameraRight = (e: React.MouseEvent<HTMLElement>) => {
        let q = new THREE.Quaternion();
        q.setFromAxisAngle(this.cameraPos.upVector, this.degreesToRadians(10)); // Create now quaternion based off of current dragon pos and 10 degrees
        this.cameraPos.relativeCamPos.applyQuaternion(q);
    }

    // RotateLeft method passed into cameraPositioning
    rotateCameraLeft = (e: React.MouseEvent<HTMLElement>) => {
        let q = new THREE.Quaternion();
        q.setFromAxisAngle(this.cameraPos.upVector, this.degreesToRadians(-10)); // Create now quaternion based off of current dragon pos and -10 degrees
        this.cameraPos.relativeCamPos.applyQuaternion(q);
    }

    // TiltUp method passed into cameraPositioning
    tiltCameraUp = (e: React.MouseEvent<HTMLElement>) => {
        let q = new THREE.Quaternion();
        // Sets the new quaternion to the current camPos and crosses it with the "upVector" (0, 0, 1)
        q.setFromAxisAngle(this.cameraPos.relativeCamPos.clone().cross(this.cameraPos.upVector).normalize(), this.degreesToRadians(10));
        this.cameraPos.relativeCamPos.applyQuaternion(q);
    }

    // TiltDown method passed into cameraPositioning
    tiltCameraDown = (e: React.MouseEvent<HTMLElement>) => {
        let q = new THREE.Quaternion();
        // Sets the new quaternion to the current camPos and crosses it with the "upVector" (0, 0, 1)
        q.setFromAxisAngle(this.cameraPos.relativeCamPos.clone().cross(this.cameraPos.upVector).normalize(), this.degreesToRadians(-10));
        this.cameraPos.relativeCamPos.applyQuaternion(q);
    }

    render() {
        return (
            <div id="three-js" ref={this.divRef}>
                <div id="game-controls-bar-top" className="game-controls-bar puzzleModeUI sandboxModeUI" style={{ display: "flex" }}>
                    <CameraTiltDown onClickFunction={this.tiltCameraDown} />
                    <CameraTiltUp onClickFunction={this.tiltCameraUp} />
                    <CameraRotateLeft onClickFunction={this.rotateCameraLeft} />
                    <CameraRotateRight onClickFunction={this.rotateCameraRight} />
                    <CameraZoomIn onClickFunction={this.zoomInCamera} />
                    <CameraZoomOut onClickFunction={this.zoomOutCamera} />
                    <Slider onChange={this.handleSlideChange} />
                </div>
            </div>
        );
    }
}