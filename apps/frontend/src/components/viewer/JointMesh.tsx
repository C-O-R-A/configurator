import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import type { JointManifest } from '../../types/manifest'
import { COLORS } from '../../theme'

interface JointMeshProps {
  manifest: JointManifest
  selected: boolean
  hovered: boolean
}

export function JointMesh({ manifest, selected, hovered }: JointMeshProps) {
  const meshUrl = `/joint-library/joints/${manifest.id}/${manifest.mesh.visual}`
  const { scene } = useGLTF(meshUrl)
  const cloned = scene.clone()

  const emissiveIntensity = selected ? 0.4 : hovered ? 0.15 : 0

  cloned.traverse(child => {
    if (child instanceof THREE.Mesh) {
      const material = child.material as THREE.MeshStandardMaterial
      if (material) {
        material.emissive = new THREE.Color(COLORS.accent)
        material.emissiveIntensity = emissiveIntensity
      }
    }
  })

  return <primitive object={cloned} />
}