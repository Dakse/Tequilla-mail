import {
  DeleteRounded,
  FilterAlt,
  FolderDeleteRounded,
  MarkEmailReadRounded,
  MarkEmailUnreadRounded,
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
  List,
  ListItemButton,
  Menu,
  MenuButton,
  MenuItem,
  Option,
  Radio,
  Select,
  Stack,
  Tooltip,
  Typography
} from '@mui/joy'
import { useCallback, useMemo, useState } from 'react'
import { Panel } from 'react-resizable-panels'
import { List as VirtualList } from 'react-window'
import { emptyMessageFilters, filterMessages } from '../message-filters'
import TooltipIconButton from './TooltipIconButton'
import { accountTabs, formatMessageDate, initials } from './helpers'

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

function EmailsListPanel({
  emails,
  loading,
  error,
  selectedAccount,
  selectedTab,
  selectedEmailId,
  selectedEmailIds,
  bulkActionLoading,
  dateLocale,
  onSelectTab,
  onSelectionChange,
  onOpen,
  onSetFlag,
  onMove
}) {
  const [sortOption, setSortOption] = useState('newest')
  const [filterOpen, setFilterOpen] = useState(false)
  const [messageFilters, setMessageFilters] = useState(emptyMessageFilters)
  const displayedEmails = useMemo(() => {
    const filtered = filterMessages(emails, messageFilters)
    return sortOption === 'oldest' ? filtered.reverse() : filtered
  }, [emails, messageFilters, sortOption])
  const filtersActive = Object.values(messageFilters).some(Boolean)
  const allEmailsSelected =
    displayedEmails.length > 0 &&
    displayedEmails.every((email) => selectedEmailIds.includes(email.id))

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
      openedEmailId: selectedEmailId,
      selectedEmailIds,
      dateLocale,
      onOpen,
      onToggle: toggleSelection
    }),
    [dateLocale, displayedEmails, onOpen, selectedEmailId, selectedEmailIds, toggleSelection]
  )

  function updateFilter(name, value) {
    setMessageFilters((current) => ({ ...current, [name]: value }))
    onSelectionChange([])
  }

  return (
    <Box
      component={Panel}
      minSize={400}
      maxSize="60%"
      sx={{
        zIndex: 2,
        boxShadow: (theme) => theme.shadow.lg,
        background: (theme) => theme.palette.background.surface,
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
          <Input
            placeholder={`Search "${selectedTab}"`}
            fullWidth
            startDecorator={<Search />}
            variant="soft"
            value={messageFilters.words}
            onChange={(event) => updateFilter('words', event.target.value)}
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
                <FormControl>
                  <FormLabel>From</FormLabel>
                  <Input
                    size="sm"
                    placeholder="Email address or username"
                    value={messageFilters.from}
                    onChange={(event) => updateFilter('from', event.target.value)}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>To</FormLabel>
                  <Input
                    size="sm"
                    placeholder="Email address or username"
                    value={messageFilters.to}
                    onChange={(event) => updateFilter('to', event.target.value)}
                  />
                </FormControl>
                <FormControl sx={{ gridColumn: '1 / -1' }}>
                  <FormLabel>Subject</FormLabel>
                  <Input
                    size="sm"
                    placeholder="Subject"
                    value={messageFilters.subject}
                    onChange={(event) => updateFilter('subject', event.target.value)}
                  />
                </FormControl>
                <FormControl sx={{ gridColumn: '1 / -1' }}>
                  <FormLabel>Includes words</FormLabel>
                  <Input
                    size="sm"
                    placeholder="Keywords"
                    value={messageFilters.words}
                    onChange={(event) => updateFilter('words', event.target.value)}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>From date</FormLabel>
                  <Input
                    size="sm"
                    type="date"
                    value={messageFilters.dateFrom}
                    onChange={(event) => updateFilter('dateFrom', event.target.value)}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>To date</FormLabel>
                  <Input
                    size="sm"
                    type="date"
                    value={messageFilters.dateTo}
                    onChange={(event) => updateFilter('dateTo', event.target.value)}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>Folder to search</FormLabel>
                  <Select
                    size="sm"
                    value={selectedTab}
                    onChange={(_event, value) => value && onSelectTab(value)}
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
                    onChange={(event) => updateFilter('hasAttachment', event.target.checked)}
                  />
                </Box>
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
        <Divider />
      </Box>

      <List component="div" sx={{ flex: 1, minHeight: 0, p: 0 }}>
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
          <Typography sx={{ p: 2 }}>
            {filtersActive ? 'No messages match these filters.' : 'No messages in this mailbox.'}
          </Typography>
        )}
        {!selectedAccount && <Typography sx={{ p: 2 }}>Add an account to get started.</Typography>}
        {displayedEmails.length > 0 && (
          <VirtualList
            rowComponent={EmailRow}
            rowCount={displayedEmails.length}
            rowHeight={82}
            rowKey={emailRowKey}
            rowProps={rowProps}
            overscanCount={4}
            style={{ height: '100%', width: '100%' }}
          />
        )}
      </List>
    </Box>
  )
}

export default EmailsListPanel
