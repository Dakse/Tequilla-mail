import {
  DeleteRounded,
  DraftsOutlined,
  FilterAlt,
  FolderDeleteRounded,
  MarkEmailReadRounded,
  MarkEmailUnreadRounded,
  PersonAddAlt,
  PersonAddAlt1Rounded,
  PersonAddAltRounded,
  PersonOff,
  PersonRounded,
  RestoreFromTrashRounded,
  StarBorderRounded,
  StarRounded,
  SwapVert
} from '@mui/icons-material'
import Search from '@mui/icons-material/Search'
import {
  Accordion,
  AccordionDetails,
  AccordionGroup,
  Alert,
  Avatar,
  Badge,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Divider,
  Dropdown,
  FormControl,
  FormLabel,
  Input,
  LinearProgress,
  List,
  ListItemButton,
  Menu,
  MenuButton,
  MenuItem,
  Radio,
  Stack,
  Tooltip,
  Typography
} from '@mui/joy'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Panel } from 'react-resizable-panels'
import { List as VirtualList } from 'react-window'
import { emptyMessageFilters, filterMessages } from '../message-filters'
import TooltipIconButton from './TooltipIconButton'
import UniversalForm from './UniversalForm'
import { accountTabs, formatMessageDate, initials, messageContact } from './helpers'

function emailRowKey(index, { emails }) {
  return emails[index].id
}

function DebouncedSearchInput({ value, onCommit, ...props }) {
  const [draft, setDraft] = useState(value)

  useEffect(() => setDraft(value), [value])
  useEffect(() => {
    const nextValue = draft.trim()
    if (nextValue === value) return undefined
    const timer = setTimeout(() => onCommit(nextValue), 500)
    return () => clearTimeout(timer)
  }, [draft, onCommit, value])

  return <Input {...props} value={draft} onChange={(event) => setDraft(event.target.value)} />
}

function EmailRow({
  ariaAttributes,
  index,
  style,
  emails,
  showRecipients,
  openedEmailId,
  selectedEmailIds,
  dateFormat,
  dateSeparator,
  onOpen,
  onToggle
}) {
  const email = emails[index]
  const contact = messageContact(email, showRecipients)

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
        <Avatar src={contact.primary?.avatar}>
          {initials(contact.primary?.name || contact.primary?.address)}
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
                {formatMessageDate(email.date, dateFormat, dateSeparator)}
              </Typography>
            }
            noWrap
          >
            {contact.label}
          </Typography>
          <Typography
            endDecorator={
              <Typography noWrap variant="caption" fontWeight={400} level="body-xs">
                {new Date(email.date).toLocaleTimeString('en-GB', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </Typography>
            }
            slotProps={{
              endDecorator: { sx: { ml: 'auto' } }
            }}
            lineHeight={1}
            level="body-md"
            fontWeight="bold"
            noWrap
          >
            {email.subject}
          </Typography>
          <Typography level="body-md" variant="caption" noWrap>
            {email.snippet || contact.addresses}
          </Typography>
        </Box>
      </ListItemButton>
    </Box>
  )
}

function EmailsListPanel({
  emails,
  loading,
  error,
  selectedAccount,
  selectedTab,
  selectedEmailId,
  selectedEmailIds,
  bulkActionLoading,
  bulkActionProgress,
  loadingMore,
  hasMore,
  dateFormat,
  dateSeparator,
  onSelectTab,
  onSearch,
  onSelectionChange,
  onOpen,
  onSetFlag,
  onMove,
  onLoadMore
}) {
  const [sortOption, setSortOption] = useState('newest')
  const [filterOpen, setFilterOpen] = useState(false)
  const [messageFilters, setMessageFilters] = useState(emptyMessageFilters)
  const displayedEmails = useMemo(() => {
    const filtered = filterMessages(emails, { ...messageFilters, words: '' })
    return sortOption === 'oldest' ? filtered.reverse() : filtered
  }, [emails, messageFilters, sortOption])
  const filtersActive = Object.values(messageFilters).some(Boolean)
  const allEmailsSelected =
    displayedEmails.length > 0 &&
    displayedEmails.every((email) => selectedEmailIds.includes(email.id))

  const commitSearch = useCallback(
    (value) => {
      setMessageFilters((current) => ({ ...current, words: value }))
      onSelectionChange([])
      onSearch(value)
    },
    [onSearch, onSelectionChange]
  )

  const toggleSelection = useCallback(
    (emailId, checked) =>
      onSelectionChange(
        checked ? [...selectedEmailIds, emailId] : selectedEmailIds.filter((id) => id !== emailId)
      ),
    [onSelectionChange, selectedEmailIds]
  )
  const rowProps = useMemo(
    () => ({
      emails: displayedEmails,
      showRecipients: selectedTab === 'Sent',
      openedEmailId: selectedEmailId,
      selectedEmailIds,
      dateFormat,
      dateSeparator,
      onOpen,
      onToggle: toggleSelection
    }),
    [
      dateFormat,
      dateSeparator,
      displayedEmails,
      onOpen,
      selectedTab,
      selectedEmailId,
      selectedEmailIds,
      toggleSelection
    ]
  )
  const handleRowsRendered = useCallback(
    ({ stopIndex }) => {
      if (hasMore && !loadingMore && stopIndex >= displayedEmails.length - 5) onLoadMore()
    },
    [displayedEmails.length, hasMore, loadingMore, onLoadMore]
  )

  function updateFilter(name, value) {
    setMessageFilters((current) => ({ ...current, [name]: value }))
    onSelectionChange([])
  }

  const filterFields = [
    {
      name: 'from',
      label: 'From',
      value: messageFilters.from,
      onChange: (value) => updateFilter('from', value),
      props: { size: 'sm', placeholder: 'Email address or username' }
    },
    {
      name: 'to',
      label: 'To',
      value: messageFilters.to,
      onChange: (value) => updateFilter('to', value),
      props: { size: 'sm', placeholder: 'Email address or username' }
    },
    {
      name: 'subject',
      label: 'Subject',
      value: messageFilters.subject,
      onChange: (value) => updateFilter('subject', value),
      sx: { gridColumn: '1 / -1' },
      props: { size: 'sm', placeholder: 'Subject' }
    },
    {
      type: 'custom',
      name: 'words',
      sx: { gridColumn: '1 / -1' },
      render: () => (
        <FormControl>
          <FormLabel>Includes words</FormLabel>
          <DebouncedSearchInput
            size="sm"
            placeholder="Keywords"
            value={messageFilters.words}
            onCommit={commitSearch}
          />
        </FormControl>
      )
    },
    {
      name: 'dateFrom',
      label: 'From date',
      value: messageFilters.dateFrom,
      onChange: (value) => updateFilter('dateFrom', value),
      props: { size: 'sm', type: 'date' }
    },
    {
      name: 'dateTo',
      label: 'To date',
      value: messageFilters.dateTo,
      onChange: (value) => updateFilter('dateTo', value),
      props: { size: 'sm', type: 'date' }
    },
    {
      type: 'select',
      name: 'folder',
      label: 'Folder to search',
      value: selectedTab,
      onChange: onSelectTab,
      options: accountTabs.map(({ name }) => name),
      props: { size: 'sm' }
    },
    {
      type: 'checkbox',
      name: 'hasAttachment',
      label: 'Has attachment',
      value: messageFilters.hasAttachment,
      onChange: (value) => updateFilter('hasAttachment', value),
      sx: { display: 'flex', alignItems: 'end', pb: 0.5 }
    }
  ]

  return (
    <Box
      component={Panel}
      minSize={400}
      maxSize="60%"
      sx={{
        zIndex: 2,

        background: (theme) =>
          theme.palette.mode === 'dark'
            ? theme.palette.background.body
            : theme.palette.background.level2,
        overflow: 'hidden !important',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0
      }}
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
              onSelectionChange(event.target.checked ? displayedEmails.map(({ id }) => id) : [])
            }
          />
          <DebouncedSearchInput
            placeholder={`Search "${selectedTab}"`}
            fullWidth
            startDecorator={<Search />}
            variant="soft"
            value={messageFilters.words}
            onCommit={commitSearch}
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
              {['newest', 'oldest'].map((option) => (
                <MenuItem
                  key={option}
                  sx={{ textTransform: 'capitalize' }}
                  onClick={() => setSortOption(option)}
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
            expanded={filterOpen}
            onChange={(_event, expanded) => setFilterOpen(expanded)}
            sx={{ minBlockSize: 0 }}
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
                <UniversalForm
                  fields={filterFields}
                  actions={() => (
                    <Button
                      size="sm"
                      variant="plain"
                      color="neutral"
                      disabled={!filtersActive}
                      sx={{ gridColumn: '1 / -1', justifySelf: 'end' }}
                      onClick={() => {
                        setMessageFilters({ ...emptyMessageFilters })
                        onSelectionChange([])
                      }}
                    >
                      Clear filters
                    </Button>
                  )}
                />
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
                  onClick={() => onSetFlag('\\Seen', true)}
                >
                  <MarkEmailReadRounded />
                </TooltipIconButton>
                <TooltipIconButton
                  aria-label="Mark as unread"
                  variant="soft"
                  disabled={bulkActionLoading}
                  onClick={() => onSetFlag('\\Seen', false)}
                >
                  <MarkEmailUnreadRounded />
                </TooltipIconButton>
                <TooltipIconButton
                  aria-label="Star"
                  variant="soft"
                  disabled={bulkActionLoading}
                  onClick={() => onSetFlag('\\Flagged', true)}
                >
                  <StarRounded />
                </TooltipIconButton>
                <TooltipIconButton
                  aria-label="Unstar"
                  variant="soft"
                  disabled={bulkActionLoading}
                  onClick={() => onSetFlag('\\Flagged', false)}
                >
                  <StarBorderRounded />
                </TooltipIconButton>
                <TooltipIconButton
                  aria-label="Move to spam"
                  variant="soft"
                  disabled={bulkActionLoading || selectedTab === 'Spam'}
                  onClick={() => onMove('\\Junk')}
                >
                  <FolderDeleteRounded />
                </TooltipIconButton>
                {selectedTab === 'Spam' && (
                  <TooltipIconButton
                    aria-label="Restore to inbox"
                    variant="soft"
                    disabled={bulkActionLoading}
                    onClick={() => onMove('\\Inbox')}
                  >
                    <RestoreFromTrashRounded />
                  </TooltipIconButton>
                )}
                <TooltipIconButton
                  aria-label="Delete"
                  variant="soft"
                  disabled={bulkActionLoading}
                  onClick={() => onMove('\\Trash')}
                >
                  <DeleteRounded />
                </TooltipIconButton>
              </Stack>
            </AccordionDetails>
          </Accordion>
        </AccordionGroup>
        {bulkActionLoading ? (
          <LinearProgress
            aria-label="Bulk action progress"
            aria-valuetext={`${bulkActionProgress.completed} of ${bulkActionProgress.total} messages`}
            determinate
            value={
              bulkActionProgress.total
                ? (bulkActionProgress.completed / bulkActionProgress.total) * 100
                : 0
            }
            sx={{ '--LinearProgress-thickness': '2px' }}
          />
        ) : (
          <Divider />
        )}
      </Box>

      <List component="div" sx={{ position: 'relative', flex: 1, minHeight: 0, p: 0 }}>
        {loading && (
          <Box sx={{ p: 2, alignItems: 'center', justifyContent: 'center', display: 'flex' }}>
            <CircularProgress />
          </Box>
        )}
        {!loading && error && (
          <Alert color="danger" sx={{ mx: 1 }}>
            {error}
          </Alert>
        )}
        {!loading && !error && selectedAccount && displayedEmails.length === 0 && (
          <Box
            sx={{
              display: 'flex',
              flex: 1,
              justifyContent: 'center',
              flexDirection: 'column',
              alignItems: 'center'
            }}
          >
            <DraftsOutlined
              sx={{
                fontSize: 200,
                color: (t) =>
                  t.palette.mode === 'dark' ? t.palette.neutral[700] : t.palette.neutral[400]
              }}
            />
            <Typography
              level="body-lg"
              sx={{
                color: (t) =>
                  t.palette.mode === 'dark' ? t.palette.neutral[600] : t.palette.neutral[400]
              }}
            >
              {filtersActive ? 'No messages match these filters.' : 'No messages in this mailbox.'}
            </Typography>
          </Box>
        )}
        {!selectedAccount && (
          <Box
            sx={{
              display: 'flex',
              flex: 1,
              justifyContent: 'center',
              flexDirection: 'column',
              alignItems: 'center'
            }}
          >
            <PersonRounded
              sx={{
                fontSize: 200,
                color: (t) =>
                  t.palette.mode === 'dark' ? t.palette.neutral[700] : t.palette.neutral[400]
              }}
            />
            <Typography
              level="body-lg"
              sx={{
                color: (t) =>
                  t.palette.mode === 'dark' ? t.palette.neutral[600] : t.palette.neutral[400]
              }}
            >
              Add an account to get started
            </Typography>
          </Box>
        )}
        {displayedEmails.length > 0 && (
          <VirtualList
            rowComponent={EmailRow}
            rowCount={displayedEmails.length}
            rowHeight={82}
            rowKey={emailRowKey}
            rowProps={rowProps}
            overscanCount={4}
            onRowsRendered={handleRowsRendered}
            style={{ height: '100%', width: '100%' }}
          />
        )}
        {loadingMore && (
          <Box
            sx={{
              position: 'absolute',
              bottom: 8,
              left: '50%',
              zIndex: 1,
              display: 'flex',
              p: 0.75,
              borderRadius: '50%',
              bgcolor: 'background.surface',
              transform: 'translateX(-50%)'
            }}
          >
            <CircularProgress size="sm" />
          </Box>
        )}
      </List>
    </Box>
  )
}

export default EmailsListPanel
