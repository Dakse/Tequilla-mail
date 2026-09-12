import {
  FormatAlignCenterRounded,
  FormatAlignLeftRounded,
  FormatAlignRightRounded,
  FormatBoldRounded,
  FormatClearRounded,
  FormatItalicRounded,
  FormatListBulletedRounded,
  FormatListNumberedRounded,
  FormatQuoteRounded,
  FormatUnderlinedRounded,
  LinkOffRounded,
  LinkRounded,
  LooksOneRounded,
  LooksTwoRounded,
  StrikethroughSRounded
} from '@mui/icons-material'
import {
  Autocomplete,
  Box,
  Button,
  ButtonGroup,
  Checkbox,
  FormControl,
  FormLabel,
  Input,
  Option,
  Radio,
  RadioGroup,
  Select,
  Sheet,
  Switch,
  Textarea,
  Tooltip,
  Typography
} from '@mui/joy'
import { useCallback, useState } from 'react'
import { createEditor, Editor, Element as SlateElement, Node, Text, Transforms } from 'slate'
import { Editable, Slate, withReact } from 'slate-react'
import TooltipIconButton from './TooltipIconButton'

const listTypes = ['bulleted-list', 'numbered-list']
const formattingOptions = [
  ['Bold', 'bold', FormatBoldRounded],
  ['Italic', 'italic', FormatItalicRounded],
  ['Underline', 'underline', FormatUnderlinedRounded],
  ['Strikethrough', 'strikethrough', StrikethroughSRounded]
]
const blockOptions = [
  ['Heading 1', 'heading-one', LooksOneRounded],
  ['Heading 2', 'heading-two', LooksTwoRounded],
  ['Quote', 'blockquote', FormatQuoteRounded],
  ['Bulleted list', 'bulleted-list', FormatListBulletedRounded],
  ['Numbered list', 'numbered-list', FormatListNumberedRounded]
]
const alignmentOptions = [
  ['Align left', 'left', FormatAlignLeftRounded],
  ['Align center', 'center', FormatAlignCenterRounded],
  ['Align right', 'right', FormatAlignRightRounded]
]

export function createEmptyRichText() {
  return [{ type: 'paragraph', children: [{ text: '' }] }]
}

export function richTextToText(value) {
  return value
    .map((node) => Node.string(node))
    .join('\n')
    .trim()
}

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
  if (node.strikethrough) result = `<s>${result}</s>`
  return result
}

function safeLink(value) {
  const url = String(value || '').trim()
  if (/^(?:https?:|mailto:)/i.test(url)) return url
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(url)) return `mailto:${url}`
  if (/^[^\s.]+\.[^\s]+$/.test(url)) return `https://${url}`
  return ''
}

export function richTextToHtml(nodes) {
  return nodes
    .map((node) => {
      if (Text.isText(node)) return serializeLeaf(node)
      const children = richTextToHtml(node.children)
      if (node.type === 'link') {
        const url = safeLink(node.url)
        return url ? `<a href="${escapeHtml(url)}">${children}</a>` : children
      }
      const style = ['center', 'right'].includes(node.align)
        ? ` style="text-align:${node.align}"`
        : ''
      if (node.type === 'bulleted-list') return `<ul>${children}</ul>`
      if (node.type === 'numbered-list') return `<ol>${children}</ol>`
      if (node.type === 'list-item') return `<li${style}>${children}</li>`
      if (node.type === 'heading-one') return `<h1${style}>${children || '<br>'}</h1>`
      if (node.type === 'heading-two') return `<h2${style}>${children || '<br>'}</h2>`
      if (node.type === 'blockquote') {
        return `<blockquote${style}>${children || '<br>'}</blockquote>`
      }
      return `<p${style}>${children || '<br>'}</p>`
    })
    .join('')
}

function inlineNodes(node, marks = {}) {
  if (node.nodeType === globalThis.Node.TEXT_NODE)
    return [{ text: node.textContent || '', ...marks }]
  if (node.nodeType !== globalThis.Node.ELEMENT_NODE) return []

  const tag = node.tagName.toLowerCase()
  if (tag === 'br') return [{ text: '\n', ...marks }]
  const nextMarks = {
    ...marks,
    ...(tag === 'strong' || tag === 'b' ? { bold: true } : {}),
    ...(tag === 'em' || tag === 'i' ? { italic: true } : {}),
    ...(tag === 'u' ? { underline: true } : {}),
    ...(tag === 's' || tag === 'del' || tag === 'strike' ? { strikethrough: true } : {})
  }
  const children = [...node.childNodes].flatMap((child) => inlineNodes(child, nextMarks))
  if (tag === 'a') {
    const url = safeLink(node.getAttribute('href'))
    return url && children.length ? [{ type: 'link', url, children }] : children
  }
  return children
}

export function htmlToRichText(html) {
  if (!html?.trim()) return createEmptyRichText()
  const document = new DOMParser().parseFromString(html, 'text/html')
  const blocks = [...document.body.childNodes].flatMap((node) => {
    if (node.nodeType === globalThis.Node.TEXT_NODE) {
      return node.textContent?.trim()
        ? [{ type: 'paragraph', children: [{ text: node.textContent }] }]
        : []
    }
    if (node.nodeType !== globalThis.Node.ELEMENT_NODE) return []

    const tag = node.tagName.toLowerCase()
    if (tag === 'script' || tag === 'style') return []
    if (tag === 'ul' || tag === 'ol') {
      const children = [...node.children]
        .filter((child) => child.tagName.toLowerCase() === 'li')
        .map((child) => {
          const content = inlineNodes(child)
          return { type: 'list-item', children: content.length ? content : [{ text: '' }] }
        })
      return children.length
        ? [{ type: tag === 'ul' ? 'bulleted-list' : 'numbered-list', children }]
        : []
    }

    const children = inlineNodes(node)
    const type =
      { h1: 'heading-one', h2: 'heading-two', blockquote: 'blockquote' }[tag] || 'paragraph'
    const align = ['center', 'right'].includes(node.style.textAlign)
      ? node.style.textAlign
      : undefined
    return [
      { type, ...(align ? { align } : {}), children: children.length ? children : [{ text: '' }] }
    ]
  })
  return blocks.length ? blocks : createEmptyRichText()
}

function isBlockActive(editor, type) {
  return Boolean(
    Editor.above(editor, {
      match: (node) => SlateElement.isElement(node) && node.type === type
    })
  )
}

function toggleMark(editor, format) {
  const active = Editor.marks(editor)?.[format] === true
  if (active) Editor.removeMark(editor, format)
  else Editor.addMark(editor, format, true)
}

function toggleBlock(editor, type) {
  const active = isBlockActive(editor, type)
  const list = listTypes.includes(type)
  Transforms.unwrapNodes(editor, {
    match: (node) => SlateElement.isElement(node) && listTypes.includes(node.type),
    split: true
  })
  Transforms.setNodes(
    editor,
    { type: active ? 'paragraph' : list ? 'list-item' : type },
    { match: (node) => SlateElement.isElement(node) && Editor.isBlock(editor, node) }
  )
  if (!active && list) Transforms.wrapNodes(editor, { type, children: [] })
}

function currentAlignment(editor) {
  return (
    Editor.above(editor, {
      match: (node) => SlateElement.isElement(node) && Editor.isBlock(editor, node)
    })?.[0].align || 'left'
  )
}

function toggleAlignment(editor, align) {
  Transforms.setNodes(
    editor,
    { align: currentAlignment(editor) === align ? null : align },
    { match: (node) => SlateElement.isElement(node) && Editor.isBlock(editor, node) }
  )
}

function isLinkActive(editor) {
  return Boolean(
    Editor.above(editor, {
      match: (node) => SlateElement.isElement(node) && node.type === 'link'
    })
  )
}

function toggleLink(editor) {
  if (isLinkActive(editor)) {
    Transforms.unwrapNodes(editor, {
      match: (node) => SlateElement.isElement(node) && node.type === 'link'
    })
    return
  }

  const url = safeLink(window.prompt('Link URL or email address') || '')
  if (!url || !editor.selection) return
  const link = { type: 'link', url, children: [] }
  if (Editor.string(editor, editor.selection)) Transforms.wrapNodes(editor, link, { split: true })
  else Transforms.insertNodes(editor, { ...link, children: [{ text: url }] })
}

function clearFormatting(editor) {
  for (const [, format] of formattingOptions) Editor.removeMark(editor, format)
  Transforms.unwrapNodes(editor, {
    match: (node) =>
      SlateElement.isElement(node) && (listTypes.includes(node.type) || node.type === 'link'),
    split: true
  })
  Transforms.setNodes(
    editor,
    { type: 'paragraph', align: null },
    { match: (node) => SlateElement.isElement(node) && Editor.isBlock(editor, node) }
  )
}

function withLinks(editor) {
  const { isInline } = editor
  editor.isInline = (element) => element.type === 'link' || isInline(element)
  return editor
}

function RichElement({ attributes, children, element }) {
  const style = { position: 'relative', textAlign: element.align || undefined }
  if (element.type === 'link') {
    return (
      <a {...attributes} href={safeLink(element.url)} onClick={(event) => event.preventDefault()}>
        {children}
      </a>
    )
  }
  if (element.type === 'bulleted-list') return <ul {...attributes}>{children}</ul>
  if (element.type === 'numbered-list') return <ol {...attributes}>{children}</ol>
  if (element.type === 'list-item')
    return (
      <li {...attributes} style={style}>
        {children}
      </li>
    )
  if (element.type === 'heading-one')
    return (
      <h1 {...attributes} style={style}>
        {children}
      </h1>
    )
  if (element.type === 'heading-two')
    return (
      <h2 {...attributes} style={style}>
        {children}
      </h2>
    )
  if (element.type === 'blockquote')
    return (
      <blockquote {...attributes} style={style}>
        {children}
      </blockquote>
    )
  return (
    <p {...attributes} style={{ ...style, margin: 0 }}>
      {children}
    </p>
  )
}

function RichLeaf({ attributes, children, leaf }) {
  if (leaf.bold) children = <strong>{children}</strong>
  if (leaf.italic) children = <em>{children}</em>
  if (leaf.underline) children = <u>{children}</u>
  if (leaf.strikethrough) children = <s>{children}</s>
  return <span {...attributes}>{children}</span>
}

function EditorButton({ label, active, disabled, onMouseDown, children }) {
  return (
    <TooltipIconButton
      type="button"
      size="sm"
      variant={active ? 'soft' : 'plain'}
      aria-label={label}
      disabled={disabled}
      onMouseDown={(event) => {
        event.preventDefault()
        onMouseDown()
      }}
    >
      {children}
    </TooltipIconButton>
  )
}

function ToolbarDivider() {
  return <Box sx={{ width: '1px', my: 0.5, mx: 0.25, bgcolor: 'divider' }} />
}

function RichTextInput({ initialValue, onChange, disabled, placeholder }) {
  const [editor] = useState(() => withLinks(withReact(createEditor())))
  const renderElement = useCallback((props) => <RichElement {...props} />, [])
  const renderLeaf = useCallback((props) => <RichLeaf {...props} />, [])

  return (
    <Slate
      editor={editor}
      initialValue={initialValue || createEmptyRichText()}
      onValueChange={onChange}
    >
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
            flexWrap: 'wrap',
            gap: 0.5,
            p: 0.5,
            borderBottom: '1px solid',
            borderColor: 'divider'
          }}
        >
          {formattingOptions.map(([label, format, Icon]) => (
            <EditorButton
              key={format}
              label={label}
              active={Editor.marks(editor)?.[format]}
              disabled={disabled}
              onMouseDown={() => toggleMark(editor, format)}
            >
              <Icon />
            </EditorButton>
          ))}
          <ToolbarDivider />
          {blockOptions.map(([label, type, Icon]) => (
            <EditorButton
              key={type}
              label={label}
              active={isBlockActive(editor, type)}
              disabled={disabled}
              onMouseDown={() => toggleBlock(editor, type)}
            >
              <Icon />
            </EditorButton>
          ))}
          <ToolbarDivider />
          {alignmentOptions.map(([label, align, Icon]) => (
            <EditorButton
              key={align}
              label={label}
              active={currentAlignment(editor) === align}
              disabled={disabled}
              onMouseDown={() => toggleAlignment(editor, align)}
            >
              <Icon />
            </EditorButton>
          ))}
          <ToolbarDivider />
          <EditorButton
            label={isLinkActive(editor) ? 'Remove link' : 'Add link'}
            active={isLinkActive(editor)}
            disabled={disabled}
            onMouseDown={() => toggleLink(editor)}
          >
            {isLinkActive(editor) ? <LinkOffRounded /> : <LinkRounded />}
          </EditorButton>
          <EditorButton
            label="Clear formatting"
            disabled={disabled}
            onMouseDown={() => clearFormatting(editor)}
          >
            <FormatClearRounded />
          </EditorButton>
        </Box>
        <Editable
          aria-label="Message"
          placeholder={placeholder}
          readOnly={disabled}
          renderElement={renderElement}
          renderLeaf={renderLeaf}
          onKeyDown={(event) => {
            if (!(event.ctrlKey || event.metaKey)) return
            if (event.key.toLowerCase() === 'k') {
              event.preventDefault()
              toggleLink(editor)
              return
            }
            const format = { b: 'bold', i: 'italic', u: 'underline' }[event.key.toLowerCase()]
            if (!format) return
            event.preventDefault()
            toggleMark(editor, format)
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
  )
}

function UniversalForm({ fields, actions, component, onSubmit, sx, ...props }) {
  const content = fields.map((field) => {
    const key = field.key || field.name || field.label

    if (field.type === 'custom') {
      return (
        <Box key={key} sx={field.sx}>
          {field.render(field)}
        </Box>
      )
    }

    if (field.type === 'section') {
      return (
        <Typography key={key} level="title-sm" {...field.props}>
          {field.label}
        </Typography>
      )
    }

    if (field.type === 'row') {
      return (
        <Box key={key} sx={field.sx}>
          <UniversalForm fields={field.fields} />
        </Box>
      )
    }

    if (field.type === 'checkbox') {
      return (
        <Box key={key} sx={field.sx}>
          <Checkbox
            name={field.name}
            label={field.label}
            checked={field.value}
            defaultChecked={field.defaultValue}
            disabled={field.disabled}
            onChange={(event) => field.onChange?.(event.target.checked)}
            {...field.props}
          />
        </Box>
      )
    }

    if (field.type === 'switch') {
      return (
        <Box key={key} sx={field.sx}>
          <Switch
            name={field.name}
            checked={field.value}
            disabled={field.disabled}
            onChange={(event) => field.onChange?.(event.target.checked)}
            endDecorator={field.label}
            {...field.props}
          />
          {field.description && (
            <Typography level="body-xs" sx={{ mt: 0.75, color: 'text.tertiary' }}>
              {field.description}
            </Typography>
          )}
        </Box>
      )
    }

    let control
    if (field.type === 'buttonGroup') {
      control = (
        <ButtonGroup {...field.props} sx={{ width: '100%', ...field.props?.sx }}>
          {field.options.map((option) => {
            const value = typeof option === 'object' ? option.value : option
            const label = typeof option === 'object' ? option.label : option
            const Icon = typeof option === 'object' ? option.icon : null
            const selected = field.value === value
            const button = (
              <Button
                type="button"
                aria-label={label}
                aria-pressed={selected}
                variant={selected ? 'solid' : 'outlined'}
                color={selected ? 'primary' : 'neutral'}
                disabled={field.disabled}
                sx={{ flex: 1 }}
                onClick={() => field.onChange?.(value)}
              >
                {Icon ? <Icon /> : label}
              </Button>
            )
            return typeof option === 'object' && option.tooltip ? (
              <Tooltip key={value} title={option.tooltip}>
                {button}
              </Tooltip>
            ) : (
              <Button
                key={value}
                type="button"
                aria-label={label}
                aria-pressed={selected}
                variant={selected ? 'solid' : 'outlined'}
                color={selected ? 'primary' : 'neutral'}
                disabled={field.disabled}
                sx={{ flex: 1 }}
                onClick={() => field.onChange?.(value)}
              >
                {Icon ? <Icon /> : label}
              </Button>
            )
          })}
        </ButtonGroup>
      )
    } else if (field.type === 'radio') {
      control = (
        <RadioGroup
          name={field.name}
          value={field.value}
          defaultValue={field.defaultValue}
          onChange={(event) => field.onChange?.(event.target.value)}
          {...field.props}
        >
          {field.options.map((option) => {
            const value = typeof option === 'object' ? option.value : option
            const label = typeof option === 'object' ? option.label : option
            return <Radio key={value} value={value} label={label} disabled={field.disabled} />
          })}
        </RadioGroup>
      )
    } else if (field.type === 'select') {
      control = (
        <Select
          name={field.name}
          value={field.value}
          defaultValue={field.defaultValue}
          disabled={field.disabled}
          onChange={(_event, value) => field.onChange?.(value)}
          {...field.props}
        >
          {field.options.map((option) => {
            const value = typeof option === 'object' ? option.value : option
            const label = typeof option === 'object' ? option.label : option
            return (
              <Option key={value} value={value}>
                {label}
              </Option>
            )
          })}
        </Select>
      )
    } else if (field.type === 'autocomplete') {
      control = (
        <Autocomplete
          name={field.name}
          options={field.options || []}
          value={field.value}
          disabled={field.disabled}
          onChange={(_event, value) => field.onChange?.(value)}
          {...field.props}
        />
      )
    } else if (field.type === 'richtext') {
      control = (
        <RichTextInput
          initialValue={field.initialValue}
          disabled={field.disabled}
          onChange={field.onChange}
          placeholder={field.props?.placeholder}
        />
      )
    } else if (field.type === 'textarea') {
      control = (
        <Textarea
          name={field.name}
          value={field.value}
          defaultValue={field.defaultValue}
          disabled={field.disabled}
          onChange={field.onChange ? (event) => field.onChange(event.target.value) : undefined}
          {...field.props}
        />
      )
    } else {
      control = (
        <Input
          name={field.name}
          value={field.value}
          defaultValue={field.defaultValue}
          disabled={field.disabled}
          onChange={field.onChange ? (event) => field.onChange(event.target.value) : undefined}
          {...field.props}
        />
      )
    }

    return (
      <FormControl key={key} required={field.required} sx={field.sx}>
        {field.label && <FormLabel>{field.label}</FormLabel>}
        {control}
        {field.description && (
          <Typography level="body-xs" sx={{ mt: 0.75, color: 'text.tertiary' }}>
            {field.description}
          </Typography>
        )}
      </FormControl>
    )
  })

  const actionContent = typeof actions === 'function' ? actions() : actions
  const body = (
    <>
      {content}
      {actionContent}
    </>
  )

  return component || sx || onSubmit ? (
    <Box component={component} onSubmit={onSubmit} sx={sx} {...props}>
      {body}
    </Box>
  ) : (
    body
  )
}

export default UniversalForm
