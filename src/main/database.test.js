import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { openDatabase } from './database.js'

test('stores accounts and synchronizes messages without duplicates', (context) => {
  const directory = mkdtempSync(join(tmpdir(), 'daks-mail-'))
  const store = openDatabase(directory)
  context.after(() => {
    store.close()
    rmSync(directory, { recursive: true, force: true })
  })

  const accountId = store.createAccount({
    name: 'Test account',
    email: 'test@example.com',
    imapHost: 'imap.example.com',
    imapPort: 993,
    imapSecure: 1,
    imapUser: 'test@example.com',
    imapPassword: Buffer.from('encrypted-imap'),
    smtpHost: 'smtp.example.com',
    smtpPort: 465,
    smtpSecure: 1,
    smtpUser: 'test@example.com',
    smtpPassword: Buffer.from('encrypted-smtp')
  })
  const mailbox = store.upsertMailbox(accountId, {
    path: 'INBOX',
    name: 'INBOX',
    delimiter: '/',
    specialUse: '\\Inbox'
  })
  const summary = {
    uid: 42,
    messageId: '<42@example.com>',
    subject: 'Hello',
    from: [{ name: 'Sender', address: 'sender@example.com' }],
    to: [{ name: '', address: 'test@example.com' }],
    cc: [],
    sentAt: '2026-09-04T12:00:00.000Z',
    internalDate: '2026-09-04T12:00:01.000Z',
    flags: [],
    size: 123,
    hasAttachments: 0
  }
  const mailboxState = {
    uidValidity: '123',
    uidNext: 43,
    highestModseq: '5',
    lastSyncedUid: 42
  }

  store.saveMessageSummaries(mailbox.id, mailboxState, [summary])
  store.saveMessageSummaries(mailbox.id, mailboxState, [summary])

  const messages = store.listMessages(accountId, '\\Inbox')
  assert.equal(messages.length, 1)
  assert.equal(messages[0].subject, 'Hello')
  assert.equal(messages[0].unread, true)

  store.saveMessageSummaries(mailbox.id, mailboxState, [
    { ...summary, flags: ['\\Seen', '\\Flagged'] }
  ])
  assert.equal(store.listMessages(accountId, '\\Inbox')[0].unread, false)
  assert.equal(store.listAccounts()[0].unreadAmount, 0)
  assert.equal(store.listAccounts()[0].starredAmount, 1)

  store.saveMessageBody(
    messages[0].id,
    {
      text: 'Hello from the body',
      html: '<p>Hello from the body</p>',
      snippet: 'Hello from the body',
      rawPath: 'message.eml'
    },
    [
      {
        filename: 'notes.txt',
        contentType: 'text/plain',
        size: 5,
        contentId: null,
        disposition: 'attachment',
        localPath: 'notes.txt'
      }
    ]
  )

  const message = store.getMessage(messages[0].id)
  assert.equal(message.text, 'Hello from the body')
  assert.equal(message.bodyDownloaded, true)
  assert.equal(message.attachments[0].filename, 'notes.txt')
})
