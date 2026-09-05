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

export function formatMessageDate(value, locale) {
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? ''
    : new Intl.DateTimeFormat(locale, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(date)
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
