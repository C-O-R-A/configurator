import * as THREE from 'three'
import type { SceneJoint } from '../types/manifest'

export function makeRotMat(axes: readonly [
  readonly [number, number, number],
  readonly [number, number, number],
  readonly [number, number, number],
]): THREE.Matrix4 {
  return new THREE.Matrix4().set(
    axes[0][0], axes[1][0], axes[2][0], 0,
    axes[0][1], axes[1][1], axes[2][1], 0,
    axes[0][2], axes[1][2], axes[2][2], 0,
    0,          0,          0,          1,
  )
}

export function bakedQuat(joint: SceneJoint): THREE.Quaternion {
  if (!joint.parentInstanceId || !joint.input_connector) return new THREE.Quaternion()
  const childConn = joint.manifest.connectors.find(c => c.name === joint.input_connector)
    ?? joint.manifest.connectors[0]
  if (!childConn) return new THREE.Quaternion()
  return new THREE.Quaternion()
    .setFromRotationMatrix(makeRotMat(childConn.axes))
    .invert()
}

export function bakedPositionOffset(joint: SceneJoint): THREE.Vector3 {
  if (!joint.parentInstanceId || !joint.input_connector) return new THREE.Vector3()
  const childConn = joint.manifest.connectors.find(c => c.name === joint.input_connector)
    ?? joint.manifest.connectors[0]
  if (!childConn) return new THREE.Vector3()
  const q = bakedQuat(joint)
  return new THREE.Vector3(
    childConn.origin[0] / 1000,
    childConn.origin[1] / 1000,
    childConn.origin[2] / 1000,
  ).applyQuaternion(q).negate()
}

export function computeDisplayPose(joint: SceneJoint): {
  position: [number, number, number]
  rotation: [number, number, number]
} {
  const posOffset = bakedPositionOffset(joint)
  const displayPosition: [number, number, number] = [
    joint.position[0] + posOffset.x,
    joint.position[1] + posOffset.y,
    joint.position[2] + posOffset.z,
  ]

  const bq         = bakedQuat(joint)
  const storedQuat = new THREE.Quaternion().setFromEuler(
    new THREE.Euler(joint.rotation[0], joint.rotation[1], joint.rotation[2], 'XYZ')
  )
  const displayQuat  = bq.clone().invert().multiply(storedQuat)
  const displayEuler = new THREE.Euler().setFromQuaternion(displayQuat, 'XYZ')

  return {
    position: displayPosition,
    rotation: [displayEuler.x, displayEuler.y, displayEuler.z],
  }
}