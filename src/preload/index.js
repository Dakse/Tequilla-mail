import { contextBridge, ipcRenderer } from 'electron'

const mail = {
  listAccounts: () => ipcRenderer.invoke('mail:accounts:list'),
  getAccount: (accountId) => ipcRenderer.invoke('mail:accounts:get', accountId),
  addAccount: (account) => ipcRenderer.invoke('mail:accounts:add', account),
  updateAccount: (accountId, account) =>
    ipcRenderer.invoke('mail:accounts:update', accountId, account),
  deleteAccount: (accountId) => ipcRenderer.invoke('mail:accounts:delete', accountId),
  listMailboxes: (accountId) => ipcRenderer.invoke('mail:mailboxes:list', accountId),
  setSyncMode: (mode) => ipcRenderer.invoke('mail:sync:set-mode', mode),
  onMessagesChanged: (callback) => {
    const listener = (_event, change) => callback(change)
    ipcRenderer.on('mail:messages:changed', listener)
    return () => ipcRenderer.removeListener('mail:messages:changed', listener)
  },
  onBulkProgress: (callback) => {
    const listener = (_event, progress) => callback(progress)
    ipcRenderer.on('mail:bulk-progress', listener)
    return () => ipcRenderer.removeListener('mail:bulk-progress', listener)
  },
  syncMessages: (request) => ipcRenderer.invoke('mail:messages:sync', request),
  searchMessages: (request) => ipcRenderer.invoke('mail:messages:search', request),
  getMessage: (messageId) => ipcRenderer.invoke('mail:messages:get', messageId),
  setMessageFlag: (request) => ipcRenderer.invoke('mail:messages:set-flag', request),
  moveMessages: (request) => ipcRenderer.invoke('mail:messages:move', request),
  sendMessage: (message) => ipcRenderer.invoke('mail:messages:send', message),
  chooseAttachments: () => ipcRenderer.invoke('mail:attachments:choose'),
  saveAttachment: (attachmentId) => ipcRenderer.invoke('mail:attachments:save', attachmentId)
}

const updater = {
  getState: () => ipcRenderer.invoke('app:update:get-state'),
  install: () => ipcRenderer.invoke('app:update:install'),
  onStateChange: (callback) => {
    const listener = (_event, state) => callback(state)
    ipcRenderer.on('app:update:state', listener)
    return () => ipcRenderer.removeListener('app:update:state', listener)
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('mail', mail)
    contextBridge.exposeInMainWorld('updater', updater)
  } catch (error) {
    console.error(error)
  }
} else {
  window.mail = mail
  window.updater = updater
}
