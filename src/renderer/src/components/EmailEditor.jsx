import { AttachFileRounded, CloseRounded, SendRounded } from '@mui/icons-material'
import { Alert, Box, Button, Chip, Divider, Typography } from '@mui/joy'
import { useState } from 'react'
import TooltipIconButton from './TooltipIconButton'
import UniversalForm, { createEmptyRichText, richTextToHtml, richTextToText } from './UniversalForm'

function EmailEditor({ contacts = [], onClose, onSend }) {
  const [body, setBody] = useState(createEmptyRichText)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [recipients, setRecipients] = useState([])
  const [attachments, setAttachments] = useState([])

  async function chooseAttachments() {
    try {
      const selected = await window.mail.chooseAttachments()
      setAttachments((current) => [
        ...current,
        ...selected.filter((file) => !current.some(({ path }) => path === file.path))
      ])
    } catch (attachmentError) {
      setError(attachmentError.message)
    }
  }

  async function send(event) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const text = richTextToText(body)
    if (!recipients.length || recipients.some((address) => !address.includes('@'))) {
      setError('Enter a valid recipient email address')
      return
    }
    if (!text) {
      setError('Message is required')
      return
    }

    setSending(true)
    setError('')
    try {
      await onSend({
        to: recipients.join(', '),
        subject: form.get('subject'),
        text,
        html: richTextToHtml(body),
        attachments
      })
      onClose()
    } catch (sendError) {
      setError(sendError.message)
    } finally {
      setSending(false)
    }
  }

  const fields = [
    {
      type: 'custom',
      key: 'header',
      sx: { display: 'flex', alignItems: 'center' },
      render: () => (
        <>
          <Typography level="title-lg" sx={{ flex: 1 }}>
            New message
          </Typography>
          <TooltipIconButton
            type="button"
            aria-label="Close editor"
            variant="plain"
            disabled={sending}
            onClick={onClose}
          >
            <CloseRounded />
          </TooltipIconButton>
        </>
      )
    },
    { type: 'custom', key: 'divider', render: () => <Divider /> },
    ...(error
      ? [{ type: 'custom', key: 'error', render: () => <Alert color="danger">{error}</Alert> }]
      : []),
    {
      type: 'autocomplete',
      name: 'to',
      label: 'To',
      required: true,
      options: contacts,
      value: recipients,
      disabled: sending,
      onChange: setRecipients,
      props: {
        multiple: true,
        freeSolo: true,
        autoHighlight: true,
        filterSelectedOptions: true,
        placeholder: 'recipient@example.com',
        autoFocus: true
      }
    },
    { name: 'subject', label: 'Subject', props: { placeholder: 'Subject' } },
    {
      type: 'richtext',
      name: 'body',
      label: 'Message',
      initialValue: body,
      disabled: sending,
      onChange: setBody,
      props: { placeholder: 'Write your message…' },
      sx: { flex: 1, minHeight: 0 }
    },
    ...(attachments.length
      ? [
          {
            type: 'custom',
            key: 'attachments',
            sx: { display: 'flex', flexWrap: 'wrap', gap: 0.75 },
            render: () =>
              attachments.map((file) => (
                <Chip
                  key={file.path}
                  variant="soft"
                  endDecorator={<CloseRounded />}
                  onClick={() =>
                    setAttachments((current) => current.filter(({ path }) => path !== file.path))
                  }
                >
                  {file.name}
                </Chip>
              ))
          }
        ]
      : [])
  ]

  return (
    <UniversalForm
      component="form"
      onSubmit={send}
      fields={fields}
      sx={{ display: 'flex', flex: 1, flexDirection: 'column', gap: 1.5, minHeight: 0 }}
      actions={() => (
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Button
            type="button"
            variant="outlined"
            color="neutral"
            disabled={sending}
            startDecorator={<AttachFileRounded />}
            onClick={chooseAttachments}
          >
            Attach
          </Button>
          <Button type="submit" loading={sending} startDecorator={<SendRounded />}>
            Send
          </Button>
        </Box>
      )}
    />
  )
}

export default EmailEditor
