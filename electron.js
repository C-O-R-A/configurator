const { app, BrowserWindow } = require('electron')
const { spawn } = require('child_process')
const path = require('path')

let mainWindow
let backendProcess

// If the host has no discrete GPU or problematic GPU drivers,
// disabling hardware acceleration prevents Chromium GPU errors
// shown by packaged shortcuts on some systems.
app.disableHardwareAcceleration()

function startBackend() {
  const venvPython = path.join(__dirname, '.venv', 'bin', 'python3')
  backendProcess = spawn(venvPython, ['-m', 'uvicorn', 'main:app', '--port', '8000'], {
    cwd: path.join(__dirname, 'apps', 'backend'),
  })

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

  // Wait for backend to be ready before loading
  const tryLoad = (attempts = 0) => {
    fetch('http://localhost:8000/api/health')
      .then(() => mainWindow.loadURL('http://localhost:8000'))
      .catch(() => {
        if (attempts < 20) setTimeout(() => tryLoad(attempts + 1), 500)
        else mainWindow.loadURL('http://localhost:8000')  // try anyway
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