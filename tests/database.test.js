import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { openDatabase, senderAvatar } from '../src/main/database.js'

test('uses company favicons but not public email provider logos', () => {
  assert.equal(senderAvatar('person@company.example'), 'https://company.example/favicon.ico')
  assert.equal(senderAvatar('person@gmail.com'), null)
  assert.equal(senderAvatar('person@poczta.onet.pl'), null)
})

test('stores accounts and synchronizes messages without duplicates', (context) => {
  const directory = mkdtempSync(join(tmpdir(), 'tequillamail-'))
  const store = openDatabase(directory)
  context.after(() => {
    store.close()
    rmSync(directory, { recursive: true, force: true })
  })

  const account = {
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
  }
  const accountId = store.createAccount(account)
  const mailbox = store.upsertMailbox(accountId, {
    path: 'INBOX',
    name: 'INBOX',
    delimiter: '/',
    specialUse: '\\Inbox'
  })
  store.upsertMailbox(accountId, {
    path: 'INBOX.Drafts',
    name: 'Drafts',
    delimiter: '.',
    specialUse: '\\Drafts'
  })
  assert.equal(store.listAccounts()[0].draftsAmount, 0)
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

  const junkMailbox = store.upsertMailbox(accountId, {
    path: 'INBOX.Spam',
    name: 'Spam',
    delimiter: '.',
    specialUse: null
  })
  store.saveMessageSummaries(junkMailbox.id, mailboxState, [
    { ...summary, uid: 43, messageId: '<spam@example.com>', subject: 'Spam' }
  ])

  const messages = store.listMessages(accountId, '\\Inbox')
  assert.equal(messages.length, 1)
  assert.equal(messages[0].subject, 'Hello')
  assert.equal(messages[0].from.avatar, 'https://example.com/favicon.ico')
  assert.equal(messages[0].unread, true)
  assert.equal(store.listMessages(accountId, '\\Junk')[0].subject, 'Spam')

  store.saveMessageSummaries(mailbox.id, mailboxState, [
    { ...summary, flags: ['\\Seen', '\\Flagged'] }
  ])
  assert.equal(store.listMessages(accountId, '\\Inbox')[0].unread, false)
  assert.equal(store.listMessages(accountId, '\\Flagged')[0].id, messages[0].id)
  assert.equal(store.listAccounts()[0].unreadAmount, 0)
  assert.equal(store.listAccounts()[0].starredAmount, 1)

  store.setMessageFlags(messages[0].id, ['\\Seen'])
  assert.equal(store.listMessages(accountId, '\\Inbox')[0].starred, false)

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
  assert.equal(message.html, '<p>Hello from the body</p>')
  assert.equal(message.bodyDownloaded, true)
  assert.equal(message.attachments[0].filename, 'notes.txt')
  assert.equal(store.getAttachment(message.attachments[0].id).localPath, 'notes.txt')

  store.updateAccount(accountId, { ...account, name: 'Renamed account' })
  assert.equal(store.listAccounts()[0].name, 'Renamed account')
  assert.equal(store.deleteMessages([message.id]), 1)
  assert.equal(store.getMessage(message.id), null)
  assert.equal(store.deleteAccount(accountId), true)
  assert.equal(store.getAccount(accountId), null)
})
