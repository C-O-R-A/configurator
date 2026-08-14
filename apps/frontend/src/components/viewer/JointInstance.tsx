import { useState, useCallback, useMemo } from 'react'
import { ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { JointMesh } from './JointMesh'
import { useRobotStore } from '../../store/robotStore'
import type { SceneJoint } from '../../types/manifest'
import { COLORS } from '../../theme'
import { bakedPositionOffset, makeRotMat } from '../../lib/connectorMath'

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

  // Convert offset_position (connector-relative) → mesh-origin position for rendering
  const offset = bakedPositionOffset(joint)
  const meshPosition: [number, number, number] = joint.parentInstanceId
    ? [
        joint.localPosition[0] - offset.x,
        joint.localPosition[1] - offset.y,
        joint.localPosition[2] - offset.z,
      ]
    : [...joint.localPosition] as [number, number, number]

  const childJoints = joints.filter(j => j.parentInstanceId === joint.instanceId)

  return (
    <>
      <group
        ref={(node) => onNodeReady(joint.instanceId, node)}
        position={meshPosition}
        rotation={[joint.localRotation[0], joint.localRotation[1], joint.localRotation[2]]}
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

        {childJoints.map(child => {
          // Find the connector on this joint the child attaches to
          const parentConn = joint.manifest.connectors.find(
            c => c.name === child.parent_connector
          ) ?? joint.manifest.connectors.find(
            c => c.type === 'flange_output'
          ) ?? joint.manifest.connectors[0]

          const connOrigin: [number, number, number] = parentConn
            ? [
                parentConn.origin[0] / 1000,
                parentConn.origin[1] / 1000,
                parentConn.origin[2] / 1000,
              ]
            : [0, 0, 0]

          const connQuat = parentConn
            ? new THREE.Quaternion().setFromRotationMatrix(
                new THREE.Matrix4().set(
                  parentConn.axes[0][0], parentConn.axes[1][0], parentConn.axes[2][0], 0,
                  parentConn.axes[0][1], parentConn.axes[1][1], parentConn.axes[2][1], 0,
                  parentConn.axes[0][2], parentConn.axes[1][2], parentConn.axes[2][2], 0,
                  0, 0, 0, 1,
                )
              )
            : new THREE.Quaternion()

          return (
            <group
              key={child.instanceId}
              position={connOrigin}
              quaternion={connQuat}
            >
              <JointInstance
                joint={child}
                isSelected={child.instanceId === selectedId}
                onNodeReady={onNodeReady}
              />
            </group>
          )
        })}
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

        const mat = new THREE.Matrix4().set(
          connector.axes[0][0], connector.axes[1][0], connector.axes[2][0], 0,
          connector.axes[0][1], connector.axes[1][1], connector.axes[2][1], 0,
          connector.axes[0][2], connector.axes[1][2], connector.axes[2][2], 0,
          0, 0, 0, 1,
        )
        const quaternion = new THREE.Quaternion().setFromRotationMatrix(mat)

        return (
          <group
            key={`${joint.instanceId}-${connector.name}`}
            position={[origin.x, origin.y, origin.z]}
            quaternion={quaternion}
          >
            <primitive object={new THREE.ArrowHelper(
              new THREE.Vector3(1, 0, 0), new THREE.Vector3(), 0.03, 0xff4444
            )} />
            <primitive object={new THREE.ArrowHelper(
              new THREE.Vector3(0, 1, 0), new THREE.Vector3(), 0.03, 0x44ff44
            )} />
            <primitive object={new THREE.ArrowHelper(
              new THREE.Vector3(0, 0, 1), new THREE.Vector3(), 0.03, 0x4488ff
            )} />
          </group>
        )
      })}
    </>
  )
}

function ConnectionLine({ joint }: { joint: SceneJoint }) {
  const lineObject = useMemo(() => {
    // Line from [0,0,0] (parent connector origin) to where the child's
    // input connector sits — which is offset_position in the parent connector frame
    const start    = new THREE.Vector3(0, 0, 0)
    const end      = new THREE.Vector3(...joint.localPosition)
    const geometry = new THREE.BufferGeometry().setFromPoints([start, end])
    const material = new THREE.LineBasicMaterial({
      color:       COLORS.accent,
      opacity:     0.4,
      transparent: true,
    })
    const line       = new THREE.Line(geometry, material)
    line.renderOrder = 1
    line.raycast     = () => undefined
    return line
  }, [joint.localPosition])

  return <primitive object={lineObject} />
}