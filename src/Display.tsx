// Overview: This file contains code that displays the dragon and cubes

import { SSL_OP_COOKIE_EXCHANGE } from 'constants';
import { stringify } from 'querystring';
import React, { useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import * as THREE from 'three';
import { IncrementalSimulator, SimulatorState } from './Simulator';
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
        // Map where each key is a color and each value is an object. The object has a "meshes" property
        let cubes = new Map<string, THREE.Mesh[]>();
        let cubeMats: THREE.MeshLambertMaterial[] = [];
        let tex1 = loader.load("media/canvas_cube.png");
        cubeColors.forEach(function (color: string) {
            cubeMats.push(new THREE.MeshLambertMaterial({color:color, map:tex1}));
            cubes.set(color, []);
        });

        // Camera positioning
        let relativeCamPos = new THREE.Vector3(-15,0,12);
        let relativeCamPosMag = relativeCamPos.length() - 0.5; // -0.5 is an undocumented part of unity version, preserving it here
        // Offsets are needed to make robot appear above the placement of the cubes, and to appear in the center of the plane
        let robotOffset = new THREE.Vector3(0.25, 0.25, .75); // How much the robot is offSet from center of position
        let cubeOffset = new THREE.Vector3(0.5, 0.5, 0); // How much cubes are offset from center of position

        // Defines the three main elements of a threejs window: scene, camera, and renderer
        let scene = new THREE.Scene();
        let camera = new THREE.PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 0.1, 1500);
        let renderer = new THREE.WebGLRenderer();
        renderer.setSize( window.innerWidth / 2, window.innerHeight / 2 ); // Makes renderer half the size of the window

        // Camera: initial values
        camera.position.copy(relativeCamPos);
        camera.lookAt(new THREE.Vector3(0,0,0));
        camera.up.set(0,0,1);
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
        let cubeGeo  = new THREE.BoxGeometry(1, 1, 1);
        let targetGeo = new THREE.BoxGeometry(1.1, 1.1, 1.1);
        let cubeTargetMat = new THREE.MeshLambertMaterial({color:"#4078E6", transparent: true, opacity:0.5});
        let robotTarget = new THREE.Mesh(targetGeo, new THREE.MeshLambertMaterial({color:"#df67be", transparent: true, opacity:0.5}));
        let targetShadow = new THREE.Mesh(new THREE.PlaneBufferGeometry(1, 1, 32),
            new THREE.MeshBasicMaterial({color:"#686868", transparent: true, opacity: 0.31, side: THREE.DoubleSide}));

        // Light
        var light = new THREE.DirectionalLight("#ffffff", 1.74);
        // light.position.set(0.32,0.77,-0.56); // rotating 0,0,-1 by 50 about x then 330 about y
        light.position.set(-0.56,-0.32,0.77);
        scene.add(light);
        scene.add(new THREE.AmbientLight("#404040"));

        // Plane geometry, material, and mesh
        let geometry = new THREE.PlaneBufferGeometry(100, 100, 32);
        let tex = loader.load("media/outlined_cube.png");
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(100, 100);
        let material = new THREE.MeshBasicMaterial( {map: tex, side: THREE.DoubleSide} );
        let plane = new THREE.Mesh(geometry, material);
        scene.add( plane );

        // Robot
        let roboGeometry = new THREE.SphereGeometry(0.5, 32, 32);
        let robot = new THREE.Mesh(roboGeometry, new THREE.MeshLambertMaterial( {color: "#f56e90"} ));
        let robotDir = new THREE.ArrowHelper(new THREE.Vector3(-1,0,0),new THREE.Vector3(0,0,0),1,"#ff0000",0.5,0.2);
        robot.add(robotDir);
        let zLineMat = new THREE.MeshBasicMaterial( {color: 0xf2c2ce} );
        geometry = new THREE.PlaneBufferGeometry(1, 1, 32);
        tex = loader.load("media/y-cue.png");
        material = new THREE.MeshBasicMaterial( {map: tex, side: THREE.DoubleSide} );
        let zCuePlane = new THREE.Mesh(roboGeometry, material);
        scene.add(zCuePlane);
        scene.add(robot);

        // Make z-line (this is the line that travels from the base of the robot to the ground)
        // Its function is to make clear which cube the robot is currently on
        let zLine: THREE.Mesh;
        let makeZLine = () => {
            scene.remove(zLine);
            if (zLine) {
                zLine.geometry.dispose();
            }
            // Find nearest filled cell below robot
            // Use robot.position (instead of RuthefjordWorldState.robot.pos), so height is correct when animating
            // Use Math.floor to compensate for robotOffset
            let height = robot.position.z;
            for (let z = Math.floor(robot.position.z); z >= 0; z--) {
                if (this.state.world.cube_map.has(new THREE.Vector3((Math.floor(robot.position.x), Math.floor(robot.position.y), z)))) {
                    height -= z + (robotOffset.z - cubeOffset.z);
                    break;
                }
            }
            let geometry = new THREE.CylinderGeometry(0.1, 0.1, height, 32);
            zLine = new THREE.Mesh(geometry, zLineMat);
            zLine.position.copy(robot.position);
            zLine.translateZ(-height / 2);
            zLine.rotateOnAxis(new THREE.Vector3(1,0,0), Math.PI / 2);
            scene.add(zLine);
            zCuePlane.position.copy(robot.position);
            zCuePlane.translateZ(-height + 0.1); // offset a bit to avoid z-fighting
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

        // This animates the cube. In the animate function, the scene and camera are rendered
        let animate = () => {
            requestAnimationFrame( animate );

            // Animation :)
            if (this.state.simulator.is_running()) {
                this.state.simulator.execute_to_command();
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
                cubes.get(color)!.forEach( (cube) => { // For each cube (mesh with material and position) in the specified color
                    if (!this.state.world.cube_map.has(cube.position)) { // If the cube doesn't have a position property
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
                if (!filled.has(cubePosition)) { // If this cube position does not exist (is undefined) in filled
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

            // Draws the robot's end position along with the arrowhelper
            robot.position.lerp( this.state.world.dragon_pos, .5 ).add(robotOffset);
            robotDir.setDirection( this.state.world.dragon_dir );
            zCuePlane.position.lerp( new THREE.Vector3(this.state.world.dragon_pos.x, this.state.world.dragon_pos.y, 0), .5 );
            makeZLine();

            // Attach camera to robot
            camera.position.lerp(robot.position, 0.4);
            camera.lookAt( robot.position );
            camera.position.x = robot.position.x+10;
            camera.position.y = robot.position.y-2;
            camera.position.z = robot.position.z+11;

            renderer.render( scene, camera );
        };
        animate();

    }
    render() {
        return (
            <div id="three-js" ref={this.divRef} />
        );
    }
}
