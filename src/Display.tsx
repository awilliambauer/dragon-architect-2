import React, { useRef, useState } from 'react'
import { Canvas, MeshProps, useFrame } from '@react-three/fiber'

type BoxProps = {
    position: number[],
}

function Box(props: BoxProps) {
    // This reference will give us direct access to the mesh
    const mesh = useRef<MeshProps>()
    // Set up state for the hovered and active state
    const [hovered, setHover] = useState(false)
    const [active, setActive] = useState(false)
    // Rotate mesh every frame, this is outside of React without overhead
    useFrame(() => {
        if (mesh.current) {
            mesh.current!.rotation.x = mesh.current.rotation.y += 0.01
        }
    })
    return (
        <mesh
            {...props}
            ref={mesh}
            scale={active ? 1.5 : 1}
            onClick={(e) => setActive(!active)}
            onPointerOver={(e) => setHover(true)}
            onPointerOut={(e) => setHover(false)}>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color={hovered ? 'hotpink' : 'orange'} />
        </mesh>
    )
}

export default function Display() {
    return (
        <Canvas>
            <ambientLight intensity={0.5} />
            <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} />
            <pointLight position={[-10, -10, -10]} />
            <Box position={[-1.2, 0, 0]} />
            <Box position={[1.2, 0, 0]} />
        </Canvas>
    )
}