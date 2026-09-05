import { Box } from '@mui/joy'
import { Panel } from 'react-resizable-panels'
import EmailDisplay from './EmailDisplay'
import EmailEditor from './EmailEditor'

function EmailPanel({
  composing,
  contacts,
  selectedAccount,
  email,
  dateFormat,
  dateSeparator,
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
        background: (theme) =>
          theme.palette.mode === 'dark'
            ? theme.palette.background.backdrop
            : theme.palette.background.body,
        py: 1,
        px: 1.5,
        boxShadow: (theme) => theme.shadow.lg,
        zIndex: 3,
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
          dateFormat={dateFormat}
          dateSeparator={dateSeparator}
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
