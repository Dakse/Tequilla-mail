import Delete from '@mui/icons-material/Delete'
import Drafts from '@mui/icons-material/Drafts'
import Inbox from '@mui/icons-material/Inbox'
import Send from '@mui/icons-material/Send'
import StarBorder from '@mui/icons-material/StarBorder'

export const accountTabs = [
  { name: 'Inbox', mailbox: '\\Inbox', icon: Inbox, decorator: 'unreadAmount' },
  { name: 'Sent', mailbox: '\\Sent', icon: Send },
  { name: 'Drafts', mailbox: '\\Drafts', icon: Drafts, decorator: 'draftsAmount' },
  { name: 'Starred', mailbox: '\\Flagged', icon: StarBorder, decorator: 'starredAmount' },
  { name: 'Spam', mailbox: '\\Junk', icon: Delete, decorator: 'spamUnreadAmount' }
]

export function initials(value) {
  return String(value || '?')
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export function emailAddresses(value) {
  return (Array.isArray(value) ? value : [value]).map((item) => item?.address).filter(Boolean)
}

export function messageContact(message, showRecipients = false) {
  const recipients = Array.isArray(message.to) ? message.to : message.to ? [message.to] : []
  const contacts = showRecipients ? recipients : message.from ? [message.from] : []
  const names = contacts
    .map(({ name, address }) => (name && address ? `${name} (${address})` : name || address))
    .filter(Boolean)

  return {
    primary: contacts[0],
    label: `${showRecipients ? 'To: ' : ''}${names.join(', ') || (showRecipients ? 'Unknown recipient' : 'Unknown sender')}`,
    addresses: contacts
      .map(({ address }) => address)
      .filter(Boolean)
      .join(', ')
  }
}

export function formatMessageDate(value, format = 'dmy', separator = '/') {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  const year = String(date.getFullYear())
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const parts = {
    ymd: [year, month, day],
    dmy: [day, month, year],
    mdy: [month, day, year]
  }
  return (parts[format] || parts.dmy).join(separator)
}

export function withMessageFlag(message, flag, enabled) {
  const flags = new Set(message.flags)
  if (enabled) flags.add(flag)
  else flags.delete(flag)
  return {
    ...message,
    flags: [...flags],
    unread: !flags.has('\\Seen'),
    starred: flags.has('\\Flagged')
  }
}
