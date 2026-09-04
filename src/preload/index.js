import { contextBridge, ipcRenderer } from 'electron'

const mail = {
  listAccounts: () => ipcRenderer.invoke('mail:accounts:list'),
  addAccount: (account) => ipcRenderer.invoke('mail:accounts:add', account),
  listMailboxes: (accountId) => ipcRenderer.invoke('mail:mailboxes:list', accountId),
  syncMessages: (request) => ipcRenderer.invoke('mail:messages:sync', request),
  getMessage: (messageId) => ipcRenderer.invoke('mail:messages:get', messageId),
  sendMessage: (message) => ipcRenderer.invoke('mail:messages:send', message)
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
