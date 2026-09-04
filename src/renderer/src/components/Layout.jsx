import {
  CreateRounded,
  Delete,
  DeleteForeverRounded,
  DeleteRounded,
  FilterAlt,
  FolderDeleteRounded,
  MarkEmailReadRounded,
  MarkEmailUnreadRounded,
  Refresh,
  RestoreFromTrashRounded,
  SettingsRounded,
  StarBorderRounded,
  StarRounded
} from '@mui/icons-material'
import Add from '@mui/icons-material/Add'
import Drafts from '@mui/icons-material/Drafts'
import Inbox from '@mui/icons-material/Inbox'
import Search from '@mui/icons-material/Search'
import Send from '@mui/icons-material/Send'
import StarBorder from '@mui/icons-material/StarBorder'
import SwapVert from '@mui/icons-material/SwapVert'
import {
  Accordion,
  AccordionDetails,
  AccordionGroup,
  AccordionSummary,
  Alert,
  Avatar,
  Badge,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  DialogContent,
  DialogTitle,
  Divider,
  Dropdown,
  FormControl,
  FormLabel,
  Input,
  List,
  ListItemButton,
  ListSubheader,
  Menu,
  MenuButton,
  MenuItem,
  Modal,
  ModalClose,
  ModalDialog,
  Option,
  Radio,
  Select,
  Sheet,
  Stack,
  Tooltip,
  Typography
} from '@mui/joy'
import { useColorScheme } from '@mui/joy/styles'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Group, Panel } from 'react-resizable-panels'
import { List as VirtualList } from 'react-window'
import EmailDisplay from './EmailDisplay'
import EmailEditor from './EmailEditor'
import TooltipIconButton from './TooltipIconButton'
import { emptyMessageFilters, filterMessages } from '../message-filters'

const accountTabs = [
  { name: 'Inbox', mailbox: '\\Inbox', icon: Inbox, decorator: 'unreadAmount' },
  { name: 'Sent', mailbox: '\\Sent', icon: Send },
  { name: 'Drafts', mailbox: '\\Drafts', icon: Drafts, decorator: 'draftsAmount' },
  { name: 'Starred', mailbox: '\\Flagged', icon: StarBorder, decorator: 'starredAmount' },
  { name: 'Spam', mailbox: '\\Junk', icon: Delete, decorator: 'spamUnreadAmount' }
]

function initials(value) {
  return String(value || '?')
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function emailAddresses(value) {
  return (Array.isArray(value) ? value : [value]).map((item) => item?.address).filter(Boolean)
}

function formatMessageDate(value, locale) {
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? ''
    : new Intl.DateTimeFormat(locale, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(date)
}

function withMessageFlag(message, flag, enabled) {
  const flags = new Set(message.flags)
  if (enabled) flags.add(flag)
  else flags.delete(flag)
  return {
    ...message,
    flags: [...flags],
    unread: !flags.has('\\Seen'),
    starred: flags.has('\\Flagged')
  }
}

function emailRowKey(index, { emails }) {
  return emails[index].id
}

function EmailRow({
  ariaAttributes,
  index,
  style,
  emails,
  openedEmailId,
  selectedEmailIds,
  dateLocale,
  onOpen,
  onToggle
}) {
  const email = emails[index]

  return (
    <Box {...ariaAttributes} style={style} sx={{ boxSizing: 'border-box', py: 0.25 }}>
      <ListItemButton
        selected={openedEmailId === email.id}
        sx={{
          alignItems: 'center',
          width: '100%',
          height: '100%',
          position: 'relative',
          ...(email.unread && {
            '&::before': {
              content: '""',
              position: 'absolute',
              left: 0,
              width: 5,
              height: 10,
              borderRadius: '0 999px 999px 0',
              backgroundColor: 'primary.solidBg'
            }
          })
        }}
        onClick={() => onOpen(email)}
      >
        <Checkbox
          aria-label={`Select ${email.subject}`}
          checked={selectedEmailIds.includes(email.id)}
          onClick={(event) => event.stopPropagation()}
          onChange={(event) => onToggle(email.id, event.target.checked)}
        />
        <Avatar src={email.from?.avatar}>
          {initials(email.from?.name || email.from?.address)}
        </Avatar>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            level="title-md"
            fontWeight="bold"
            slotProps={{
              endDecorator: { sx: { ml: 'auto' } },
              root: { sx: { opacity: 0.9 } }
            }}
            endDecorator={
              <Typography noWrap variant="caption" fontWeight={400} level="body-xs">
                {formatMessageDate(email.date, dateLocale)}
              </Typography>
            }
            noWrap
          >
            {email.from?.name || email.from?.address || 'Unknown sender'}
          </Typography>
          <Typography lineHeight={1} level="body-md" fontWeight="bold" noWrap>
            {email.subject}
          </Typography>
          <Typography level="body-md" variant="caption" noWrap>
            {email.snippet || email.from?.address}
          </Typography>
        </Box>
      </ListItemButton>
    </Box>
  )
}

function Layout() {
  const { mode, setMode } = useColorScheme()
  const [accounts, setAccounts] = useState([])
  const [selectedAccount, setSelectedAccount] = useState(null)
  const [selectedTab, setSelectedTab] = useState('Inbox')
  const [sortOption, setSortOption] = useState('newest')
  const [filterOpen, setFilterOpen] = useState(false)
  const [messageFilters, setMessageFilters] = useState(emptyMessageFilters)
  const [addAccountOpen, setAddAccountOpen] = useState(false)
  const [editingAccount, setEditingAccount] = useState(null)
  const [addAccountSaving, setAddAccountSaving] = useState(false)
  const [addAccountError, setAddAccountError] = useState('')
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
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [clearDataLoading, setClearDataLoading] = useState(false)
  const [settingsError, setSettingsError] = useState('')
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

  useEffect(() => {
    setSelectedEmailIds([])
  }, [messageFilters])

  const sortOptions = ['newest', 'oldest']
  const displayedEmails = useMemo(() => {
    const filtered = filterMessages(emails, messageFilters)
    return sortOption === 'oldest' ? filtered.reverse() : filtered
  }, [emails, messageFilters, sortOption])
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
  const filtersActive = Object.values(messageFilters).some(Boolean)
  const allEmailsSelected =
    displayedEmails.length > 0 &&
    displayedEmails.every((email) => selectedEmailIds.includes(email.id))

  function updateMessageFilter(name, value) {
    setMessageFilters((current) => ({ ...current, [name]: value }))
  }

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
      const displayedMessage = shouldMarkRead
        ? withMessageFlag(fullMessage, '\\Seen', true)
        : fullMessage
      setSelectedEmail((current) => (current?.id === email.id ? displayedMessage : current))
      if (shouldMarkRead) setAccounts(await window.mail.listAccounts())
    } catch (error) {
      setMailError(error.message)
    } finally {
      setSelectedEmailLoading(false)
    }
  }, [])

  const toggleEmailSelection = useCallback((emailId, checked) => {
    setSelectedEmailIds((current) =>
      checked ? [...current, emailId] : current.filter((id) => id !== emailId)
    )
  }, [])

  const emailRowProps = useMemo(
    () => ({
      emails: displayedEmails,
      openedEmailId: selectedEmail?.id,
      selectedEmailIds,
      dateLocale,
      onOpen: openMessage,
      onToggle: toggleEmailSelection
    }),
    [
      dateLocale,
      displayedEmails,
      openMessage,
      selectedEmail?.id,
      selectedEmailIds,
      toggleEmailSelection
    ]
  )

  async function clearAllData() {
    if (!window.confirm('Clear all accounts, downloaded mail, attachments, and preferences?')) return

    setClearDataLoading(true)
    setSettingsError('')
    try {
      await Promise.all(accounts.map((account) => window.mail.deleteAccount(account.id)))
      localStorage.clear()
      window.location.reload()
    } catch (error) {
      setSettingsError(error.message)
      setClearDataLoading(false)
    }
  }

  function closeAccountDialog() {
    setAddAccountOpen(false)
    setEditingAccount(null)
    setAddAccountError('')
  }

  async function openAccountSettings(accountId) {
    setAddAccountError('')
    try {
      setEditingAccount(await window.mail.getAccount(accountId))
      setAddAccountOpen(true)
    } catch (error) {
      setMailError(error.message)
    }
  }

  async function saveAccount(event) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setAddAccountSaving(true)
    setAddAccountError('')

    try {
      const values = {
        name: form.get('name'),
        email: form.get('email'),
        incomingServer: form.get('incomingServer'),
        incomingPort: form.get('incomingPort'),
        incomingUsername: form.get('incomingUsername'),
        incomingPassword: form.get('incomingPassword'),
        incomingTls: form.has('incomingTls'),
        outgoingServer: form.get('outgoingServer'),
        outgoingPort: form.get('outgoingPort'),
        outgoingUsername: form.get('outgoingUsername'),
        outgoingPassword: form.get('outgoingPassword'),
        outgoingTls: form.has('outgoingTls')
      }
      const account = editingAccount
        ? await window.mail.updateAccount(editingAccount.id, values)
        : await window.mail.addAccount(values)

      setAccounts((current) =>
        editingAccount
          ? current.map((item) => (item.id === account.id ? account : item))
          : [...current, account]
      )
      setSelectedAccount(account.id)
      setSelectedTab('Inbox')
      closeAccountDialog()
    } catch (error) {
      setAddAccountError(error.message)
    } finally {
      setAddAccountSaving(false)
    }
  }

  async function deleteAccount() {
    if (!window.confirm(`Delete ${editingAccount.name} and its locally downloaded mail?`)) return

    setAddAccountSaving(true)
    setAddAccountError('')
    try {
      await window.mail.deleteAccount(editingAccount.id)
      const remaining = accounts.filter((account) => account.id !== editingAccount.id)
      setAccounts(remaining)
      if (selectedAccount === editingAccount.id) {
        setSelectedAccount(remaining[0]?.id || null)
        setSelectedTab('Inbox')
        setSelectedEmail(null)
      }
      closeAccountDialog()
    } catch (error) {
      setAddAccountError(error.message)
    } finally {
      setAddAccountSaving(false)
    }
  }

  return (
    <Sheet sx={{ height: '100vh', width: '100vw' }}>
      <Group>
        <Box
          sx={{
            boxShadow: (theme) => theme.shadow.lg,
            zIndex: 3,
            background: (theme) => theme.palette.background.backdrop
          }}
          component={Panel}
          minSize={230}
          maxSize={500}
        >
          <AccordionGroup sx={{ gap: 1 }}>
            <ListSubheader sx={{ mt: 1, flex: 1, justifyContent: 'space-between', py: 0 }}>
              Accounts
              <Box
                sx={{
                  borderRadius: (t) => t.radius.md,
                  justifyContent: 'space-around',
                  display: 'flex',
                  gap: 1
                }}
              >
                <TooltipIconButton
                  aria-label="App settings"
                  variant="outlined"
                  onClick={() => setSettingsOpen(true)}
                >
                  <SettingsRounded />
                </TooltipIconButton>
                <TooltipIconButton
                  aria-label="Refresh messages"
                  variant="outlined"
                  disabled={!selectedAccount || emailsLoading}
                  onClick={() => setRefreshVersion((version) => version + 1)}
                >
                  <Refresh />
                </TooltipIconButton>
                <TooltipIconButton
                  aria-label="Create email"
                  variant="outlined"
                  disabled={!selectedAccount}
                  onClick={() => setEmailEditorOpen(true)}
                >
                  <CreateRounded />
                </TooltipIconButton>
              </Box>
            </ListSubheader>
            <Divider sx={{ mx: 1.5 }} />
            {accounts.map((account) => (
              <Accordion key={account.id} sx={{ border: 'none' }} defaultExpanded>
                <AccordionSummary sx={{ justifyContent: 'start' }}>
                  <Box
                    sx={{
                      position: 'relative',
                      flexShrink: 0,
                      '& .account-settings': { opacity: 0 },
                      '&:hover .account-settings, &:focus-within .account-settings': { opacity: 1 }
                    }}
                  >
                    <Avatar variant="solid">{initials(account.name)}</Avatar>
                    <TooltipIconButton
                      className="account-settings"
                      aria-label={`Settings for ${account.name}`}
                      color="neutral"
                      variant="solid"
                      onMouseDown={(event) => event.stopPropagation()}
                      onClick={(event) => {
                        event.stopPropagation()
                        openAccountSettings(account.id)
                      }}
                      sx={{ position: 'absolute', inset: 0, borderRadius: '50%' }}
                    >
                      <SettingsRounded />
                    </TooltipIconButton>
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography noWrap>{account.name}</Typography>
                    <Typography noWrap>{account.email}</Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <List sx={{ gap: 1 }} size="lg">
                    {accountTabs.map((tab) => {
                      const Icon = tab.icon
                      const count = Number(account[tab.decorator]) || 0
                      return (
                        <ListItemButton
                          key={tab.name}
                          selected={selectedAccount === account.id && selectedTab === tab.name}
                          sx={{ pl: 2 }}
                          onClick={() => {
                            if (selectedAccount !== account.id) setSelectedAccount(account.id)
                            if (selectedTab !== tab.name) setSelectedTab(tab.name)
                          }}
                        >
                          <Typography
                            flex={1}
                            startDecorator={<Icon />}
                            endDecorator={count > 0 ? count : null}
                            slotProps={{
                              endDecorator: { sx: { ml: 'auto', opacity: 0.6, fontWeight: 100 } }
                            }}
                          >
                            {tab.name}
                          </Typography>
                        </ListItemButton>
                      )
                    })}
                  </List>
                </AccordionDetails>
              </Accordion>
            ))}
            <Divider sx={{ mx: 1.5 }} />
            <List size="lg">
              <ListItemButton
                variant="outlined"
                sx={{ borderRadius: (t) => t.radius.md, mx: 1, px: 1 }}
                onClick={() => {
                  setEditingAccount(null)
                  setAddAccountOpen(true)
                }}
              >
                <Typography
                  width={'100%'}
                  textAlign={'center'}
                  lineHeight={1}
                  sx={{ gap: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <Add />
                  Add account
                </Typography>
              </ListItemButton>
            </List>
          </AccordionGroup>
        </Box>

        <Box
          sx={{
            zIndex: 2,
            boxShadow: (theme) => theme.shadow.lg,
            background: (theme) => theme.palette.background.surface,
            overflow: 'hidden !important',
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0
          }}
          component={Panel}
          minSize={400}
          maxSize={'60%'}
        >
          <Box sx={{ flexShrink: 0 }}>
            <Box
              sx={{
                px: 1.5,
                py: 1,
                alignItems: 'center',
                justifyContent: 'center',
                display: 'flex',
                gap: 1
              }}
            >
              <Checkbox
                aria-label="Select all messages"
                checked={allEmailsSelected}
                indeterminate={selectedEmailIds.length > 0 && !allEmailsSelected}
                disabled={displayedEmails.length === 0}
                onChange={(event) =>
                  setSelectedEmailIds(
                    event.target.checked ? displayedEmails.map(({ id }) => id) : []
                  )
                }
              />
              <Input
                placeholder={`Search "${selectedTab}"`}
                fullWidth
                startDecorator={<Search />}
                variant="soft"
                value={messageFilters.words}
                onChange={(event) => updateMessageFilter('words', event.target.value)}
              />

              <Badge invisible={!filtersActive}>
                <TooltipIconButton
                  aria-label="Filter messages"
                  onClick={() => setFilterOpen(!filterOpen)}
                  variant={filterOpen ? 'solid' : 'soft'}
                >
                  <FilterAlt />
                </TooltipIconButton>
              </Badge>

              <Dropdown>
                <Badge invisible={sortOption === 'newest'}>
                  <Tooltip title="Sort messages">
                    <MenuButton
                      aria-label="Sort messages"
                      variant={sortOption === 'newest' ? 'soft' : 'solid'}
                    >
                      <SwapVert />
                    </MenuButton>
                  </Tooltip>
                </Badge>
                <Menu>
                  {sortOptions.map((option) => (
                    <MenuItem
                      key={option}
                      sx={{ textTransform: 'capitalize' }}
                      onClick={() => {
                        if (sortOption !== option) setSortOption(option)
                      }}
                    >
                      <Radio checked={sortOption === option} />
                      {option}
                    </MenuItem>
                  ))}
                </Menu>
              </Dropdown>
            </Box>
            <AccordionGroup disableDivider>
             
              <Accordion
                sx={{ minBlockSize: 0 }}
                expanded={filterOpen}
                onChange={(e, expanded) => {
                  setFilterOpen(expanded)
                }}
              >
                <Divider sx={{ height: filterOpen ? undefined : 0 }} />
                <AccordionDetails sx={{ pt: filterOpen && 0.7 }}>
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                      gap: 1,
                      px: 1.5,
                      pb: 1
                    }}
                  >
                    <FormControl>
                      <FormLabel>From</FormLabel>
                      <Input
                        size="sm"
                        placeholder="Email address or username"
                        value={messageFilters.from}
                        onChange={(event) => updateMessageFilter('from', event.target.value)}
                      />
                    </FormControl>
                    <FormControl>
                      <FormLabel>To</FormLabel>
                      <Input
                        size="sm"
                        placeholder="Email address or username"
                        value={messageFilters.to}
                        onChange={(event) => updateMessageFilter('to', event.target.value)}
                      />
                    </FormControl>
                    <FormControl sx={{ gridColumn: '1 / -1' }}>
                      <FormLabel>Subject</FormLabel>
                      <Input
                        size="sm"
                        placeholder="Subject"
                        value={messageFilters.subject}
                        onChange={(event) => updateMessageFilter('subject', event.target.value)}
                      />
                    </FormControl>
                    <FormControl sx={{ gridColumn: '1 / -1' }}>
                      <FormLabel>Includes words</FormLabel>
                      <Input
                        size="sm"
                        placeholder="Keywords"
                        value={messageFilters.words}
                        onChange={(event) => updateMessageFilter('words', event.target.value)}
                      />
                    </FormControl>
                    <FormControl>
                      <FormLabel>From date</FormLabel>
                      <Input
                        size="sm"
                        type="date"
                        value={messageFilters.dateFrom}
                        onChange={(event) => updateMessageFilter('dateFrom', event.target.value)}
                      />
                    </FormControl>
                    <FormControl>
                      <FormLabel>To date</FormLabel>
                      <Input
                        size="sm"
                        type="date"
                        value={messageFilters.dateTo}
                        onChange={(event) => updateMessageFilter('dateTo', event.target.value)}
                      />
                    </FormControl>
                    <FormControl>
                      <FormLabel>Folder to search</FormLabel>
                      <Select
                        size="sm"
                        value={selectedTab}
                        onChange={(_event, value) => value && setSelectedTab(value)}
                      >
                        {accountTabs.map(({ name }) => (
                          <Option key={name} value={name}>
                            {name}
                          </Option>
                        ))}
                      </Select>
                    </FormControl>
                    <Box sx={{ display: 'flex', alignItems: 'end', pb: 0.5 }}>
                      <Checkbox
                        label="Has attachment"
                        checked={messageFilters.hasAttachment}
                        onChange={(event) =>
                          updateMessageFilter('hasAttachment', event.target.checked)
                        }
                      />
                    </Box>
                    <Button
                      size="sm"
                      variant="plain"
                      color="neutral"
                      disabled={!filtersActive}
                      sx={{ gridColumn: '1 / -1', justifySelf: 'end' }}
                      onClick={() => setMessageFilters({ ...emptyMessageFilters })}
                    >
                      Clear filters
                    </Button>
                  </Box>
                </AccordionDetails>
              </Accordion>
               <Accordion sx={{ minBlockSize: 0 }} expanded={selectedEmailIds.length > 0}>
                <Divider sx={{ height: selectedEmailIds.length ? undefined : 0 }} />
                <AccordionDetails sx={{ pt: selectedEmailIds.length ? 0.7 : 0 }}>
                  <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
                    <Typography level="body-sm" sx={{ mr: 'auto' }}>
                      {selectedEmailIds.length} selected
                    </Typography>
                    <TooltipIconButton
                      aria-label="Mark as read"
                      variant="soft"
                      disabled={bulkActionLoading}
                      onClick={() => setSelectedFlag('\\Seen', true)}
                    >
                      <MarkEmailReadRounded />
                    </TooltipIconButton>
                    <TooltipIconButton
                      aria-label="Mark as unread"
                      variant="soft"
                      disabled={bulkActionLoading}
                      onClick={() => setSelectedFlag('\\Seen', false)}
                    >
                      <MarkEmailUnreadRounded />
                    </TooltipIconButton>
                    <TooltipIconButton
                      aria-label="Star"
                      variant="soft"
                      disabled={bulkActionLoading}
                      onClick={() => setSelectedFlag('\\Flagged', true)}
                    >
                      <StarRounded />
                    </TooltipIconButton>
                    <TooltipIconButton
                      aria-label="Unstar"
                      variant="soft"
                      disabled={bulkActionLoading}
                      onClick={() => setSelectedFlag('\\Flagged', false)}
                    >
                      <StarBorderRounded />
                    </TooltipIconButton>

                    <TooltipIconButton
                      aria-label="Move to spam"
                      variant="soft"
                      disabled={bulkActionLoading || selectedTab === 'Spam'}
                      onClick={() => moveSelectedMessages('\\Junk')}
                    >
                      <FolderDeleteRounded />
                    </TooltipIconButton>
                    {selectedTab === 'Spam' && (
                      <TooltipIconButton
                        aria-label="Restore to inbox"
                        variant="soft"
                        disabled={bulkActionLoading}
                        onClick={() => moveSelectedMessages('\\Inbox')}
                      >
                        <RestoreFromTrashRounded />
                      </TooltipIconButton>
                    )}
                    <TooltipIconButton
                      aria-label="Delete"
                      variant="soft"
                      disabled={bulkActionLoading}
                      onClick={() => moveSelectedMessages('\\Trash')}
                    >
                      <DeleteRounded />
                    </TooltipIconButton>
                  </Stack>
                </AccordionDetails>
              </Accordion>
            </AccordionGroup>
            <Divider  />
          </Box>
          <List component="div" sx={{ flex: 1, minHeight: 0, p: 0 }}>
            {emailsLoading && (
              <Box sx={{ p: 2, alignItems: 'center', justifyContent: 'center', display: 'flex' }}>
                <CircularProgress />
              </Box>
            )}
            {!emailsLoading && mailError && (
              <Alert color="danger" sx={{ mx: 1 }}>
                {mailError}
              </Alert>
            )}
            {!emailsLoading && !mailError && selectedAccount && displayedEmails.length === 0 && (
              <Typography sx={{ p: 2 }}>
                {filtersActive
                  ? 'No messages match these filters.'
                  : 'No messages in this mailbox.'}
              </Typography>
            )}
            {!selectedAccount && (
              <Typography sx={{ p: 2 }}>Add an account to get started.</Typography>
            )}
            {displayedEmails.length > 0 && (
              <VirtualList
                rowComponent={EmailRow}
                rowCount={displayedEmails.length}
                rowHeight={82}
                rowKey={emailRowKey}
                rowProps={emailRowProps}
                overscanCount={4}
                style={{ height: '100%', width: '100%' }}
              />
            )}
          </List>
        </Box>

        <Box
          sx={{
            background: (theme) => theme.palette.background.backdrop,
            py: 1,
            px: 1.5,
            zIndex: 1,
            gap: 1,
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
            overflow: 'hidden !important'
          }}
          component={Panel}
          minSize={400}
          maxSize={'60%'}
        >
          {emailEditorOpen ? (
            <EmailEditor
              contacts={contacts}
              onClose={() => setEmailEditorOpen(false)}
              onSend={(message) =>
                window.mail.sendMessage({ accountId: selectedAccount, ...message })
              }
            />
          ) : (
            <EmailDisplay
              email={selectedEmail}
              dateLocale={dateLocale}
              loading={selectedEmailLoading}
              actionLoading={messageActionLoading}
              mailbox={selectedTab}
              onSetFlag={setOpenMessageFlag}
              onMove={moveOpenMessage}
              onReply={() => setEmailEditorOpen(true)}
            />
          )}
        </Box>
      </Group>

      <Modal open={settingsOpen} onClose={() => !clearDataLoading && setSettingsOpen(false)}>
        <ModalDialog sx={{ width: 420, maxWidth: 'calc(100vw - 32px)' }}>
          <ModalClose disabled={clearDataLoading} />
          <DialogTitle>Settings</DialogTitle>
          <DialogContent>Customize this app.</DialogContent>

          <Stack spacing={2}>
            {settingsError && <Alert color="danger">{settingsError}</Alert>}

            <FormControl>
              <FormLabel>Display mode</FormLabel>
              <Select
                value={mode || 'dark'}
                onChange={(_event, value) => value && setMode(value)}
              >
                <Option value="light">Light</Option>
                <Option value="dark">Dark</Option>
                <Option value="system">System</Option>
              </Select>
            </FormControl>

            <FormControl>
              <FormLabel>Date display format</FormLabel>
              <Select
                value={dateFormat}
                onChange={(_event, value) => {
                  if (!value) return
                  setDateFormat(value)
                  localStorage.setItem('dateFormat', value)
                }}
              >
                <Option value="american">American (MM/DD/YYYY)</Option>
                <Option value="european">European (DD/MM/YYYY)</Option>
              </Select>
            </FormControl>

            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography level="body-sm">Current app version</Typography>
              <Typography level="body-sm" fontWeight="lg">
                0.0.1
              </Typography>
            </Box>

            <Divider />
            <Button
              color="danger"
              variant="outlined"
              loading={clearDataLoading}
              startDecorator={<DeleteForeverRounded />}
              onClick={clearAllData}
            >
              Clear all data
            </Button>
          </Stack>
        </ModalDialog>
      </Modal>

      <Modal
        open={addAccountOpen}
        onClose={() => {
          if (!addAccountSaving) closeAccountDialog()
        }}
      >
        <ModalDialog
          key={editingAccount?.id || 'new-account'}
          component="form"
          onSubmit={saveAccount}
          sx={{
            width: 440,
            maxWidth: 'calc(100vw - 32px)',
            maxHeight: 'calc(100vh - 32px)',
            overflowY: 'auto'
          }}
        >
          <ModalClose disabled={addAccountSaving} />
          <DialogTitle>{editingAccount ? 'Account settings' : 'Add account'}</DialogTitle>
          <DialogContent>
            {editingAccount
              ? 'Modify the account and mail server info.'
              : 'Enter the account and mail server info.'}
          </DialogContent>

          <Stack spacing={2}>
            {addAccountError && <Alert color="danger">{addAccountError}</Alert>}

            <FormControl required>
              <FormLabel>Name</FormLabel>
              <Input
                name="name"
                placeholder="Personal account"
                defaultValue={editingAccount?.name}
                autoFocus
              />
            </FormControl>

            <FormControl required>
              <FormLabel>Email</FormLabel>
              <Input
                name="email"
                type="email"
                placeholder="you@example.com"
                defaultValue={editingAccount?.email}
              />
            </FormControl>

            <Typography level="title-sm">Incoming server (IMAP)</Typography>

            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: 1.5 }}>
              <FormControl required>
                <FormLabel>Server</FormLabel>
                <Input
                  name="incomingServer"
                  placeholder="imap.example.com"
                  defaultValue={editingAccount?.incomingServer}
                />
              </FormControl>

              <FormControl required>
                <FormLabel>Port</FormLabel>
                <Input
                  name="incomingPort"
                  type="number"
                  defaultValue={editingAccount?.incomingPort || 993}
                  slotProps={{ input: { min: 1, max: 65535 } }}
                />
              </FormControl>
            </Box>

            <FormControl required>
              <FormLabel>Username</FormLabel>
              <Input
                name="incomingUsername"
                placeholder="you@example.com"
                defaultValue={editingAccount?.incomingUsername}
              />
            </FormControl>

            <FormControl required={!editingAccount}>
              <FormLabel>Password</FormLabel>
              <Input
                name="incomingPassword"
                type="password"
                placeholder={editingAccount ? '************' : ''}
              />
            </FormControl>

            <Checkbox
              name="incomingTls"
              label="Use TLS"
              defaultChecked={editingAccount ? editingAccount.incomingTls : true}
            />

            <Typography level="title-sm">Outgoing server (SMTP)</Typography>

            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: 1.5 }}>
              <FormControl required>
                <FormLabel>Server</FormLabel>
                <Input
                  name="outgoingServer"
                  placeholder="smtp.example.com"
                  defaultValue={editingAccount?.outgoingServer}
                />
              </FormControl>

              <FormControl required>
                <FormLabel>Port</FormLabel>
                <Input
                  name="outgoingPort"
                  type="number"
                  defaultValue={editingAccount?.outgoingPort || 465}
                  slotProps={{ input: { min: 1, max: 65535 } }}
                />
              </FormControl>
            </Box>

            <FormControl required>
              <FormLabel>Username</FormLabel>
              <Input
                name="outgoingUsername"
                placeholder="you@example.com"
                defaultValue={editingAccount?.outgoingUsername}
              />
            </FormControl>

            <FormControl required={!editingAccount}>
              <FormLabel>Password</FormLabel>
              <Input
                name="outgoingPassword"
                type="password"
                placeholder={editingAccount ? '************' : ''}
              />
            </FormControl>

            <Checkbox
              name="outgoingTls"
              label="Use TLS"
              defaultChecked={editingAccount ? editingAccount.outgoingTls : true}
            />

            <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
              {editingAccount ? (
                <Button
                  type="button"
                  color="danger"
                  variant="outlined"
                  startDecorator={<DeleteForeverRounded />}
                  disabled={addAccountSaving}
                  onClick={deleteAccount}
                >
                  Delete account
                </Button>
              ) : (
                <span />
              )}
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  type="button"
                  variant="outlined"
                  color="neutral"
                  disabled={addAccountSaving}
                  onClick={closeAccountDialog}
                >
                  Cancel
                </Button>
                <Button type="submit" loading={addAccountSaving}>
                  {editingAccount ? 'Save changes' : 'Add account'}
                </Button>
              </Box>
            </Box>
          </Stack>
        </ModalDialog>
      </Modal>
    </Sheet>
  )
}

export default Layout
