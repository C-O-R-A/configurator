import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Cylinder, Box, Torus, Sphere } from '@react-three/drei'
import * as THREE from 'three'
import type { JointManifest } from '../../types/manifest'

interface JointMeshProps {
  manifest: JointManifest
  selected: boolean
  hovered: boolean
}

// Procedural mesh so the viewer works without any .glb files.
// Once you have real GLBs, swap this component to load them via useGLTF.
export function JointMesh({ manifest, selected, hovered }: JointMeshProps) {
  const { params, type } = manifest
  
  // Convert mm → meters for Three.js
  const r = (params.housing_diameter / 2) / 1000
  const h = params.length / 1000
  const flangeR = (params.flange_diameter / 2) / 1000

  const emissiveIntensity = selected ? 0.4 : hovered ? 0.15 : 0
  const color = JOINT_COLORS[type] ?? '#7a8a99'

  return (
    <group>
      {/* Main housing */}
      <Cylinder args={[r, r, h, 32]} position={[0, 0, h / 2]}>
        <meshStandardMaterial
          color={color}
          roughness={0.35}
          metalness={0.8}
          emissive={color}
          emissiveIntensity={emissiveIntensity}
        />
      </Cylinder>

      {/* Output flange (bottom) */}
      <Cylinder args={[flangeR, flangeR, 0.008, 32]} position={[0, 0, 0.004]}>
        <meshStandardMaterial color="#c8d0d8" roughness={0.2} metalness={0.9} />
      </Cylinder>

      {/* Output flange (top) */}
      <Cylinder args={[flangeR, flangeR, 0.008, 32]} position={[0, 0, h - 0.004]}>
        <meshStandardMaterial color="#c8d0d8" roughness={0.2} metalness={0.9} />
      </Cylinder>

      {/* Type-specific feature */}
      {type === 'revolute' && <RevoluteFeature r={r} h={h} />}
      {type === 'prismatic' && <PrismaticFeature r={r} h={h} />}
      {type === 'universal' && <UniversalFeature r={r} h={h} />}

      {/* Selection outline */}
      {selected && (
        <Cylinder args={[r + 0.003, r + 0.003, h + 0.003, 32]}>
          <meshBasicMaterial color="#00e5ff" wireframe transparent opacity={0.6} />
        </Cylinder>
      )}

      {/* Axis indicator */}
      <AxisArrow length={h} />
    </group>
  )
}

function RevoluteFeature({ r, h }: { r: number; h: number }) {
  return (
    <Torus args={[r * 0.6, 0.004, 8, 24]} position={[0, 0, h / 2]} rotation={[Math.PI / 2, 0, 0]}>
      <meshStandardMaterial color="#00b4d8" roughness={0.3} metalness={0.7} />
    </Torus>
  )
}

function PrismaticFeature({ r, h }: { r: number; h: number }) {
  return (
    <>
      <Box args={[r * 0.3, r * 0.3, h * 0.7]} position={[r * 0.7, 0, h / 2]}>
        <meshStandardMaterial color="#ff9f1c" roughness={0.4} metalness={0.6} />
      </Box>
    </>
  )
}

function UniversalFeature({ r, h }: { r: number; h: number }) {
  return (
    <Sphere args={[r * 0.4, 12, 12]} position={[0, 0, h / 2]}>
      <meshStandardMaterial color="#a8dadc" roughness={0.2} metalness={0.8} />
    </Sphere>
  )
}

function AxisArrow({ length }: { length: number }) {
  return (
    <group>
      <Cylinder args={[0.002, 0.002, length * 0.9, 8]} position={[0, 0, length / 2]}>
        <meshBasicMaterial color="#ff4444" />
      </Cylinder>
      <Cylinder args={[0.005, 0, 0.015, 8]} position={[0, 0, length + 0.005]}>
        <meshBasicMaterial color="#ff4444" />
      </Cylinder>
    </group>
  )
}

const JOINT_COLORS: Record<string, string> = {
  revolute:   '#2b4c7e',
  prismatic:  '#3d5a3e',
  continuous: '#2b4c7e',
  universal:  '#5c3d6e',
  spherical:  '#6e3d3d',
  fixed:      '#4a4a4a',
}
