import {
  FormatBoldRounded,
  FormatItalicRounded,
  FormatListBulletedRounded,
  FormatListNumberedRounded,
  FormatUnderlinedRounded
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
  ['Bold', 'bold', FormatBoldRounded, false],
  ['Italic', 'italic', FormatItalicRounded, false],
  ['Underline', 'underline', FormatUnderlinedRounded, false],
  ['Bulleted list', 'bulleted-list', FormatListBulletedRounded, true],
  ['Numbered list', 'numbered-list', FormatListNumberedRounded, true]
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
  return result
}

export function richTextToHtml(nodes) {
  return nodes
    .map((node) => {
      if (Text.isText(node)) return serializeLeaf(node)
      const children = richTextToHtml(node.children)
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

function RichTextInput({ initialValue, onChange, disabled, placeholder }) {
  const [editor] = useState(() => withReact(createEditor()))
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
              variant={
                isBlockActive(editor, format) || Editor.marks(editor)?.[format] ? 'soft' : 'plain'
              }
              aria-label={label}
              disabled={disabled}
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
          placeholder={placeholder}
          readOnly={disabled}
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
