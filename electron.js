const { app, BrowserWindow } = require('electron')
const { spawn } = require('child_process')
const path = require('path')

let mainWindow
let backendProcess

// app.disableHardwareAcceleration()

function startBackend() {
  let backendPath, args, cwd, env

  if (app.isPackaged) {
    // Packaged: use the PyInstaller-frozen binary + frontend build,
    // both shipped via electron-builder's extraResources.
    backendPath = path.join(process.resourcesPath, 'backend', 'cora-backend')
    args = []
    cwd = path.join(process.resourcesPath, 'backend')
    env = {
      ...process.env,
      CORA_FRONTEND_DIST: path.join(process.resourcesPath, 'frontend', 'dist'),
      JOINT_LIBRARY_PATH: path.join(process.resourcesPath, 'joint_library'),
    }
  } else {
    // Dev: use the venv Python, frontend served relative to the repo as usual.
    backendPath = path.join(__dirname, '.venv', 'bin', 'python3')
    args = ['-m', 'uvicorn', 'main:app', '--port', '8000']
    cwd = path.join(__dirname, 'apps', 'backend')
    env = process.env
  }

  backendProcess = spawn(backendPath, args, { cwd, env })
  backendProcess.stdout.on('data', d => console.log(`backend: ${d}`))
  backendProcess.stderr.on('data', d => console.error(`backend: ${d}`))
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    icon: path.join(__dirname, 'assets', 'icon.png'),
    webPreferences: { contextIsolation: true },
    title: 'CORA Configurator',
    frame: true,
    autoHideMenuBar: false,
  })

  mainWindow.setMenuBarVisibility(true)

  const tryLoad = (attempts = 0) => {
    fetch('http://localhost:8000/api/health')
      .then(() => mainWindow.loadURL('http://localhost:8000'))
      .catch(() => {
        if (attempts < 20) setTimeout(() => tryLoad(attempts + 1), 500)
        else mainWindow.loadURL('http://localhost:8000')
      })
  }

  setTimeout(() => tryLoad(), 1000)
}

app.whenReady().then(() => {
  startBackend()
  createWindow()
})

app.on('window-all-closed', () => {
  if (backendProcess) backendProcess.kill()
  app.quit()
})