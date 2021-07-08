import React, { useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import * as THREE from 'three';

export default class Display extends React.Component {
    divRef: React.RefObject<HTMLDivElement>;

    constructor(props: {}) {
        super(props);
        this.divRef = React.createRef();
    }

    componentDidMount() {
        // Camera positioning
        let relativeCamPos = new THREE.Vector3(-15,0,12);
        let relativeCamPosMag = relativeCamPos.length() - 0.5; // -0.5 is an undocumented part of unity version, preserving it here
        let robotOffset = new THREE.Vector3(0.5,0.5,1.5);
        let cubeOffset = new THREE.Vector3(0.5,0.5,0.5);

        // Defines the three main elements of a threejs window: scene, camera, and renderer
        let scene = new THREE.Scene();
        let camera = new THREE.PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 0.1, 1500);
        let renderer = new THREE.WebGLRenderer();
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
        let loader = new THREE.TextureLoader();
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
        var robotDir = new THREE.ArrowHelper(new THREE.Vector3(-1,0,0),new THREE.Vector3(0,0,0),1,"#ff0000",0.5,0.2);
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
        var path = "media/skybox/";
        var format = ".jpg";
        // it's not clear to me three js does what it says it does with the six images, but I've got everything lining
        // up via trial and error
        var texes = [path + "px" + format, path + "nx" + format,
            path + "py" + format, path + "ny" + format,
            path + "pz" + format, path + "nz" + format];
        var cubeLoader = new THREE.CubeTextureLoader();
        scene.background = cubeLoader.load(texes);

        // Used to move the robot randomly in the animate function
        function getRandomArbitrary(min: number, max: number) {
            return Math.random() * (max - min) + min;
          }

        // This animates the cube. In the animate function, the scene and camera are rendered
        let animate = function() {
            requestAnimationFrame( animate );
            cube.rotation.x += .01;
            cube.rotation.y += .01;
            cube.rotation.z += .01;
            if (robot.position.x <= Math.abs(3)) {
                const randNum = getRandomArbitrary(-.1, .1);
                robot.translateX( randNum );
                zCuePlane.translateX( randNum );
            }
            if (robot.position.y <= Math.abs(3)) {
                const randNum = getRandomArbitrary(-.1, .1);
                robot.translateY( randNum );
                zCuePlane.translateY( randNum );
            }
            if (robot.position.z <= Math.abs(3)) {
                const randNum = getRandomArbitrary(-.1, .1);
                robot.translateZ( randNum );
            }
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
