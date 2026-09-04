import { Delete, Filter, Filter1, FilterAlt, MenuOpen } from '@mui/icons-material'
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
import { useState } from 'react'
import { Group, Panel, Separator } from 'react-resizable-panels'

function Layout({ children }) {
  const [selectedAccount, setSelectedAccount] = useState('example@email.com')
  const [selectedTab, setSelectedTab] = useState('Inbox')
  const [sortOption, setSortOption] = useState('newest')
  const [sortAnchor, setSortAnchor] = useState(null)
  const [filterOpen, setFilterOpen] = useState(false)

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
            <ListSubheader sx={{ mt: 1 }}>Accounts</ListSubheader>
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
              <ListItemButton variant="outlined" sx={{ borderRadius: '24px', mx: 1, px: 1 }}>
                <Typography startDecorator={<Add />}>Add account</Typography>
              </ListItemButton>
            </List>
          </AccordionGroup>
        </Box>

        <Box
          sx={{
            zIndex: 2,
            boxShadow: (theme) => theme.shadow.lg,
            background: (theme) => theme.palette.background.surface
          }}
          component={Panel}
          minSize={400}
          maxSize={'60%'}
        >
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
                Filter options will be here
              </AccordionDetails>
            </Accordion>
          </AccordionGroup>

          <Divider sx={{ mx: 1.5 }} />
        </Box>

        <Box
          sx={{
            background: (theme) => theme.palette.background.body,
            p: 2,
            zIndex: 1
          }}
          component={Panel}
          minSize={400}
          maxSize={'60%'}
        >
          {children}
        </Box>
      </Group>
    </Sheet>
  )
}

export default Layout
