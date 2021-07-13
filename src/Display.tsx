import { SSL_OP_COOKIE_EXCHANGE } from 'constants';
import { stringify } from 'querystring';
import React, { useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import * as THREE from 'three';
import { IncrementalSimulator } from './Simulator';
import WorldState from './WorldState';

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
        let cubes = new Map<string, {meshes: object[]}>();
        let cubeMats: any = [];
        let tex1 = loader.load("media/canvas_cube.png");
        cubeColors.forEach(function (color: string) {
            cubeMats.push(new THREE.MeshLambertMaterial({color:color, map:tex1}));
            cubes.set(color, {meshes:[]});
        });
        console.log("THiS IS THE OBJ: " + JSON.stringify(cubes));

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
        camera.rotateZ(270 * Math.PI / 180);
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

        // Camera init
        camera.position.copy(relativeCamPos);
        camera.lookAt(new THREE.Vector3(0,0,0));
        // camera.rotateX(-10);

        // Moves the camera up 2 so that it's not in the center of the image
        camera.position.z = 10;

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

        // Used to move the robot randomly in the animate function
        function getRandomArbitrary(min: number, max: number) {
            return Math.random() * (max - min) + min;
          }
        
        let removeStuff = () => {

        }

        // This animates the cube. In the animate function, the scene and camera are rendered
        let animate = () => {
            requestAnimationFrame( animate );

            // Iterates over each cube in cube_mat and places all cubes
            this.state.world.cube_map.forEach((colorVal: number, cubePosition: THREE.Vector3) => {
                let cubeGeo = new THREE.BoxGeometry(1, 1, 1);
                let cubeMat = new THREE.MeshLambertMaterial({color: cubeColors[colorVal], transparent: true, opacity:0.5});
                let cube = new THREE.Mesh( cubeGeo, cubeMat );

                // Place cube in correct position
                cube.translateX( cubePosition.x );
                cube.translateY( cubePosition.y );
                cube.translateZ( cubePosition.z );

                scene.add( cube );
            });


            // A map where the keys are colors and the values are meshes
            // This map shows all of the available meshes, or the meshes that haven't been used yet
            // REMINDER: Mesh is the combination of the cube's (or "object's" more generally) material + position
            let available = new Map<number, Array<THREE.Mesh>>();
            // Indexes which mesh on the available map we're on
            let available_index = 0;
            // A map whose keys are positions and values are booleans
            // Represents if a position is filled (true) or not (false)
            let filled = new Map<THREE.Vector3, boolean>();

            // This checks for cubes that should be removed
            // console.log("CUBE COLORS: " + cubeColors);
            cubeColors.forEach((color: string) => {
                available.set(cubeColors.indexOf(color), []);
                // console.log("CUBES: " + JSON.stringify(cubes));
                cubes.get(color)!.meshes.forEach( (obj: any) => { // For each cube (.meshes) (object with material and position) in the specified color
                    if (!this.state.world.cube_map.hasOwnProperty(obj.pos)) { // If the object has a position property
                        scene.remove(obj.mesh); // Remove from scene
                        obj.pos = null; // And set position to null
                    } else { // If the object doesn't have a position property
                        filled.set(obj.pos, true); // Set the filled object at that cube object to true
                    } if (obj.pos === null) {
                        available.get(cubeColors.indexOf(color))!.push(obj);
                    }
                })
            });

            // Loop over positions that need meshes
            for (let [cubePosition, colorInd] of this.state.world.cube_map) {
                // console.log(typeof(cubePosition)); "OBJECT!!"
                // console.log("INSTANCE OF: " + (cubePosition instanceof THREE.Vector3)) "TRUE!!"
                let color: string = cubeColors[colorInd];
                if (!filled.get(cubePosition!)) {
                    let cube = {
                        // IDK WHY THIS IS PROTOTYPE??
                        pos: THREE.Vector3.prototype,
                        mesh: THREE.Mesh.prototype,
                    };
                    if (available.get(cubeColors.indexOf(color))) {
                        cube.pos = cubePosition;
                        cube.mesh = (available.get(cubeColors.indexOf(color))![available_index++] as THREE.Mesh);
                    } else {
                        cube = {
                            mesh: new THREE.Mesh(targetGeo, cubeMats[this.state.world.cube_map.get(cubePosition)!]),
                            pos: cubePosition,
                        };
                        cubes.get(color)!.meshes.push(cube);
                    }
                    scene.add(cube.mesh);
                    // cube.mesh.copy(cubePosition).add(cubeOffset);
                }
            };
            
            // Draws the robot's end position along with the arrowhelper
            robot.position.lerp( this.state.world.dragon_pos, .5 );
            robotDir.setDirection( this.state.world.dragon_dir );
            zCuePlane.position.lerp( new THREE.Vector3(this.state.world.dragon_pos.x, this.state.world.dragon_pos.y, 0), .5 );

            cube.rotation.x += .01;
            cube.rotation.y += .01;
            cube.rotation.z += .01;

            renderer.render( scene, camera );

            // if (robot.position.x <= Math.abs(3)) {
            //     const randNum = getRandomArbitrary(-.1, .1);
            //     robot.translateX( randNum );
            //     zCuePlane.translateX( randNum );
            // }
            // if (robot.position.y <= Math.abs(3)) {
            //     const randNum = getRandomArbitrary(-.1, .1);
            //     robot.translateY( randNum );
            //     zCuePlane.translateY( randNum );
            // }
            // if (robot.position.z <= Math.abs(3)) {
            //     const randNum = getRandomArbitrary(-.1, .1);
            //     robot.translateZ( randNum );
            // }
        };
        animate();






        let setDisplayFromWorld = function(dt: number) {
            let bot = robot;
    
            if (bot) {
                // set robot goal position and direction
                finalBotPos.copy(bot.position).add(robotOffset);
                finalBotQ.setFromUnitVectors(new THREE.Vector3(1, 0, 0), new THREE.Vector3(1, 0, 0)); // 1,0,0 is default direction
                waitTime = dt*0.1;
                animTime = Math.min(dt*0.9, MAX_ANIMATION_TIME);
                animStatus = "waiting";
                if (animTime < MIN_ANIMATION_TIME) {
                    animTime = 0;
                    animStatus = "animating";
                }
                dirty = false;
            }
        }
    }
    render() {
        return (
            <div id="three-js" ref={this.divRef} />
        );
    }
}
