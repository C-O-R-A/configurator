import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { v4 as uuid } from 'uuid'
import type { SceneJoint, JointManifest } from '../types/manifest'
import * as THREE from 'three'
import { bakedQuat, bakedPositionOffset, makeRotMat} from '../lib/connectorMath'

function snapshot(state: { joints: SceneJoint[]; selectedId: string | null }) {
  return {
    joints:     JSON.parse(JSON.stringify(state.joints)),
    selectedId: state.selectedId,
  }
}

interface RobotStore {
  library:        JointManifest[]
  libraryLoading: boolean
  loadLibrary:    () => Promise<void>

  joints:     SceneJoint[]
  selectedId: string | null

  past:   { joints: SceneJoint[]; selectedId: string | null }[]
  future: { joints: SceneJoint[]; selectedId: string | null }[]
  undo:   () => void
  redo:   () => void

  addJoint: (
    manifest:         JointManifest,
    parentId?:        string,
    childConnector?:  'joint_in' | 'joint_out' | null,
    parentConnector?: 'joint_in' | 'joint_out' | null,
  ) => void
  removeJoint:  (instanceId: string) => void
  selectJoint:  (instanceId: string | null) => void
  renameJoint:  (instanceId: string, newName: string) => void
  moveJoint:    (instanceId: string, position: [number, number, number]) => void
  rotateJoint:  (instanceId: string, rotation: [number, number, number]) => void
  connectJoint: (
    childId:         string,
    parentId:        string | null,
    childConnector:  'joint_in' | 'joint_out',
    parentConnector: 'joint_in' | 'joint_out',
  ) => void
  clearScene: () => void

  robotName:    string
  setRobotName: (name: string) => void
  gridVisible:  boolean
  toggleGrid:   () => void
}

let linkCounter = 0

export const useRobotStore = create<RobotStore>()(
  devtools(
    (set, get) => ({
      library:        [],
      libraryLoading: false,
      joints:         [],
      selectedId:     null,
      past:           [],
      future:         [],
      robotName:      'my_robot',
      gridVisible:    true,

      undo: () => set(state => {
        if (state.past.length === 0) return state
        const prev    = state.past[state.past.length - 1]
        const newPast = state.past.slice(0, -1)
        return {
          joints:     prev.joints,
          selectedId: prev.selectedId,
          past:       newPast,
          future:     [snapshot(state), ...state.future],
        }
      }),

      redo: () => set(state => {
        if (state.future.length === 0) return state
        const next      = state.future[0]
        const newFuture = state.future.slice(1)
        return {
          joints:     next.joints,
          selectedId: next.selectedId,
          past:       [...state.past, snapshot(state)],
          future:     newFuture,
        }
      }),

      loadLibrary: async () => {
        set({ libraryLoading: true })
        try {
          const res  = await fetch('/api/joints')
          const data = await res.json()
          set({ library: data, libraryLoading: false })
        } catch (err) {
          console.error('Failed to load joint library:', err)
          set({ libraryLoading: false })
        }
      },

      addJoint: (manifest, parentId, childConnector, parentConnector) => {
        set(state => ({ past: [...state.past, snapshot(state)], future: [] }))

        const n          = ++linkCounter
        const instanceId = uuid()
        const parent     = parentId
          ? get().joints.find(j => j.instanceId === parentId)
          : null

        let defaultPosition: [number, number, number] = [0, 0, 0]
        let defaultRotation: [number, number, number] = [0, 0, 0]

        if (parent && parentConnector && childConnector) {
          const parentConn = parent.manifest.connectors.find(c => c.name === parentConnector)
          const childConn  = manifest.connectors.find(c => c.name === childConnector)

          if (parentConn && childConn) {
            const childConnQuat = new THREE.Quaternion()
              .setFromRotationMatrix(makeRotMat(childConn.axes))

            const localQuat  = childConnQuat.clone().invert()
            const childEuler = new THREE.Euler().setFromQuaternion(localQuat, 'XYZ')

            defaultRotation = [childEuler.x, childEuler.y, childEuler.z]

            const childConnLocalPos = new THREE.Vector3(
              childConn.origin[0] / 1000,
              childConn.origin[1] / 1000,
              childConn.origin[2] / 1000,
            )
            const rotatedOffset = childConnLocalPos.clone().applyQuaternion(localQuat)

            defaultPosition = [
              -rotatedOffset.x,
              -rotatedOffset.y,
              -rotatedOffset.z,
            ]
          }
        }

        const newJoint: SceneJoint = {
          instanceId,
          manifestId:       manifest.jid,
          manifest,
          position:         defaultPosition,
          rotation:         defaultRotation,
          offset_position:    [0, 0, 0],
          offset_rotation:    [0, 0, 0],
          parentInstanceId: parentId ?? null,
          childInstanceIds: [],
          jointName:        `J${n}`,
          input_connector:  childConnector  ?? null,
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
        set(state => ({ past: [...state.past, snapshot(state)], future: [] }))
        set(state => ({
          joints: state.joints
            .filter(j => j.instanceId !== instanceId)
            .map(j => ({
              ...j,
              parentInstanceId: j.parentInstanceId === instanceId ? null : j.parentInstanceId,
              childInstanceIds: j.childInstanceIds.filter(id => id !== instanceId),
            })),
          selectedId: state.selectedId === instanceId ? null : state.selectedId,
        }))
      },

      renameJoint: (instanceId, newName) => {
        set(state => ({ past: [...state.past, snapshot(state)], future: [] }))
        set(state => ({
          joints: state.joints.map(j =>
            j.instanceId === instanceId ? { ...j, jointName: newName } : j
          ),
        }))
      },

      selectJoint: (instanceId) => set({ selectedId: instanceId }),

      moveJoint: (instanceId, position) => {
        set(state => ({ past: [...state.past, snapshot(state)], future: [] }))
        set(state => ({
          joints: state.joints.map(j => {
            if (j.instanceId !== instanceId) return j
            const offset = bakedPositionOffset(j)
            const offset_position: [number, number, number] = [
              position[0] + offset.x,
              position[1] + offset.y,
              position[2] + offset.z,
            ]
            return { ...j, position, offset_position }
          }),
        }))
      },

      rotateJoint: (instanceId, rotation) => {
        set(state => ({ past: [...state.past, snapshot(state)], future: [] }))
        set(state => ({
          joints: state.joints.map(j => {
            if (j.instanceId !== instanceId) return j
            const bq         = bakedQuat(j)
            const storedQuat = new THREE.Quaternion().setFromEuler(
              new THREE.Euler(rotation[0], rotation[1], rotation[2], 'XYZ')
            )
            const displayQuat  = bq.clone().invert().multiply(storedQuat)
            const displayEuler = new THREE.Euler().setFromQuaternion(displayQuat, 'XYZ')
            const displayRotation: [number, number, number] = [
              displayEuler.x, displayEuler.y, displayEuler.z,
            ]
            return { ...j, rotation, displayRotation }
          }),
        }))
      },

      connectJoint: (childId, parentId, childConnector, parentConnector) => {
        set(state => ({ past: [...state.past, snapshot(state)], future: [] }))
        set(state => ({
          joints: state.joints.map(j => {
            if (j.instanceId === childId)
              return { ...j, parentInstanceId: parentId, input_connector: childConnector, parent_connector: parentConnector }
            if (parentId && j.instanceId === parentId)
              return { ...j, childInstanceIds: [...j.childInstanceIds, childId] }
            return j
          }),
        }))
      },

      clearScene: () => {
        set(state => ({ past: [...state.past, snapshot(state)], future: [] }))
        linkCounter = 0
        set({ joints: [], selectedId: null })
      },

      setRobotName: (robotName) => set({ robotName }),
      toggleGrid:   () => set(state => ({ gridVisible: !state.gridVisible })),
    }),
    { name: 'cobot-store' }
  )
)