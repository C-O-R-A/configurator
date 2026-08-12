import { useState, useCallback, useMemo } from 'react'
import { ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { JointMesh } from './JointMesh'
import { useRobotStore } from '../../store/robotStore'
import type { SceneJoint } from '../../types/manifest'
import { COLORS } from '../../theme'

function computeWorldTransform(joint: SceneJoint, joints: SceneJoint[]): { position: THREE.Vector3; quaternion: THREE.Quaternion } {
  const localPosition = new THREE.Vector3(...joint.position)
  const localQuaternion = new THREE.Quaternion().setFromEuler(
    new THREE.Euler(joint.rotation[0], joint.rotation[1], joint.rotation[2], 'XYZ')
  )

  if (!joint.parentInstanceId) {
    return { position: localPosition, quaternion: localQuaternion }
  }

  const parent = joints.find(j => j.instanceId === joint.parentInstanceId)
  if (!parent) {
    return { position: localPosition, quaternion: localQuaternion }
  }

  const parentWorld = computeWorldTransform(parent, joints)

  const childConnector = joint.manifest.connectors.find(c => c.name === joint.input) || joint.manifest.connectors[0]

  const childInputLocalPosition = childConnector
    ? new THREE.Vector3(
        childConnector.origin[0] / 1000,
        childConnector.origin[1] / 1000,
        childConnector.origin[2] / 1000,
      )
    : new THREE.Vector3()

  const childInputLocalQuaternion = childConnector
    ? new THREE.Quaternion().setFromRotationMatrix(
        new THREE.Matrix4().makeBasis(
          new THREE.Vector3(...childConnector.axes[0]),
          new THREE.Vector3(...childConnector.axes[1]),
          new THREE.Vector3(...childConnector.axes[2]),
        )
      )
    : new THREE.Quaternion()

  const localPositionAdjusted = localPosition.clone().sub(childInputLocalPosition)
  const localQuaternionAdjusted = localQuaternion.clone().multiply(childInputLocalQuaternion.clone().invert())

  return {
    position: localPositionAdjusted.clone().applyQuaternion(parentWorld.quaternion).add(parentWorld.position),
    quaternion: parentWorld.quaternion.clone().multiply(localQuaternionAdjusted),
  }
}

interface JointInstanceProps {
  joint:       SceneJoint
  isSelected:  boolean
  onNodeReady: (instanceId: string, node: THREE.Group | null) => void
}

export function JointInstance({ joint, isSelected, onNodeReady }: JointInstanceProps) {
  const [hovered, setHovered] = useState(false)
  const { selectJoint, joints, selectedId } = useRobotStore()

  const handleClick = useCallback((e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    console.debug('JointInstance clicked', joint.instanceId)
    selectJoint(joint.instanceId)
  }, [joint.instanceId, selectJoint])

  const handlePointerOver = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    setHovered(true)
    document.body.style.cursor = 'pointer'
  }, [])

  const handlePointerOut = useCallback((e?: ThreeEvent<PointerEvent>) => {
    if (e) e.stopPropagation()
    setHovered(false)
    document.body.style.cursor = 'auto'
  }, [])

  const childJoints = joints.filter(j => j.parentInstanceId === joint.instanceId)

  return (
    <>
      <group
        ref={(node) => onNodeReady(joint.instanceId, node)}
        position={[joint.position[0], joint.position[1], joint.position[2]]}
        rotation={[joint.rotation[0], joint.rotation[1], joint.rotation[2]]}
      >
        <JointMesh
          manifest={joint.manifest}
          selected={isSelected}
          hovered={hovered}
          onClick={handleClick}
          onPointerOver={handlePointerOver}
          onPointerOut={handlePointerOut}
        />

        <ConnectorAxes joint={joint} />

        {childJoints.map(child => (
          <JointInstance
            key={child.instanceId}
            joint={child}
            isSelected={child.instanceId === selectedId}
            onNodeReady={onNodeReady}
          />
        ))}
      </group>

      {joint.parentInstanceId && <ConnectionLine joint={joint} />}
    </>
  )
}

function ConnectorAxes({ joint }: { joint: SceneJoint }) {
  return (
    <>
      {joint.manifest.connectors.map((connector) => {
        const origin = new THREE.Vector3(
          connector.origin[0] / 1000,
          connector.origin[1] / 1000,
          connector.origin[2] / 1000,
        )

        const basis = new THREE.Matrix4().makeBasis(
          new THREE.Vector3(...connector.axes[0]),
          new THREE.Vector3(...connector.axes[1]),
          new THREE.Vector3(...connector.axes[2]),
        )
        const quaternion = new THREE.Quaternion().setFromRotationMatrix(basis)

        return (
          <group
            key={`${joint.instanceId}-${connector.name}`}
            position={[origin.x, origin.y, origin.z]}
            quaternion={quaternion}
          >
            <primitive object={new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 0), 0.03, 0xff4444)} />
            <primitive object={new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 0), 0.03, 0x44ff44)} />
            <primitive object={new THREE.ArrowHelper(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, 0), 0.03, 0x4488ff)} />
          </group>
        )
      })}
    </>
  )
}

// Removed ErrorBoundary and MeshFallback — let GLTF loader errors surface instead of rendering placeholders.

function ConnectionLine({ joint }: { joint: SceneJoint }) {
  const joints  = useRobotStore(s => s.joints)
  const parent  = joints.find(j => j.instanceId === joint.parentInstanceId)

  const lineObject = useMemo(() => {
    if (!parent) return null

    const outputConnector = parent.manifest.connectors.find(c => c.type === 'flange_output')
      ?? parent.manifest.connectors[0]

    const parentWorld = computeWorldTransform(parent, joints)
    const childWorld = computeWorldTransform(joint, joints)

    const startOffset = outputConnector
      ? new THREE.Vector3(
          outputConnector.origin[0] / 1000,
          outputConnector.origin[1] / 1000,
          outputConnector.origin[2] / 1000,
        )
      : new THREE.Vector3(0, 0, 0)

    const start = startOffset.applyQuaternion(parentWorld.quaternion).add(parentWorld.position)
    const end = childWorld.position
    const geometry = new THREE.BufferGeometry().setFromPoints([start, end])
    const material = new THREE.LineBasicMaterial({
      color:       COLORS.accent,
      opacity:     0.4,
      transparent: true,
    })

    const line = new THREE.Line(geometry, material)
    line.renderOrder = 1
    line.raycast = () => undefined
    return line
  }, [parent, joint, joints])

  if (!lineObject) return null
  return <primitive object={lineObject} />
}