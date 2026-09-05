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
  CircularProgress,
  Divider,
  ListSubheader,
  Sheet,
  SvgIcon,
  Typography
} from '@mui/joy'
import TooltipIconButton from './TooltipIconButton'
import { formatMessageDate, initials, messageContact } from './helpers'

function AppLogo(props) {
  return (
    <SvgIcon viewBox="0 0 16 16" {...props}>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M1 7L4.80061 1.43926C5.56059 0.527292 6.68638 0 7.8735 0H8V4L12 5L15 10L14.1875 11.2188C13.4456 12.3316 12.1967 13 10.8593 13H9L7 16H5L1 7ZM10 9C10.5523 9 11 8.55229 11 8C11 7.44772 10.5523 7 10 7C9.44771 7 9 7.44772 9 8C9 8.55229 9.44771 9 10 9Z"
      />
      <path d="M10 0.465878V2.43845L12 2.93845V0H11.8735C11.2125 0 10.5704 0.163501 10 0.465878Z" />
    </SvgIcon>
  )
}

function htmlDocument(html) {
  const document = new DOMParser().parseFromString(html, 'text/html')
  for (const link of document.querySelectorAll('a, area')) {
    link.setAttribute('target', '_blank')
    link.setAttribute('rel', 'noopener noreferrer')
  }
  document.querySelectorAll('meta[http-equiv="refresh" i]').forEach((meta) => meta.remove())
  const policy = document.createElement('meta')
  policy.httpEquiv = 'Content-Security-Policy'
  policy.content =
    "default-src 'none'; img-src data: https: http:; style-src 'unsafe-inline'; font-src data:; form-action 'none'; base-uri 'none'"
  const responsiveStyles = document.createElement('style')
  responsiveStyles.textContent = `
    :root { color-scheme: only light; }
    html, body { overflow-x: hidden !important; }
    body { box-sizing: border-box !important; margin: 0 !important; padding-inline: 24px !important; }
    img { max-width: 100%; height: auto; }
    table { max-width: 100%; }
  `
  document.head.prepend(policy)
  document.head.append(responsiveStyles)

  return `<!doctype html>${document.documentElement.outerHTML}`
}

function EmailDisplay({
  email,
  dateFormat,
  dateSeparator,
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
        <AppLogo
          sx={{
            width: 200,
            height: 200,
            color: (t) =>
              t.palette.mode === 'dark' ? t.palette.neutral[700] : t.palette.neutral[400]
          }}
        />
      </Box>
    )
  }

  const contact = messageContact(email, mailbox === 'Sent')
  const timestamp = email.date ? new Date(email.date) : null
  const date = formatMessageDate(email.date, dateFormat, dateSeparator)
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
        overflow: 'hidden'
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
          <Avatar
            src={contact.primary?.avatar}
            sx={{ width: 20, height: 20, borderRadius: (t) => t.radius.xs }}
          >
            {initials(contact.primary?.name || contact.primary?.address)}
          </Avatar>
        }
        slotProps={{ endDecorator: { sx: { ml: 'auto' } } }}
        endDecorator={<Typography endDecorator={<InsertInvitationRounded />}>{date}</Typography>}
        variant="caption"
      >
        {contact.label}
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

      {loading ? (
        <Card sx={{ minHeight: 120, display: 'grid', flex: 1, placeItems: 'center' }}>
          <CircularProgress />
        </Card>
      ) : !email.html ? (
        <Card
          sx={{
            flex: 1,
            minHeight: 120,
            overflowX: 'hidden',
            overflowY: 'auto',
            overflowWrap: 'anywhere'
          }}
        >
          <Typography sx={{ whiteSpace: 'pre-wrap' }}>
            {email.text || email.snippet || 'This message has no body.'}
          </Typography>
        </Card>
      ) : (
        <Card
          sx={{
            p: 0,
            flex: 1,
            minHeight: 120,
            overflow: 'hidden'
          }}
        >
          <iframe
            title={email.subject || 'Email body'}
            sandbox="allow-popups allow-same-origin"
            scrolling="auto"
            srcDoc={htmlDocument(email.html)}
            style={{
              display: 'block',
              flex: 1,
              width: '100%',
              minHeight: 0,
              border: 0,
              colorScheme: 'light',
              backgroundColor: '#fff'
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
                    <Avatar
                      sx={{ width: 20, height: 20, mr: 0.7, borderRadius: (t) => t.radius.xs }}
                    >
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
