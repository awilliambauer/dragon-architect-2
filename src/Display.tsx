import { SSL_OP_COOKIE_EXCHANGE } from 'constants';
import { stringify } from 'querystring';
import React, { useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import * as THREE from 'three';
import { IncrementalSimulator } from './Simulator';
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

    componentDidMount() {
        //animation
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
        // console.log("THiS IS THE OBJ: " + JSON.stringify(cubes));

        // Camera positioning
        let relativeCamPos = new THREE.Vector3(-15,0,12);
        let relativeCamPosMag = relativeCamPos.length() - 0.5; // -0.5 is an undocumented part of unity version, preserving it here
        let robotOffset = new THREE.Vector3(0.5,0.5,1.5);
        let cubeOffset = new THREE.Vector3(0.5,0.5,0.5);

        // Defines the three main elements of a threejs window: scene, camera, and renderer
        let scene = new THREE.Scene();
        let camera = new THREE.PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 0.1, 1500);
        let renderer = new THREE.WebGLRenderer();
        let clock = new THREE.Clock();
        let oldTime = 0;
        finalBotPos = new THREE.Vector3();
        finalBotQ = new THREE.Quaternion();
        // Makes renderer the same size as the window
        renderer.setSize( window.innerWidth / 2, window.innerHeight / 2 );
        // Without this, the image doesn't show
        this.divRef.current?.appendChild(renderer.domElement);

        camera.position.copy(relativeCamPos);
        camera.lookAt(new THREE.Vector3(0,0,0));
        //camera.rotateZ(270 * Math.PI / 180);
        camera.up.set(0,0,1);
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();

        // Cube geometry, materials, and mesh
        let targetGeo = new THREE.BoxGeometry(1.1, 1.1, 1.1);
        let cubeTargetMat = new THREE.MeshLambertMaterial({color:"#4078E6", transparent: true, opacity:0.5});
        let robotTarget = new THREE.Mesh(targetGeo, new THREE.MeshLambertMaterial({color:"#df67be", transparent: true, opacity:0.5}));
        let cube = new THREE.Mesh( targetGeo, cubeTargetMat );
        let targetShadow = new THREE.Mesh(new THREE.PlaneBufferGeometry(1, 1, 32),
            new THREE.MeshBasicMaterial({color:"#686868", transparent: true, opacity: 0.31, side: THREE.DoubleSide}));
        cube.translateX( 10 );
        cube.translateZ( .6 );
        robotTarget.translateX( 20 );
        robotTarget.translateY( 20 );
        robotTarget.translateZ( .6 );
        scene.add( cube, robotTarget, targetShadow );

        // Light
        var light = new THREE.DirectionalLight("#ffffff", 1.74);
        //light.position.set(0.32,0.77,-0.56); // rotating 0,0,-1 by 50 about x then 330 about y
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

        // robot
        let roboGeometry = new THREE.SphereGeometry(0.5, 32, 32);
        let robot = new THREE.Mesh(roboGeometry, new THREE.MeshLambertMaterial( {color: "#f56e90"} ));
        let robotDir = new THREE.ArrowHelper(new THREE.Vector3(-1,0,0),new THREE.Vector3(0,0,0),1,"#ff0000",0.5,0.2);
        robot.add(robotDir);
        let zLineMat = new THREE.MeshBasicMaterial( {color: 0xf2c2ce} );
        geometry = new THREE.PlaneBufferGeometry(1, 1, 32);
        tex = loader.load("media/y-cue.png");
        material = new THREE.MeshBasicMaterial( {map: tex, side: THREE.DoubleSide} );
        let zCuePlane = new THREE.Mesh(roboGeometry, material);
        robot.translateZ( .6 );
        scene.add(zCuePlane);
        scene.add(robot);

        // Camera init
        let radiansOfDegrees = (deg: number) => {
            return deg / 180 * Math.PI;
        }
        let rotateCamera = (degrees: number) => {
            let q = new THREE.Quaternion();
            q.setFromAxisAngle(UP, radiansOfDegrees(degrees));
            relativeCamPos.applyQuaternion(q);
        };
        let onWindowResize = () => {
            renderer.setSize(window.innerWidth, window.innerHeight);
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
        };
        let moveCam = (tDelta: number, tTotal: number) => {
            let z = WOBBLE_MAGNITUDE * Math.sin(tTotal * 4 * Math.PI / WOBBLE_PERIOD);
            let y = WOBBLE_MAGNITUDE * Math.cos(tTotal * 2 * Math.PI / WOBBLE_PERIOD);
            let v = new THREE.Vector3(0, y, z);

            // switch (animStatus) {
            //     case "waiting":
            //         waitTime -= tDelta;
            //         if (waitTime > 0) {
            //             break;
            //         }
            //         tDelta += waitTime; // wait time is negative, carry over into animating
            //         animStatus = "animating";
            //         // deliberate case fall-through since wait time is up if we get here
            //     case "animating":
            //         robot.position.lerp(finalBotPos, Math.min(tDelta / animTime, 1));
            //         robot.quaternion.slerp(finalBotQ, Math.min(tDelta / animTime, 1));
            //         animTime -= tDelta;
            //         if (animTime <= 0) {
            //             robot.position.copy(finalBotPos);
            //             robot.quaternion.copy(finalBotQ);
            //             animStatus = "done";
            //         }
            //         break;
            // }
            // makeZLine();

            let newCamPos = v.add(relativeCamPos).add(robot.position);
            camera.position.lerp(newCamPos, TRANSLATION_SMOOTHNESS * tDelta);

            // Couldn't figure out how to reimplement technique from Unity code
            // There's probably something better than my hack
            let oldCamQ = camera.quaternion.clone();
            camera.lookAt(robot.position);
            let newCamQ = camera.quaternion.clone();
            camera.quaternion.copy(oldCamQ);
            camera.quaternion.slerp(newCamQ, ROTATION_SMOOTHNESS * tDelta);

            renderer.render(scene, camera);
        }
        camera.position.copy(relativeCamPos);
        camera.lookAt(new THREE.Vector3(0,0,0));
        //camera.lookAt(scene.position);
        rotateCamera(-100);
        robot.position.copy(robotOffset);
        window.addEventListener( 'resize', onWindowResize, false );

        // Moves the camera up 2 so that it's not in the center of the image
        camera.position.z = 10;

        // Skybox
        let path = "media/skybox/";
        let format = ".jpg";
        // it's not clear to me three js does what it says it does with the six images, but I've got everything lining
        // up via trial and error
        let texes = [path + "px" + format, path + "nx" + format,
            path + "py" + format, path + "ny" + format,
            path + "pz" + format, path + "nz" + format];
        let cubeLoader = new THREE.CubeTextureLoader();
        scene.background = cubeLoader.load(texes);

        // This animates the cube. In the animate function, the scene and camera are rendered
        let animate = () => {
            requestAnimationFrame( animate );
            // A map where the keys are colors and the values are cube meshes
            // This map shows all of the available meshes, or the meshes that don't have a position
            let available = new Map<string, THREE.Mesh[]>();
            // A map whose keys are positions and values are booleans
            // Represents if a position is filled (true) or not (false)
            let filled = new Map<THREE.Vector3, boolean>();

            // This checks for cubes that should be removed
            cubeColors.forEach((color: string) => {
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
            // This loop will add a cube to the display if it doesn't have a position
            for (let [cubePosition, colorInd] of this.state.world.cube_map) {
                let color: string = cubeColors[colorInd];
                if (!filled.has(cubePosition)) { // If this cube position does not exist (is undefined) in filled
                    let existing_cube = available.get(color)?.pop(); // Remove the last cube mesh from available list
                    if (existing_cube) { // If there is a cube available....
                        existing_cube.position.copy(cubePosition); // ...Give it the position of the current cube
                        scene.add(existing_cube);
                    } else { // If there isn't a cube mesh available....
                        let new_cube: THREE.Mesh = new THREE.Mesh(targetGeo, cubeTargetMat) // ...Create a new cube mesh
                        new_cube.position.copy(cubePosition);
                        cubes.get(color)!.push(new_cube);
                        filled.set(new_cube.position, true);
                        scene.add(new_cube);
                    }
                }
            };
            //moveCam(dt, t);
            // Draws the robot's end position along with the arrowhelper
            robot.position.lerp( this.state.world.dragon_pos, .5 );
            robotDir.setDirection( this.state.world.dragon_dir );
            zCuePlane.position.lerp( new THREE.Vector3(this.state.world.dragon_pos.x, this.state.world.dragon_pos.y, 0), .5 );

            cube.rotation.x += .01;
            cube.rotation.y += .01;
            cube.rotation.z += .01;
    
            // Attaches camera to robot
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
