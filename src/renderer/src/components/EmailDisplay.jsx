import {
  AccessTimeRounded,
  DeleteRounded,
  DownloadRounded,
  FolderDeleteRounded,
  InsertDriveFileRounded,
  InsertInvitationRounded,
  MarkEmailReadRounded,
  MarkEmailUnreadRounded,
  ReplyRounded,
  RestoreFromTrashRounded,
  StarBorderRounded,
  StarRounded,
  TitleRounded
} from '@mui/icons-material'
import {
  Avatar,
  Box,
  Card,
  CardContent,
  CardOverflow,
  Divider,
  ListSubheader,
  Sheet,
  Typography
} from '@mui/joy'
import TooltipIconButton from './TooltipIconButton'

function initials(value) {
  return String(value || '?')
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function htmlDocument(html) {
  const document = new DOMParser().parseFromString(html, 'text/html')
  const policy = document.createElement('meta')
  policy.httpEquiv = 'Content-Security-Policy'
  policy.content =
    "default-src 'none'; img-src data: https: http:; style-src 'unsafe-inline'; font-src data:; form-action 'none'; base-uri 'none'"
  const responsiveStyles = document.createElement('style')
  responsiveStyles.textContent = `
    img { max-width: 100%; height: auto; }
    table { max-width: 100%; }
  `
  document.head.prepend(policy)
  document.head.append(responsiveStyles)

  return `<!doctype html>${document.documentElement.outerHTML}`
}

function EmailDisplay({
  email,
  dateLocale,
  loading,
  actionLoading,
  mailbox,
  onSetFlag,
  onMove,
  onReply
}) {
  if (!email) {
    return (
      <Box sx={{ display: 'grid', flex: 1, placeItems: 'center' }}>
        <Typography level="body-lg" textColor="text.tertiary">
          Select an email to read it.
        </Typography>
      </Box>
    )
  }

  const sender = email.from?.name || email.from?.address || 'Unknown sender'
  const timestamp = email.date ? new Date(email.date) : null
  const date =
    timestamp && !Number.isNaN(timestamp.getTime())
      ? timestamp.toLocaleDateString(dateLocale)
      : ''
  const time =
    timestamp && !Number.isNaN(timestamp.getTime())
      ? timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : ''
  const attachments = email.attachments || []

  return (
    <Box
      sx={{
        display: 'flex',
        flex: 1,
        flexDirection: 'column',
        gap: 1,
        minHeight: 0,
        minWidth: 0,
        overflowX: 'hidden',
        overflowY: 'auto'
      }}
    >
      <Sheet
        sx={{
          borderRadius: (theme) => theme.radius.md,
          display: 'flex',
          justifyContent: 'space-around'
        }}
      >
        <TooltipIconButton
          aria-label={email.unread ? 'Mark as read' : 'Mark as unread'}
          disabled={actionLoading || loading}
          sx={{ flex: 1 }}
          onClick={() => onSetFlag('\\Seen', email.unread)}
        >
          {email.unread ? <MarkEmailReadRounded /> : <MarkEmailUnreadRounded />}
        </TooltipIconButton>
        <TooltipIconButton
          aria-label={email.starred ? 'Unstar' : 'Star'}
          disabled={actionLoading || loading}
          sx={{ flex: 1 }}
          onClick={() => onSetFlag('\\Flagged', !email.starred)}
        >
          {email.starred ? <StarBorderRounded /> : <StarRounded />}
        </TooltipIconButton>
        {mailbox === 'Spam' ? (
          <TooltipIconButton
            aria-label="Restore to inbox"
            disabled={actionLoading || loading}
            sx={{ flex: 1 }}
            onClick={() => onMove('\\Inbox')}
          >
            <RestoreFromTrashRounded />
          </TooltipIconButton>
        ) : (
          <TooltipIconButton
            aria-label="Move to spam"
            disabled={actionLoading || loading}
            sx={{ flex: 1 }}
            onClick={() => onMove('\\Junk')}
          >
            <FolderDeleteRounded />
          </TooltipIconButton>
        )}
        <TooltipIconButton
          aria-label="Delete email"
          disabled={actionLoading || loading}
          sx={{ flex: 1 }}
          onClick={() => onMove('\\Trash')}
        >
          <DeleteRounded />
        </TooltipIconButton>
        <TooltipIconButton aria-label="Reply" sx={{ flex: 1 }} onClick={onReply}>
          <ReplyRounded />
        </TooltipIconButton>
        <TooltipIconButton aria-label="Forward" sx={{ flex: 1 }} onClick={onReply}>
          <ReplyRounded sx={{ transform: 'scaleX(-1)' }} />
        </TooltipIconButton>
      </Sheet>

      <Divider />

      <Typography
        startDecorator={
          <Avatar src={email.from?.avatar} sx={{ width: 20, height: 20 }}>
            {initials(sender)}
          </Avatar>
        }
        slotProps={{ endDecorator: { sx: { ml: 'auto' } } }}
        endDecorator={<Typography endDecorator={<InsertInvitationRounded />}>{date}</Typography>}
        variant="caption"
      >
        {sender}
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
            {time}
          </Typography>
        }
      >
        {email.subject}
      </Typography>

      {loading || !email.html ? (
        <Card sx={{ overflowWrap: 'anywhere' }}>
          <Typography sx={{ whiteSpace: 'pre-wrap' }}>
            {loading
              ? 'Downloading message…'
              : email.text || email.snippet || 'This message has no body.'}
          </Typography>
        </Card>
      ) : (
        <Card
          sx={{
            p: 0,
            overflow: 'hidden'
          }}
        >
          <iframe
            title={email.subject || 'Email body'}
            sandbox="allow-same-origin"
            srcDoc={htmlDocument(email.html)}
            onLoad={(event) => {
              const frame = event.currentTarget
              frame.style.height = `${Math.max(
                120,
                frame.contentDocument.documentElement.scrollHeight
              )}px`
            }}
            style={{
              display: 'block',
              width: '100%',
              minHeight: 120,
              border: 0
            }}
          />
        </Card>
      )}

      {attachments.length > 0 && (
        <Card sx={{ flexShrink: 0 }}>
          <ListSubheader>Attachments</ListSubheader>
          <CardContent sx={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {attachments.map((file) => {
              const filename = file.filename || file.name
              return (
                <Card
                  key={file.id || filename}
                  sx={{ aspectRatio: '4/3', width: 130, p: 0, gap: 0, overflow: 'clip' }}
                >
                  <CardOverflow
                    sx={{
                      display: 'grid',
                      placeItems: 'center',
                      backgroundColor: 'background.level1',
                      backgroundImage: file.thumbnail ? `url("${file.thumbnail}")` : 'none',
                      height: '100%',
                      backgroundPosition: 'center',
                      backgroundSize: 'cover'
                    }}
                  >
                    {!file.thumbnail && <InsertDriveFileRounded sx={{ fontSize: 40 }} />}
                  </CardOverflow>
                  <Sheet
                    sx={{
                      px: 1,
                      py: '3px',
                      display: 'flex',
                      alignItems: 'center',
                      borderTop: (theme) => `1px solid ${theme.palette.divider}`
                    }}
                  >
                    <Avatar sx={{ width: 20, height: 20, mr: 0.7 }}>
                      <InsertDriveFileRounded />
                    </Avatar>
                    <Typography level="body-sm" lineHeight={1} noWrap sx={{ flex: 1, minWidth: 0 }}>
                      {filename}
                    </Typography>
                    <TooltipIconButton
                      aria-label={`Save ${filename}`}
                      size="sm"
                      variant="plain"
                      onClick={() => window.mail.saveAttachment(file.id)}
                    >
                      <DownloadRounded />
                    </TooltipIconButton>
                  </Sheet>
                </Card>
              )
            })}
          </CardContent>
        </Card>
      )}
    </Box>
  )
}

export default EmailDisplay
