import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { v4 as uuid } from 'uuid'
import type { SceneJoint, JointManifest } from '../types/manifest'

interface RobotStore {
  // ── Joint library (fetched from backend) ──────────────────────────────────
  library: JointManifest[]
  libraryLoading: boolean
  loadLibrary: () => Promise<void>

  // ── Scene graph ────────────────────────────────────────────────────────────
  joints: SceneJoint[]
  selectedId: string | null

  // ── Actions ────────────────────────────────────────────────────────────────
  addJoint: (manifest: JointManifest, parentId?: string) => void
  removeJoint: (instanceId: string) => void
  selectJoint: (instanceId: string | null) => void
  moveJoint: (instanceId: string, position: [number, number, number]) => void
  rotateJoint: (instanceId: string, rotation: [number, number, number]) => void
  renameLink: (instanceId: string, linkName: string) => void
  connectJoint: (childId: string, parentId: string | null) => void
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

      addJoint: (manifest, parentId) => {
        const n = ++linkCounter
        const instanceId = uuid()

        // Default position: stack above parent or at origin
        const parent = parentId ? get().joints.find(j => j.instanceId === parentId) : null
        const defaultPosition: [number, number, number] = parent
          ? [
              parent.position[0],
              parent.position[1],
              parent.position[2],
            ]
          : [0, 0, 0]

        const newJoint: SceneJoint = {
          instanceId,
          manifestId: manifest.id,
          manifest,
          position: defaultPosition,
          rotation: [0, 0, 0],
          parentInstanceId: parentId ?? null,
          childInstanceIds: [],
          linkName: `link_${n}`,
          jointName: `joint_${n}`,
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

      selectJoint: (instanceId) => set({ selectedId: instanceId }),

      moveJoint: (instanceId, position) =>
        set(state => ({
          joints: state.joints.map(j =>
            j.instanceId === instanceId ? { ...j, position } : j
          ),
        })),

      rotateJoint: (instanceId, rotation) =>
        set(state => ({
          joints: state.joints.map(j =>
            j.instanceId === instanceId ? { ...j, rotation } : j
          ),
        })),

      renameLink: (instanceId, linkName) =>
        set(state => ({
          joints: state.joints.map(j =>
            j.instanceId === instanceId ? { ...j, linkName } : j
          ),
        })),

      connectJoint: (childId, parentId) =>
        set(state => ({
          joints: state.joints.map(j => {
            if (j.instanceId === childId) return { ...j, parentInstanceId: parentId }
            if (j.instanceId === parentId)
              return { ...j, childInstanceIds: [...j.childInstanceIds, childId] }
            // Remove from old parent
            if (j.childInstanceIds.includes(childId))
              return { ...j, childInstanceIds: j.childInstanceIds.filter(id => id !== childId) }
            return j
          }),
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
