import { useRef, useState, useCallback, useMemo } from 'react'
import { ThreeEvent } from '@react-three/fiber'
import { TransformControls } from '@react-three/drei'
import * as THREE from 'three'
import { JointMesh } from './JointMesh'
import { useRobotStore } from '../../store/robotStore'
import type { SceneJoint } from '../../types/manifest'
import { COLORS } from '../../theme'

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

  const outputConnector = joint.manifest.connectors.find(c => c.type === 'flange_output') ?? joint.manifest.connectors[0]
  const labelHeight = outputConnector ? outputConnector.origin[2] + 0.03 : 0.1
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

        {(isSelected || hovered) && (
          <group position={[0, 0, labelHeight]}>
            {/* Billboard text handled in parent canvas via Html component */}
          </group>
        )}
      </group>

      {isSelected && groupRef.current && transformMode && (
        <TransformControls
          object={groupRef.current}
          mode={transformMode}
          onObjectChange={handleTransformChange}
          size={0.6}
        />
      )}

      {joint.parentInstanceId && <ConnectionLine joint={joint} />}
    </>
  )
}

function ConnectionLine({ joint }: { joint: SceneJoint }) {
  const joints = useRobotStore(s => s.joints)
  const parent = joints.find(j => j.instanceId === joint.parentInstanceId)

  const lineObject = useMemo(() => {
    if (!parent) return null

    const outputConnector = parent.manifest.connectors.find(c => c.type === 'flange_output') ?? parent.manifest.connectors[0]
    const offset = outputConnector
      ? new THREE.Vector3(
          outputConnector.origin[0],
          outputConnector.origin[1],
          outputConnector.origin[2],
        )
      : new THREE.Vector3(0, 0, 0)

    const start = new THREE.Vector3(...parent.position).add(offset)
    const end = new THREE.Vector3(...joint.position)

    const geometry = new THREE.BufferGeometry().setFromPoints([start, end])
    const material = new THREE.LineBasicMaterial({
      color: COLORS.accent,
      opacity: 0.4,
      transparent: true,
    })

    return new THREE.Line(geometry, material)
  }, [parent, joint.position])

  if (!lineObject) return null

  return <primitive object={lineObject} />
}