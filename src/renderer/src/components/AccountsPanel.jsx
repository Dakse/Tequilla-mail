import { CreateRounded, Refresh, SettingsRounded } from '@mui/icons-material'
import Add from '@mui/icons-material/Add'
import {
  Accordion,
  AccordionDetails,
  AccordionGroup,
  AccordionSummary,
  Avatar,
  Badge,
  Box,
  Divider,
  List,
  ListItemButton,
  ListSubheader,
  Typography
} from '@mui/joy'
import { Panel } from 'react-resizable-panels'
import TooltipIconButton from './TooltipIconButton'
import { accountTabs, initials } from './helpers'

function AccountsPanel({
  accounts,
  selectedAccount,
  selectedTab,
  loading,
  updateAvailable,
  onSettings,
  onRefresh,
  onCompose,
  onAccountSettings,
  onSelect,
  onAddAccount
}) {
  return (
    <Box
      component={Panel}
      minSize={250}
      maxSize={500}
      sx={{
        boxShadow: (theme) => theme.shadow.lg,
        zIndex: 3,
        background: (theme) =>
          theme.palette.mode === 'dark'
            ? theme.palette.background.backdrop
            : theme.palette.background.body
      }}
    >
      <AccordionGroup sx={{ gap: 1, height: '100%', minHeight: 0, overflowY: 'auto' }}>
        <ListSubheader sx={{ mt: 1, justifyContent: 'space-between', py: 0 }}>
          Accounts
          <Box sx={{ borderRadius: 'md', justifyContent: 'space-around', display: 'flex', gap: 1 }}>
            <Badge invisible={!updateAvailable}>
              <TooltipIconButton aria-label="App settings" variant="outlined" onClick={onSettings}>
                <SettingsRounded />
              </TooltipIconButton>
            </Badge>
            <TooltipIconButton
              aria-label="Refresh messages"
              variant="outlined"
              disabled={!selectedAccount || loading}
              onClick={onRefresh}
            >
              <Refresh />
            </TooltipIconButton>
            <TooltipIconButton
              aria-label="Create email"
              variant={accounts.length ? 'soft' : 'outlined'}
              color={accounts.length ? 'primary' : undefined}
              disabled={!selectedAccount}
              onClick={onCompose}
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
                    onAccountSettings(account.id)
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
                      sx={{ pl: 2.5 }}
                      onClick={() => onSelect(account.id, tab.name)}
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

        <Box sx={{ mt: 'auto', flexShrink: 0 }}>
          {accounts.length ? <Divider sx={{ mx: 1.5, mb: 1.5 }} /> : null}
          <List size="lg">
            <ListItemButton
              color={accounts.length ? undefined : 'primary'}
              variant={accounts.length ? 'outlined' : 'soft'}
              sx={{ borderRadius: 'md', mx: 1, px: 1, mb: 1.5 }}
              onClick={onAddAccount}
            >
              <Typography
                width="100%"
                textAlign="center"
                lineHeight={1}
                sx={{ gap: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <Add />
                Add account
              </Typography>
            </ListItemButton>
          </List>
        </Box>
      </AccordionGroup>
    </Box>
  )
}

export default AccountsPanel
