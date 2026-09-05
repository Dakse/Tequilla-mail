import { Box } from '@mui/joy'
import { Panel } from 'react-resizable-panels'
import EmailDisplay from './EmailDisplay'
import EmailEditor from './EmailEditor'

function EmailPanel({
  composing,
  contacts,
  selectedAccount,
  email,
  dateLocale,
  loading,
  actionLoading,
  mailbox,
  onCloseEditor,
  onSetFlag,
  onMove,
  onCompose
}) {
  return (
    <Box
      component={Panel}
      minSize={400}
      maxSize="60%"
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
    >
      {composing ? (
        <EmailEditor
          contacts={contacts}
          onClose={onCloseEditor}
          onSend={(message) => window.mail.sendMessage({ accountId: selectedAccount, ...message })}
        />
      ) : (
        <EmailDisplay
          email={email}
          dateLocale={dateLocale}
          loading={loading}
          actionLoading={actionLoading}
          mailbox={mailbox}
          onSetFlag={onSetFlag}
          onMove={onMove}
          onReply={onCompose}
        />
      )}
    </Box>
  )
}

export default EmailPanel
