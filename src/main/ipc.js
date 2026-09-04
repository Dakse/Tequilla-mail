import { ipcMain } from 'electron'

export function registerMailIpc(mailService) {
  ipcMain.handle('mail:accounts:list', () => mailService.listAccounts())
  ipcMain.handle('mail:accounts:add', (_event, account) => mailService.addAccount(account))
  ipcMain.handle('mail:mailboxes:list', (_event, accountId) => mailService.listMailboxes(accountId))
  ipcMain.handle('mail:messages:sync', (_event, request) => mailService.syncMessages(request))
  ipcMain.handle('mail:messages:get', (_event, messageId) => mailService.getMessage(messageId))
  ipcMain.handle('mail:messages:send', (_event, message) => mailService.sendMessage(message))
}
