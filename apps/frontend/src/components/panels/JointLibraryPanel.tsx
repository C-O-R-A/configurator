import { useState } from 'react'
import { useRobotStore } from '../../store/robotStore'
import type { JointManifest, JointType } from '../../types/manifest'

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
  const { library, libraryLoading, addJoint, selectedId } = useRobotStore()
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<JointType | 'all'>('all')

  const filtered = library.filter(j => {
    const matchSearch =
      j.displayName.toLowerCase().includes(search.toLowerCase()) ||
      j.description?.toLowerCase().includes(search.toLowerCase()) ||
      j.tags.some(t => t.toLowerCase().includes(search.toLowerCase()))
    const matchType = filterType === 'all' || j.type === filterType
    return matchSearch && matchType
  })

  return (
    <div style={styles.panel}>
      <div style={styles.header}>
        <span style={styles.title}>Joint Library</span>
        <span style={styles.count}>{library.length}</span>
      </div>

      {/* Search */}
      <div style={styles.searchWrap}>
        <input
          style={styles.search}
          placeholder="Search joints…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Type filter pills */}
      <div style={styles.filterRow}>
        {(['all', 'revolute', 'prismatic', 'universal', 'spherical', 'fixed'] as const).map(t => (
          <button
            key={t}
            onClick={() => setFilterType(t)}
            style={{
              ...styles.pill,
              background: filterType === t ? 'rgba(0,229,255,0.12)' : 'transparent',
              border: filterType === t ? '1px solid rgba(0,229,255,0.5)' : '1px solid rgba(255,255,255,0.07)',
              color: filterType === t ? '#00e5ff' : '#6a7a90',
            }}
          >
            {t === 'all' ? 'All' : t}
          </button>
        ))}
      </div>

      {/* Joint cards */}
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
              onAdd={() => addJoint(j, selectedId ?? undefined)}
            />
          ))
        )}
      </div>
    </div>
  )
}

function JointCard({ manifest, onAdd }: { manifest: JointManifest; onAdd: () => void }) {
  const [hovered, setHovered] = useState(false)
  const color = TYPE_BADGE_COLORS[manifest.type]
  const icon = TYPE_ICONS[manifest.type]

  return (
    <div
      style={{
        ...styles.card,
        background: hovered ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.02)',
        border: hovered ? '1px solid rgba(0,229,255,0.2)' : '1px solid rgba(255,255,255,0.06)',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Icon */}
      <div style={{ ...styles.cardIcon, background: color + '22', color }}>
        {icon}
      </div>

      {/* Info */}
      <div style={styles.cardInfo}>
        <div style={styles.cardName}>{manifest.displayName}</div>
        <div style={styles.cardMeta}>
          {manifest.specs?.max_torque ? ` · ${manifest.specs.max_torque}Nm` : ''}
          {manifest.specs?.max_speed ? ` · ${manifest.specs.max_speed}N` : ''}
        </div>
        {manifest.gearbox?.integrated && (
          <div style={styles.cardTag}>
            {manifest.gearbox.type} {manifest.gearbox.ratio}:1
          </div>
        )}
      </div>

      {/* Add button */}
      <button
        onClick={onAdd}
        title="Add to scene"
        style={{
          ...styles.addBtn,
          opacity: hovered ? 1 : 0.4,
        }}
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
    background: '#10141c',
    borderRight: '1px solid rgba(255,255,255,0.06)',
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
  count: {
    fontSize: 10,
    color: '#4a5568',
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
    color: '#e0e8f0',
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
  list: {
    flex: 1,
    overflowY: 'auto',
    padding: '4px 8px 8px',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  empty: {
    color: '#4a5568',
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
    background: 'rgba(0, 229, 255, 0.15)',
    border: '1px solid rgba(0,229,255,0.3)',
    color: '#00e5ff',
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
