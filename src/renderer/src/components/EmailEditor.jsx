import { AttachFileRounded, CloseRounded, SendRounded } from '@mui/icons-material'
import {
  Alert,
  Box,
  Button,
  Divider,
  FormControl,
  FormLabel,
  IconButton,
  Input,
  Textarea,
  Typography
} from '@mui/joy'
import { useState } from 'react'

function EmailEditor({ onClose, onSend }) {
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  async function send(event) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setSending(true)
    setError('')

    try {
      await onSend({
        to: form.get('to'),
        subject: form.get('subject'),
        text: form.get('body')
      })
      onClose()
    } catch (sendError) {
      setError(sendError.message)
    } finally {
      setSending(false)
    }
  }

  return (
    <Box
      component="form"
      onSubmit={send}
      sx={{
        display: 'flex',
        flex: 1,
        flexDirection: 'column',
        gap: 1.5,
        minHeight: 0
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <Typography level="title-lg" sx={{ flex: 1 }}>
          New message
        </Typography>
        <IconButton
          type="button"
          aria-label="Close editor"
          variant="plain"
          disabled={sending}
          onClick={onClose}
        >
          <CloseRounded />
        </IconButton>
      </Box>

      <Divider />

      {error && <Alert color="danger">{error}</Alert>}

      <FormControl required>
        <FormLabel>To</FormLabel>
        <Input name="to" type="email" placeholder="recipient@example.com" autoFocus />
      </FormControl>

      <FormControl>
        <FormLabel>Subject</FormLabel>
        <Input name="subject" placeholder="Subject" />
      </FormControl>

      <FormControl sx={{ flex: 1, minHeight: 0 }}>
        <FormLabel>Message</FormLabel>
        <Textarea
          name="body"
          required
          placeholder="Write your message…"
          sx={{ flex: 1, minHeight: 0, overflow: 'hidden' }}
          slotProps={{
            textarea: {
              sx: {
                minHeight: 0,
                overflowX: 'hidden !important',
                overflowY: 'auto !important'
              }
            }
          }}
        />
      </FormControl>

      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
        <Button
          type="button"
          variant="outlined"
          color="neutral"
          disabled
          startDecorator={<AttachFileRounded />}
        >
          Attach
        </Button>
        <Button type="submit" loading={sending} startDecorator={<SendRounded />}>
          Send
        </Button>
      </Box>
    </Box>
  )
}

export default EmailEditor
