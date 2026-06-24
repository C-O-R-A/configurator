import { useState } from 'react'
import { useRobotStore } from '../../store/robotStore'

export function PropertiesPanel() {
  const { joints, selectedId, removeJoint, renameLink, selectJoint } = useRobotStore()
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

  const { manifest, motorConfig, gearboxConfig } = joint

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
        {/* Identity */}
        <Section label="Joint">
          <Field label="Type" value={manifest.type} mono />
          <Field label="Model" value={manifest.displayName} />
          <EditableField
            label="Link name"
            value={joint.linkName}
            onChange={v => renameLink(joint.instanceId, v)}
          />
          <Field label="Joint name" value={joint.jointName} mono />
        </Section>

        {/* Geometry */}
        <Section label="Geometry">
          <Field label="Flange ⌀" value={`${manifest.params.flange_diameter} mm`} mono />
          <Field label="Housing ⌀" value={`${manifest.params.housing_diameter} mm`} mono />
          <Field label="Length" value={`${manifest.params.length} mm`} mono />
          <Field label="Mass" value={`${manifest.params.mass} kg`} mono />
        </Section>

        {/* Performance */}
        <Section label="Performance">
          {manifest.params.max_torque && (
            <Field label="Max torque" value={`${manifest.params.max_torque} Nm`} mono />
          )}
          {manifest.params.max_force && (
            <Field label="Max force" value={`${manifest.params.max_force} N`} mono />
          )}
          {manifest.params.stroke && (
            <Field label="Stroke" value={`${manifest.params.stroke} mm`} mono />
          )}
          {manifest.params.max_speed && (
            <Field label="Max speed" value={`${manifest.params.max_speed} RPM`} mono />
          )}
        </Section>

        {/* Motor interface */}
        <Section label="Motor Interface">
          <Field label="Type" value={manifest.motor_interface.type} mono />
          <Field label="Bolt circle" value={`⌀${manifest.motor_interface.flange_bolt_circle} mm`} mono />
          <Field label="Bolts" value={`${manifest.motor_interface.bolt_count}× ${manifest.motor_interface.bolt_size}`} mono />
          <Field label="Max motor ⌀" value={`${manifest.motor_interface.max_motor_diameter} mm`} mono />
        </Section>

        {/* Gearbox (if integrated) */}
        {manifest.gearbox?.integrated && (
          <Section label="Integrated Gearbox">
            <Field label="Type" value={manifest.gearbox.type} mono />
            {manifest.gearbox.ratio && (
              <Field label="Ratio" value={`${manifest.gearbox.ratio}:1`} mono />
            )}
          </Section>
        )}

        {/* Position (read-only display) */}
        <Section label="Transform">
          <Field
            label="Position"
            value={joint.position.map(v => v.toFixed(4)).join(', ')}
            mono
          />
          <Field
            label="Rotation"
            value={joint.rotation.map(v => (v * 180 / Math.PI).toFixed(1) + '°').join(', ')}
            mono
          />
        </Section>

        {/* Motor assignment */}
        <Section label="Motor">
          {motorConfig ? (
            <>
              <Field label="Name" value={motorConfig.name} />
              <Field label="Rated torque" value={`${motorConfig.rated_torque} Nm`} mono />
              <Field label="Rated speed" value={`${motorConfig.rated_speed} RPM`} mono />
            </>
          ) : (
            <div style={styles.unassigned}>No motor assigned</div>
          )}
        </Section>

        {/* Parent/child */}
        <Section label="Kinematic Chain">
          <Field
            label="Parent"
            value={
              joint.parentInstanceId
                ? joints.find(j => j.instanceId === joint.parentInstanceId)?.linkName ?? '—'
                : 'base_link (root)'
            }
          />
          <Field
            label="Children"
            value={
              joint.childInstanceIds.length > 0
                ? joint.childInstanceIds
                    .map(id => joints.find(j => j.instanceId === id)?.linkName ?? id.slice(0, 8))
                    .join(', ')
                : 'none'
            }
          />
        </Section>
      </div>
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
  const [draft, setDraft] = useState(value)

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
    width: 240,
    height: '100%',
    background: '#10141c',
    borderLeft: '1px solid rgba(255,255,255,0.06)',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: 'Inter, sans-serif',
    overflow: 'hidden',
  },
  header: {
    padding: '16px 16px 12px',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 11,
    fontWeight: 600,
    color: '#8a9ab0',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    fontFamily: 'IBM Plex Mono, monospace',
  },
  deleteBtn: {
    background: 'transparent',
    border: '1px solid rgba(255,80,80,0.3)',
    color: '#ff5050',
    borderRadius: 5,
    padding: '2px 7px',
    cursor: 'pointer',
    fontSize: 11,
  },
  body: { flex: 1, overflowY: 'auto', padding: '4px 0' },
  empty: {
    color: '#4a5568',
    fontSize: 12,
    textAlign: 'center',
    padding: 24,
    fontFamily: 'IBM Plex Mono, monospace',
  },
  unassigned: {
    color: '#4a5568',
    fontSize: 11,
    fontFamily: 'IBM Plex Mono, monospace',
    padding: '2px 0',
  },
  section: {
    padding: '8px 14px',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
  },
  sectionLabel: {
    fontSize: 9,
    fontWeight: 600,
    color: '#4a5a6a',
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
    fontFamily: 'IBM Plex Mono, monospace',
    marginBottom: 6,
  },
  field: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '3px 0',
    gap: 8,
  },
  fieldLabel: { fontSize: 11, color: '#6a7a90', flexShrink: 0 },
  fieldValue: { fontSize: 11, color: '#b0c4d8', textAlign: 'right', wordBreak: 'break-all' },
  inlineInput: {
    background: 'rgba(0,229,255,0.08)',
    border: '1px solid rgba(0,229,255,0.4)',
    borderRadius: 4,
    color: '#00e5ff',
    fontSize: 11,
    padding: '2px 6px',
    fontFamily: 'IBM Plex Mono, monospace',
    outline: 'none',
    width: 110,
    textAlign: 'right',
  },
}
