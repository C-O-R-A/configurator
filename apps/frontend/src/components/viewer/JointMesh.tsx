import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import type { JointManifest } from '../../types/manifest'
import { COLORS } from '../../theme'
import { useMemo } from 'react'

interface JointMeshProps {
  manifest: JointManifest
  selected: boolean
  hovered: boolean
}

export function JointMesh({ manifest, selected, hovered }: JointMeshProps) {
  const meshUrl = `/joint-library/joints/${manifest.id}/${manifest.mesh.visual}`
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

  return <primitive object={cloned} />
}

