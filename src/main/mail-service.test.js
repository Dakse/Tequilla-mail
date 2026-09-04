import assert from 'node:assert/strict'
import test from 'node:test'
import { connectionError } from './mail-service.js'

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
