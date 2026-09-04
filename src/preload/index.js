import { contextBridge, ipcRenderer } from 'electron'

const mail = {
  listAccounts: () => ipcRenderer.invoke('mail:accounts:list'),
  getAccount: (accountId) => ipcRenderer.invoke('mail:accounts:get', accountId),
  addAccount: (account) => ipcRenderer.invoke('mail:accounts:add', account),
  updateAccount: (accountId, account) =>
    ipcRenderer.invoke('mail:accounts:update', accountId, account),
  deleteAccount: (accountId) => ipcRenderer.invoke('mail:accounts:delete', accountId),
  listMailboxes: (accountId) => ipcRenderer.invoke('mail:mailboxes:list', accountId),
  syncMessages: (request) => ipcRenderer.invoke('mail:messages:sync', request),
  getMessage: (messageId) => ipcRenderer.invoke('mail:messages:get', messageId),
  setMessageFlag: (request) => ipcRenderer.invoke('mail:messages:set-flag', request),
  moveMessages: (request) => ipcRenderer.invoke('mail:messages:move', request),
  sendMessage: (message) => ipcRenderer.invoke('mail:messages:send', message),
  saveAttachment: (attachmentId) => ipcRenderer.invoke('mail:attachments:save', attachmentId)
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('mail', mail)
  } catch (error) {
    console.error(error)
  }
} else {
  window.mail = mail
}
