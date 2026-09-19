const { app, BrowserWindow } = require('electron')
const { spawn } = require('child_process')
const path = require('path')
const fs = require('fs')

let mainWindow
let backendProcess

const isPackaged = app.isPackaged

function log(message) {
  const line = `[CORA Electron] ${new Date().toISOString()} ${message}`
  console.log(line)

  try {
    const logPath = path.join(app.getPath('userData'), 'cora-electron.log')
    fs.appendFileSync(logPath, line + '\n')
  } catch (err) {
    console.error('Could not write Electron log:', err)
  }
}

function startBackend() {
  let backendPath
  let args
  let cwd
  let env

  if (isPackaged) {
    const backendBinaryName =
      process.platform === 'win32'
        ? 'cora-backend.exe'
        : 'cora-backend'

    backendPath = path.join(
      process.resourcesPath,
      'backend',
      backendBinaryName
    )

    cwd = path.join(process.resourcesPath, 'backend')

    env = {
      ...process.env,

      CORA_FRONTEND_DIST: path.join(
        process.resourcesPath,
        'frontend',
        'dist'
      ),

      JOINT_LIBRARY_PATH: path.join(
        process.resourcesPath,
        'joint_library'
      ),

      PYTHONUNBUFFERED: '1',
    }

    args = []
  } else {
    const pythonBinaryName =
      process.platform === 'win32'
        ? path.join('Scripts', 'python.exe')
        : path.join('bin', 'python3')

    backendPath = path.join(
      __dirname,
      '.venv',
      pythonBinaryName
    )

    args = [
      '-m',
      'uvicorn',
      'main:app',
      '--host',
      '127.0.0.1',
      '--port',
      '8000',
    ]

    cwd = path.join(__dirname, 'apps', 'backend')

    env = {
      ...process.env,
      JOINT_LIBRARY_PATH: path.join(
        __dirname,
        'packages',
        'joint_library'
      ),
    }
  }

  log(`Packaged: ${isPackaged}`)
  log(`Platform: ${process.platform}`)
  log(`Architecture: ${process.arch}`)
  log(`resourcesPath: ${process.resourcesPath}`)
  log(`backendPath: ${backendPath}`)
  log(`backend cwd: ${cwd}`)
  log(`CORA_FRONTEND_DIST: ${env.CORA_FRONTEND_DIST || '(not set)'}`)
  log(`JOINT_LIBRARY_PATH: ${env.JOINT_LIBRARY_PATH || '(not set)'}`)

  if (!fs.existsSync(backendPath)) {
    log(`ERROR: Backend executable does not exist: ${backendPath}`)

    if (isPackaged) {
      try {
        const backendDir = path.dirname(backendPath)
        log(`Backend directory contents: ${JSON.stringify(fs.readdirSync(backendDir))}`)
      } catch (err) {
        log(`Could not inspect backend directory: ${err}`)
      }
    }

    return
  }

  if (env.JOINT_LIBRARY_PATH) {
    const jointLibraryExists = fs.existsSync(env.JOINT_LIBRARY_PATH)

    log(`Joint library exists: ${jointLibraryExists}`)

    if (jointLibraryExists) {
      try {
        log(
          `Joint library contents: ${JSON.stringify(
            fs.readdirSync(env.JOINT_LIBRARY_PATH)
          )}`
        )

        const jointsDir = path.join(
          env.JOINT_LIBRARY_PATH,
          'joints'
        )

        log(`Joints directory: ${jointsDir}`)
        log(`Joints directory exists: ${fs.existsSync(jointsDir)}`)

        if (fs.existsSync(jointsDir)) {
          log(
            `Joint folders: ${JSON.stringify(
              fs.readdirSync(jointsDir)
            )}`
          )
        }
      } catch (err) {
        log(`Could not inspect joint library: ${err}`)
      }
    }
  }

  backendProcess = spawn(
    backendPath,
    args,
    {
      cwd,
      env,
      windowsHide: false,
    }
  )

  backendProcess.stdout.on('data', data => {
    const message = data.toString()
    console.log(`backend: ${message}`)
    log(`backend stdout: ${message.trimEnd()}`)
  })

  backendProcess.stderr.on('data', data => {
    const message = data.toString()
    console.error(`backend: ${message}`)
    log(`backend stderr: ${message.trimEnd()}`)
  })

  backendProcess.on('error', err => {
    log(`BACKEND PROCESS ERROR: ${err.stack || err}`)
  })

  backendProcess.on('exit', (code, signal) => {
    log(
      `BACKEND EXITED: code=${code}, signal=${signal}`
    )
  })

  log('Backend process started')
}

async function waitForBackend(maxAttempts = 40) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const response = await fetch(
        'http://127.0.0.1:8000/api/health'
      )

      if (response.ok) {
        log(`Backend health check succeeded on attempt ${attempt + 1}`)
        return true
      }

      log(
        `Backend health check returned HTTP ${response.status}`
      )
    } catch (err) {
      log(
        `Backend health check attempt ${attempt + 1} failed: ${err.message}`
      )
    }

    await new Promise(resolve => setTimeout(resolve, 500))
  }

  log('ERROR: Backend did not become ready within timeout')
  return false
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,

    icon: path.join(
      __dirname,
      'assets',
      process.platform === 'win32'
        ? 'icon.ico'
        : 'icon.png'
    ),

    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },

    title: 'CORA Configurator',

    frame: true,
    autoHideMenuBar: false,
  })

  mainWindow.setMenuBarVisibility(true)

  const backendReady = await waitForBackend()

  if (!backendReady) {
    log('Loading application despite backend timeout')
  }

  try {
    const response = await fetch(
      'http://127.0.0.1:8000/api/joints'
    )

    log(
      `Startup /api/joints status: ${response.status}`
    )

    if (!response.ok) {
      const body = await response.text()
      log(
        `Startup /api/joints response body: ${body}`
      )
    }
  } catch (err) {
    log(
      `Could not test /api/joints during startup: ${err.stack || err}`
    )
  }

  await mainWindow.loadURL(
    'http://127.0.0.1:8000'
  )
}

app.whenReady().then(async () => {
  log('CORA Electron starting')
  startBackend()
  await createWindow()
})

app.on('window-all-closed', () => {
  log('All Electron windows closed')

  if (backendProcess) {
    log('Stopping backend process')

    try {
      backendProcess.kill()
    } catch (err) {
      log(`Could not kill backend: ${err}`)
    }
  }

  app.quit()
})

app.on('before-quit', () => {
  log('Electron quitting')

  if (backendProcess) {
    try {
      backendProcess.kill()
    } catch (err) {
      log(`Could not kill backend during quit: ${err}`)
    }
  }
})
