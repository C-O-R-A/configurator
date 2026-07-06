import { useState, useCallback, useEffect, Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Grid, GizmoHelper, GizmoViewport, TransformControls } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { JointInstance } from './JointInstance'
import { useRobotStore } from '../../store/robotStore'
import { COLORS } from '../../theme'

type TransformMode = 'translate' | 'rotate' | null

function CameraSetup() {
  const { camera } = useThree()
  useEffect(() => {
    camera.up.set(0, 0, 1)
    camera.position.set(1.2, -1.2, 0.8)
    camera.lookAt(0, 0, 0)
  }, [camera])
  return null
}

function WorldOrigin() {
  return (
    <group>
      <mesh position={[0.05, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <cylinderGeometry args={[0.002, 0.002, 0.1, 8]} />
        <meshBasicMaterial color="#ff4444" />
      </mesh>
      <mesh position={[0, 0, -0.05]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.002, 0.002, 0.1, 8]} />
        <meshBasicMaterial color="#44ff44" />
      </mesh>
      <mesh position={[0, 0.05, 0]} rotation={[0, 0, 0]}>
        <cylinderGeometry args={[0.002, 0.002, 0.1, 8]} />
        <meshBasicMaterial color="#4488ff" />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.006, 8, 8]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
    </group>
  )
}

export function Viewport3D() {
  const { joints, selectedId, selectJoint, gridVisible } = useRobotStore()
  const [transformMode, setTransformMode]     = useState<TransformMode>('translate')
  const [selectedNode, setSelectedNode]       = useState<THREE.Group | null>(null)
  const [moveJoint, rotateJoint]              = useRobotStore(s => [s.moveJoint, s.rotateJoint])

  // Clear selected node when selection changes
  useEffect(() => {
    setSelectedNode(null)
  }, [selectedId])

  const handleNodeReady = useCallback((instanceId: string, node: THREE.Group | null) => {
    if (instanceId === selectedId) {
      setSelectedNode(node)
    }
  }, [selectedId])

  const handleTransformChange = useCallback(() => {
    if (!selectedNode || !selectedId) return
    const pos = selectedNode.position
    const rot = selectedNode.rotation
    moveJoint(selectedId, [pos.x, pos.y, pos.z])
    rotateJoint(selectedId, [rot.x, rot.y, rot.z])
  }, [selectedNode, selectedId, moveJoint, rotateJoint])

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div style={{
        position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
        zIndex: 10, display: 'flex', gap: 4, background: 'rgba(16,20,28,0.85)',
        border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: '4px 6px',
        backdropFilter: 'blur(8px)',
      }}>
        {(['translate', 'rotate'] as const).map(mode => (
          <button
            key={mode}
            onClick={() => setTransformMode(transformMode === mode ? null : mode)}
            style={{
              background: transformMode === mode ? COLORS.accentDim    : 'transparent',
              border:     transformMode === mode ? `1px solid ${COLORS.accent}` : '1px solid transparent',
              color:      transformMode === mode ? COLORS.accent        : COLORS.textSecondary,
              borderRadius: 5,
              padding: '4px 12px',
              cursor: 'pointer',
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: 11,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
            }}
          >
            {mode === 'translate' ? '↔ Move' : '↻ Rotate'}
          </button>
        ))}
      </div>

      {joints.length === 0 && (
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 5, pointerEvents: 'none', textAlign: 'center',
        }}>
          <div style={{ color: 'rgba(138,154,176,0.4)', fontSize: 13, fontFamily: 'IBM Plex Mono, monospace' }}>
            click + on a joint to place it
          </div>
        </div>
      )}

      <Canvas
        camera={{ fov: 45, near: 0.001, far: 100 }}
        gl={{ antialias: true, alpha: false }}
        style={{ background: COLORS.background }}
        onPointerMissed={() => selectJoint(null)}
        shadows
      >
        <Suspense fallback={null}>
          <CameraSetup />

          <ambientLight intensity={0.4} />
          <directionalLight
            position={[3, 5, 3]}
            intensity={1.2}
            castShadow
            shadow-mapSize={[2048, 2048]}
          />
          <pointLight position={[-2, 2, -2]} intensity={0.5} color="#4080ff" />
          <fog attach="fog" args={[COLORS.background, 8, 25]} />

          {/* TransformControls at scene root — not inside rotated group */}
          {selectedId && selectedNode && transformMode && (
            <TransformControls
              object={selectedNode}
              mode={transformMode}
              onObjectChange={handleTransformChange}
              size={0.6}
            />
          )}

          {/* Z-up scene */}
          <group rotation={[Math.PI / 2, 0, 0]}>
            {gridVisible && (
              <Grid
                args={[10, 10]}
                cellSize={0.1}
                cellThickness={1.0}
                cellColor="#1e2a38"
                sectionSize={0.5}
                sectionThickness={2}
                sectionColor="#1e3a58"
                fadeDistance={8}
                fadeStrength={1}
                followCamera={false}
                infiniteGrid
                position={[0, 0, 0]}
              />
            )}

            <WorldOrigin />

            {joints.map(joint => (
              <JointInstance
                key={joint.instanceId}
                joint={joint}
                isSelected={joint.instanceId === selectedId}
                onNodeReady={(node) => handleNodeReady(joint.instanceId, node)}
              />
            ))}
          </group>

          <OrbitControls
            makeDefault
            enableDamping
            dampingFactor={0.05}
            minDistance={0.1}
            maxDistance={10}
            mouseButtons={{
              LEFT:   THREE.MOUSE.PAN,
              MIDDLE: THREE.MOUSE.DOLLY,
              RIGHT:  THREE.MOUSE.ROTATE,
            }}
          />

          <GizmoHelper alignment="top-right" margin={[60, 60]}>
            <GizmoViewport
              axisColors={['#ff4444', '#44ff44', '#4488ff']}
              labelColor="white"
            />
          </GizmoHelper>
        </Suspense>
      </Canvas>
    </div>
  )
}