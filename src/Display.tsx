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

export default class Display extends React.Component<DisplayProps, DisplayState> {
    divRef: React.RefObject<HTMLDivElement>;

    constructor(props: DisplayProps) {
        super(props);
        this.divRef = React.createRef();
        this.state = {
            world: props.world,
            simulator: props.simulator
        }
    }

    // simulate function
    // This function will incorporate the simulation every X seconds
    simulate() {

    }
    // update state function
    // This function will update the state using the this.dirty flag
    updateState() {
        
    }

    // Function that displays things after program "did mount"
    componentDidMount() {
        // Animation
        let animStatus = "";
        let animTime, waitTime, finalBotPos: THREE.Vector3, finalBotQ: THREE.Quaternion;
        let dirty = false;

        // Constants
        const WOBBLE_PERIOD = 4.0;
        const WOBBLE_MAGNITUDE = 0.05;
        const TRANSLATION_SMOOTHNESS = 1.5; // The relative speed at which the camera will catch up.
        const ROTATION_SMOOTHNESS = 5.0; // The relative speed at which the camera will catch up.
        const MAX_ANIMATION_TIME = 0.2; // if animation would take longer than this, take this time and then just sit idle
        const MIN_ANIMATION_TIME = 0.1; // if animation would take less than this, just don't bother animating anything
        const cubeColors = ["#1ca84f", "#a870b7", "#ff1a6d", "#00bcf4", "#ffc911", "#ff6e3d", "#000000", "#ffffff"];
        let loader = new THREE.TextureLoader();
        // Map where each key is a color and each value is a list of meshes
        let cubes = new Map<string, THREE.Mesh[]>();
        let cubeMats: THREE.MeshLambertMaterial[] = [];
        let tex1 = loader.load("media/canvas_cube.png");
        cubeColors.forEach(function (color: string) {
            cubeMats.push(new THREE.MeshLambertMaterial({ color: color, map: tex1 }));
            cubes.set(color, []);
        });

        // Camera positioning
        let relativeCamPos = new THREE.Vector3(-15, 0, 12);
        let relativeCamPosMag = relativeCamPos.length() - 0.5; // -0.5 is an undocumented part of unity version, preserving it here
        // Offsets are needed to make dragon appear above the placement of the cubes, and to appear in the center of the plane
        let dragonOffset = new THREE.Vector3(0.5, 0.5, 1.5); // How much the dragon is offSet from center of position
        let cubeOffset = new THREE.Vector3(0.5, 0.5, 0.5); // How much cubes are offset from center of position

        // Defines the three main elements of a threejs window: scene, camera, and renderer
        let scene = new THREE.Scene();
        let camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1500);
        let renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(window.innerWidth / 2, window.innerHeight / 2); // Makes renderer half the size of the window

        // Camera: initial values
        camera.position.copy(relativeCamPos);
        camera.lookAt(new THREE.Vector3(0, 0, 0));
        camera.up.set(0, 0, 1);
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();

        // Defines clock (used for animation), final bot position/quaternion (rotation direction)
        let clock = new THREE.Clock();
        let oldTime = 0;
        finalBotPos = new THREE.Vector3();
        finalBotQ = new THREE.Quaternion();

        // Without this, the image doesn't show
        this.divRef.current?.appendChild(renderer.domElement);

        // Cube geometry, materials, and mesh
        let cubeGeo = new THREE.BoxGeometry(1, 1, 1);
        let targetGeo = new THREE.BoxGeometry(1.1, 1.1, 1.1);
        let cubeTargetMat = new THREE.MeshLambertMaterial({ color: "#4078E6", transparent: true, opacity: 0.5 });
        let dragonTarget = new THREE.Mesh(targetGeo, new THREE.MeshLambertMaterial({ color: "#df67be", transparent: true, opacity: 0.5 }));
        let targetShadow = new THREE.Mesh(new THREE.PlaneBufferGeometry(1, 1, 32),
            new THREE.MeshBasicMaterial({ color: "#686868", transparent: true, opacity: 0.31, side: THREE.DoubleSide }));

        // Light
        const light = new THREE.DirectionalLight("#ffffff", 1.74);
        // light.position.set(0.32,0.77,-0.56); // rotating 0,0,-1 by 50 about x then 330 about y
        light.position.set(-0.56, -0.32, 0.77);
        scene.add(light);
        scene.add(new THREE.AmbientLight("#404040"));

        // Plane geometry, material, and mesh
        let geometry = new THREE.PlaneBufferGeometry(100, 100, 32);
        let tex = loader.load("media/outlined_cube.png");
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(100, 100);
        let material = new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide });
        let plane = new THREE.Mesh(geometry, material);
        scene.add(plane);

        // Dragon
        let dragonGeometry = new THREE.SphereGeometry(0.5, 32, 32);
        let dragon = new THREE.Mesh(dragonGeometry, new THREE.MeshLambertMaterial({ color: "#f56e90" }));
        let dragonDir = new THREE.ArrowHelper(new THREE.Vector3(-1, 0, 0), new THREE.Vector3(0, 0, 0), 1, "#ff0000", 0.5, 0.2);
        dragon.add(dragonDir);
        geometry = new THREE.PlaneBufferGeometry(1, 1, 32);
        tex = loader.load("media/y-cue.png");
        material = new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide });
        let zCuePlane = new THREE.Mesh(new THREE.PlaneBufferGeometry(1, 1, 32), new THREE.MeshBasicMaterial({ color: "#686868", transparent: true, opacity: 0.8, side: THREE.DoubleSide }));
        scene.add(zCuePlane);
        scene.add(dragon);

        // Position the shadow underneath the dragon
        let positionZCue = () => {
            // Find nearest filled cell below dragon
            // Use dragon.position (instead of this.state.dragon_pos), so zOffset is correct when animating
            // Use Math.floor to compensate for dragonOffset
            let zOffset = dragon.position.z;
            let vec = new THREE.Vector3();
            for (let z = Math.floor(dragon.position.z); z >= 0; z--) {
                if (mapHasVector3(this.state.world.cube_map, vec.set(Math.floor(dragon.position.x), Math.floor(dragon.position.y), z))) {
                    zOffset -= z + (dragonOffset.z - cubeOffset.z);
                    zCuePlane.position.copy(dragon.position);
                    zCuePlane.translateZ(-zOffset + 0.1); // offset a bit to avoid z-fighting
                    return;
                }
            }
            // position when there's no cube below
            zCuePlane.position.copy(dragon.position);
            zCuePlane.translateZ(-zOffset + 0.1); // offset a bit to avoid z-fighting
        }

        // Skybox
        let path = "media/skybox/";
        let format = ".jpg";
        // It's not clear to me three js does what it says it does with the six images, but I've got everything lining
        // up via trial and error
        let texes = [path + "px" + format, path + "nx" + format,
        path + "py" + format, path + "ny" + format,
        path + "pz" + format, path + "nz" + format];
        let cubeLoader = new THREE.CubeTextureLoader();
        scene.background = cubeLoader.load(texes);

        // Create new clock for animation
        let animClock = new THREE.Clock();
        let time = 0; // Time starts at 0, will increase every iteration through the animation section

        // This animates the scene. In the animate function, the scene and camera are rendered
        let animate = () => {
            requestAnimationFrame(animate);

            let z = WOBBLE_MAGNITUDE * Math.sin(clock.elapsedTime * 4 * Math.PI / WOBBLE_PERIOD);
            let y = WOBBLE_MAGNITUDE * Math.cos(clock.elapsedTime * 2 * Math.PI / WOBBLE_PERIOD);
            let v = new THREE.Vector3(0, y, z);
            let tDelta = clock.getDelta();

            // Animation :)
            // Checks to see if the simulator is running (if there are still animations left to do)
            if (this.state.simulator.is_running()) {
                let delta = animClock.getDelta(); // delta represents the amount of time between each iteration
                time += delta; // Add delta to time variable (total time between each time entering second if statement below)
                let animationPerSec = .017; // This is the amount of time you want between each animation movement!
                if (time>animationPerSec) { // If the total time is greater than the time you want...
                    this.state.simulator.execute_to_command(); // The command is executed
                    time = 0; // Reset time to 0
                }
            }

            // The "available" and "filled" maps are solely for efficiency. Cubes can be reused so we don't have to keep creating them
            // A map where the keys are colors and the values are cube meshes
            // This map shows all of the available meshes, or the meshes that don't have a position
            let available = new Map<string, THREE.Mesh[]>();
            // A map whose keys are positions and values are booleans
            // Represents if a position is filled (true) or not (false)
            let filled = new Map<THREE.Vector3, boolean>();

            // This for loop checks for cubes that are no longer in the cube_map and should be removed
            cubeColors.forEach((color: string) => { // Iterate over each color
                available.set(color, []); // Set each color in available map to an empty array
                cubes.get(color)!.forEach((cube) => { // For each cube (mesh with material and position) in the specified color
                    if (!mapHasVector3(this.state.world.cube_map, cube.position)) { // If the cube doesn't have a position property
                        scene.remove(cube); // Remove from scene
                        available.get(color)!.push(cube);
                    } else { // If the cube has a position property
                        filled.set(cube.position, true); // Set the filled object at that cube object to true
                    }
                });
            });

            // Loop over all cubes in cube map
            // This loop will add a cube to the display if the cube doesn't have a position
            for (let [cubePosition, colorInd] of this.state.world.cube_map) {
                let color: string = cubeColors[colorInd];
                if (!mapHasVector3(filled, cubePosition)) { // If this cube position does not exist (is undefined) in filled
                    let existing_cube = available.get(color)?.pop(); // Remove the last cube mesh from available list
                    if (existing_cube) { // If there is a cube available....
                        existing_cube.position.copy(cubePosition).add(cubeOffset); // ...Give it the position of the current cube
                        scene.add(existing_cube);
                    } else { // If there isn't a cube mesh available....
                        let new_cube: THREE.Mesh = new THREE.Mesh(cubeGeo, cubeMats[colorInd]) // ...Create a new cube mesh
                        new_cube.position.copy(cubePosition).add(cubeOffset);
                        cubes.get(color)!.push(new_cube);
                        filled.set(new_cube.position, true);
                        scene.add(new_cube);
                    }
                }
            };

            // Draws the dragon's end position along with the arrowhelper
            dragon.position.copy(this.state.world.dragon_pos).add(dragonOffset);
            dragonDir.setDirection(this.state.world.dragon_dir);
            // zCuePlane.position.set(this.state.world.dragon_pos.x, this.state.world.dragon_pos.y, 0);
            positionZCue();

            // Smoothly move the camera towards its position relative to the dragon
            let newCamPos = v.add(relativeCamPos).add(dragon.position);
            camera.position.lerp(newCamPos, TRANSLATION_SMOOTHNESS * tDelta);

            // Smoothly rotate the camera to look at the dragon
            let oldCamQ = camera.quaternion.clone();
            camera.lookAt(dragon.position);
            let newCamQ = camera.quaternion.clone();
            camera.quaternion.copy(oldCamQ);
            camera.quaternion.slerp(newCamQ, ROTATION_SMOOTHNESS * tDelta);

            renderer.render(scene, camera);
        };
        animate();

    }
    render() {
        return (
            <div id="three-js" ref={this.divRef} />
        );
    }
}
