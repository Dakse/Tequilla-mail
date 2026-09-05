import { app, shell, BrowserWindow, ipcMain, nativeImage, safeStorage } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import electronUpdater from 'electron-updater'
import icon from '../../resources/icon.png?asset'
import { openDatabase } from './database'
import { registerMailIpc } from './ipc'
import { createMailService } from './mail-service'

const { autoUpdater } = electronUpdater
let store
let updateState = { status: 'idle', currentVersion: '', availableVersion: null }

function setUpdateState(changes) {
  updateState = { ...updateState, ...changes }
  for (const window of BrowserWindow.getAllWindows()) {
    window.webContents.send('app:update:state', updateState)
  }
}

function registerUpdater() {
  updateState.currentVersion = app.getVersion()
  ipcMain.handle('app:update:get-state', () => updateState)
  ipcMain.handle('app:update:install', async () => {
    if (!app.isPackaged || !updateState.availableVersion) return false
    if (updateState.status !== 'downloaded') await autoUpdater.downloadUpdate()
    setImmediate(() => autoUpdater.quitAndInstall())
    return true
  })

  if (!app.isPackaged) return
  autoUpdater.autoDownload = false
  autoUpdater.on('checking-for-update', () => setUpdateState({ status: 'checking' }))
  autoUpdater.on('update-available', ({ version }) =>
    setUpdateState({ status: 'available', availableVersion: version })
  )
  autoUpdater.on('update-not-available', () =>
    setUpdateState({ status: 'current', availableVersion: null })
  )
  autoUpdater.on('download-progress', () => setUpdateState({ status: 'downloading' }))
  autoUpdater.on('update-downloaded', () => setUpdateState({ status: 'downloaded' }))
  autoUpdater.on('error', (error) => {
    console.error('Auto-update failed:', error)
    setUpdateState({ status: 'error' })
  })
  autoUpdater.checkForUpdates().catch(() => {})
}

function createWindow() {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1100,
    height: 670,
    minWidth: 1100,
    minHeight: 500,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    const url = new URL(details.url)
    if (url.protocol === 'http:' || url.protocol === 'https:') shell.openExternal(url.href)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.tequillamail.app')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  store = openDatabase(app.getPath('userData'))
  registerMailIpc(createMailService(store, safeStorage, nativeImage))
  registerUpdater()

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('will-quit', () => {
  store?.close()
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
