import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { v4 as uuid } from 'uuid'
import type { SceneJoint, JointManifest } from '../types/manifest'

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

        // localPosition/localRotation is the child-input-connector pose
        // expressed in the parent-output-connector frame. On connect, those
        // two connectors coincide by definition — so this is always zero.
        // Root joints (no parent) spawn at the world origin.
        const defaultPosition: [number, number, number] = [0, 0, 0]
        const defaultRotation: [number, number, number] = [0, 0, 0]

        const newJoint: SceneJoint = {
          instanceId,
          manifestId:       manifest.jid,
          manifest,
          localPosition:    defaultPosition,
          localRotation:    defaultRotation,
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

      // localPosition IS the value the user edits — no mesh-space conversion.
      moveJoint: (instanceId, position) => {
        set(state => ({ past: [...state.past, snapshot(state)], future: [] }))
        set(state => ({
          joints: state.joints.map(j =>
            j.instanceId === instanceId ? { ...j, localPosition: position } : j
          ),
        }))
      },

      // localRotation IS the value the user edits — no bakedQuat round trip.
      rotateJoint: (instanceId, rotation) => {
        set(state => ({ past: [...state.past, snapshot(state)], future: [] }))
        set(state => ({
          joints: state.joints.map(j =>
            j.instanceId === instanceId ? { ...j, localRotation: rotation } : j
          ),
        }))
      },

      connectJoint: (childId, parentId, childConnector, parentConnector) => {
        set(state => ({ past: [...state.past, snapshot(state)], future: [] }))
        set(state => ({
          joints: state.joints.map(j => {
            if (j.instanceId === childId)
              return {
                ...j,
                parentInstanceId: parentId,
                input_connector: childConnector,
                parent_connector: parentConnector,
                // re-connecting also resets to the identity frame
                localPosition: [0, 0, 0],
                localRotation: [0, 0, 0],
              }
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