import {
  AccessTimeRounded,
  DeleteRounded,
  FolderDeleteRounded,
  InsertInvitationRounded,
  ReplyRounded,
  StarOutlineRounded,
  TitleRounded
} from '@mui/icons-material'
import {
  Avatar,
  Box,
  Card,
  CardContent,
  CardOverflow,
  Divider,
  IconButton,
  ListSubheader,
  Sheet,
  Typography
} from '@mui/joy'

function initials(value) {
  return String(value || '?')
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function EmailDisplay({ email, loading, onReply }) {
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
  const date = timestamp && !Number.isNaN(timestamp.getTime()) ? timestamp.toLocaleDateString() : ''
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
        <IconButton aria-label="Delete email" sx={{ flex: 1 }}>
          <DeleteRounded />
        </IconButton>
        <IconButton aria-label="Move email" sx={{ flex: 1 }}>
          <FolderDeleteRounded />
        </IconButton>
        <IconButton aria-label="Star email" sx={{ flex: 1 }}>
          <StarOutlineRounded />
        </IconButton>
        <IconButton aria-label="Reply" sx={{ flex: 1 }} onClick={onReply}>
          <ReplyRounded />
        </IconButton>
        <IconButton aria-label="Forward" sx={{ flex: 1 }} onClick={onReply}>
          <ReplyRounded sx={{ transform: 'scaleX(-1)' }} />
        </IconButton>
      </Sheet>

      <Divider />

      <Typography
        startDecorator={<Avatar sx={{ width: 20, height: 20 }}>{initials(sender)}</Avatar>}
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

      <Card sx={{ overflowWrap: 'anywhere' }}>
        <Typography sx={{ whiteSpace: 'pre-wrap' }}>
          {loading
            ? 'Downloading message…'
            : email.text || email.snippet || 'This message has no plain-text body.'}
        </Typography>
      </Card>

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
                      backgroundImage: 'url(https://api.images.cat/300/300)',
                      height: '100%',
                      backgroundPosition: 'center',
                      backgroundSize: 'cover'
                    }}
                  />
                  <Sheet
                    sx={{
                      px: 1,
                      py: '3px',
                      display: 'flex',
                      alignItems: 'center',
                      borderTop: (theme) => `1px solid ${theme.palette.divider}`
                    }}
                  >
                    <Avatar sx={{ width: 20, height: 20, mr: 0.7 }} />
                    <Typography level="body-sm" lineHeight={1} noWrap sx={{ minWidth: 0 }}>
                      {filename}
                    </Typography>
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
