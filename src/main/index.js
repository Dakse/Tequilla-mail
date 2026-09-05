import { app, shell, BrowserWindow, ipcMain, Menu, nativeImage, safeStorage, Tray } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import electronUpdater from 'electron-updater'
import icon from '../../resources/icon.png?asset'
import { openDatabase } from './database'
import { registerMailIpc } from './ipc'
import { createMailService } from './mail-service'

const { autoUpdater } = electronUpdater
let store
let mailService
let mainWindow
let tray
let trayIcon
let unreadTrayIcon
let unreadOverlayIcon
let closeBehavior = 'tray'
let quitting = false
let updateState = { status: 'idle', currentVersion: '', availableVersion: null }
const UNREAD_TRAY_ICON =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAARbSURBVFhHtVffa1RHFL7pprE/tlZiotvsj+zuvTNndvMQHwpGCSFQRFwFURDBFavElmCgSYkiaQtSxJiXqHmwZDe6MRtjEP+J9qH0wT71X2gphfShfS2UU865d5LZ2Xuzu2o/+GDDzs73zTdnzkwc5xXhum5aKfU5AHwrpZxQSn1kj/lfUCwWewDgKwD4u1AooKaU8k8AmHUcJ2b/5o1BCFGSUv5CggBAotukvwMjL6WUn9i/fS0AQFZKuaGUQqIpbNMYUxNCJO25OkWMYgWAv4LV7azYdVFlMgj5PEqdhhCoBgexQPRT2pJSTtmTtgWKUUr5sx03eB4W0ml0h4cxWSph9sgRNkPiZCQzPo7J48ftbflRSjlqa4SCYqP4wuImITLQe/Uqxh4+ROfFC9x/+TIWkklOIn7jBjqbm9h9/77/G8/b3hYyAwDf5fP5A7bmNgBgUim1ZcetV65yOYzfvMkizqNH6KyvY9/Fi74B18Weu3fRefYMexYWGgxoBmn+LoT41NYm8W+KxWJTdWsWk0nsK5fR2dhAp1LxaRl499YtTiX24EGoASKlEehMm+KESHEqLNrrrpUVf+WmgXIZC6kU1wDVxcDJk9h/4QIK2j6qi5D5Ap1/qJmxASHEbFjsPNjzeHXv3L6NztrajriRwFB/PxcmM5XCQibTNI9N0hNCfKYNLEQZoOh7r1xB5+nTRnHiygrH/cHsLB44fx4HR0d55WSAjNtzhRj4mg1IKefDDNBEmbExdB4/ZrEmA8vL/pbU65wGfX57cRH3zsygoIKj4xkibhiYizSgzzZVtPPkSbO4zWrVN0lmnz/H3okJTs8WbtuAymZx37Vr/spsMZskXKv5aQRpdVWrmD18mOexxVsbEMI/1/PzrVdPYsvLmDh9GrMjI7jnzh3fRL2O783NcVsOOw27G6AB6TQmzp5tncDqKosOJRI4HI/7vUIXbL2OA6dO+ce0UwNUxVTR3YuL/opsYc1qFbsqFTx47hwXLNeMHl+rcVHSPHZBtjTAg1Ip7Lt0qXUKVICrqz5JnE6H/m59HfdNTnIz69gAXTDuoUP4Fl08ZgeMIhkJPu+Gtg3oFD6cmmqdgsF20GBgt05Ix4juAU7AWGET6btqtUFka/zjJpowO+FMlAFOIZPB9+katu8CTeoBtVrD5LZwlAk24HmeK6X8N+o2JAOpY8fCe0K9jvHr1/keaEfcNsEGghS+pHvafgUxqTHl87iHbkSqdGPlsaUl9IaG+E3wWgYIAFAGgF9pO+w0qBgTZ87sFCPt+doaDpRK/F0n4pEGCEqp/VLKJeNByeTrFQC7793zO93mJu6dnuaOqcd0YiLSgIZSagQAfjDToG0YPHqUX8PJEyc4erPDvVEDGsH/f39wGgD8MKWiDHt0mLAFw8QJtl4ocrncQQCohD3VbZqwhV9J3IQQYgwAfgorUl0zAPB9g0oE7Lk7AgB8obdFEwB+o+3SY2xBE+Zc/wGilhGg6AOrlwAAAABJRU5ErkJggg=='
const UNREAD_OVERLAY_ICON =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAE6SURBVDhPtVI9SwNBFExpaWlpmTJFimAVG21EglikEktLf0KsYmUrVqlMCm3EIliInSIIgiAiFmJjCi8RzMflYpyRd+xbj907tHFgir17M29238vl/hMk8yTLJAvuv0yQnAFQBxDSAYAWyTlXYyGdADyo4PPpkZPbG07u75ImHUnlarXzsxSJoLexzrdy0bK7tszo+lJN3r0kAPZVnBS6DNunatJ2u4eIIvaqq54oyWBlkV/dQG80rwaFv3RXjs/P1KCi8bfkNDo59orTOGwcqEFNE8is40dyi9MojQw21WBWTuh/MFha8AQupy/xsAQ/CwbgQr78do3BXj1Wysit2KTI6/YNDxupSfq7O5RJGfjLBKCqJtPOK0dHzfjBxFC2UgFg29VamCRXtjqBzDVOA4CSGW9NOmYJvwGmnSOwMw7R6gAAAABJRU5ErkJggg=='

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

function showWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    createWindow()
    return
  }
  if (mainWindow.isMinimized()) mainWindow.restore()
  mainWindow.show()
  mainWindow.focus()
}

function updateUnreadIndicators() {
  const unreadCount = store
    ? store.listAccounts().reduce((total, account) => total + Number(account.unreadAmount), 0)
    : 0
  const hasUnread = unreadCount > 0

  if (process.platform === 'win32' && mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.setOverlayIcon(hasUnread ? unreadOverlayIcon : null, 'Unread email')
  } else if (process.platform === 'darwin') {
    app.dock?.setBadge(hasUnread ? '•' : '')
  } else {
    app.setBadgeCount(hasUnread ? 1 : 0)
  }

  if (tray && !tray.isDestroyed()) {
    tray.setImage(hasUnread ? unreadTrayIcon : trayIcon)
    tray.setToolTip(hasUnread ? 'TequillaMail — unread email' : 'TequillaMail')
  }
}

function createTray() {
  trayIcon = nativeImage.createFromPath(icon).resize({ width: 32, height: 32 })
  unreadTrayIcon = nativeImage.createFromDataURL(UNREAD_TRAY_ICON)
  unreadOverlayIcon = nativeImage.createFromDataURL(UNREAD_OVERLAY_ICON)
  tray = new Tray(trayIcon)
  tray.setToolTip('TequillaMail')
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: 'Open', click: showWindow },
      { label: 'Exit', click: () => app.quit() }
    ])
  )
  tray.on('click', showWindow)
}

function registerDesktopIpc() {
  ipcMain.handle('app:close-behavior:set', (_event, behavior) => {
    if (!['tray', 'close'].includes(behavior)) throw new Error('Invalid close behavior')
    closeBehavior = behavior
    return closeBehavior
  })
}

function createWindow() {
  // Create the browser window.
  const window = new BrowserWindow({
    name: 'main-window',
    width: 1100,
    height: 670,
    minWidth: 1100,
    minHeight: 500,
    windowStatePersistence: { bounds: true, displayMode: false },
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true
    }
  })

  mainWindow = window
  window.on('ready-to-show', () => {
    window.show()
  })
  window.on('show', updateUnreadIndicators)

  window.on('close', (event) => {
    if (quitting || closeBehavior === 'close') return
    event.preventDefault()
    window.hide()
  })
  window.on('closed', () => {
    if (mainWindow === window) mainWindow = null
  })

  window.webContents.setWindowOpenHandler((details) => {
    const url = new URL(details.url)
    if (url.protocol === 'http:' || url.protocol === 'https:') shell.openExternal(url.href)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    window.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    window.loadFile(join(__dirname, '../renderer/index.html'))
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
  mailService = createMailService(store, safeStorage, nativeImage)
  registerMailIpc(mailService, updateUnreadIndicators)
  registerDesktopIpc()
  registerUpdater()

  createTray()
  createWindow()
  updateUnreadIndicators()

  app.on('activate', showWindow)
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (closeBehavior === 'close') app.quit()
})

app.on('before-quit', () => {
  quitting = true
})

app.on('will-quit', () => {
  mailService?.closeSync()
  store?.close()
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
