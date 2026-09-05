import assert from 'node:assert/strict'
import test from 'node:test'
import {
  connectionError,
  messageSequencePage,
  publicMessage,
  selectMailbox,
  syncPolicy
} from '../src/main/mail-service.js'

test('pages backward through IMAP sequence numbers', () => {
  assert.deepEqual(messageSequencePage(250, 50, 0), {
    range: '201:250',
    hasMore: true,
    limit: 50,
    offset: 0
  })
  assert.deepEqual(messageSequencePage(250, 50, 200), {
    range: '1:50',
    hasMore: false,
    limit: 50,
    offset: 200
  })
  assert.equal(messageSequencePage(250, 50, 250).range, null)
})

test('creates thumbnails without exposing attachment paths', async () => {
  const message = await publicMessage(
    {
      id: 1,
      rawPath: 'private/message.eml',
      mailboxPath: 'INBOX',
      attachments: [{ id: 2, filename: 'photo.png', localPath: 'private/photo.png' }]
    },
    {
      createThumbnailFromPath: async () => ({
        isEmpty: () => false,
        toDataURL: () => 'data:image/png;base64,thumbnail'
      })
    }
  )

  assert.equal(message.rawPath, undefined)
  assert.equal(message.attachments[0].localPath, undefined)
  assert.equal(message.attachments[0].thumbnail, 'data:image/png;base64,thumbnail')
})

test('selects the populated junk folder when the marked folder is empty', () => {
  const mailboxes = [
    { path: 'INBOX.spam', name: 'spam', specialUse: '\\Junk', status: { messages: 0 } },
    { path: 'INBOX.Junk', name: 'Junk', status: { messages: 12 } }
  ]

  assert.equal(selectMailbox(mailboxes, '\\Junk').path, 'INBOX.Junk')
  assert.equal(selectMailbox([{ path: 'INBOX', name: 'INBOX' }], '\\Inbox').path, 'INBOX')
})

test('connection errors include the safe server response without the IMAP command', () => {
  const cause = new Error('Command failed')
  cause.response = {
    attributes: [{ type: 'TEXT', value: 'Authentication failed' }]
  }
  cause.executedCommand = 'LOGIN user secret'

  assert.equal(
    connectionError('IMAP verification failed', cause).message,
    'IMAP verification failed: Authentication failed'
  )
})

test('maps synchronization modes to timed and IDLE behavior', () => {
  assert.deepEqual(syncPolicy('sync'), { idle: true, timed: true })
  assert.deepEqual(syncPolicy('no-sync'), { idle: false, timed: true })
  assert.deepEqual(syncPolicy('manual'), { idle: false, timed: false })
  assert.throws(() => syncPolicy('invalid'), /Invalid sync mode/)
})
