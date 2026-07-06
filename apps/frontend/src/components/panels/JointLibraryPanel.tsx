import { useState } from 'react'
import { useRobotStore } from '../../store/robotStore'
import type { JointManifest, JointType } from '../../types/manifest'
import { COLORS } from '../../theme'
import { ConnectJointDialog } from '../ui/ConnectJointDialogue'

type ConnectorName = 'joint_in' | 'joint_out'

const TYPE_BADGE_COLORS: Record<JointType, string> = {
  revolute:   '#0077b6',
  prismatic:  '#2d6a4f',
  continuous: '#0077b6',
  universal:  '#5c2d6e',
  spherical:  '#6e2d2d',
  fixed:      '#3a3a3a',
}

const TYPE_ICONS: Record<JointType, string> = {
  revolute:   '↻',
  prismatic:  '↕',
  continuous: '∞',
  universal:  '✦',
  spherical:  '◎',
  fixed:      '⬛',
}

export function JointLibraryPanel() {
  const { library, libraryLoading, addJoint, selectedId, joints } = useRobotStore()
  const [search, setSearch]           = useState('')
  const [filterType, setFilterType]   = useState<JointType | 'all'>('all')
  const [pendingManifest, setPendingManifest] = useState<JointManifest | null>(null)

  const selectedJoint = joints.find(j => j.instanceId === selectedId) ?? null

  const filtered = library.filter(j => {
    const matchSearch =
      j.displayName.toLowerCase().includes(search.toLowerCase()) ||
      j.description?.toLowerCase().includes(search.toLowerCase()) ||
      j.tags.some(t => t.toLowerCase().includes(search.toLowerCase()))
    const matchType = filterType === 'all' || j.type === filterType
    return matchSearch && matchType
  })

  const handleAdd = (manifest: JointManifest) => {
    if (selectedJoint) {
      // A joint is already selected — ask which connectors to wire
      setPendingManifest(manifest)
    } else {
      // No parent — add as root joint, no dialog needed
      addJoint(manifest)
    }
  }

  const handleConfirm = (
    childConnector:  ConnectorName,
    parentConnector: ConnectorName,
  ) => {
    if (!pendingManifest || !selectedId) return
    addJoint(pendingManifest, selectedId, childConnector, parentConnector)
    setPendingManifest(null)
  }

  return (
    <>
      <div style={styles.panel}>
        <div style={styles.header}>
          <span style={styles.title}>Joint Library</span>
          <span style={styles.count}>{library.length}</span>
        </div>

        <div style={styles.searchWrap}>
          <input
            style={styles.search}
            placeholder="Search joints…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div style={styles.filterRow}>
          {(['all', 'revolute', 'prismatic', 'universal', 'spherical', 'fixed'] as const).map(t => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              style={{
                ...styles.pill,
                background: filterType === t ? COLORS.accentDim    : 'transparent',
                border:     filterType === t ? `1px solid ${COLORS.accentBorder}` : `1px solid ${COLORS.border}`,
                color:      filterType === t ? COLORS.accent        : COLORS.textSecondary,
              }}
            >
              {t === 'all' ? 'All' : t}
            </button>
          ))}
        </div>

        {/* Hint when a joint is selected */}
        {selectedJoint && (
          <div style={styles.selectionHint}>
            + will connect to <strong>{selectedJoint.jointName}</strong>
          </div>
        )}

        <div style={styles.list}>
          {libraryLoading ? (
            <div style={styles.empty}>Loading…</div>
          ) : filtered.length === 0 ? (
            <div style={styles.empty}>No joints found</div>
          ) : (
            filtered.map(j => (
              <JointCard
                key={j.id}
                manifest={j}
                onAdd={() => handleAdd(j)}
              />
            ))
          )}
        </div>
      </div>

      {/* Dialog renders outside the panel div so it overlays everything */}
      {pendingManifest && selectedJoint && (
        <ConnectJointDialog
          childName={pendingManifest.displayName}
          parentName={selectedJoint.jointName}
          onConfirm={handleConfirm}
          onCancel={() => setPendingManifest(null)}
        />
      )}
    </>
  )
}

function JointCard({ manifest, onAdd }: { manifest: JointManifest; onAdd: () => void }) {
  const [hovered, setHovered] = useState(false)
  const color = TYPE_BADGE_COLORS[manifest.type]
  const icon  = TYPE_ICONS[manifest.type]

  return (
    <div
      style={{
        ...styles.card,
        background: hovered ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.02)',
        border:     hovered ? `1px solid ${COLORS.accentBorder}` : `1px solid ${COLORS.border}`,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{ ...styles.cardIcon, background: color + '22', color }}>
        {icon}
      </div>

      <div style={styles.cardInfo}>
        <div style={styles.cardName}>{manifest.displayName}</div>
        <div style={styles.cardMeta}>
          {manifest.specs?.max_torque ? `${manifest.specs.max_torque}Nm` : ''}
          {manifest.specs?.max_speed  ? ` · ${manifest.specs.max_speed}RPM` : ''}
        </div>
        {manifest.gearbox?.integrated && (
          <div style={styles.cardTag}>
            {manifest.gearbox.type} {manifest.gearbox.ratio}:1
          </div>
        )}
      </div>

      <button
        onClick={onAdd}
        title="Add to scene"
        style={{ ...styles.addBtn, opacity: hovered ? 1 : 0.4 }}
      >
        +
      </button>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  panel: {
    width: 260,
    height: '100%',
    background: COLORS.panel,
    borderRight: `1px solid ${COLORS.border}`,
    display: 'flex',
    flexDirection: 'column',
    fontFamily: 'Inter, sans-serif',
    overflow: 'hidden',
  },
  header: {
    padding: '16px 16px 12px',
    borderBottom: `1px solid ${COLORS.border}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 11,
    fontWeight: 600,
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    fontFamily: 'IBM Plex Mono, monospace',
  },
  count: {
    fontSize: 10,
    color: COLORS.textDim,
    background: 'rgba(255,255,255,0.06)',
    padding: '2px 7px',
    borderRadius: 10,
    fontFamily: 'IBM Plex Mono, monospace',
  },
  searchWrap: { padding: '10px 12px 4px' },
  search: {
    width: '100%',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 6,
    padding: '6px 10px',
    color: COLORS.textPrimary,
    fontSize: 12,
    outline: 'none',
    fontFamily: 'Inter, sans-serif',
    boxSizing: 'border-box',
  },
  filterRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 4,
    padding: '6px 12px 8px',
  },
  pill: {
    fontSize: 9,
    padding: '2px 7px',
    borderRadius: 10,
    cursor: 'pointer',
    fontFamily: 'IBM Plex Mono, monospace',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  selectionHint: {
    fontSize: 10,
    color: COLORS.textDim,
    fontFamily: 'IBM Plex Mono, monospace',
    padding: '4px 14px 6px',
    borderBottom: `1px solid ${COLORS.border}`,
  },
  list: {
    flex: 1,
    overflowY: 'auto',
    padding: '4px 8px 8px',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  empty: {
    color: COLORS.textDim,
    fontSize: 12,
    textAlign: 'center',
    padding: 24,
    fontFamily: 'IBM Plex Mono, monospace',
  },
  card: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    borderRadius: 7,
    padding: '8px 10px',
    cursor: 'default',
    transition: 'all 0.1s',
  },
  cardIcon: {
    width: 32,
    height: 32,
    borderRadius: 6,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 15,
    flexShrink: 0,
  },
  cardInfo: { flex: 1, minWidth: 0 },
  cardName: { fontSize: 12, color: '#c8d8e8', fontWeight: 500, marginBottom: 2 },
  cardMeta: { fontSize: 10, color: '#5a6a80', fontFamily: 'IBM Plex Mono, monospace' },
  cardTag: {
    fontSize: 9,
    color: '#a060d0',
    fontFamily: 'IBM Plex Mono, monospace',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  addBtn: {
    width: 26,
    height: 26,
    borderRadius: 5,
    background: COLORS.accentDim,
    border: `1px solid ${COLORS.accentBorder}`,
    color: COLORS.accent,
    fontSize: 16,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    transition: 'opacity 0.15s',
    lineHeight: 1,
    padding: 0,
  },
}