import { createReadStream, createWriteStream } from 'node:fs'
import { mkdir, rename, rm, writeFile } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { pipeline } from 'node:stream/promises'
import { ImapFlow } from 'imapflow'
import { simpleParser } from 'mailparser'
import nodemailer from 'nodemailer'

function requiredString(value, label) {
  const result = String(value || '').trim()
  if (!result) throw new Error(`${label} is required`)
  return result
}

function validPort(value, label) {
  const result = Number(value)
  if (!Number.isInteger(result) || result < 1 || result > 65535) {
    throw new Error(`${label} must be between 1 and 65535`)
  }
  return result
}

function normalizeAccount(input) {
  const email = requiredString(input.email, 'Email')
  if (!email.includes('@')) throw new Error('Email is invalid')

  return {
    name: requiredString(input.name, 'Name'),
    email,
    imapHost: requiredString(input.incomingServer, 'IMAP server'),
    imapPort: validPort(input.incomingPort, 'IMAP port'),
    imapSecure: Boolean(input.incomingTls),
    imapUser: requiredString(input.incomingUsername, 'IMAP username'),
    imapPassword: requiredString(input.incomingPassword, 'IMAP password'),
    smtpHost: requiredString(input.outgoingServer, 'SMTP server'),
    smtpPort: validPort(input.outgoingPort, 'SMTP port'),
    smtpSecure: Boolean(input.outgoingTls),
    smtpUser: requiredString(input.outgoingUsername, 'SMTP username'),
    smtpPassword: requiredString(input.outgoingPassword, 'SMTP password')
  }
}

function imapOptions(account) {
  return {
    host: account.imapHost,
    port: account.imapPort,
    secure: account.imapSecure,
    auth: { user: account.imapUser, pass: account.imapPassword },
    logger: false
  }
}

function smtpOptions(account) {
  return {
    host: account.smtpHost,
    port: account.smtpPort,
    secure: account.smtpSecure,
    auth: { user: account.smtpUser, pass: account.smtpPassword },
    disableFileAccess: true,
    disableUrlAccess: true
  }
}

function addresses(value) {
  return (value || []).map(({ name, address }) => ({ name: name || '', address }))
}

function isoDate(value) {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

function hasAttachment(part) {
  if (!part) return false
  if (String(part.disposition || '').toLowerCase() === 'attachment') return true
  if (part.dispositionParameters?.filename || part.parameters?.name) return true
  return (part.childNodes || []).some(hasAttachment)
}

function safeFilename(filename, index) {
  const cleaned = basename(filename || `attachment-${index}`).replace(/[^a-zA-Z0-9._ -]/g, '_')
  return `${index}-${cleaned || 'attachment'}`
}

function publicMessage(message) {
  const { rawPath, mailboxPath, ...result } = message
  return result
}

function connectionError(stage, error) {
  const responseText =
    typeof error.response === 'string'
      ? error.response.trim()
      : error.response?.attributes
          ?.filter((attribute) => attribute.type === 'TEXT')
          .map((attribute) => String(attribute.value || '').trim())
          .filter(Boolean)
          .join(' ')
  const reason =
    responseText ||
    (error.message === 'Command failed' ? null : error.message) ||
    error.serverResponseCode ||
    error.responseStatus ||
    error.code ||
    'Server rejected the command'

  return new Error(`${stage}: ${reason}`)
}

export { connectionError }

export function createMailService(store, safeStorage) {
  function accountWithSecrets(id) {
    const row = store.getAccount(Number(id))
    if (!row) throw new Error('Account not found')

    return {
      id: row.id,
      name: row.name,
      email: row.email,
      imapHost: row.imap_host,
      imapPort: row.imap_port,
      imapSecure: Boolean(row.imap_secure),
      imapUser: row.imap_user,
      imapPassword: safeStorage.decryptString(Buffer.from(row.imap_password)),
      smtpHost: row.smtp_host,
      smtpPort: row.smtp_port,
      smtpSecure: Boolean(row.smtp_secure),
      smtpUser: row.smtp_user,
      smtpPassword: safeStorage.decryptString(Buffer.from(row.smtp_password))
    }
  }

  async function withImap(account, callback) {
    const client = new ImapFlow(imapOptions(account))
    try {
      await client.connect()
      return await callback(client)
    } finally {
      if (client.usable) await client.logout().catch(() => client.close())
      else client.close()
    }
  }

  function saveMailboxes(mailboxes, accountId) {
    return mailboxes.map((mailbox) =>
      store.upsertMailbox(accountId, {
        path: mailbox.path,
        name: mailbox.name || mailbox.path,
        delimiter: mailbox.delimiter,
        specialUse:
          mailbox.specialUse || (mailbox.path.toUpperCase() === 'INBOX' ? '\\Inbox' : null)
      })
    )
  }

  return {
    listAccounts() {
      return store.listAccounts()
    },

    async addAccount(input) {
      if (!safeStorage.isEncryptionAvailable()) {
        throw new Error('Secure credential storage is unavailable')
      }

      const account = normalizeAccount(input)
      let mailboxes

      try {
        mailboxes = await withImap(account, (client) => client.list())
      } catch (error) {
        throw connectionError('IMAP verification failed', error)
      }

      const transporter = nodemailer.createTransport(smtpOptions(account))
      try {
        await transporter.verify()
      } catch (error) {
        throw connectionError('SMTP verification failed', error)
      } finally {
        transporter.close()
      }

      const id = store.createAccount({
        ...account,
        imapSecure: Number(account.imapSecure),
        smtpSecure: Number(account.smtpSecure),
        imapPassword: safeStorage.encryptString(account.imapPassword),
        smtpPassword: safeStorage.encryptString(account.smtpPassword)
      })

      saveMailboxes(mailboxes, id)
      return store.listAccounts().find((savedAccount) => savedAccount.id === id)
    },

    listMailboxes(accountId) {
      return store.listMailboxes(Number(accountId))
    },

    async syncMessages({ accountId, mailbox = '\\Inbox', limit = 100 }) {
      const account = accountWithSecrets(accountId)

      await withImap(account, async (client) => {
        saveMailboxes(await client.list(), account.id)
        const mailboxRecord = store.getMailbox(account.id, mailbox)
        if (!mailboxRecord) throw new Error(`Mailbox not found: ${mailbox}`)

        const lock = await client.getMailboxLock(mailboxRecord.path, { readOnly: true })
        try {
          const uidValidity = String(client.mailbox.uidValidity)
          if (mailboxRecord.uid_validity && mailboxRecord.uid_validity !== uidValidity) {
            store.resetMailbox(mailboxRecord.id, uidValidity)
          }

          const messageCount = client.mailbox.exists
          const start = Math.max(1, messageCount - Math.min(Number(limit) || 100, 200) + 1)
          const fetched = messageCount
            ? await client.fetchAll(`${start}:*`, {
                envelope: true,
                flags: true,
                internalDate: true,
                size: true,
                bodyStructure: true
              })
            : []

          const messages = fetched.map((message) => ({
            uid: message.uid,
            messageId: message.envelope?.messageId || null,
            subject: message.envelope?.subject || null,
            from: addresses(message.envelope?.from),
            to: addresses(message.envelope?.to),
            cc: addresses(message.envelope?.cc),
            sentAt: isoDate(message.envelope?.date),
            internalDate: isoDate(message.internalDate),
            flags: [...(message.flags || [])],
            size: message.size || null,
            hasAttachments: Number(hasAttachment(message.bodyStructure))
          }))
          const lastSyncedUid = Math.max(
            Number(mailboxRecord.last_synced_uid) || 0,
            ...messages.map((message) => message.uid)
          )

          store.saveMessageSummaries(
            mailboxRecord.id,
            {
              uidValidity,
              uidNext: client.mailbox.uidNext || null,
              highestModseq: client.mailbox.highestModseq
                ? String(client.mailbox.highestModseq)
                : null,
              lastSyncedUid
            },
            messages
          )
        } finally {
          lock.release()
        }
      })

      return store.listMessages(Number(accountId), mailbox, limit)
    },

    async getMessage(messageId) {
      let message = store.getMessage(Number(messageId))
      if (!message) throw new Error('Message not found')
      if (message.bodyDownloaded) return publicMessage(message)

      const account = accountWithSecrets(message.accountId)
      const rawDirectory = join(store.dataPath, 'messages', String(message.accountId))
      const attachmentDirectory = join(store.dataPath, 'attachments', String(message.id))
      const rawPath = join(rawDirectory, `${message.id}.eml`)
      const temporaryPath = `${rawPath}.tmp`

      await mkdir(rawDirectory, { recursive: true })
      await mkdir(attachmentDirectory, { recursive: true })

      try {
        await withImap(account, async (client) => {
          const lock = await client.getMailboxLock(message.mailboxPath, { readOnly: true })
          try {
            const download = await client.download(String(message.uid), undefined, { uid: true })
            await pipeline(download.content, createWriteStream(temporaryPath))
          } finally {
            lock.release()
          }
        })
        await rename(temporaryPath, rawPath)
      } catch (error) {
        await rm(temporaryPath, { force: true })
        throw error
      }

      // ponytail: simpleParser buffers attachments; move to streaming MailParser if large messages
      // cause measurable memory pressure.
      const parsed = await simpleParser(createReadStream(rawPath))
      const attachments = []
      for (const [index, attachment] of parsed.attachments.entries()) {
        const localPath = join(attachmentDirectory, safeFilename(attachment.filename, index))
        await writeFile(localPath, attachment.content)
        attachments.push({
          filename: attachment.filename || `attachment-${index + 1}`,
          contentType: attachment.contentType || null,
          size: attachment.size || attachment.content.length,
          contentId: attachment.contentId || null,
          disposition: attachment.contentDisposition || null,
          localPath
        })
      }

      const text = parsed.text || ''
      store.saveMessageBody(
        message.id,
        {
          text,
          html: typeof parsed.html === 'string' ? parsed.html : null,
          snippet: text.replace(/\s+/g, ' ').trim().slice(0, 240),
          rawPath
        },
        attachments
      )

      message = store.getMessage(message.id)
      return publicMessage(message)
    },

    async sendMessage({ accountId, to, subject, text }) {
      const account = accountWithSecrets(accountId)
      const recipient = requiredString(to, 'Recipient')
      const transporter = nodemailer.createTransport(smtpOptions(account))

      try {
        const info = await transporter.sendMail({
          from: { name: account.name, address: account.email },
          to: recipient,
          subject: String(subject || ''),
          text: requiredString(text, 'Message')
        })

        return {
          messageId: info.messageId,
          accepted: info.accepted,
          rejected: info.rejected,
          response: info.response
        }
      } finally {
        transporter.close()
      }
    }
  }
}
