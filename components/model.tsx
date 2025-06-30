"use client"

import { useRef, useEffect } from "react"
import { useGLTF, useAnimations } from "@react-three/drei"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import type { EyeState } from "./robot-scene"

export function Model({ eyeState }: { eyeState: EyeState }) {
  const group = useRef<THREE.Group>(null)
  const { nodes, materials, animations } = useGLTF("/robot-head.glb")
  const { actions } = useAnimations(animations, group)

  const eyeMaterial = materials["Eye Emission"] as THREE.MeshStandardMaterial

  useEffect(() => {
    // Enable shadows on all meshes
    if (group.current) {
      group.current.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.castShadow = true
        }
      })
    }
  }, [])

  useFrame((state) => {
    if (!group.current) return

    // Idle float animation
    if (eyeState === "idle") {
      const t = state.clock.getElapsedTime()
      group.current.position.y = Math.sin(t * 1.5) * 0.1
    }

    // Eye color and intensity logic
    let targetColor = new THREE.Color("#00BFFF") // Deep sky blue for idle/focused
    let targetIntensity = 10

    switch (eyeState) {
      case "win":
        targetColor = new THREE.Color("#4CAF50") // Green
        targetIntensity = 20
        break
      case "lose":
        targetColor = new THREE.Color("#FF5252") // Red
        targetIntensity = 15
        break
      case "focused":
        targetIntensity = 25
        break
      default: // idle
        targetIntensity = 10
        break
    }

    // Smoothly transition eye color and intensity
    eyeMaterial.emissive.lerp(targetColor, 0.1)
    eyeMaterial.emissiveIntensity = THREE.MathUtils.lerp(eyeMaterial.emissiveIntensity, targetIntensity, 0.1)
  })

  return (
    <group ref={group} dispose={null}>
      <primitive object={nodes.Head} />
    </group>
  )
}

useGLTF.preload("/robot-head.glb")
