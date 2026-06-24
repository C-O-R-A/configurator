import { useRef, useState, useCallback } from 'react'
import { ThreeEvent } from '@react-three/fiber'
import { TransformControls } from '@react-three/drei'
import * as THREE from 'three'
import { JointMesh } from './JointMesh'
import { useRobotStore } from '../../store/robotStore'
import type { SceneJoint } from '../../types/manifest'

interface JointInstanceProps {
  joint: SceneJoint
  isSelected: boolean
  transformMode: 'translate' | 'rotate' | null
}

export function JointInstance({ joint, isSelected, transformMode }: JointInstanceProps) {
  const [hovered, setHovered] = useState(false)
  const groupRef = useRef<THREE.Group>(null)
  const { selectJoint, moveJoint, rotateJoint } = useRobotStore()

  const handleClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation()
      selectJoint(joint.instanceId)
    },
    [joint.instanceId, selectJoint]
  )

  const handlePointerOver = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    setHovered(true)
    document.body.style.cursor = 'pointer'
  }, [])

  const handlePointerOut = useCallback(() => {
    setHovered(false)
    document.body.style.cursor = 'auto'
  }, [])

  const handleTransformChange = useCallback(() => {
    if (!groupRef.current) return
    const pos = groupRef.current.position
    const rot = groupRef.current.rotation
    moveJoint(joint.instanceId, [pos.x, pos.y, pos.z])
    rotateJoint(joint.instanceId, [rot.x, rot.y, rot.z])
  }, [joint.instanceId, moveJoint, rotateJoint])

  // Convert mm frames to meters for rendering
  const parentAttach = joint.manifest.frames.parent_attach
  const p = joint.position

  return (
    <>
      <group
        ref={groupRef}
        position={[p[0], p[1], p[2]]}
        rotation={[joint.rotation[0], joint.rotation[1], joint.rotation[2]]}
        onClick={handleClick}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      >
        <JointMesh
          manifest={joint.manifest}
          selected={isSelected}
          hovered={hovered}
        />

        {/* Link name label (HTML overlay) */}
        {(isSelected || hovered) && (
          <group position={[0, 0, joint.manifest.params.length / 1000 + 0.03]}>
            {/* Billboard text handled in parent canvas via Html component */}
          </group>
        )}
      </group>

      {/* Transform gizmo when selected */}
      {isSelected && groupRef.current && transformMode && (
        <TransformControls
          object={groupRef.current}
          mode={transformMode}
          onObjectChange={handleTransformChange}
          size={0.6}
        />
      )}

      {/* Connection line to parent */}
      {joint.parentInstanceId && (
        <ConnectionLine joint={joint} />
      )}
    </>
  )
}

function ConnectionLine({ joint }: { joint: SceneJoint }) {
  const joints = useRobotStore(s => s.joints)
  const parent = joints.find(j => j.instanceId === joint.parentInstanceId)
  if (!parent) return null

  const start = new THREE.Vector3(...parent.position).add(
    new THREE.Vector3(
      parent.manifest.frames.child_attach[0] / 1000,
      parent.manifest.frames.child_attach[1] / 1000,
      parent.manifest.frames.child_attach[2] / 1000,
    )
  )
  const end = new THREE.Vector3(...joint.position)

  const points = [start, end]
  const geometry = new THREE.BufferGeometry().setFromPoints(points)

  return (
    <line geometry={geometry}>
      <lineBasicMaterial color="#00e5ff" opacity={0.4} transparent linewidth={1} />
    </line>
  )
}
