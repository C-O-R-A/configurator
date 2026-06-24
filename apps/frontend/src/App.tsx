import { useEffect } from 'react'
import { Topbar } from './components/ui/Topbar'
import { JointLibraryPanel } from './components/panels/JointLibraryPanel'
import { PropertiesPanel } from './components/panels/PropertiesPanel'
import { Viewport3D } from './components/viewer/Viewport3D'
import { useRobotStore } from './store/robotStore'
import { MOCK_JOINTS } from './joints/mockJoints'

export default function App() {
  const { loadLibrary, library } = useRobotStore()

  useEffect(() => {
    // Try to load from backend; fall back to mock data
    fetch('/api/joints')
      .then(r => r.json())
      .then(data => useRobotStore.setState({ library: data, libraryLoading: false }))
      .catch(() => {
        // Backend not running — use mock data so UI is always demonstrable
        console.info('Backend not available — using mock joint library')
        useRobotStore.setState({ library: MOCK_JOINTS, libraryLoading: false })
      })
  }, [])

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
    width: '100vw',
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    background: '#0d1117',
    overflow: 'hidden',
  },
  workspace: {
    flex: 1,
    display: 'flex',
    overflow: 'hidden',
  },
  viewport: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
}
