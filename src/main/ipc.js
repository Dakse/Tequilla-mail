import { BrowserWindow, dialog, ipcMain } from 'electron'
import { stat } from 'node:fs/promises'
import { basename } from 'node:path'

export function registerMailIpc(mailService) {
  const selectedAttachmentPaths = new Set()
  const notifyMessagesChanged = (change) => {
    for (const window of BrowserWindow.getAllWindows()) {
      window.webContents.send('mail:messages:changed', change)
    }
  }
  ipcMain.handle('mail:accounts:list', () => mailService.listAccounts())
  ipcMain.handle('mail:accounts:get', (_event, accountId) =>
    mailService.getAccountSettings(accountId)
  )
  ipcMain.handle('mail:accounts:add', (_event, account) => mailService.addAccount(account))
  ipcMain.handle('mail:accounts:update', (_event, accountId, account) =>
    mailService.updateAccount(accountId, account)
  )
  ipcMain.handle('mail:accounts:delete', (_event, accountId) =>
    mailService.deleteAccount(accountId)
  )
  ipcMain.handle('mail:mailboxes:list', (_event, accountId) => mailService.listMailboxes(accountId))
  ipcMain.handle('mail:sync:set-mode', (_event, mode) =>
    mailService.configureSync(mode, notifyMessagesChanged)
  )
  ipcMain.handle('mail:messages:sync', (_event, request) => mailService.syncMessages(request))
  ipcMain.handle('mail:messages:get', (_event, messageId) => mailService.getMessage(messageId))
  ipcMain.handle('mail:messages:set-flag', (_event, request) => mailService.setMessageFlag(request))
  ipcMain.handle('mail:messages:move', (_event, request) => mailService.moveMessages(request))
  ipcMain.handle('mail:attachments:choose', async () => {
    const result = await dialog.showOpenDialog({ properties: ['openFile', 'multiSelections'] })
    if (result.canceled) return []

    return Promise.all(
      result.filePaths.map(async (path) => {
        selectedAttachmentPaths.add(path)
        return { path, name: basename(path), size: (await stat(path)).size }
      })
    )
  })
  ipcMain.handle('mail:messages:send', async (_event, message) => {
    const attachments = Array.isArray(message.attachments) ? message.attachments : []
    if (attachments.length > 20) throw new Error('A message can have at most 20 attachments')
    if (attachments.some(({ path }) => !selectedAttachmentPaths.has(path))) {
      throw new Error('Select attachments with the attachment picker')
    }

    const result = await mailService.sendMessage({
      ...message,
      attachments: attachments.map(({ path, name }) => ({
        path,
        filename: basename(name || path)
      }))
    })
    attachments.forEach(({ path }) => selectedAttachmentPaths.delete(path))
    return result
  })
  ipcMain.handle('mail:attachments:save', async (_event, attachmentId) => {
    const attachment = mailService.getAttachment(attachmentId)
    const result = await dialog.showSaveDialog({
      title: 'Save attachment',
      defaultPath: basename(attachment.filename)
    })
    if (result.canceled || !result.filePath) return false

    await mailService.saveAttachment(attachmentId, result.filePath)
    return true
  })
}
