import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import type { JointManifest } from '../../types/manifest'
import { COLORS } from '../../theme'
import { useMemo } from 'react'
import type { ThreeEvent } from '@react-three/fiber'

interface JointMeshProps {
  manifest: JointManifest
  selected: boolean
  hovered: boolean
  onClick?: (e: ThreeEvent<MouseEvent>) => void
  onPointerOver?: (e: ThreeEvent<PointerEvent>) => void
  onPointerOut?: (e: ThreeEvent<PointerEvent>) => void
}

export function JointMesh({ manifest, selected, hovered, onClick, onPointerOver, onPointerOut }: JointMeshProps) {
  const meshUrl = `/joint-library/joints/${manifest.id}/${manifest.mesh.visual}`
  console.debug('Loading joint mesh', manifest.id, meshUrl)
  const { scene } = useGLTF(meshUrl)

  const cloned = useMemo(() => {
    const c = scene.clone()
    c.traverse((child: THREE.Object3D) => {
      if (child instanceof THREE.Mesh) {
        // clone the material so this instance owns its own copy
        child.material = (child.material as THREE.Material).clone()
      }
    })
    return c
  }, [scene])

  const emissiveIntensity = selected ? 0.4 : hovered ? 0.15 : 0

  cloned.traverse((child: THREE.Object3D) => {
    if (child instanceof THREE.Mesh) {
      const mat = child.material as THREE.MeshStandardMaterial
      mat.emissive.set(COLORS.accent)
      mat.emissiveIntensity = emissiveIntensity
    }
  })

  return (
    <primitive
      object={cloned}
      onClick={onClick}
      onPointerOver={onPointerOver}
      onPointerOut={onPointerOut}
    />
  )
}

