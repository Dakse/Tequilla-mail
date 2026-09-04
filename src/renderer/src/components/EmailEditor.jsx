import {
  AttachFileRounded,
  CloseRounded,
  FormatBoldRounded,
  FormatItalicRounded,
  FormatListBulletedRounded,
  FormatListNumberedRounded,
  FormatUnderlinedRounded,
  SendRounded
} from '@mui/icons-material'
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  Divider,
  FormControl,
  FormLabel,
  Input,
  Sheet,
  Typography
} from '@mui/joy'
import { useCallback, useState } from 'react'
import { createEditor, Editor, Element as SlateElement, Node, Text, Transforms } from 'slate'
import { Editable, Slate, withReact } from 'slate-react'
import TooltipIconButton from './TooltipIconButton'

const initialValue = [{ type: 'paragraph', children: [{ text: '' }] }]
const listTypes = ['bulleted-list', 'numbered-list']
const formattingOptions = [
  ['Bold', 'bold', FormatBoldRounded, false],
  ['Italic', 'italic', FormatItalicRounded, false],
  ['Underline', 'underline', FormatUnderlinedRounded, false],
  ['Bulleted list', 'bulleted-list', FormatListBulletedRounded, true],
  ['Numbered list', 'numbered-list', FormatListNumberedRounded, true]
]

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function serializeLeaf(node) {
  let result = escapeHtml(node.text).replaceAll('\n', '<br>')
  if (node.bold) result = `<strong>${result}</strong>`
  if (node.italic) result = `<em>${result}</em>`
  if (node.underline) result = `<u>${result}</u>`
  return result
}

function serializeHtml(nodes) {
  return nodes
    .map((node) => {
      if (Text.isText(node)) return serializeLeaf(node)
      const children = serializeHtml(node.children)
      if (node.type === 'bulleted-list') return `<ul>${children}</ul>`
      if (node.type === 'numbered-list') return `<ol>${children}</ol>`
      if (node.type === 'list-item') return `<li>${children}</li>`
      return `<p>${children || '<br>'}</p>`
    })
    .join('')
}

function isBlockActive(editor, type) {
  return Boolean(
    Editor.above(editor, {
      match: (node) => SlateElement.isElement(node) && node.type === type
    })
  )
}

function toggleFormat(editor, format, block) {
  if (!block) {
    const active = Editor.marks(editor)?.[format] === true
    if (active) Editor.removeMark(editor, format)
    else Editor.addMark(editor, format, true)
    return
  }

  const active = isBlockActive(editor, format)
  Transforms.unwrapNodes(editor, {
    match: (node) => SlateElement.isElement(node) && listTypes.includes(node.type),
    split: true
  })
  Transforms.setNodes(
    editor,
    { type: active ? 'paragraph' : 'list-item' },
    { match: (node) => SlateElement.isElement(node) && Editor.isBlock(editor, node) }
  )
  if (!active) Transforms.wrapNodes(editor, { type: format, children: [] })
}

function isFormatActive(editor, format, block) {
  return block ? isBlockActive(editor, format) : Editor.marks(editor)?.[format] === true
}

function RichElement({ attributes, children, element }) {
  if (element.type === 'bulleted-list') return <ul {...attributes}>{children}</ul>
  if (element.type === 'numbered-list') return <ol {...attributes}>{children}</ol>
  if (element.type === 'list-item') return <li {...attributes}>{children}</li>
  return <p {...attributes}>{children}</p>
}

function RichLeaf({ attributes, children, leaf }) {
  if (leaf.bold) children = <strong>{children}</strong>
  if (leaf.italic) children = <em>{children}</em>
  if (leaf.underline) children = <u>{children}</u>
  return <span {...attributes}>{children}</span>
}

function EmailEditor({ contacts = [], onClose, onSend }) {
  const [editor] = useState(() => withReact(createEditor()))
  const [value, setValue] = useState(initialValue)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [recipients, setRecipients] = useState([])
  const [attachments, setAttachments] = useState([])
  const renderElement = useCallback((props) => <RichElement {...props} />, [])
  const renderLeaf = useCallback((props) => <RichLeaf {...props} />, [])

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
    const text = value.map((node) => Node.string(node)).join('\n').trim()
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
        html: serializeHtml(value),
        attachments
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
      sx={{ display: 'flex', flex: 1, flexDirection: 'column', gap: 1.5, minHeight: 0 }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
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
      </Box>

      <Divider />
      {error && <Alert color="danger">{error}</Alert>}

      <FormControl required>
        <FormLabel>To</FormLabel>
        <Autocomplete
          multiple
          freeSolo
          autoHighlight
          filterSelectedOptions
          placeholder="recipient@example.com"
          autoFocus
          options={contacts}
          value={recipients}
          disabled={sending}
          onChange={(_event, addresses) => setRecipients(addresses)}
        />
      </FormControl>

      <FormControl>
        <FormLabel>Subject</FormLabel>
        <Input name="subject" placeholder="Subject" />
      </FormControl>

      <FormControl sx={{ flex: 1, minHeight: 0 }}>
        <FormLabel>Message</FormLabel>
        <Slate editor={editor} initialValue={initialValue} onValueChange={setValue}>
          <Sheet
            variant="outlined"
            sx={{
              display: 'flex',
              flex: 1,
              minHeight: 0,
              flexDirection: 'column',
              borderRadius: 'sm',
              overflow: 'hidden'
            }}
          >
            <Box
              sx={{
                display: 'flex',
                gap: 0.5,
                p: 0.5,
                borderBottom: '1px solid',
                borderColor: 'divider'
              }}
            >
              {formattingOptions.map(([label, format, Icon, block]) => (
                <TooltipIconButton
                  key={format}
                  type="button"
                  size="sm"
                  variant={isFormatActive(editor, format, block) ? 'soft' : 'plain'}
                  aria-label={label}
                  onMouseDown={(event) => {
                    event.preventDefault()
                    toggleFormat(editor, format, block)
                  }}
                >
                  <Icon />
                </TooltipIconButton>
              ))}
            </Box>
            <Editable
              aria-label="Message"
              placeholder="Write your message…"
              renderElement={renderElement}
              renderLeaf={renderLeaf}
              onKeyDown={(event) => {
                if (!(event.ctrlKey || event.metaKey)) return
                const format = { b: 'bold', i: 'italic', u: 'underline' }[event.key.toLowerCase()]
                if (!format) return
                event.preventDefault()
                toggleFormat(editor, format, false)
              }}
              style={{
                flex: 1,
                minHeight: 120,
                padding: 12,
                overflowX: 'hidden',
                overflowY: 'auto',
                overflowWrap: 'anywhere',
                outline: 'none'
              }}
            />
          </Sheet>
        </Slate>
      </FormControl>

      {attachments.length > 0 && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
          {attachments.map((file) => (
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
          ))}
        </Box>
      )}

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
    </Box>
  )
}

export default EmailEditor
