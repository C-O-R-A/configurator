import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { v4 as uuid } from 'uuid'
import type { SceneJoint, JointManifest } from '../types/manifest'
import * as THREE from 'three'

interface RobotStore {
  // ── Joint library (fetched from backend) ──────────────────────────────────
  library: JointManifest[]
  libraryLoading: boolean
  loadLibrary: () => Promise<void>

  // ── Scene graph ────────────────────────────────────────────────────────────
  joints: SceneJoint[]
  selectedId: string | null

  // ── Actions ────────────────────────────────────────────────────────────────
  addJoint: (manifest: JointManifest, parentId?: string, childConnector?: 'joint_in' | 'joint_out' | null, parentConnector?: 'joint_in' | 'joint_out' | null) => void
  removeJoint: (instanceId: string) => void
  selectJoint: (instanceId: string | null) => void
  renameJoint: (instanceId: string, newName: string) => void
  moveJoint: (instanceId: string, position: [number, number, number]) => void
  rotateJoint: (instanceId: string, rotation: [number, number, number]) => void
  connectJoint: (
    childId: string,
    parentId: string | null,
    childConnector: 'joint_in' | 'joint_out',
    parentConnector: 'joint_in' | 'joint_out'
  ) => void
  clearScene: () => void

  // ── UI state ───────────────────────────────────────────────────────────────
  robotName: string
  setRobotName: (name: string) => void
  gridVisible: boolean
  toggleGrid: () => void
}

// Counter for auto-naming links
let linkCounter = 0

export const useRobotStore = create<RobotStore>()(
  devtools(
    (set, get) => ({
      library: [],
      libraryLoading: false,
      joints: [],
      selectedId: null,
      robotName: 'my_robot',
      gridVisible: true,

      loadLibrary: async () => {
        set({ libraryLoading: true })
        try {
          const res = await fetch('/api/joints')
          const data = await res.json()
          set({ library: data, libraryLoading: false })
        } catch (err) {
          console.error('Failed to load joint library:', err)
          set({ libraryLoading: false })
        }
      },

      addJoint: (manifest, parentId, childConnector, parentConnector) => {
        const n = ++linkCounter
        const instanceId = uuid()

        const parent = parentId ? get().joints.find(j => j.instanceId === parentId) : null

        let defaultPosition: [number, number, number] = [0, 0, 0]
        let defaultRotation: [number, number, number] = [0, 0, 0]

      if (parent && parentConnector && childConnector) {
        const parentConn = parent.manifest.connectors.find(c => c.name === parentConnector)
        const childConn  = manifest.connectors.find(c => c.name === childConnector)

        if (parentConn && childConn) {
          // ── Parent connector world transform ──────────────────────────────────
          const parentWorldQuat = new THREE.Quaternion().setFromEuler(
            new THREE.Euler(parent.rotation[0], parent.rotation[1], parent.rotation[2], 'XYZ')
          )

          // Parent connector position in world space
          const parentConnWorldPos = new THREE.Vector3(
            parentConn.origin[0] / 1000,
            parentConn.origin[1] / 1000,
            parentConn.origin[2] / 1000,
          ).applyQuaternion(parentWorldQuat).add(new THREE.Vector3(...parent.position))

          // Parent connector orientation in world space
          // axes columns are [X, Y, Z] of the connector frame
          const parentConnMat = new THREE.Matrix4().makeBasis(
            new THREE.Vector3(...parentConn.axes[0]),
            new THREE.Vector3(...parentConn.axes[1]),
            new THREE.Vector3(...parentConn.axes[2]),
          )
          const parentConnWorldQuat = new THREE.Quaternion()
            .setFromRotationMatrix(parentConnMat)
            .premultiply(parentWorldQuat)

          // ── Child connector local transform ───────────────────────────────────
          const childConnLocalPos = new THREE.Vector3(
            childConn.origin[0] / 1000,
            childConn.origin[1] / 1000,
            childConn.origin[2] / 1000,
          )

          const childConnLocalMat = new THREE.Matrix4().makeBasis(
            new THREE.Vector3(...childConn.axes[0]),
            new THREE.Vector3(...childConn.axes[1]),
            new THREE.Vector3(...childConn.axes[2]),
          )
          const childConnLocalQuat = new THREE.Quaternion()
            .setFromRotationMatrix(childConnLocalMat)

          // ── Compute child world transform so connectors align ─────────────────
          // We want: parentConnWorldQuat = childWorldQuat * childConnLocalQuat
          // So:      childWorldQuat = parentConnWorldQuat * inv(childConnLocalQuat)
          const childWorldQuat = parentConnWorldQuat
            .clone()
            .multiply(childConnLocalQuat.clone().invert())

          // Child origin in world space:
          // childConnWorldPos = childWorldPos + childWorldQuat * childConnLocalPos
          // So: childWorldPos = childConnWorldPos - childWorldQuat * childConnLocalPos
          const childConnLocalPosRotated = childConnLocalPos
            .clone()
            .applyQuaternion(childWorldQuat)

          const childWorldPos = parentConnWorldPos.clone().sub(childConnLocalPosRotated)

          // Extract euler from quaternion
          const childEuler = new THREE.Euler().setFromQuaternion(childWorldQuat, 'XYZ')

          defaultPosition = [childWorldPos.x, childWorldPos.y, childWorldPos.z]
          defaultRotation = [childEuler.x, childEuler.y, childEuler.z]
        }
      }

        const newJoint: SceneJoint = {
          instanceId,
          manifestId:       manifest.id,
          manifest,
          position:         defaultPosition,
          rotation:         defaultRotation,
          parentInstanceId: parentId ?? null,
          childInstanceIds: [],
          jointName:        `J${n}`,
          input:            childConnector ?? null,
          parent_connector: parentConnector ?? null,
        }

        set(state => {
          const updatedJoints = state.joints.map(j =>
            j.instanceId === parentId
              ? { ...j, childInstanceIds: [...j.childInstanceIds, instanceId] }
              : j
          )
          return { joints: [...updatedJoints, newJoint], selectedId: instanceId }
        })
      },

      removeJoint: (instanceId) => {
        set(state => {
          // Detach children
          const joint = state.joints.find(j => j.instanceId === instanceId)
          const detachedChildren = joint?.childInstanceIds ?? []
          return {
            joints: state.joints
              .filter(j => j.instanceId !== instanceId)
              .map(j => ({
                ...j,
                parentInstanceId:
                  j.parentInstanceId === instanceId ? null : j.parentInstanceId,
                childInstanceIds: j.childInstanceIds.filter(id => id !== instanceId),
              })),
            selectedId: state.selectedId === instanceId ? null : state.selectedId,
          }
        })
      },

      renameJoint: (instanceId: string, newName: string) => {
        set(state => ({
          joints: state.joints.map(j =>
            j.instanceId === instanceId ? { ...j, jointName: newName } : j
          ),
        }))
      },

      selectJoint: (instanceId: string | null) => set({ selectedId: instanceId }),

      moveJoint: (instanceId: string, position: [number, number, number]) =>
        set(state => ({
          joints: state.joints.map(j =>
            j.instanceId === instanceId ? { ...j, position } : j
          ),
        })),

      rotateJoint: (instanceId: string, rotation: [number, number, number]) =>
        set(state => ({
          joints: state.joints.map(j =>
            j.instanceId === instanceId ? { ...j, rotation } : j
          ),
        })),

      connectJoint: (childId, parentId, childConnector, parentConnector) =>
        set(state => ({
          joints: state.joints.map(j => {
            if (j.instanceId === childId)
              return { ...j, parentInstanceId: parentId, input: childConnector, parent_connector: parentConnector }
            if (j.instanceId === parentId)
              return { ...j, childInstanceIds: [...j.childInstanceIds, childId] }
            return j
          })
        })),

      clearScene: () => {
        linkCounter = 0
        set({ joints: [], selectedId: null })
      },

      setRobotName: (robotName) => set({ robotName }),
      toggleGrid: () => set(state => ({ gridVisible: !state.gridVisible })),
    }),
    { name: 'cobot-store' }
  )
)
