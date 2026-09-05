import assert from 'node:assert/strict'
import test from 'node:test'
import { emptyMessageFilters, filterMessages } from '../src/renderer/src/message-filters.js'

test('filters message summaries by people, words, date, and attachment', () => {
  const messages = [
    {
      from: { name: 'Alice Smith', address: 'alice@example.com' },
      to: [{ name: 'Bob', address: 'bob@example.com' }],
      cc: [],
      subject: 'Quarterly report',
      snippet: 'The final numbers are attached',
      date: '2026-09-05T12:00:00.000Z',
      hasAttachments: true
    }
  ]

  assert.equal(
    filterMessages(messages, {
      ...emptyMessageFilters,
      from: 'alice',
      to: 'bob@example.com',
      subject: 'report',
      words: 'final attached',
      dateFrom: '2026-09-05',
      dateTo: '2026-09-05',
      hasAttachment: true
    }).length,
    1
  )
  assert.equal(filterMessages(messages, { ...emptyMessageFilters, words: 'missing' }).length, 0)
})
