import { Sheet } from '@mui/joy'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Group } from 'react-resizable-panels'
import { mergeMessagePage } from '../message-filters'
import AccountModal from './AccountModal'
import AccountsPanel from './AccountsPanel'
import EmailPanel from './EmailPanel'
import EmailsListPanel from './EmailsListPanel'
import SettingsModal from './SettingsModal'
import { accountTabs, emailAddresses, withMessageFlag } from './helpers'

function Layout() {
  const [accounts, setAccounts] = useState([])
  const [selectedAccount, setSelectedAccount] = useState(null)
  const [selectedTab, setSelectedTab] = useState('Inbox')
  const [accountModalOpen, setAccountModalOpen] = useState(false)
  const [editingAccount, setEditingAccount] = useState(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [emailEditorOpen, setEmailEditorOpen] = useState(false)
  const [emails, setEmails] = useState([])
  const [emailsLoading, setEmailsLoading] = useState(false)
  const [moreEmailsLoading, setMoreEmailsLoading] = useState(false)
  const [hasMoreEmails, setHasMoreEmails] = useState(false)
  const [mailError, setMailError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [refreshVersion, setRefreshVersion] = useState(0)
  const [selectedEmail, setSelectedEmail] = useState(null)
  const [selectedEmailLoading, setSelectedEmailLoading] = useState(false)
  const [selectedEmailIds, setSelectedEmailIds] = useState([])
  const [bulkActionLoading, setBulkActionLoading] = useState(false)
  const [bulkActionProgress, setBulkActionProgress] = useState({ completed: 0, total: 0 })
  const [messageActionLoading, setMessageActionLoading] = useState(false)
  const [updateState, setUpdateState] = useState({
    status: 'idle',
    currentVersion: '',
    availableVersion: null
  })
  const [dateFormat, setDateFormat] = useState(() => {
    const saved = localStorage.getItem('dateFormat')
    if (['ymd', 'dmy', 'mdy'].includes(saved)) return saved
    return saved === 'american' ? 'mdy' : 'dmy'
  })
  const [dateSeparator, setDateSeparator] = useState(() => {
    const saved = localStorage.getItem('dateSeparator')
    return ['/', '.', '-'].includes(saved) ? saved : '/'
  })
  const [syncMode, setSyncMode] = useState(() => {
    const saved = localStorage.getItem('syncMode')
    return ['sync', 'no-sync', 'manual'].includes(saved) ? saved : 'sync'
  })
  const [messagePageSize, setMessagePageSize] = useState(() => {
    const saved = Number(localStorage.getItem('messagePageSize'))
    return [50, 100, 200, 500].includes(saved) ? saved : 50
  })
  const mailboxRequest = useRef(0)
  const nextMessageOffset = useRef(messagePageSize)
  const loadingMoreMessages = useRef(false)

  useEffect(() => {
    let active = true
    window.mail
      .listAccounts()
      .then((savedAccounts) => {
        if (!active) return
        setAccounts(savedAccounts)
        setSelectedAccount((current) => current || savedAccounts[0]?.id || null)
      })
      .catch((error) => active && setMailError(error.message))
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    const unsubscribe = window.mail.onMessagesChanged((change) => {
      window.mail
        .listAccounts()
        .then(setAccounts)
        .catch(() => {})

      if (change.accountId !== selectedAccount || selectedTab !== 'Inbox' || searchQuery) return
      if (change.error) {
        setMailError(change.error)
        return
      }

      setEmails((current) => mergeMessagePage(current, change.page.messages))
      setHasMoreEmails((current) => current || change.page.hasMore)
    })
    return unsubscribe
  }, [searchQuery, selectedAccount, selectedTab])

  useEffect(() => window.mail.onBulkProgress(setBulkActionProgress), [])

  useEffect(() => {
    window.mail.setSyncMode(syncMode).catch((error) => setMailError(error.message))
  }, [syncMode])

  useEffect(() => {
    let active = true
    const unsubscribe = window.updater.onStateChange((state) => active && setUpdateState(state))
    window.updater
      .getState()
      .then((state) => active && setUpdateState(state))
      .catch(() => {})
    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  useEffect(() => {
    let active = true
    const request = ++mailboxRequest.current
    const tab = accountTabs.find((item) => item.name === selectedTab)

    setSelectedEmailIds([])
    setSelectedEmail(null)
    setEmails([])
    setEmailsLoading(false)
    setHasMoreEmails(false)
    setMoreEmailsLoading(false)
    nextMessageOffset.current = messagePageSize
    loadingMoreMessages.current = false
    if (!selectedAccount || !tab?.mailbox) {
      return undefined
    }

    setEmailsLoading(true)
    setMailError('')
    const requestPage = searchQuery ? window.mail.searchMessages : window.mail.syncMessages
    requestPage({
      accountId: selectedAccount,
      mailbox: tab.mailbox,
      query: searchQuery,
      limit: messagePageSize,
      offset: 0
    })
      .then(async (page) => {
        if (!active || request !== mailboxRequest.current) return
        setEmails(page.messages)
        setHasMoreEmails(page.hasMore)
        const savedAccounts = await window.mail.listAccounts()
        if (active && request === mailboxRequest.current) setAccounts(savedAccounts)
      })
      .catch((error) => active && request === mailboxRequest.current && setMailError(error.message))
      .finally(() => active && request === mailboxRequest.current && setEmailsLoading(false))

    return () => {
      active = false
    }
  }, [messagePageSize, searchQuery, selectedAccount, selectedTab, refreshVersion])

  const loadMoreMessages = useCallback(async () => {
    const tab = accountTabs.find((item) => item.name === selectedTab)
    if (
      !selectedAccount ||
      !tab?.mailbox ||
      emailsLoading ||
      !hasMoreEmails ||
      loadingMoreMessages.current
    ) {
      return
    }

    const request = mailboxRequest.current
    const offset = nextMessageOffset.current
    loadingMoreMessages.current = true
    setMoreEmailsLoading(true)
    try {
      const requestPage = searchQuery ? window.mail.searchMessages : window.mail.syncMessages
      const page = await requestPage({
        accountId: selectedAccount,
        mailbox: tab.mailbox,
        query: searchQuery,
        limit: messagePageSize,
        offset
      })
      if (request !== mailboxRequest.current) return

      nextMessageOffset.current = offset + messagePageSize
      setEmails((current) => {
        const existing = new Set(current.map(({ id }) => id))
        return [...current, ...page.messages.filter(({ id }) => !existing.has(id))]
      })
      setHasMoreEmails(page.hasMore)
    } catch (error) {
      if (request === mailboxRequest.current) setMailError(error.message)
    } finally {
      loadingMoreMessages.current = false
      if (request === mailboxRequest.current) setMoreEmailsLoading(false)
    }
  }, [emailsLoading, hasMoreEmails, messagePageSize, searchQuery, selectedAccount, selectedTab])

  const contacts = useMemo(
    () =>
      [
        ...new Set(
          [
            ...accounts.map(({ email }) => email),
            ...emails.flatMap((email) => [
              ...emailAddresses(email.from),
              ...emailAddresses(email.to),
              ...emailAddresses(email.cc)
            ])
          ].filter(Boolean)
        )
      ].sort(),
    [accounts, emails]
  )

  async function setSelectedFlag(flag, enabled) {
    setBulkActionLoading(true)
    setBulkActionProgress({ completed: 0, total: selectedEmailIds.length })
    setMailError('')
    try {
      await window.mail.setMessageFlag({
        messageIds: selectedEmailIds,
        flag,
        enabled,
        reportProgress: true
      })
      setSelectedEmailIds([])
      setRefreshVersion((version) => version + 1)
    } catch (error) {
      setMailError(error.message)
    } finally {
      setBulkActionLoading(false)
    }
  }

  async function moveSelectedMessages(destination) {
    const messageIds = [...selectedEmailIds]
    setBulkActionLoading(true)
    setBulkActionProgress({ completed: 0, total: messageIds.length })
    setMailError('')
    try {
      await window.mail.moveMessages({ messageIds, destination, reportProgress: true })
      if (messageIds.includes(selectedEmail?.id)) setSelectedEmail(null)
      setSelectedEmailIds([])
      setRefreshVersion((version) => version + 1)
    } catch (error) {
      setMailError(error.message)
    } finally {
      setBulkActionLoading(false)
    }
  }

  async function setOpenMessageFlag(flag, enabled) {
    const messageId = selectedEmail.id
    setMessageActionLoading(true)
    setMailError('')
    try {
      await window.mail.setMessageFlag({ messageIds: [messageId], flag, enabled })
      if (selectedTab === 'Starred' && flag === '\\Flagged' && !enabled) {
        setEmails((current) => current.filter((email) => email.id !== messageId))
        setSelectedEmail((current) => (current?.id === messageId ? null : current))
      } else {
        setEmails((current) =>
          current.map((email) =>
            email.id === messageId ? withMessageFlag(email, flag, enabled) : email
          )
        )
        setSelectedEmail((current) =>
          current?.id === messageId ? withMessageFlag(current, flag, enabled) : current
        )
      }
      setAccounts(await window.mail.listAccounts())
    } catch (error) {
      setMailError(error.message)
    } finally {
      setMessageActionLoading(false)
    }
  }

  async function moveOpenMessage(destination) {
    const messageId = selectedEmail.id
    setMessageActionLoading(true)
    setMailError('')
    try {
      await window.mail.moveMessages({ messageIds: [messageId], destination })
      setEmails((current) => current.filter((email) => email.id !== messageId))
      setSelectedEmail((current) => (current?.id === messageId ? null : current))
      setAccounts(await window.mail.listAccounts())
    } catch (error) {
      setMailError(error.message)
    } finally {
      setMessageActionLoading(false)
    }
  }

  const openMessage = useCallback(async (email) => {
    const shouldMarkRead = email.unread
    const openedEmail = shouldMarkRead ? withMessageFlag(email, '\\Seen', true) : email
    setEmailEditorOpen(false)
    setSelectedEmail(openedEmail)
    if (shouldMarkRead) {
      setEmails((current) =>
        current.map((item) => (item.id === email.id ? withMessageFlag(item, '\\Seen', true) : item))
      )
    }
    setSelectedEmailLoading(true)
    setMailError('')
    try {
      const [fullMessage] = await Promise.all([
        window.mail.getMessage(email.id),
        shouldMarkRead
          ? window.mail.setMessageFlag({ messageIds: [email.id], flag: '\\Seen', enabled: true })
          : Promise.resolve()
      ])
      setSelectedEmail((current) =>
        current?.id === email.id
          ? shouldMarkRead
            ? withMessageFlag(fullMessage, '\\Seen', true)
            : fullMessage
          : current
      )
      if (shouldMarkRead) setAccounts(await window.mail.listAccounts())
    } catch (error) {
      setMailError(error.message)
    } finally {
      setSelectedEmailLoading(false)
    }
  }, [])

  async function openAccountSettings(accountId) {
    try {
      setEditingAccount(await window.mail.getAccount(accountId))
      setAccountModalOpen(true)
    } catch (error) {
      setMailError(error.message)
    }
  }

  function closeAccountModal() {
    setAccountModalOpen(false)
    setEditingAccount(null)
  }

  function accountSaved(account) {
    setAccounts((current) =>
      editingAccount
        ? current.map((item) => (item.id === account.id ? account : item))
        : [...current, account]
    )
    setSelectedAccount(account.id)
    setSelectedTab('Inbox')
    closeAccountModal()
  }

  function accountDeleted(accountId) {
    const remaining = accounts.filter((account) => account.id !== accountId)
    setAccounts(remaining)
    if (selectedAccount === accountId) {
      setSelectedAccount(remaining[0]?.id || null)
      setSelectedTab('Inbox')
      setSelectedEmail(null)
    }
    closeAccountModal()
  }

  return (
    <Sheet sx={{ height: '100vh', width: '100vw' }}>
      <Group>
        <AccountsPanel
          accounts={accounts}
          selectedAccount={selectedAccount}
          selectedTab={selectedTab}
          loading={emailsLoading}
          updateAvailable={Boolean(updateState.availableVersion)}
          onSettings={() => setSettingsOpen(true)}
          onRefresh={() => setRefreshVersion((version) => version + 1)}
          onCompose={() => setEmailEditorOpen(true)}
          onAccountSettings={openAccountSettings}
          onSelect={(accountId, tab) => {
            setSelectedAccount(accountId)
            setSelectedTab(tab)
          }}
          onAddAccount={() => {
            setEditingAccount(null)
            setAccountModalOpen(true)
          }}
        />

        <EmailsListPanel
          emails={emails}
          loading={emailsLoading}
          error={mailError}
          selectedAccount={selectedAccount}
          selectedTab={selectedTab}
          selectedEmailId={selectedEmail?.id}
          selectedEmailIds={selectedEmailIds}
          bulkActionLoading={bulkActionLoading}
          bulkActionProgress={bulkActionProgress}
          loadingMore={moreEmailsLoading}
          hasMore={hasMoreEmails}
          dateFormat={dateFormat}
          dateSeparator={dateSeparator}
          onSelectTab={setSelectedTab}
          onSearch={setSearchQuery}
          onSelectionChange={setSelectedEmailIds}
          onOpen={openMessage}
          onSetFlag={setSelectedFlag}
          onMove={moveSelectedMessages}
          onLoadMore={loadMoreMessages}
        />

        <EmailPanel
          composing={emailEditorOpen}
          contacts={contacts}
          selectedAccount={selectedAccount}
          email={selectedEmail}
          dateFormat={dateFormat}
          dateSeparator={dateSeparator}
          loading={selectedEmailLoading}
          actionLoading={messageActionLoading}
          mailbox={selectedTab}
          onCloseEditor={() => setEmailEditorOpen(false)}
          onSetFlag={setOpenMessageFlag}
          onMove={moveOpenMessage}
          onCompose={() => setEmailEditorOpen(true)}
        />
      </Group>

      <SettingsModal
        open={settingsOpen}
        accounts={accounts}
        dateFormat={dateFormat}
        dateSeparator={dateSeparator}
        syncMode={syncMode}
        messagePageSize={messagePageSize}
        updateState={updateState}
        onDateFormatChange={(value) => {
          setDateFormat(value)
          localStorage.setItem('dateFormat', value)
        }}
        onDateSeparatorChange={(value) => {
          setDateSeparator(value)
          localStorage.setItem('dateSeparator', value)
        }}
        onSyncModeChange={(value) => {
          setSyncMode(value)
          localStorage.setItem('syncMode', value)
        }}
        onMessagePageSizeChange={(value) => {
          setMessagePageSize(value)
          localStorage.setItem('messagePageSize', value)
        }}
        onClose={() => setSettingsOpen(false)}
      />
      <AccountModal
        key={`${editingAccount?.id || 'new'}-${accountModalOpen}`}
        open={accountModalOpen}
        account={editingAccount}
        onClose={closeAccountModal}
        onSaved={accountSaved}
        onDeleted={accountDeleted}
      />
    </Sheet>
  )
}

export default Layout
