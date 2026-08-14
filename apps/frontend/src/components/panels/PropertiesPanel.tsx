import { useState } from 'react'
import * as THREE from 'three'
import { useRobotStore } from '../../store/robotStore'
import { COLORS } from '../../theme'
import { bakedQuat, bakedPositionOffset } from '../../lib/connectorMath'

export function PropertiesPanel() {
  const { joints, selectedId, removeJoint, renameJoint, selectJoint, moveJoint, rotateJoint } = useRobotStore()
  const joint = joints.find(j => j.instanceId === selectedId)

  if (!joint) {
    return (
      <div style={styles.panel}>
        <div style={styles.header}>
          <span style={styles.title}>Properties</span>
        </div>
        <div style={styles.empty}>Select a joint to inspect</div>
      </div>
    )
  }

  const { manifest } = joint

  const displayPosition = joint.displayPosition
  const displayRotation = joint.displayRotation

  const handlePosChange = (axis: 0 | 1 | 2, raw: string) => {
    const v = parseFloat(raw)
    if (isNaN(v)) return
    const next: [number, number, number] = [...displayPosition] as [number, number, number]
    next[axis] = v
    // Convert display position back to stored position
    const offset = bakedPositionOffset(joint)
    moveJoint(joint.instanceId, [
      next[0] - offset.x,
      next[1] - offset.y,
      next[2] - offset.z,
    ])
  }

  const handleRotChange = (axis: 0 | 1 | 2, raw: string) => {
    const deg = parseFloat(raw)
    if (isNaN(deg)) return
    const next: [number, number, number] = [
      displayRotation[0],
      displayRotation[1],
      displayRotation[2],
    ]
    next[axis] = deg * Math.PI / 180
    // Convert display rotation back to stored rotation
    const bq = bakedQuat(joint)
    const inputQuat = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(next[0], next[1], next[2], 'XYZ')
    )
    const stored = bq.clone().multiply(inputQuat)
    const e = new THREE.Euler().setFromQuaternion(stored, 'XYZ')
    rotateJoint(joint.instanceId, [e.x, e.y, e.z])
  }

  return (
    <div style={styles.panel}>
      <div style={styles.header}>
        <span style={styles.title}>Properties</span>
        <button
          onClick={() => { removeJoint(joint.instanceId); selectJoint(null) }}
          style={styles.deleteBtn}
          title="Remove joint"
        >
          ✕
        </button>
      </div>

      <div style={styles.body}>
        <Section label="Joint">
          <Field label="Type"  value={manifest.type}        mono />
          <Field label="Model" value={manifest.displayName}      />
          <EditableField
            label="Name"
            value={joint.jointName}
            onChange={v => renameJoint(joint.instanceId, v)}
          />
        </Section>

        <Section label="Geometry">
          <Field label="Mass" value={`${manifest.specs.mass} kg`} mono />
        </Section>

        <Section label="Performance">
          {manifest.specs.max_torque && (
            <Field label="Max torque" value={`${manifest.specs.max_torque} Nm`}  mono />
          )}
          {manifest.specs.max_speed && (
            <Field label="Max speed"  value={`${manifest.specs.max_speed} RPM`} mono />
          )}
        </Section>

        <Section label="Motor Interface">
          <Field label="Type"        value={manifest.motor_interface.type} mono />
          <Field label="Bolt circle" value={`⌀${manifest.motor_interface.flange_bolt_circle ?? '—'} mm`} mono />
          <Field label="Bolts"       value={`${manifest.motor_interface.bolt_count}× ${manifest.motor_interface.bolt_size}`} mono />
          <Field label="Max motor ⌀" value={`${manifest.motor_interface.max_motor_diameter ?? '—'} mm`} mono />
        </Section>

        {manifest.gearbox?.integrated && (
          <Section label="Integrated Gearbox">
            <Field label="Type" value={manifest.gearbox.type} mono />
            {manifest.gearbox.ratio && (
              <Field label="Ratio" value={`${manifest.gearbox.ratio}:1`} mono />
            )}
          </Section>
        )}

        <Section label="Position (m)">
          <XYZFields
            values={displayPosition}
            labels={['X', 'Y', 'Z']}
            onChange={handlePosChange}
            decimals={4}
          />
        </Section>

        <Section label="Rotation (°)">
          <XYZFields
            values={displayRotation.map(v => v * 180 / Math.PI) as [number, number, number]}
            labels={['R', 'P', 'Y']}
            onChange={handleRotChange}
            decimals={1}
          />
        </Section>

        <Section label="Kinematic Chain">
          <Field
            label="Parent"
            value={
              joint.parentInstanceId
                ? joints.find(j => j.instanceId === joint.parentInstanceId)?.jointName ?? '—'
                : 'base_link (root)'
            }
          />
          <Field label="Input"  value={joint.input            ?? '—'} mono />
          <Field label="Output" value={joint.parent_connector ?? '—'} mono />
          <Field
            label="Children"
            value={
              joint.childInstanceIds.length > 0
                ? joint.childInstanceIds
                    .map(id => joints.find(j => j.instanceId === id)?.jointName ?? id.slice(0, 8))
                    .join(', ')
                : 'none'
            }
          />
        </Section>
      </div>
    </div>
  )
}

function XYZFields({
  values, labels, onChange, decimals,
}: {
  values:   [number, number, number]
  labels:   [string, string, string]
  onChange: (axis: 0 | 1 | 2, raw: string) => void
  decimals: number
}) {
  return (
    <div style={styles.xyzRow}>
      {([0, 1, 2] as const).map(i => (
        <XYZInput
          key={i}
          label={labels[i]}
          value={values[i]}
          decimals={decimals}
          onChange={raw => onChange(i, raw)}
        />
      ))}
    </div>
  )
}

function XYZInput({
  label, value, decimals, onChange,
}: {
  label:    string
  value:    number
  decimals: number
  onChange: (raw: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft]     = useState('')
  const display               = value.toFixed(decimals)

  return (
    <div style={styles.xyzCell}>
      <span style={styles.xyzLabel}>{label}</span>
      {editing ? (
        <input
          style={styles.xyzInput}
          value={draft}
          autoFocus
          onChange={e => setDraft(e.target.value)}
          onBlur={() => { onChange(draft); setEditing(false) }}
          onKeyDown={e => {
            if (e.key === 'Enter')  { onChange(draft); setEditing(false) }
            if (e.key === 'Escape') { setEditing(false) }
          }}
        />
      ) : (
        <span
          style={styles.xyzValue}
          onClick={() => { setDraft(display); setEditing(true) }}
        >
          {display}
        </span>
      )}
    </div>
  )
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={styles.section}>
      <div style={styles.sectionLabel}>{label}</div>
      {children}
    </div>
  )
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={styles.field}>
      <span style={styles.fieldLabel}>{label}</span>
      <span style={{ ...styles.fieldValue, fontFamily: mono ? 'IBM Plex Mono, monospace' : 'Inter, sans-serif' }}>
        {value}
      </span>
    </div>
  )
}

function EditableField({ label, value, onChange }: {
  label: string; value: string; onChange: (v: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft]     = useState(value)

  return (
    <div style={styles.field}>
      <span style={styles.fieldLabel}>{label}</span>
      {editing ? (
        <input
          style={styles.inlineInput}
          value={draft}
          autoFocus
          onChange={e => setDraft(e.target.value)}
          onBlur={() => { onChange(draft); setEditing(false) }}
          onKeyDown={e => { if (e.key === 'Enter') { onChange(draft); setEditing(false) } }}
        />
      ) : (
        <span
          style={{ ...styles.fieldValue, cursor: 'text', fontFamily: 'IBM Plex Mono, monospace' }}
          onClick={() => { setDraft(value); setEditing(true) }}
        >
          {value}
        </span>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  panel: {
    width: 240, height: '100%',
    background: COLORS.panel,
    borderLeft: `1px solid ${COLORS.border}`,
    display: 'flex', flexDirection: 'column',
    fontFamily: 'Inter, sans-serif', overflow: 'hidden',
  },
  header: {
    padding: '16px 16px 12px',
    borderBottom: `1px solid ${COLORS.border}`,
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  },
  title: {
    fontSize: 11, fontWeight: 600, color: COLORS.textSecondary,
    textTransform: 'uppercase', letterSpacing: '0.1em',
    fontFamily: 'IBM Plex Mono, monospace',
  },
  deleteBtn: {
    background: 'transparent',
    border: '1px solid rgba(255,80,80,0.3)',
    color: '#ff5050', borderRadius: 5,
    padding: '2px 7px', cursor: 'pointer', fontSize: 11,
  },
  body:  { flex: 1, overflowY: 'auto', padding: '4px 0' },
  empty: {
    color: COLORS.textDim, fontSize: 12, textAlign: 'center',
    padding: 24, fontFamily: 'IBM Plex Mono, monospace',
  },
  section: {
    padding: '8px 14px',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
  },
  sectionLabel: {
    fontSize: 9, fontWeight: 600, color: '#4a5a6a',
    textTransform: 'uppercase', letterSpacing: '0.12em',
    fontFamily: 'IBM Plex Mono, monospace', marginBottom: 6,
  },
  field: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'center', padding: '3px 0', gap: 8,
  },
  fieldLabel:  { fontSize: 11, color: '#6a7a90', flexShrink: 0 },
  fieldValue:  { fontSize: 11, color: '#b0c4d8', textAlign: 'right', wordBreak: 'break-all' },
  inlineInput: {
    background: COLORS.accentGlow, border: `1px solid ${COLORS.accentBorder}`,
    borderRadius: 4, color: COLORS.accent, fontSize: 11,
    padding: '2px 6px', fontFamily: 'IBM Plex Mono, monospace',
    outline: 'none', width: 110, textAlign: 'right',
  },
  xyzRow:  { display: 'flex', gap: 4, paddingTop: 2 },
  xyzCell: { flex: 1, display: 'flex', flexDirection: 'column', gap: 2 },
  xyzLabel: {
    fontSize: 9, color: COLORS.textDim,
    fontFamily: 'IBM Plex Mono, monospace',
    textTransform: 'uppercase', letterSpacing: '0.08em',
  },
  xyzValue: {
    fontSize: 10, color: '#b0c4d8',
    fontFamily: 'IBM Plex Mono, monospace',
    cursor: 'text', padding: '2px 4px', borderRadius: 3,
    border: '1px solid transparent', textAlign: 'right' as const,
  },
  xyzInput: {
    width: '100%', background: COLORS.accentGlow,
    border: `1px solid ${COLORS.accentBorder}`, borderRadius: 3,
    color: COLORS.accent, fontSize: 10, padding: '2px 4px',
    fontFamily: 'IBM Plex Mono, monospace', outline: 'none',
    textAlign: 'right' as const, boxSizing: 'border-box' as const,
  },
}