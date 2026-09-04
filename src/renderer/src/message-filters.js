export const emptyMessageFilters = {
  from: '',
  to: '',
  subject: '',
  words: '',
  dateFrom: '',
  dateTo: '',
  hasAttachment: false
}

function peopleText(people) {
  return (people || []).map(({ name, address }) => `${name || ''} ${address || ''}`).join(' ')
}

export function filterMessages(messages, filters) {
  const from = filters.from.trim().toLowerCase()
  const to = filters.to.trim().toLowerCase()
  const subject = filters.subject.trim().toLowerCase()
  const words = filters.words.trim().toLowerCase().split(/\s+/).filter(Boolean)
  const dateFrom = filters.dateFrom ? new Date(`${filters.dateFrom}T00:00:00`).getTime() : null
  const dateTo = filters.dateTo ? new Date(`${filters.dateTo}T23:59:59.999`).getTime() : null

  return messages.filter((message) => {
    const sender = peopleText(message.from ? [message.from] : []).toLowerCase()
    const recipients = peopleText(message.to).toLowerCase()
    const messageSubject = String(message.subject || '').toLowerCase()
    const searchable =
      `${sender} ${recipients} ${peopleText(message.cc)} ${messageSubject} ${message.snippet || ''} ${message.text || ''}`.toLowerCase()
    const timestamp = message.date ? new Date(message.date).getTime() : NaN

    return (
      (!from || sender.includes(from)) &&
      (!to || recipients.includes(to)) &&
      (!subject || messageSubject.includes(subject)) &&
      words.every((word) => searchable.includes(word)) &&
      (!dateFrom || (!Number.isNaN(timestamp) && timestamp >= dateFrom)) &&
      (!dateTo || (!Number.isNaN(timestamp) && timestamp <= dateTo)) &&
      (!filters.hasAttachment || message.hasAttachments)
    )
  })
}
