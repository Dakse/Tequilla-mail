import {
  AccessTimeRounded,
  CreateRounded,
  Delete,
  DeleteRounded,
  Filter,
  Filter1,
  FilterAlt,
  FolderDelete,
  FolderDeleteRounded,
  Forward,
  InsertInvitationRounded,
  MenuOpen,
  Refresh,
  Reply,
  ReplyAll,
  ReplyOutlined,
  ReplyRounded,
  Star,
  StarOutlineRounded,
  Title,
  TitleRounded
} from '@mui/icons-material'
import Add from '@mui/icons-material/Add'
import Drafts from '@mui/icons-material/Drafts'
import ExpandLess from '@mui/icons-material/ExpandLess'
import ExpandMore from '@mui/icons-material/ExpandMore'
import Inbox from '@mui/icons-material/Inbox'
import MarkAsUnread from '@mui/icons-material/MarkAsUnread'
import RadioButtonChecked from '@mui/icons-material/RadioButtonChecked'
import RadioButtonUnchecked from '@mui/icons-material/RadioButtonUnchecked'
import Search from '@mui/icons-material/Search'
import Send from '@mui/icons-material/Send'
import Sort from '@mui/icons-material/Sort'
import StarBorder from '@mui/icons-material/StarBorder'
import SwapVert from '@mui/icons-material/SwapVert'
import {
  Accordion,
  AccordionDetails,
  AccordionGroup,
  AccordionSummary,
  Avatar,
  Badge,
  Box,
  Card,
  CardContent,
  CardOverflow,
  Divider,
  Dropdown,
  IconButton,
  Input,
  List,
  ListItem,
  ListItemButton,
  ListItemContent,
  ListItemDecorator,
  ListSubheader,
  Menu,
  MenuButton,
  MenuItem,
  Radio,
  Sheet,
  Typography
} from '@mui/joy'
import { useEffect, useState } from 'react'
import { Group, Panel, Separator } from 'react-resizable-panels'

function Layout({ children }) {
  const [selectedAccount, setSelectedAccount] = useState('example@email.com')
  const [selectedTab, setSelectedTab] = useState('Inbox')
  const [sortOption, setSortOption] = useState('newest')
  const [filterOpen, setFilterOpen] = useState(false)

  const [emails, setEmails] = useState([])
  const [emailsLoading, setEmailsLoading] = useState(false)

  const fetchEmails = () => {
    console.debug('AAAAAAAA')
    return new Promise((resolve, reject) => {
      fetch('https://fake.jsonmockapi.com/custom?size=15', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify([
          {
            from: 'email',
            date: 'date',
            avatar: 'image',
            topic: 'sentence',
            contentTxt: 'paragraph',
            content: 'paragraph',
            name: 'username'
          }
        ])
      })
        .then((response) => response.json())
        .then((response) => resolve(response))
        .catch((error) => {
          console.error('Error:', error)
          reject(error)
        })
    })
  }

  useEffect(() => {
    setEmailsLoading(true)
    fetchEmails()
      .then((res) => setEmails(res))
      .finally(() => setEmailsLoading(false))
  }, [selectedAccount, selectedTab])

  const sortOptions = ['newest', 'oldest']

  const accountsData = [
    {
      email: 'example@email.com',
      name: 'Konto email',
      unreadAmount: 123,
      draftsAmount: 5,
      starredAmount: 9,
      spamUnreadAmount: 36
    }
  ]

  const accountTabs = [
    { name: 'Inbox', icon: Inbox, decorator: 'unreadAmount' },
    { name: 'Sent', icon: Send },
    { name: 'Drafts', icon: Drafts, decorator: 'draftsAmount' },
    { name: 'Starred', icon: StarBorder, decorator: 'starredAmount' },
    { name: 'Spam', icon: Delete, decorator: 'spamUnreadAmount' }
  ]

  const attachments = [
    { name: 'veryimportantdocument.docx', weight: '254kb', icon: '', thumbnail: '' }
  ]

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
                <IconButton variant="outlined">
                  <Refresh />
                </IconButton>
                <IconButton variant="outlined">
                  <CreateRounded />
                </IconButton>
              </Box>
            </ListSubheader>
            <Divider sx={{ mx: 1.5 }} />
            {accountsData.map((account) => (
              <Accordion sx={{ border: 'none' }}>
                <AccordionSummary sx={{ justifyContent: 'start' }}>
                  <Avatar variant="solid">
                    {account?.name
                      .match(/(\b\S)?/g)
                      .join('')
                      .match(/(^\S|\S$)?/g)
                      .join('')
                      .toUpperCase()}
                  </Avatar>
                  <Box flex={1} overflow={'hidden'} textOverflow={'ellipsis'} whiteSpace={'nowrap'}>
                    <Typography overflow={'hidden'} textOverflow={'ellipsis'}>
                      {account.name}
                    </Typography>
                    <Typography overflow={'hidden'} textOverflow={'ellipsis'}>
                      {account.email}
                    </Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <List sx={{ gap: 1 }} size="lg">
                    {accountTabs.map((tab) => {
                      const Icon = tab.icon
                      return (
                        <ListItemButton
                          selected={selectedAccount === account.email && selectedTab === tab.name}
                          sx={{ pl: 2 }}
                          onClick={() => {
                            if (selectedAccount !== account.email) setSelectedAccount(account.email)
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
          <List sx={{ flex: 1, minHeight: 0, overflowY: 'auto',gap:0.5 }}>
            {emails.map((email) => (
              <ListItemButton key={email.id} sx={{ alignItems: 'center', width: '100%' }}>
                <Avatar src={email.avatar} />

                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography
                    level="title-md"
                    fontWeight={'bold'}
                    slotProps={{ endDecorator: { sx: { ml: 'auto' } },root:{sx:{opacity:0.9}} }}
                    endDecorator={<Typography noWrap variant='caption' fontWeight={400} level='body-xs'>{email.date}</Typography>}
                    noWrap
                  >
                    {email.name}
                  </Typography>
                  <Typography lineHeight={1} level="body-md" fontWeight={'bold'} noWrap>
                    {email.topic}
                  </Typography>
                  <Typography  level="body-md" variant="caption" noWrap>
                    {email.contentTxt}
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
            flexDirection: 'column'
          }}
          component={Panel}
          minSize={400}
          maxSize={'60%'}
        >
          <Sheet
            sx={{
              borderRadius: (t) => t.radius.md,
              justifyContent: 'space-around',
              display: 'flex'
            }}
          >
            <IconButton sx={{ flex: 1 }}>
              <DeleteRounded />
            </IconButton>
            <IconButton sx={{ flex: 1 }}>
              <FolderDeleteRounded />
            </IconButton>
            <IconButton sx={{ flex: 1 }}>
              <StarOutlineRounded />
            </IconButton>
            <IconButton sx={{ flex: 1 }}>
              <ReplyRounded />
            </IconButton>
            <IconButton sx={{ flex: 1 }}>
              <ReplyRounded sx={{ transform: 'scaleX(-1)' }} />
            </IconButton>
          </Sheet>
          <Divider />
          <Typography
            startDecorator={<Avatar sx={{ width: 20, height: 20 }} />}
            slotProps={{ endDecorator: { sx: { ml: 'auto' } } }}
            endDecorator={
              <Typography endDecorator={<InsertInvitationRounded />}>01.01.1970</Typography>
            }
            variant="caption"
          >
            Email sender
          </Typography>
          <Typography
            startDecorator={<TitleRounded sx={{ fontSize: 20 }} />}
            lineHeight={1}

            level="title-md"
            slotProps={{ endDecorator: { sx: { ml: 'auto' } } }}
            endDecorator={
              <Typography
                variant="caption"
                fontWeight={400}
                endDecorator={<AccessTimeRounded />}
                padding={0}
              >
                21:37
              </Typography>
            }
          >
            Email title
          </Typography>
          <Card>Rendered email here</Card>
          <Card>
            <ListSubheader>Attachments</ListSubheader>
            <CardContent>
              {attachments.map((file) => (
                <Card
                  sx={{ aspectRatio: '4/3', width: '130px', padding: 0, gap: 0, overflow: 'clip' }}
                >
                  <CardOverflow
                    sx={{
                      backgroundImage: 'url(https://api.images.cat/300/300)',
                      height: '100%',
                      backgroundPosition: 'center',
                      backgroundSize: 'cover'
                    }}
                  ></CardOverflow>
                  <Sheet
                    sx={{
                      px: 1,
                      py: '3px',
                      display: 'flex',
                      borderTop: (t) => `1px solid ${t.palette.divider}`,

                      alignItems: 'center'
                    }}
                  >
                    <Avatar sx={{ width: 20, height: 20, mr: 0.7 }} />
                    <Typography
                      level="body-sm"
                      lineHeight={1}
                      noWrap
                      sx={{ minWidth: 0, width: '100%' }}
                    >
                      {file.name}
                    </Typography>
                  </Sheet>
                </Card>
              ))}
            </CardContent>
          </Card>
        </Box>
      </Group>
    </Sheet>
  )
}

export default Layout
