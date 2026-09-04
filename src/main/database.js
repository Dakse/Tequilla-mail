import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'

function parseJson(value, fallback) {
  try {
    return value ? JSON.parse(value) : fallback
  } catch {
    return fallback
  }
}

const publicEmailDomains = new Set([
  'gmail.com',
  'googlemail.com',
  'outlook.com',
  'hotmail.com',
  'live.com',
  'msn.com',
  'yahoo.com',
  'ymail.com',
  'icloud.com',
  'me.com',
  'mac.com',
  'aol.com',
  'proton.me',
  'protonmail.com',
  'tuta.com',
  'tutanota.com',
  'fastmail.com',
  'gmx.com',
  'gmx.net',
  'mail.com',
  'zoho.com',
  'yandex.com',
  'yandex.ru',
  'mail.ru',
  'qq.com',
  '163.com',
  'o2.pl',
  'o2.co.uk',
  'wp.pl',
  'onet.pl',
  'interia.pl',
  'tlen.pl'
])

export function senderAvatar(address) {
  const domain = String(address || '')
    .trim()
    .toLowerCase()
    .split('@')
    .pop()

  if (
    !domain ||
    publicEmailDomains.has(domain) ||
    [...publicEmailDomains].some((provider) => domain.endsWith(`.${provider}`))
  ) {
    return null
  }

  try {
    const favicon = new URL('/favicon.ico', `https://${domain}`)
    return favicon.hostname === domain ? favicon.href : null
  } catch {
    return null
  }
}

function mapMessage(row) {
  if (!row) return null

  const flags = parseJson(row.flagsJson, [])
  const from = parseJson(row.fromJson, [])[0] || null
  if (from?.address) from.avatar = senderAvatar(from.address)

  return {
    id: row.id,
    accountId: row.accountId,
    mailboxId: row.mailboxId,
    uid: row.uid,
    messageId: row.messageId,
    subject: row.subject || '(no subject)',
    from,
    to: parseJson(row.toJson, []),
    cc: parseJson(row.ccJson, []),
    date: row.sentAt || row.internalDate,
    flags,
    unread: !flags.includes('\\Seen'),
    starred: flags.includes('\\Flagged'),
    snippet: row.snippet || '',
    text: row.textBody,
    html: row.htmlBody,
    bodyDownloaded: Boolean(row.bodyDownloaded),
    hasAttachments: Boolean(row.hasAttachments)
  }
}

export function openDatabase(userDataPath) {
  const dataPath = join(userDataPath, 'mail-data')
  mkdirSync(dataPath, { recursive: true })

  const db = new DatabaseSync(join(dataPath, 'mail.sqlite'), { timeout: 5000 })
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS accounts (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL COLLATE NOCASE UNIQUE,
      imap_host TEXT NOT NULL,
      imap_port INTEGER NOT NULL,
      imap_secure INTEGER NOT NULL,
      imap_user TEXT NOT NULL,
      imap_password BLOB NOT NULL,
      smtp_host TEXT NOT NULL,
      smtp_port INTEGER NOT NULL,
      smtp_secure INTEGER NOT NULL,
      smtp_user TEXT NOT NULL,
      smtp_password BLOB NOT NULL,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    ) STRICT;

    CREATE TABLE IF NOT EXISTS mailboxes (
      id INTEGER PRIMARY KEY,
      account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      path TEXT NOT NULL,
      name TEXT NOT NULL,
      delimiter TEXT,
      special_use TEXT,
      uid_validity TEXT,
      uid_next INTEGER,
      highest_modseq TEXT,
      last_synced_uid INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      UNIQUE(account_id, path)
    ) STRICT;

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY,
      mailbox_id INTEGER NOT NULL REFERENCES mailboxes(id) ON DELETE CASCADE,
      uid INTEGER NOT NULL,
      message_id TEXT,
      subject TEXT,
      from_json TEXT NOT NULL DEFAULT '[]',
      to_json TEXT NOT NULL DEFAULT '[]',
      cc_json TEXT NOT NULL DEFAULT '[]',
      sent_at TEXT,
      internal_date TEXT,
      flags_json TEXT NOT NULL DEFAULT '[]',
      size INTEGER,
      snippet TEXT,
      text_body TEXT,
      html_body TEXT,
      raw_path TEXT,
      body_downloaded INTEGER NOT NULL DEFAULT 0,
      has_attachments INTEGER NOT NULL DEFAULT 0,
      UNIQUE(mailbox_id, uid)
    ) STRICT;

    CREATE TABLE IF NOT EXISTS attachments (
      id INTEGER PRIMARY KEY,
      message_id INTEGER NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
      filename TEXT NOT NULL,
      content_type TEXT,
      size INTEGER,
      content_id TEXT,
      disposition TEXT,
      local_path TEXT
    ) STRICT;

    CREATE INDEX IF NOT EXISTS messages_mailbox_date
      ON messages(mailbox_id, sent_at DESC, internal_date DESC);
    CREATE INDEX IF NOT EXISTS mailboxes_account_special_use
      ON mailboxes(account_id, special_use);
  `)

  const insertAccount = db.prepare(`
    INSERT INTO accounts (
      name, email,
      imap_host, imap_port, imap_secure, imap_user, imap_password,
      smtp_host, smtp_port, smtp_secure, smtp_user, smtp_password
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  const updateAccount = db.prepare(`
    UPDATE accounts SET
      name = ?, email = ?,
      imap_host = ?, imap_port = ?, imap_secure = ?, imap_user = ?, imap_password = ?,
      smtp_host = ?, smtp_port = ?, smtp_secure = ?, smtp_user = ?, smtp_password = ?
    WHERE id = ?
  `)
  const deleteAccount = db.prepare('DELETE FROM accounts WHERE id = ?')
  const deleteAccountMailboxes = db.prepare('DELETE FROM mailboxes WHERE account_id = ?')
  const listAccounts = db.prepare(`
    SELECT
      a.id,
      a.name,
      a.email,
      a.created_at AS createdAt,
      COALESCE(SUM(CASE
        WHEN mb.special_use = '\\Inbox' AND m.flags_json NOT LIKE '%\\\\Seen%' THEN 1
        ELSE 0
      END), 0) AS unreadAmount,
      COALESCE(SUM(CASE
        WHEN mb.special_use = '\\Drafts' AND m.id IS NOT NULL THEN 1
        ELSE 0
      END), 0) AS draftsAmount,
      COALESCE(SUM(CASE WHEN m.flags_json LIKE '%\\\\Flagged%' THEN 1 ELSE 0 END), 0) AS starredAmount,
      COALESCE(SUM(CASE
        WHEN (
          mb.special_use IN ('\\Junk', '\\Spam') OR lower(mb.name) IN ('junk', 'spam')
        ) AND m.flags_json NOT LIKE '%\\\\Seen%' THEN 1
        ELSE 0
      END), 0) AS spamUnreadAmount
    FROM accounts a
    LEFT JOIN mailboxes mb ON mb.account_id = a.id
    LEFT JOIN messages m ON m.mailbox_id = mb.id
    GROUP BY a.id
    ORDER BY a.created_at
  `)
  const getAccount = db.prepare('SELECT * FROM accounts WHERE id = ?')
  const upsertMailbox = db.prepare(`
    INSERT INTO mailboxes (account_id, path, name, delimiter, special_use)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(account_id, path) DO UPDATE SET
      name = excluded.name,
      delimiter = excluded.delimiter,
      special_use = excluded.special_use,
      updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  `)
  const getMailboxByPath = db.prepare('SELECT * FROM mailboxes WHERE account_id = ? AND path = ?')
  const getMailboxBySelector = db.prepare(`
    SELECT * FROM mailboxes
    WHERE account_id = ? AND (special_use = ? OR lower(path) = lower(?))
    ORDER BY CASE WHEN special_use = ? THEN 0 ELSE 1 END
    LIMIT 1
  `)
  const listMailboxes = db.prepare(`
    SELECT id, account_id AS accountId, path, name, delimiter, special_use AS specialUse
    FROM mailboxes
    WHERE account_id = ?
    ORDER BY CASE special_use
      WHEN '\\Inbox' THEN 0
      WHEN '\\Sent' THEN 1
      WHEN '\\Drafts' THEN 2
      WHEN '\\Junk' THEN 3
      WHEN '\\Trash' THEN 4
      ELSE 5
    END, name
  `)
  const resetMailbox = db.prepare(`
    UPDATE mailboxes SET
      uid_validity = ?, uid_next = NULL, highest_modseq = NULL, last_synced_uid = 0
    WHERE id = ?
  `)
  const deleteMailboxMessages = db.prepare('DELETE FROM messages WHERE mailbox_id = ?')
  const updateMailboxSync = db.prepare(`
    UPDATE mailboxes SET
      uid_validity = ?, uid_next = ?, highest_modseq = ?, last_synced_uid = ?,
      updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
    WHERE id = ?
  `)
  const upsertMessage = db.prepare(`
    INSERT INTO messages (
      mailbox_id, uid, message_id, subject, from_json, to_json, cc_json,
      sent_at, internal_date, flags_json, size, has_attachments
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(mailbox_id, uid) DO UPDATE SET
      message_id = excluded.message_id,
      subject = excluded.subject,
      from_json = excluded.from_json,
      to_json = excluded.to_json,
      cc_json = excluded.cc_json,
      sent_at = excluded.sent_at,
      internal_date = excluded.internal_date,
      flags_json = excluded.flags_json,
      size = excluded.size,
      has_attachments = excluded.has_attachments
  `)
  const listMessages = db.prepare(`
    SELECT
      m.id, mb.account_id AS accountId, m.mailbox_id AS mailboxId, m.uid,
      m.message_id AS messageId, m.subject, m.from_json AS fromJson,
      m.to_json AS toJson, m.cc_json AS ccJson, m.sent_at AS sentAt,
      m.internal_date AS internalDate, m.flags_json AS flagsJson, m.snippet,
      m.text_body AS textBody, m.body_downloaded AS bodyDownloaded,
      m.has_attachments AS hasAttachments
    FROM messages m
    JOIN mailboxes mb ON mb.id = m.mailbox_id
    WHERE mb.account_id = ? AND (
      (? = '\\Flagged' AND m.flags_json LIKE '%\\\\Flagged%') OR
      (? = '\\Junk' AND (
        mb.special_use IN ('\\Junk', '\\Spam') OR lower(mb.name) IN ('junk', 'spam')
      )) OR
      (? NOT IN ('\\Flagged', '\\Junk') AND (mb.special_use = ? OR lower(mb.path) = lower(?)))
    )
    ORDER BY COALESCE(m.sent_at, m.internal_date) DESC, m.uid DESC
    LIMIT ? OFFSET ?
  `)
  const getMessage = db.prepare(`
    SELECT
      m.id, mb.account_id AS accountId, m.mailbox_id AS mailboxId, m.uid,
      m.message_id AS messageId, m.subject, m.from_json AS fromJson,
      m.to_json AS toJson, m.cc_json AS ccJson, m.sent_at AS sentAt,
      m.internal_date AS internalDate, m.flags_json AS flagsJson, m.snippet,
      m.text_body AS textBody, m.html_body AS htmlBody, m.body_downloaded AS bodyDownloaded,
      m.has_attachments AS hasAttachments, m.raw_path AS rawPath,
      mb.path AS mailboxPath
    FROM messages m
    JOIN mailboxes mb ON mb.id = m.mailbox_id
    WHERE m.id = ?
  `)
  const saveMessageBody = db.prepare(`
    UPDATE messages SET
      text_body = ?, html_body = ?, snippet = ?, raw_path = ?,
      body_downloaded = 1, has_attachments = ?
    WHERE id = ?
  `)
  const updateMessageFlags = db.prepare('UPDATE messages SET flags_json = ? WHERE id = ?')
  const deleteMessage = db.prepare('DELETE FROM messages WHERE id = ?')
  const deleteAttachments = db.prepare('DELETE FROM attachments WHERE message_id = ?')
  const insertAttachment = db.prepare(`
    INSERT INTO attachments (
      message_id, filename, content_type, size, content_id, disposition, local_path
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `)
  const listAttachments = db.prepare(`
    SELECT id, filename, content_type AS contentType, size, content_id AS contentId,
      disposition, local_path AS localPath
    FROM attachments
    WHERE message_id = ?
    ORDER BY id
  `)
  const getAttachment = db.prepare(`
    SELECT id, filename, content_type AS contentType, size, content_id AS contentId,
      disposition, local_path AS localPath
    FROM attachments
    WHERE id = ?
  `)

  return {
    dataPath,

    close() {
      db.close()
    },

    createAccount(account) {
      const result = insertAccount.run(
        account.name,
        account.email,
        account.imapHost,
        account.imapPort,
        account.imapSecure,
        account.imapUser,
        account.imapPassword,
        account.smtpHost,
        account.smtpPort,
        account.smtpSecure,
        account.smtpUser,
        account.smtpPassword
      )
      return Number(result.lastInsertRowid)
    },

    updateAccount(id, account) {
      updateAccount.run(
        account.name,
        account.email,
        account.imapHost,
        account.imapPort,
        account.imapSecure,
        account.imapUser,
        account.imapPassword,
        account.smtpHost,
        account.smtpPort,
        account.smtpSecure,
        account.smtpUser,
        account.smtpPassword,
        id
      )
    },

    deleteAccount(id) {
      return deleteAccount.run(id).changes > 0
    },

    deleteAccountMailboxes(id) {
      deleteAccountMailboxes.run(id)
    },

    getAccount(id) {
      return getAccount.get(id) || null
    },

    listAccounts() {
      return listAccounts.all()
    },

    upsertMailbox(accountId, mailbox) {
      upsertMailbox.run(
        accountId,
        mailbox.path,
        mailbox.name || mailbox.path,
        mailbox.delimiter || null,
        mailbox.specialUse || null
      )
      return getMailboxByPath.get(accountId, mailbox.path)
    },

    getMailbox(accountId, selector) {
      return getMailboxBySelector.get(accountId, selector, selector, selector) || null
    },

    listMailboxes(accountId) {
      return listMailboxes.all(accountId)
    },

    resetMailbox(mailboxId, uidValidity) {
      db.exec('BEGIN IMMEDIATE')
      try {
        deleteMailboxMessages.run(mailboxId)
        resetMailbox.run(uidValidity, mailboxId)
        db.exec('COMMIT')
      } catch (error) {
        db.exec('ROLLBACK')
        throw error
      }
    },

    saveMessageSummaries(mailboxId, mailboxState, messages) {
      db.exec('BEGIN IMMEDIATE')
      try {
        for (const message of messages) {
          upsertMessage.run(
            mailboxId,
            message.uid,
            message.messageId,
            message.subject,
            JSON.stringify(message.from),
            JSON.stringify(message.to),
            JSON.stringify(message.cc),
            message.sentAt,
            message.internalDate,
            JSON.stringify(message.flags),
            message.size,
            message.hasAttachments
          )
        }

        updateMailboxSync.run(
          mailboxState.uidValidity,
          mailboxState.uidNext,
          mailboxState.highestModseq,
          mailboxState.lastSyncedUid,
          mailboxId
        )
        db.exec('COMMIT')
      } catch (error) {
        db.exec('ROLLBACK')
        throw error
      }
    },

    listMessages(accountId, mailbox, limit = 100, offset = 0) {
      return listMessages
        .all(
          accountId,
          mailbox,
          mailbox,
          mailbox,
          mailbox,
          mailbox,
          Math.min(limit, 200),
          Math.max(offset, 0)
        )
        .map(mapMessage)
    },

    getMessage(id) {
      const row = getMessage.get(id)
      if (!row) return null
      return {
        ...mapMessage(row),
        rawPath: row.rawPath,
        mailboxPath: row.mailboxPath,
        attachments: listAttachments.all(id)
      }
    },

    setMessageFlags(id, flags) {
      return updateMessageFlags.run(JSON.stringify(flags), id).changes > 0
    },

    deleteMessages(ids) {
      db.exec('BEGIN IMMEDIATE')
      try {
        let changes = 0
        for (const id of ids) changes += deleteMessage.run(id).changes
        db.exec('COMMIT')
        return changes
      } catch (error) {
        db.exec('ROLLBACK')
        throw error
      }
    },

    getAttachment(id) {
      return getAttachment.get(id) || null
    },

    saveMessageBody(messageId, body, attachments) {
      db.exec('BEGIN IMMEDIATE')
      try {
        saveMessageBody.run(
          body.text,
          body.html,
          body.snippet,
          body.rawPath,
          Number(attachments.length > 0),
          messageId
        )
        deleteAttachments.run(messageId)
        for (const attachment of attachments) {
          insertAttachment.run(
            messageId,
            attachment.filename,
            attachment.contentType,
            attachment.size,
            attachment.contentId,
            attachment.disposition,
            attachment.localPath
          )
        }
        db.exec('COMMIT')
      } catch (error) {
        db.exec('ROLLBACK')
        throw error
      }
    }
  }
}
