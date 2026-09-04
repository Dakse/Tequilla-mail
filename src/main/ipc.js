import { dialog, ipcMain } from 'electron'
import { basename } from 'node:path'

export function registerMailIpc(mailService) {
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
  ipcMain.handle('mail:messages:sync', (_event, request) => mailService.syncMessages(request))
  ipcMain.handle('mail:messages:get', (_event, messageId) => mailService.getMessage(messageId))
  ipcMain.handle('mail:messages:set-flag', (_event, request) => mailService.setMessageFlag(request))
  ipcMain.handle('mail:messages:move', (_event, request) => mailService.moveMessages(request))
  ipcMain.handle('mail:messages:send', (_event, message) => mailService.sendMessage(message))
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
