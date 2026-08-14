import * as THREE from 'three'
import type { SceneJoint, Connector } from '../types/manifest'

/** Rotation matrix from a connector's 3x3 axis basis (columns = local X/Y/Z, in parent space). */
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

/** Full transform of a connector frame, expressed in its own joint's mesh-origin space. */
export function connectorMatrix(connector: Connector): THREE.Matrix4 {
  const m = makeRotMat(connector.axes)
  m.setPosition(
    connector.origin[0] / 1000,
    connector.origin[1] / 1000,
    connector.origin[2] / 1000,
  )
  return m
}

/**
 * The joint's stored/edited frame: child-input-connector pose, expressed in
 * parent-output-connector space. This is the ONLY transform the UI edits and
 * the ONLY transform written to URDF <origin>.
 */
export function jointFrameMatrix(joint: SceneJoint): THREE.Matrix4 {
  return new THREE.Matrix4().compose(
    new THREE.Vector3(...joint.localPosition),
    new THREE.Quaternion().setFromEuler(
      new THREE.Euler(joint.localRotation[0], joint.localRotation[1], joint.localRotation[2], 'XYZ')
    ),
    new THREE.Vector3(1, 1, 1),
  )
}

function findConnector(joint: SceneJoint, name: string | null): Connector | undefined {
  if (!name) return joint.manifest.connectors[0]
  return joint.manifest.connectors.find(c => c.name === name) ?? joint.manifest.connectors[0]
}

/**
 * Mesh-origin transform for this joint, expressed in the parent's output
 * connector space (i.e. what to apply to the <group> rendered at the parent
 * connector). Root joints have no connector to compose against, so their
 * stored frame IS the mesh transform directly.
 *
 *   meshLocal = jointFrame * childConnMat⁻¹
 */
export function meshLocalMatrix(joint: SceneJoint): THREE.Matrix4 {
  if (!joint.parentInstanceId) {
    return jointFrameMatrix(joint)
  }
  const childConn = findConnector(joint, joint.input_connector)
  if (!childConn) return jointFrameMatrix(joint)

  const childConnInv = new THREE.Matrix4().copy(connectorMatrix(childConn)).invert()
  return jointFrameMatrix(joint).multiply(childConnInv)
}

/** Decompose a matrix into the [pos, eulerXYZ] tuples the R3F components want. */
export function decompose(m: THREE.Matrix4): {
  position: [number, number, number]
  rotation: [number, number, number]
} {
  const pos = new THREE.Vector3()
  const quat = new THREE.Quaternion()
  const scale = new THREE.Vector3()
  m.decompose(pos, quat, scale)
  const e = new THREE.Euler().setFromQuaternion(quat, 'XYZ')
  return { position: [pos.x, pos.y, pos.z], rotation: [e.x, e.y, e.z] }
}