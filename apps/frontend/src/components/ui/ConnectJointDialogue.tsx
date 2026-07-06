import { useState } from 'react'
import { COLORS } from '../../theme'

type ConnectorName = 'joint_in' | 'joint_out'

interface ConnectJointDialogProps {
  childName:  string    // e.g. "Revolute Large"
  parentName: string    // e.g. "link_1"
  onConfirm:  (childConnector: ConnectorName, parentConnector: ConnectorName) => void
  onCancel:   () => void
}

export function ConnectJointDialog({
  childName,
  parentName,
  onConfirm,
  onCancel,
}: ConnectJointDialogProps) {
  const [childConnector,  setChildConnector]  = useState<ConnectorName>('joint_in')
  const [parentConnector, setParentConnector] = useState<ConnectorName>('joint_out')

  return (
    <div style={styles.overlay}>
      <div style={styles.dialog}>
        <div style={styles.title}>Connect Joint</div>

        <div style={styles.row}>
          <div style={styles.side}>
            <div style={styles.sideLabel}>This joint</div>
            <div style={styles.sideName}>{childName}</div>
            <ConnectorPicker value={childConnector} onChange={setChildConnector} />
          </div>

          <div style={styles.arrow}>→</div>

          <div style={styles.side}>
            <div style={styles.sideLabel}>Parent joint</div>
            <div style={styles.sideName}>{parentName}</div>
            <ConnectorPicker value={parentConnector} onChange={setParentConnector} />
          </div>
        </div>

        <div style={styles.preview}>
          <code style={styles.previewCode}>
            {parentName}_{parentConnector} ← {childName.toLowerCase().replace(' ', '_')}_{childConnector}
          </code>
        </div>

        <div style={styles.buttons}>
          <button style={styles.cancelBtn} onClick={onCancel}>Cancel</button>
          <button
            style={styles.confirmBtn}
            onClick={() => onConfirm(childConnector, parentConnector)}
          >
            Connect
          </button>
        </div>
      </div>
    </div>
  )
}

function ConnectorPicker({
  value,
  onChange,
}: {
  value:    ConnectorName
  onChange: (v: ConnectorName) => void
}) {
  return (
    <div style={styles.pickerRow}>
      {(['joint_in', 'joint_out'] as const).map(name => (
        <button
          key={name}
          onClick={() => onChange(name)}
          style={{
            ...styles.pickerBtn,
            background: value === name ? COLORS.accentDim   : 'transparent',
            border:     value === name ? `1px solid ${COLORS.accent}` : `1px solid ${COLORS.border}`,
            color:      value === name ? COLORS.accent       : COLORS.textSecondary,
          }}
        >
          {name === 'joint_in' ? '→ in' : 'out →'}
        </button>
      ))}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position:       'fixed',
    inset:          0,
    background:     'rgba(0,0,0,0.6)',
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    zIndex:         1000,
    backdropFilter: 'blur(4px)',
  },
  dialog: {
    background:   '#161b22',
    border:       `1px solid ${COLORS.border}`,
    borderRadius: 10,
    padding:      24,
    width:        380,
    display:      'flex',
    flexDirection:'column',
    gap:          16,
    fontFamily:   'Inter, sans-serif',
  },
  title: {
    fontSize:      13,
    fontWeight:    600,
    color:         COLORS.textPrimary,
    fontFamily:    'IBM Plex Mono, monospace',
    letterSpacing: '0.05em',
  },
  row: {
    display:    'flex',
    alignItems: 'center',
    gap:        12,
  },
  side: {
    flex:          1,
    display:       'flex',
    flexDirection: 'column',
    gap:           6,
  },
  sideLabel: {
    fontSize: 9,
    color:    COLORS.textDim,
    fontFamily: 'IBM Plex Mono, monospace',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
  },
  sideName: {
    fontSize:   12,
    color:      COLORS.textPrimary,
    fontWeight: 500,
  },
  arrow: {
    fontSize: 18,
    color:    COLORS.textDim,
    flexShrink: 0,
  },
  pickerRow: {
    display: 'flex',
    gap:     6,
  },
  pickerBtn: {
    flex:        1,
    padding:     '5px 0',
    borderRadius: 5,
    cursor:      'pointer',
    fontSize:    11,
    fontFamily:  'IBM Plex Mono, monospace',
    textAlign:   'center',
  },
  preview: {
    background:   '#0d1117',
    borderRadius: 6,
    padding:      '8px 12px',
  },
  previewCode: {
    fontSize:   10,
    color:      COLORS.textSecondary,
    fontFamily: 'IBM Plex Mono, monospace',
  },
  buttons: {
    display:        'flex',
    justifyContent: 'flex-end',
    gap:            8,
  },
  cancelBtn: {
    background:   'transparent',
    border:       `1px solid ${COLORS.border}`,
    borderRadius: 6,
    color:        COLORS.textSecondary,
    padding:      '6px 16px',
    cursor:       'pointer',
    fontSize:     12,
    fontFamily:   'IBM Plex Mono, monospace',
  },
  confirmBtn: {
    background:   COLORS.accentDim,
    border:       `1px solid ${COLORS.accentBorder}`,
    borderRadius: 6,
    color:        COLORS.accent,
    padding:      '6px 16px',
    cursor:       'pointer',
    fontSize:     12,
    fontFamily:   'IBM Plex Mono, monospace',
  },
}