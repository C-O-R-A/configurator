import { useState } from 'react'
import { useRobotStore } from '../../store/robotStore'
import { COLORS } from '../../theme'

export function Topbar() {
  const { robotName, setRobotName, joints, clearScene, toggleGrid, gridVisible } = useRobotStore()
  const [exporting, setExporting] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState(robotName)

  const handleExport = async () => {
    if (joints.length === 0) return
    setExporting(true)
    try {
      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          robot_name: robotName,
          joints,
          links: [],
          export_formats: ['urdf_xacro', 'srdf', 'ros2_control', 'moveit_config'],
        }),
      })
      if (!res.ok) throw new Error('Export failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${robotName}_config.zip`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error(err)
      alert('Export failed — is the backend running?')
    } finally {
      setExporting(false)
    }
  }

  const handleSave = async () => {
    try {
      const res = await fetch('/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          robot_name: robotName,
          joints,
          links: [],
        }),
      })
      if (!res.ok) throw new Error('Save failed')
      alert('Configuration saved successfully!')
    } catch (err) {
      console.error(err)
      alert('Save failed — is the backend running?')
    } 
  }

  return (
    <div style={styles.bar}>
      <div style={styles.logo}>
        <img src="/logo.png" alt="CORA" style={{ width: 18, height: 18 }} />
        <span style={styles.logoText}>Configurator</span>
      </div>

      <div style={styles.divider} />

      <div style={styles.nameWrap}>
        <span style={styles.nameLabel}>Robot:</span>
        {editingName ? (
          <input
            style={styles.nameInput}
            value={nameDraft}
            autoFocus
            onChange={e => setNameDraft(e.target.value)}
            onBlur={() => { setRobotName(nameDraft); setEditingName(false) }}
            onKeyDown={e => { if (e.key === 'Enter') { setRobotName(nameDraft); setEditingName(false) } }}
          />
        ) : (
          <span style={styles.nameValue} onClick={() => { setNameDraft(robotName); setEditingName(true) }}>
            {robotName}
          </span>
        )}
      </div>

      <div style={styles.spacer} />

      <div style={styles.stat}>
        <span style={styles.statValue}>{joints.length}</span>
        <span style={styles.statLabel}>joints</span>
      </div>

      <div style={styles.divider} />

      <button onClick={toggleGrid} style={styles.iconBtn} title="Toggle grid">
        {gridVisible ? '⊞' : '⊟'}
      </button>

      <button
        onClick={clearScene}
        style={styles.iconBtn}
        title="Clear scene"
        disabled={joints.length === 0}
      >
        ⌫
      </button>

      <button
        onClick={handleExport}
        disabled={joints.length === 0 || exporting}
        style={{
          ...styles.exportBtn,
          opacity: joints.length === 0 ? 0.4 : 1,
        }}
      >
        {exporting ? 'Exporting…' : '↓ Export'}
      </button>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  bar: {
    height: 48,
    background: COLORS.background,
    borderBottom: `1px solid ${COLORS.border}`,
    display: 'flex',
    alignItems: 'center',
    padding: '0 16px',
    gap: 12,
    flexShrink: 0,
    zIndex: 100,
  },
  logo: { display: 'flex', alignItems: 'center', gap: 7 },
  logoText: {
    fontSize: 13,
    fontWeight: 600,
    color: COLORS.textPrimary,
    fontFamily: 'IBM Plex Mono, monospace',
    letterSpacing: '0.05em',
  },
  divider: { width: 1, height: 20, background: 'rgba(255,255,255,0.08)' },
  nameWrap: { display: 'flex', alignItems: 'center', gap: 7 },
  nameLabel: { fontSize: 11, color: COLORS.textDim, fontFamily: 'IBM Plex Mono, monospace' },
  nameValue: {
    fontSize: 12,
    color: '#b0c4d8',
    fontFamily: 'IBM Plex Mono, monospace',
    cursor: 'text',
    padding: '2px 6px',
    borderRadius: 4,
    border: '1px solid transparent',
  },
  nameInput: {
    background: COLORS.accentGlow,
    border: `1px solid ${COLORS.accentBorder}`,
    borderRadius: 5,
    color: COLORS.accent,
    fontSize: 12,
    padding: '3px 8px',
    fontFamily: 'IBM Plex Mono, monospace',
    outline: 'none',
  },
  spacer: { flex: 1 },
  stat: { display: 'flex', alignItems: 'baseline', gap: 4 },
  statValue: { fontSize: 14, color: COLORS.textPrimary, fontFamily: 'IBM Plex Mono, monospace', fontWeight: 500 },
  statLabel: { fontSize: 10, color: COLORS.textDim, fontFamily: 'IBM Plex Mono, monospace' },
  iconBtn: {
    background: 'transparent',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 5,
    color: COLORS.textSecondary,
    padding: '4px 9px',
    cursor: 'pointer',
    fontSize: 13,
  },
  exportBtn: {
    background: COLORS.accentDim,
    border: `1px solid ${COLORS.accentBorder}`,
    borderRadius: 6,
    color: COLORS.accent,
    padding: '6px 16px',
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 500,
    fontFamily: 'IBM Plex Mono, monospace',
    letterSpacing: '0.04em',
    transition: 'opacity 0.15s',
  },
}