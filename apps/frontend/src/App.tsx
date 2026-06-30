import { useEffect, useState } from 'react'
import { Topbar } from './components/ui/Topbar'
import { JointLibraryPanel } from './components/panels/JointLibraryPanel'
import { PropertiesPanel } from './components/panels/PropertiesPanel'
import { Viewport3D } from './components/viewer/Viewport3D'
import { useRobotStore } from './store/robotStore'

export default function App() {
  const [backendError, setBackendError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/joints')
      .then(r => {
        if (!r.ok) throw new Error(`Backend returned ${r.status}`)
        return r.json()
      })
      .then(data => {
        useRobotStore.setState({ library: data, libraryLoading: false })
      })
      .catch(err => {
        console.error('Failed to load joint library:', err)
        setBackendError(
          'Could not reach the backend. Make sure it is running on port 8000.'
        )
        useRobotStore.setState({ libraryLoading: false })
      })
  }, [])

  if (backendError) {
    return (
      <div style={styles.errorScreen}>
        <div style={styles.errorBox}>
          <div style={styles.errorTitle}>Backend unreachable</div>
          <div style={styles.errorMessage}>{backendError}</div>
          <code style={styles.errorCode}>cd apps/backend && uvicorn main:app --reload</code>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.root}>
      <Topbar />
      <div style={styles.workspace}>
        <JointLibraryPanel />
        <div style={styles.viewport}>
          <Viewport3D />
        </div>
        <PropertiesPanel />
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    width: '100vw', height: '100vh',
    display: 'flex', flexDirection: 'column',
    background: '#0d1117', overflow: 'hidden',
  },
  workspace: { flex: 1, display: 'flex', overflow: 'hidden' },
  viewport:  { flex: 1, position: 'relative', overflow: 'hidden' },
  errorScreen: {
    width: '100vw', height: '100vh',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: '#0d1117',
  },
  errorBox: {
    background: '#161b22', border: '1px solid rgba(255,80,80,0.3)',
    borderRadius: 10, padding: 32, maxWidth: 420,
    fontFamily: 'Inter, sans-serif',
  },
  errorTitle: {
    color: '#ff6b6b', fontSize: 16, fontWeight: 600, marginBottom: 8,
  },
  errorMessage: {
    color: '#9aa8b8', fontSize: 13, lineHeight: 1.5, marginBottom: 16,
  },
  errorCode: {
    display: 'block', background: '#0d1117', padding: '8px 12px',
    borderRadius: 6, color: '#00e5ff', fontSize: 12,
    fontFamily: 'IBM Plex Mono, monospace',
  },
}