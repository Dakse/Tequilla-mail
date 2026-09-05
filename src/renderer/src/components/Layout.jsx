import { Sheet } from '@mui/joy'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Group } from 'react-resizable-panels'
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
  const [mailError, setMailError] = useState('')
  const [refreshVersion, setRefreshVersion] = useState(0)
  const [selectedEmail, setSelectedEmail] = useState(null)
  const [selectedEmailLoading, setSelectedEmailLoading] = useState(false)
  const [selectedEmailIds, setSelectedEmailIds] = useState([])
  const [bulkActionLoading, setBulkActionLoading] = useState(false)
  const [messageActionLoading, setMessageActionLoading] = useState(false)
  const [dateFormat, setDateFormat] = useState(() =>
    localStorage.getItem('dateFormat') === 'american' ? 'american' : 'european'
  )
  const dateLocale = dateFormat === 'american' ? 'en-US' : 'en-GB'

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
    let active = true
    const tab = accountTabs.find((item) => item.name === selectedTab)

    setSelectedEmailIds([])
    setSelectedEmail(null)
    if (!selectedAccount || !tab?.mailbox) {
      setEmails([])
      return undefined
    }

    setEmailsLoading(true)
    setMailError('')
    window.mail
      .syncMessages({ accountId: selectedAccount, mailbox: tab.mailbox, limit: 100 })
      .then(async (messages) => {
        if (!active) return
        setEmails(messages)
        const savedAccounts = await window.mail.listAccounts()
        if (active) setAccounts(savedAccounts)
      })
      .catch((error) => active && setMailError(error.message))
      .finally(() => active && setEmailsLoading(false))

    return () => {
      active = false
    }
  }, [selectedAccount, selectedTab, refreshVersion])

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
    setMailError('')
    try {
      await window.mail.setMessageFlag({ messageIds: selectedEmailIds, flag, enabled })
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
    setMailError('')
    try {
      await window.mail.moveMessages({ messageIds, destination })
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
          dateLocale={dateLocale}
          onSelectTab={setSelectedTab}
          onSelectionChange={setSelectedEmailIds}
          onOpen={openMessage}
          onSetFlag={setSelectedFlag}
          onMove={moveSelectedMessages}
        />

        <EmailPanel
          composing={emailEditorOpen}
          contacts={contacts}
          selectedAccount={selectedAccount}
          email={selectedEmail}
          dateLocale={dateLocale}
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
        onDateFormatChange={(value) => {
          setDateFormat(value)
          localStorage.setItem('dateFormat', value)
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
