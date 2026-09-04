import { CreateRounded, Delete, FilterAlt, Refresh } from '@mui/icons-material'
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
  DialogContent,
  DialogTitle,
  Divider,
  Dropdown,
  FormControl,
  FormLabel,
  IconButton,
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
  Radio,
  Sheet,
  Stack,
  Typography
} from '@mui/joy'
import { useEffect, useState } from 'react'
import { Group, Panel } from 'react-resizable-panels'
import EmailDisplay from './EmailDisplay'
import EmailEditor from './EmailEditor'

const accountTabs = [
  { name: 'Inbox', mailbox: '\\Inbox', icon: Inbox, decorator: 'unreadAmount' },
  { name: 'Sent', mailbox: '\\Sent', icon: Send, enabled: false },
  { name: 'Drafts', mailbox: '\\Drafts', icon: Drafts, decorator: 'draftsAmount', enabled: false },
  { name: 'Starred', icon: StarBorder, decorator: 'starredAmount', enabled: false },
  { name: 'Spam', mailbox: '\\Junk', icon: Delete, decorator: 'spamUnreadAmount', enabled: false }
]

function initials(value) {
  return String(value || '?')
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function formatMessageDate(value) {
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? ''
    : new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date)
}

function Layout() {
  const [accounts, setAccounts] = useState([])
  const [selectedAccount, setSelectedAccount] = useState(null)
  const [selectedTab, setSelectedTab] = useState('Inbox')
  const [sortOption, setSortOption] = useState('newest')
  const [filterOpen, setFilterOpen] = useState(false)
  const [addAccountOpen, setAddAccountOpen] = useState(false)
  const [addAccountSaving, setAddAccountSaving] = useState(false)
  const [addAccountError, setAddAccountError] = useState('')
  const [emailEditorOpen, setEmailEditorOpen] = useState(false)
  const [emails, setEmails] = useState([])
  const [emailsLoading, setEmailsLoading] = useState(false)
  const [mailError, setMailError] = useState('')
  const [refreshVersion, setRefreshVersion] = useState(0)
  const [selectedEmail, setSelectedEmail] = useState(null)
  const [selectedEmailLoading, setSelectedEmailLoading] = useState(false)

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

    setSelectedEmail(null)
    if (!selectedAccount || !tab?.mailbox) {
      setEmails([])
      return undefined
    }

    setEmailsLoading(true)
    setMailError('')
    window.mail
      .syncMessages({ accountId: selectedAccount, mailbox: tab.mailbox, limit: 100 })
      .then((messages) => active && setEmails(messages))
      .catch((error) => active && setMailError(error.message))
      .finally(() => active && setEmailsLoading(false))

    return () => {
      active = false
    }
  }, [selectedAccount, selectedTab, refreshVersion])

  const sortOptions = ['newest', 'oldest']
  const displayedEmails = sortOption === 'oldest' ? [...emails].reverse() : emails

  async function openMessage(email) {
    setEmailEditorOpen(false)
    setSelectedEmail(email)
    setSelectedEmailLoading(true)
    setMailError('')
    try {
      const fullMessage = await window.mail.getMessage(email.id)
      setSelectedEmail((current) => (current?.id === email.id ? fullMessage : current))
    } catch (error) {
      setMailError(error.message)
    } finally {
      setSelectedEmailLoading(false)
    }
  }

  async function addAccount(event) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setAddAccountSaving(true)
    setAddAccountError('')

    try {
      const account = await window.mail.addAccount({
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
      })
      setAccounts((current) => [...current, account])
      setSelectedAccount(account.id)
      setSelectedTab('Inbox')
      setAddAccountOpen(false)
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
            background: (theme) => theme.palette.background.level1
          }}
          component={Panel}
          minSize={150}
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
                <IconButton
                  aria-label="Refresh messages"
                  variant="outlined"
                  disabled={!selectedAccount || emailsLoading}
                  onClick={() => setRefreshVersion((version) => version + 1)}
                >
                  <Refresh />
                </IconButton>
                <IconButton
                  aria-label="Compose email"
                  variant="outlined"
                  disabled={!selectedAccount}
                  onClick={() => setEmailEditorOpen(true)}
                >
                  <CreateRounded />
                </IconButton>
              </Box>
            </ListSubheader>
            <Divider sx={{ mx: 1.5 }} />
            {accounts.map((account) => (
              <Accordion key={account.id} sx={{ border: 'none' }}>
                <AccordionSummary sx={{ justifyContent: 'start' }}>
                  <Avatar variant="solid">{initials(account.name)}</Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography noWrap>{account.name}</Typography>
                    <Typography noWrap>{account.email}</Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <List sx={{ gap: 1 }} size="lg">
                    {accountTabs.map((tab) => {
                      const Icon = tab.icon
                      return (
                        <ListItemButton
                          key={tab.name}
                          disabled={tab.enabled === false}
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
                            endDecorator={tab?.decorator ? account[tab?.decorator] : null}
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
                onClick={() => setAddAccountOpen(true)}
              >
                <Typography startDecorator={<Add />}>Add account</Typography>
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
              <Input
                placeholder={`Search "${selectedTab}"`}
                fullWidth
                startDecorator={<Search />}
                variant="soft"
              />

              <IconButton
                onClick={() => setFilterOpen(!filterOpen)}
                variant={filterOpen ? 'solid' : 'soft'}
              >
                <FilterAlt />
              </IconButton>

              <Dropdown>
                <Badge invisible={sortOption === 'newest'}>
                  <MenuButton variant={sortOption === 'newest' ? 'soft' : 'solid'}>
                    <SwapVert />
                  </MenuButton>
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
            <AccordionGroup>
              <Accordion
                sx={{ minBlockSize: 0 }}
                expanded={filterOpen}
                onChange={(e, expanded) => {
                  setFilterOpen(expanded)
                }}
              >
                <Divider sx={{ height: filterOpen ? undefined : 0 }} />
                <AccordionDetails sx={{ pt: filterOpen && 0.7 }}>
                  Filter options will be here. Date range, includes attachment, etc
                </AccordionDetails>
              </Accordion>
            </AccordionGroup>
            <Divider sx={{ mx: 1.5 }} />
          </Box>
          <List sx={{ flex: 1, minHeight: 0, overflowY: 'auto', gap: 0.5 }}>
            {emailsLoading && <Typography sx={{ p: 2 }}>Synchronizing mailbox…</Typography>}
            {!emailsLoading && mailError && (
              <Alert color="danger" sx={{ mx: 1 }}>
                {mailError}
              </Alert>
            )}
            {!emailsLoading && !mailError && selectedAccount && displayedEmails.length === 0 && (
              <Typography sx={{ p: 2 }}>No messages in this mailbox.</Typography>
            )}
            {!selectedAccount && (
              <Typography sx={{ p: 2 }}>Add an account to get started.</Typography>
            )}
            {displayedEmails.map((email) => (
              <ListItemButton
                key={email.id}
                selected={selectedEmail?.id === email.id}
                sx={{ alignItems: 'center', width: '100%' }}
                onClick={() => openMessage(email)}
              >
                <Avatar>{initials(email.from?.name || email.from?.address)}</Avatar>

                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography
                    level="title-md"
                    fontWeight={'bold'}
                    slotProps={{
                      endDecorator: { sx: { ml: 'auto' } },
                      root: { sx: { opacity: 0.9 } }
                    }}
                    endDecorator={
                      <Typography noWrap variant="caption" fontWeight={400} level="body-xs">
                        {formatMessageDate(email.date)}
                      </Typography>
                    }
                    noWrap
                  >
                    {email.from?.name || email.from?.address || 'Unknown sender'}
                  </Typography>
                  <Typography lineHeight={1} level="body-md" fontWeight={'bold'} noWrap>
                    {email.subject}
                  </Typography>
                  <Typography level="body-md" variant="caption" noWrap>
                    {email.snippet || email.from?.address}
                  </Typography>
                </Box>
              </ListItemButton>
            ))}
          </List>
        </Box>

        <Box
          sx={{
            background: (theme) => theme.palette.background.body,
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
              onClose={() => setEmailEditorOpen(false)}
              onSend={(message) =>
                window.mail.sendMessage({ accountId: selectedAccount, ...message })
              }
            />
          ) : (
            <EmailDisplay
              email={selectedEmail}
              loading={selectedEmailLoading}
              onReply={() => setEmailEditorOpen(true)}
            />
          )}
        </Box>
      </Group>

      <Modal
        open={addAccountOpen}
        onClose={() => {
          if (!addAccountSaving) setAddAccountOpen(false)
        }}
      >
        <ModalDialog
          component="form"
          onSubmit={addAccount}
          sx={{
            width: 440,
            maxWidth: 'calc(100vw - 32px)',
            maxHeight: 'calc(100vh - 32px)',
            overflowY: 'auto'
          }}
        >
          <ModalClose disabled={addAccountSaving} />
          <DialogTitle>Add account</DialogTitle>
          <DialogContent>Enter the account and mail server details.</DialogContent>

          <Stack spacing={2}>
            {addAccountError && <Alert color="danger">{addAccountError}</Alert>}

            <FormControl required>
              <FormLabel>Name</FormLabel>
              <Input name="name" placeholder="Personal account" autoFocus />
            </FormControl>

            <FormControl required>
              <FormLabel>Email</FormLabel>
              <Input name="email" type="email" placeholder="you@example.com" />
            </FormControl>

            <Typography level="title-sm">Incoming server (IMAP)</Typography>

            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: 1.5 }}>
              <FormControl required>
                <FormLabel>Server</FormLabel>
                <Input name="incomingServer" placeholder="imap.example.com" />
              </FormControl>

              <FormControl required>
                <FormLabel>Port</FormLabel>
                <Input
                  name="incomingPort"
                  type="number"
                  defaultValue={993}
                  slotProps={{ input: { min: 1, max: 65535 } }}
                />
              </FormControl>
            </Box>

            <FormControl required>
              <FormLabel>Username</FormLabel>
              <Input name="incomingUsername" placeholder="you@example.com" />
            </FormControl>

            <FormControl required>
              <FormLabel>Password</FormLabel>
              <Input name="incomingPassword" type="password" />
            </FormControl>

            <Checkbox
              name="incomingTls"
              label="Use implicit TLS (usually port 993)"
              defaultChecked
            />

            <Typography level="title-sm">Outgoing server (SMTP)</Typography>

            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: 1.5 }}>
              <FormControl required>
                <FormLabel>Server</FormLabel>
                <Input name="outgoingServer" placeholder="smtp.example.com" />
              </FormControl>

              <FormControl required>
                <FormLabel>Port</FormLabel>
                <Input
                  name="outgoingPort"
                  type="number"
                  defaultValue={465}
                  slotProps={{ input: { min: 1, max: 65535 } }}
                />
              </FormControl>
            </Box>

            <FormControl required>
              <FormLabel>Username</FormLabel>
              <Input name="outgoingUsername" placeholder="you@example.com" />
            </FormControl>

            <FormControl required>
              <FormLabel>Password</FormLabel>
              <Input name="outgoingPassword" type="password" />
            </FormControl>

            <Checkbox
              name="outgoingTls"
              label="Use implicit TLS (usually port 465; leave off for STARTTLS/587)"
              defaultChecked
            />

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
              <Button
                type="button"
                variant="plain"
                color="neutral"
                disabled={addAccountSaving}
                onClick={() => setAddAccountOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" loading={addAccountSaving}>
                Add account
              </Button>
            </Box>
          </Stack>
        </ModalDialog>
      </Modal>
    </Sheet>
  )
}

export default Layout
