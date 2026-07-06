import { useState, useCallback, useMemo } from 'react'
import { ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { JointMesh } from './JointMesh'
import { useRobotStore } from '../../store/robotStore'
import type { SceneJoint } from '../../types/manifest'
import { COLORS } from '../../theme'

interface JointInstanceProps {
  joint:       SceneJoint
  isSelected:  boolean
  onNodeReady: (node: THREE.Group | null) => void
}

export function JointInstance({ joint, isSelected, onNodeReady }: JointInstanceProps) {
  const [hovered, setHovered] = useState(false)
  const { selectJoint } = useRobotStore()

  const handleClick = useCallback((e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    selectJoint(joint.instanceId)
  }, [joint.instanceId, selectJoint])

  const handlePointerOver = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    setHovered(true)
    document.body.style.cursor = 'pointer'
  }, [])

  const handlePointerOut = useCallback(() => {
    setHovered(false)
    document.body.style.cursor = 'auto'
  }, [])

  const p = joint.position

  return (
    <>
      <group
        ref={onNodeReady}
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
      </group>

      {joint.parentInstanceId && <ConnectionLine joint={joint} />}
    </>
  )
}

function ConnectionLine({ joint }: { joint: SceneJoint }) {
  const joints  = useRobotStore(s => s.joints)
  const parent  = joints.find(j => j.instanceId === joint.parentInstanceId)

  const lineObject = useMemo(() => {
    if (!parent) return null

    const outputConnector = parent.manifest.connectors.find(c => c.type === 'flange_output')
      ?? parent.manifest.connectors[0]

    const offset = outputConnector
      ? new THREE.Vector3(
          outputConnector.origin[0] / 1000,
          outputConnector.origin[1] / 1000,
          outputConnector.origin[2] / 1000,
        )
      : new THREE.Vector3(0, 0, 0)

    const start    = new THREE.Vector3(...parent.position).add(offset)
    const end      = new THREE.Vector3(...joint.position)
    const geometry = new THREE.BufferGeometry().setFromPoints([start, end])
    const material = new THREE.LineBasicMaterial({
      color:       COLORS.accent,
      opacity:     0.4,
      transparent: true,
    })

    const line        = new THREE.Line(geometry, material)
    line.renderOrder  = 1
    line.raycast      = () => undefined
    return line
  }, [parent, joint.position])

  if (!lineObject) return null
  return <primitive object={lineObject} />
}