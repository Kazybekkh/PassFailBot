"use client"

import { Suspense } from "react"
import { Canvas } from "@react-three/fiber"
import { Model } from "./model"

export type EyeState = "idle" | "focused" | "win" | "lose"

export function RobotScene({ eyeState }: { eyeState: EyeState }) {
  return (
    <div className="w-64 h-64">
      <Canvas shadows camera={{ position: [0, 0.5, 5], fov: 30 }}>
        <ambientLight intensity={0.5} />
        <directionalLight
          position={[5, 5, 5]}
          intensity={1.5}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />
        <pointLight position={[-5, -5, -5]} intensity={0.2} color="#F39C12" />
        <pointLight position={[0, 2, 4]} intensity={1} color="#00BFFF" />

        <Suspense fallback={null}>
          <Model eyeState={eyeState} />
        </Suspense>

        {/* Invisible plane to receive shadows */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.5, 0]} receiveShadow>
          <planeGeometry args={[10, 10]} />
          <shadowMaterial opacity={0.3} />
        </mesh>
        {/* <OrbitControls /> */}
      </Canvas>
    </div>
  )
}
