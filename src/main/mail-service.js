import { createReadStream, createWriteStream } from 'node:fs'
import { copyFile, mkdir, rename, rm, writeFile } from 'node:fs/promises'
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

export async function publicMessage(message, nativeImage) {
  const { rawPath, mailboxPath, attachments = [], ...result } = message
  return {
    ...result,
    attachments: await Promise.all(
      attachments.map(async (attachment) => {
        const { localPath, ...publicAttachment } = attachment
        try {
          const thumbnail = await nativeImage.createThumbnailFromPath(localPath, {
            width: 260,
            height: 195
          })
          return {
            ...publicAttachment,
            thumbnail: thumbnail.isEmpty() ? null : thumbnail.toDataURL()
          }
        } catch {
          return { ...publicAttachment, thumbnail: null }
        }
      })
    )
  }
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

function isJunkMailbox(mailbox) {
  return (
    ['\\Junk', '\\Spam'].includes(mailbox.specialUse) ||
    ['junk', 'spam'].includes(String(mailbox.name).toLowerCase())
  )
}

export function selectMailbox(mailboxes, selector) {
  const exact = mailboxes.find(
    (mailbox) =>
      mailbox.specialUse === selector ||
      mailbox.path.toLowerCase() === selector.toLowerCase() ||
      (selector === '\\Inbox' && mailbox.path.toUpperCase() === 'INBOX')
  )
  if (selector !== '\\Junk') return exact

  return mailboxes
    .filter(isJunkMailbox)
    .reduce(
      (best, mailbox) =>
        !best || Number(mailbox.status?.messages || 0) > Number(best.status?.messages || 0)
          ? mailbox
          : best,
      exact
    )
}

export function createMailService(store, safeStorage, nativeImage) {
  function attachmentById(id) {
    const attachment = store.getAttachment(Number(id))
    if (!attachment) throw new Error('Attachment not found')
    return attachment
  }

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

  function selectedMessageGroups(messageIds) {
    const ids = [...new Set((Array.isArray(messageIds) ? messageIds : []).map(Number))].filter(
      (id) => Number.isInteger(id) && id > 0
    )
    if (!ids.length || ids.length > 200) throw new Error('Select between 1 and 200 messages')

    const messages = ids.map((id) => store.getMessage(id))
    if (messages.some((message) => !message)) throw new Error('Message not found')

    const groups = new Map()
    for (const message of messages) {
      const account = groups.get(message.accountId) || new Map()
      const mailbox = account.get(message.mailboxPath) || []
      mailbox.push(message)
      account.set(message.mailboxPath, mailbox)
      groups.set(message.accountId, account)
    }
    return { ids, messages, groups }
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

  async function verifyAccount(account) {
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

    return mailboxes
  }

  async function removeAccountFiles(id) {
    await Promise.all([
      rm(join(store.dataPath, 'messages', String(id)), { recursive: true, force: true }),
      rm(join(store.dataPath, 'attachments', String(id)), { recursive: true, force: true })
    ])
  }

  return {
    listAccounts() {
      return store.listAccounts()
    },

    getAccountSettings(accountId) {
      const account = accountWithSecrets(accountId)
      return {
        id: account.id,
        name: account.name,
        email: account.email,
        incomingServer: account.imapHost,
        incomingPort: account.imapPort,
        incomingTls: account.imapSecure,
        incomingUsername: account.imapUser,
        outgoingServer: account.smtpHost,
        outgoingPort: account.smtpPort,
        outgoingTls: account.smtpSecure,
        outgoingUsername: account.smtpUser
      }
    },

    async addAccount(input) {
      if (!safeStorage.isEncryptionAvailable()) {
        throw new Error('Secure credential storage is unavailable')
      }

      const account = normalizeAccount(input)
      const mailboxes = await verifyAccount(account)

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

    async updateAccount(accountId, input) {
      if (!safeStorage.isEncryptionAvailable()) {
        throw new Error('Secure credential storage is unavailable')
      }

      const current = accountWithSecrets(accountId)
      const account = normalizeAccount({
        ...input,
        incomingPassword: input.incomingPassword || current.imapPassword,
        outgoingPassword: input.outgoingPassword || current.smtpPassword
      })
      const mailboxes = await verifyAccount(account)
      const imapChanged =
        current.imapHost !== account.imapHost ||
        current.imapPort !== account.imapPort ||
        current.imapSecure !== account.imapSecure ||
        current.imapUser !== account.imapUser

      store.updateAccount(current.id, {
        ...account,
        imapSecure: Number(account.imapSecure),
        smtpSecure: Number(account.smtpSecure),
        imapPassword: safeStorage.encryptString(account.imapPassword),
        smtpPassword: safeStorage.encryptString(account.smtpPassword)
      })
      if (imapChanged) {
        store.deleteAccountMailboxes(current.id)
        await removeAccountFiles(current.id)
      }
      saveMailboxes(mailboxes, current.id)
      return store.listAccounts().find((savedAccount) => savedAccount.id === current.id)
    },

    async deleteAccount(accountId) {
      const id = Number(accountId)
      if (!store.deleteAccount(id)) throw new Error('Account not found')
      await removeAccountFiles(id)
      return true
    },

    listMailboxes(accountId) {
      return store.listMailboxes(Number(accountId))
    },

    async syncMessages({ accountId, mailbox = '\\Inbox', limit = 100 }) {
      if (mailbox === '\\Flagged') {
        return store.listMessages(Number(accountId), mailbox, limit)
      }

      const account = accountWithSecrets(accountId)
      let selectedMailbox = mailbox

      await withImap(account, async (client) => {
        const mailboxes = await client.list(
          mailbox === '\\Junk' ? { statusQuery: { messages: true } } : undefined
        )
        saveMailboxes(mailboxes, account.id)
        const discoveredMailboxes =
          mailbox === '\\Junk'
            ? mailboxes.filter(isJunkMailbox)
            : [selectMailbox(mailboxes, mailbox)].filter(Boolean)
        const mailboxRecords = discoveredMailboxes
          .map((item) => store.getMailbox(account.id, item.path))
          .filter(Boolean)
        if (!mailboxRecords.length) throw new Error(`Mailbox not found: ${mailbox}`)
        if (mailbox !== '\\Junk') selectedMailbox = mailboxRecords[0].path

        for (const mailboxRecord of mailboxRecords) {
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
        }
      })

      return store.listMessages(Number(accountId), selectedMailbox, limit)
    },

    async getMessage(messageId) {
      let message = store.getMessage(Number(messageId))
      if (!message) throw new Error('Message not found')
      if (message.bodyDownloaded) return publicMessage(message, nativeImage)

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
      return publicMessage(message, nativeImage)
    },

    async setMessageFlag({ messageIds, flag, enabled }) {
      if (!['\\Seen', '\\Flagged'].includes(flag)) throw new Error('Unsupported message flag')
      const { messages, groups } = selectedMessageGroups(messageIds)

      for (const [accountId, mailboxes] of groups) {
        await withImap(accountWithSecrets(accountId), async (client) => {
          for (const [mailboxPath, mailboxMessages] of mailboxes) {
            const lock = await client.getMailboxLock(mailboxPath)
            try {
              const uids = mailboxMessages.map((message) => message.uid)
              if (enabled) await client.messageFlagsAdd(uids, [flag], { uid: true })
              else await client.messageFlagsRemove(uids, [flag], { uid: true })
            } finally {
              lock.release()
            }
          }
        })
      }

      for (const message of messages) {
        const flags = new Set(message.flags)
        if (enabled) flags.add(flag)
        else flags.delete(flag)
        store.setMessageFlags(message.id, [...flags])
      }
      return true
    },

    async moveMessages({ messageIds, destination }) {
      if (!['\\Inbox', '\\Junk', '\\Trash'].includes(destination)) {
        throw new Error('Unsupported destination mailbox')
      }
      const { ids, messages, groups } = selectedMessageGroups(messageIds)
      const affectedIds = []

      for (const [accountId, mailboxes] of groups) {
        await withImap(accountWithSecrets(accountId), async (client) => {
          const availableMailboxes = await client.list(
            destination === '\\Junk' ? { statusQuery: { messages: true } } : undefined
          )
          saveMailboxes(availableMailboxes, accountId)
          const target = selectMailbox(availableMailboxes, destination)
          if (!target) throw new Error(`Mailbox not found: ${destination}`)

          for (const [mailboxPath, mailboxMessages] of mailboxes) {
            const lock = await client.getMailboxLock(mailboxPath)
            try {
              const uids = mailboxMessages.map((message) => message.uid)
              if (mailboxPath.toLowerCase() !== target.path.toLowerCase()) {
                await client.messageMove(uids, target.path, { uid: true })
                affectedIds.push(...mailboxMessages.map((message) => message.id))
              } else if (destination === '\\Trash') {
                await client.messageDelete(uids, { uid: true })
                affectedIds.push(...mailboxMessages.map((message) => message.id))
              }
            } finally {
              lock.release()
            }
          }
        })
      }

      await Promise.all(
        messages
          .filter((message) => affectedIds.includes(message.id))
          .flatMap((message) => [
            message.rawPath ? rm(message.rawPath, { force: true }) : Promise.resolve(),
            rm(join(store.dataPath, 'attachments', String(message.id)), {
              recursive: true,
              force: true
            })
          ])
      )
      store.deleteMessages(ids.filter((id) => affectedIds.includes(id)))
      return true
    },

    getAttachment(attachmentId) {
      return attachmentById(attachmentId)
    },

    async saveAttachment(attachmentId, destination) {
      const attachment = attachmentById(attachmentId)
      await copyFile(attachment.localPath, destination)
    },

    async sendMessage({ accountId, to, subject, text, html, attachments = [] }) {
      const account = accountWithSecrets(accountId)
      const recipient = requiredString(to, 'Recipient')
      const transporter = nodemailer.createTransport(smtpOptions(account))

      try {
        const info = await transporter.sendMail({
          from: { name: account.name, address: account.email },
          to: recipient,
          subject: String(subject || ''),
          text: requiredString(text, 'Message'),
          html: String(html || '') || undefined,
          attachments: attachments.map(({ filename, path }) => ({
            filename: basename(filename || path),
            content: createReadStream(path)
          }))
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
