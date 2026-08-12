import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { v4 as uuid } from 'uuid'
import type { SceneJoint, JointManifest } from '../types/manifest'
import * as THREE from 'three'

/**
 * Returns the world transform of the JOINT ATTACHMENT FRAME.
 *
 * IMPORTANT:
 * joint.position is the offset from the parent's selected connector.
 * It is NOT the position of the joint's physical/model origin.
 *
 * Therefore:
 *
 *   parent connector
 *        +
 *   joint.position
 *        =
 *   child input connector
 *
 * The child model is rendered relative to its input connector in
 * JointInstance.tsx.
 */
function computeJointWorldTransform(
  joint: SceneJoint,
  joints: SceneJoint[],
): {
  position: THREE.Vector3
  quaternion: THREE.Quaternion
} {
  const localPosition = new THREE.Vector3(...joint.position)

  const localQuaternion = new THREE.Quaternion().setFromEuler(
    new THREE.Euler(
      joint.rotation[0],
      joint.rotation[1],
      joint.rotation[2],
      'XYZ',
    ),
  )

  if (!joint.parentInstanceId) {
    return {
      position: localPosition,
      quaternion: localQuaternion,
    }
  }

  const parent = joints.find(
    j => j.instanceId === joint.parentInstanceId,
  )

  if (!parent) {
    return {
      position: localPosition,
      quaternion: localQuaternion,
    }
  }

  const parentWorld = computeJointWorldTransform(parent, joints)

  /**
   * The child attachment frame is positioned relative to the parent
   * attachment frame.
   *
   * DO NOT add the child's input connector origin here.
   *
   * The input connector is the local origin of the rendered child
   * assembly, so adding connector_local here double-counts the offset.
   */
  const worldPosition = localPosition
    .clone()
    .applyQuaternion(parentWorld.quaternion)
    .add(parentWorld.position)

  const worldQuaternion = parentWorld.quaternion
    .clone()
    .multiply(localQuaternion)

  return {
    position: worldPosition,
    quaternion: worldQuaternion,
  }
}

interface RobotStore {
  library: JointManifest[]
  libraryLoading: boolean
  loadLibrary: () => Promise<void>

  joints: SceneJoint[]
  selectedId: string | null

  addJoint: (
    manifest: JointManifest,
    parentId?: string,
    childConnector?: 'joint_in' | 'joint_out' | null,
    parentConnector?: 'joint_in' | 'joint_out' | null,
  ) => void

  removeJoint: (instanceId: string) => void
  selectJoint: (instanceId: string | null) => void
  renameJoint: (instanceId: string, newName: string) => void
  moveJoint: (
    instanceId: string,
    position: [number, number, number],
  ) => void
  rotateJoint: (
    instanceId: string,
    rotation: [number, number, number],
  ) => void

  connectJoint: (
    childId: string,
    parentId: string | null,
    childConnector: 'joint_in' | 'joint_out',
    parentConnector: 'joint_in' | 'joint_out',
  ) => void

  clearScene: () => void

  past: {
    joints: SceneJoint[]
    selectedId: string | null
  }[]

  future: {
    joints: SceneJoint[]
    selectedId: string | null
  }[]

  undo: () => void
  redo: () => void

  robotName: string
  setRobotName: (name: string) => void

  gridVisible: boolean
  toggleGrid: () => void
}

let linkCounter = 0

export const useRobotStore = create<RobotStore>()(
  devtools(
    (set, get) => ({
      library: [],
      libraryLoading: false,

      joints: [],
      past: [],
      future: [],
      selectedId: null,

      robotName: 'my_robot',
      gridVisible: true,

      undo: () => {
        set(state => {
          if (state.past.length === 0) return state

          const prev = state.past[state.past.length - 1]
          const newPast = state.past.slice(0, -1)

          const snapshot = {
            joints: JSON.parse(JSON.stringify(state.joints)),
            selectedId: state.selectedId,
          }

          return {
            joints: prev.joints,
            selectedId: prev.selectedId,
            past: newPast,
            future: [snapshot, ...state.future],
          }
        })
      },

      redo: () => {
        set(state => {
          if (state.future.length === 0) return state

          const next = state.future[0]
          const newFuture = state.future.slice(1)

          const snapshot = {
            joints: JSON.parse(JSON.stringify(state.joints)),
            selectedId: state.selectedId,
          }

          return {
            joints: next.joints,
            selectedId: next.selectedId,
            past: [...state.past, snapshot],
            future: newFuture,
          }
        })
      },

      loadLibrary: async () => {
        set({ libraryLoading: true })

        try {
          const res = await fetch('/api/joints')
          const data = await res.json()

          set({
            library: data,
            libraryLoading: false,
          })
        } catch (err) {
          console.error('Failed to load joint library:', err)

          set({
            libraryLoading: false,
          })
        }
      },

      addJoint: (
        manifest,
        parentId,
        childConnector,
        parentConnector,
      ) => {
        set(state => ({
          past: [
            ...state.past,
            {
              joints: JSON.parse(JSON.stringify(state.joints)),
              selectedId: state.selectedId,
            },
          ],
          future: [],
        }))

        const n = ++linkCounter
        const instanceId = uuid()

        const parent = parentId
          ? get().joints.find(
              j => j.instanceId === parentId,
            )
          : null

        const defaultPosition: [number, number, number] = [0, 0, 0]

        let defaultRotation: [number, number, number] = [0, 0, 0]

        if (
          parent &&
          parentConnector &&
          childConnector
        ) {
          const parentConn =
            parent.manifest.connectors.find(
              c => c.name === parentConnector,
            )

          const childConn =
            manifest.connectors.find(
              c => c.name === childConnector,
            )

          if (parentConn && childConn) {
            const parentConnQuat =
              new THREE.Quaternion().setFromRotationMatrix(
                new THREE.Matrix4().makeBasis(
                  new THREE.Vector3(...parentConn.axes[0]),
                  new THREE.Vector3(...parentConn.axes[1]),
                  new THREE.Vector3(...parentConn.axes[2]),
                ),
              )

            const childConnQuat =
              new THREE.Quaternion().setFromRotationMatrix(
                new THREE.Matrix4().makeBasis(
                  new THREE.Vector3(...childConn.axes[0]),
                  new THREE.Vector3(...childConn.axes[1]),
                  new THREE.Vector3(...childConn.axes[2]),
                ),
              )

            const localQuaternion = parentConnQuat
              .clone()
              .multiply(childConnQuat.clone().invert())

            const childEuler =
              new THREE.Euler().setFromQuaternion(
                localQuaternion,
                'XYZ',
              )

            defaultRotation = [
              childEuler.x,
              childEuler.y,
              childEuler.z,
            ]
          }
        }

        const newJoint: SceneJoint = {
          instanceId,
          manifestId: manifest.id,
          manifest,

          // This is now an offset FROM THE PARENT CONNECTOR,
          // not an offset from the child's physical origin.
          position: defaultPosition,

          rotation: defaultRotation,

          parentInstanceId: parentId ?? null,
          childInstanceIds: [],

          jointName: `J${n}`,

          input: childConnector ?? null,
          parent_connector: parentConnector ?? null,
        }

        set(state => {
          const updatedJoints =
            state.joints.map(j =>
              j.instanceId === parentId
                ? {
                    ...j,
                    childInstanceIds: [
                      ...j.childInstanceIds,
                      instanceId,
                    ],
                  }
                : j,
            )

          return {
            joints: [...updatedJoints, newJoint],
            selectedId: instanceId,
          }
        })
      },

      removeJoint: instanceId => {
        set(state => ({
          past: [
            ...state.past,
            {
              joints: JSON.parse(
                JSON.stringify(state.joints),
              ),
              selectedId: state.selectedId,
            },
          ],
          future: [],
        }))

        set(state => {
          const joint = state.joints.find(
            j => j.instanceId === instanceId,
          )

          return {
            joints: state.joints
              .filter(j => j.instanceId !== instanceId)
              .map(j => ({
                ...j,

                parentInstanceId:
                  j.parentInstanceId === instanceId
                    ? null
                    : j.parentInstanceId,

                childInstanceIds:
                  j.childInstanceIds.filter(
                    id => id !== instanceId,
                  ),
              })),

            selectedId:
              state.selectedId === instanceId
                ? null
                : state.selectedId,
          }
        })
      },

      renameJoint: (instanceId, newName) => {
        set(state => ({
          past: [
            ...state.past,
            {
              joints: JSON.parse(
                JSON.stringify(state.joints),
              ),
              selectedId: state.selectedId,
            },
          ],
          future: [],
        }))

        set(state => ({
          joints: state.joints.map(j =>
            j.instanceId === instanceId
              ? { ...j, jointName: newName }
              : j,
          ),
        }))
      },

      selectJoint: instanceId =>
        set({ selectedId: instanceId }),

      moveJoint: (instanceId, position) => {
        set(state => ({
          past: [
            ...state.past,
            {
              joints: JSON.parse(
                JSON.stringify(state.joints),
              ),
              selectedId: state.selectedId,
            },
          ],
          future: [],
        }))

        set(state => ({
          joints: state.joints.map(j =>
            j.instanceId === instanceId
              ? { ...j, position }
              : j,
          ),
        }))
      },

      rotateJoint: (instanceId, rotation) => {
        set(state => ({
          past: [
            ...state.past,
            {
              joints: JSON.parse(
                JSON.stringify(state.joints),
              ),
              selectedId: state.selectedId,
            },
          ],
          future: [],
        }))

        set(state => ({
          joints: state.joints.map(j =>
            j.instanceId === instanceId
              ? { ...j, rotation }
              : j,
          ),
        }))
      },

      connectJoint: (
        childId,
        parentId,
        childConnector,
        parentConnector,
      ) => {
        set(state => ({
          past: [
            ...state.past,
            {
              joints: JSON.parse(
                JSON.stringify(state.joints),
              ),
              selectedId: state.selectedId,
            },
          ],
          future: [],
        }))

        set(state => ({
          joints: state.joints.map(j => {
            if (j.instanceId === childId) {
              return {
                ...j,
                parentInstanceId: parentId,
                input: childConnector,
                parent_connector: parentConnector,
              }
            }

            if (j.instanceId === parentId) {
              return {
                ...j,
                childInstanceIds: [
                  ...j.childInstanceIds,
                  childId,
                ],
              }
            }

            return j
          }),
        }))
      },

      clearScene: () => {
        set(state => ({
          past: [
            ...state.past,
            {
              joints: JSON.parse(
                JSON.stringify(state.joints),
              ),
              selectedId: state.selectedId,
            },
          ],
          future: [],
        }))

        linkCounter = 0

        set({
          joints: [],
          selectedId: null,
        })
      },

      setRobotName: robotName =>
        set({ robotName }),

      toggleGrid: () =>
        set(state => ({
          gridVisible: !state.gridVisible,
        })),
    }),

    {
      name: 'cobot-store',
    },
  ),
)

