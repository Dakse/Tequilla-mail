import {
  DeleteForeverRounded,
  DnsRounded,
  PaletteRounded,
  PersonRounded
} from '@mui/icons-material'
import {
  Alert,
  Avatar,
  Box,
  Button,
  Divider,
  List,
  ListItemButton,
  Stack,
  Typography
} from '@mui/joy'
import { useState } from 'react'
import FooterPreview from './FooterPreview'
import Modal from './Modal.jsx'
import UniversalForm, { createEmptyRichText, htmlToRichText, richTextToHtml } from './UniversalForm'

const panels = [
  { id: 'general', label: 'General', icon: PersonRounded },
  { id: 'connection', label: 'Connection', icon: DnsRounded },
  { id: 'personalization', label: 'Personalization', icon: PaletteRounded }
]

function initialValues(account) {
  return {
    name: account?.name || '',
    email: account?.email || '',
    avatar: account?.avatar || '',
    color: account?.color || '#009999',
    incomingServer: account?.incomingServer || '',
    incomingPort: account?.incomingPort || 993,
    incomingUsername: account?.incomingUsername || '',
    incomingPassword: '',
    incomingTls: account ? account.incomingTls : true,
    outgoingServer: account?.outgoingServer || '',
    outgoingPort: account?.outgoingPort || 465,
    outgoingUsername: account?.outgoingUsername || '',
    outgoingPassword: '',
    outgoingTls: account ? account.outgoingTls : true,
    footerHtml: account?.footerHtml || '',
    footerMode: account?.footerMode === 'raw' ? 'raw' : 'rich'
  }
}

function initials(name) {
  return String(name || '?')
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}

function AccountModal({ open, account, onClose, onSaved, onDeleted }) {
  const [activePanel, setActivePanel] = useState('general')
  const [values, setValues] = useState(() => initialValues(account))
  const [footer, setFooter] = useState(() =>
    account?.footerHtml ? htmlToRichText(account.footerHtml) : createEmptyRichText()
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const setValue = (name) => (value) => setValues((current) => ({ ...current, [name]: value }))
  const field = (name, options = {}) => ({
    name,
    value: values[name],
    disabled: saving,
    onChange: setValue(name),
    ...options
  })

  function close() {
    if (saving) return
    setError('')
    onClose()
  }

  async function chooseAvatar(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(file.type)) {
      setError('Choose a PNG, JPEG, WebP, or GIF image')
      return
    }
    if (file.size > 1_500_000) {
      setError('Avatar must be smaller than 1.5 MB')
      return
    }

    try {
      const image = await createImageBitmap(file)
      const scale = Math.min(1, 256 / Math.max(image.width, image.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(image.width * scale))
      canvas.height = Math.max(1, Math.round(image.height * scale))
      canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height)
      image.close()
      setValue('avatar')(canvas.toDataURL('image/png'))
      setError('')
    } catch {
      setError('Could not read the selected image')
    }
  }

  function changeFooterMode(raw) {
    if (!raw) setFooter(htmlToRichText(values.footerHtml))
    setValue('footerMode')(raw ? 'raw' : 'rich')
  }

  async function save(event) {
    event.preventDefault()
    setSaving(true)
    setError('')

    try {
      const savedAccount = account
        ? await window.mail.updateAccount(account.id, values)
        : await window.mail.addAccount(values)
      onSaved(savedAccount)
    } catch (saveError) {
      setError(saveError.message)
    } finally {
      setSaving(false)
    }
  }

  async function deleteAccount() {
    if (!window.confirm(`Delete ${account.name} and its locally downloaded mail?`)) return

    setSaving(true)
    setError('')
    try {
      await window.mail.deleteAccount(account.id)
      onDeleted(account.id)
    } catch (deleteError) {
      setError(deleteError.message)
    } finally {
      setSaving(false)
    }
  }

  const serverRow = { display: 'grid', gridTemplateColumns: '1fr 120px', gap: 1.5 }
  const nameField = field('name', {
    label: 'Account name',
    required: true,
    props: { placeholder: 'Personal account', autoFocus: true }
  })
  const fields = {
    general: [
      {
        type: 'custom',
        key: 'avatar',
        render: () => (
          <Stack direction="row" spacing={2} alignItems="center">
            <Avatar src={values.avatar || undefined} sx={{ width: 72, height: 72 }}>
              {initials(values.name)}
            </Avatar>
            <Stack spacing={1}>
              <Button component="label" type="button" variant="outlined" disabled={saving}>
                Choose avatar
                <input
                  hidden
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  onChange={chooseAvatar}
                />
              </Button>
              {values.avatar && (
                <Button
                  type="button"
                  size="sm"
                  color="neutral"
                  variant="plain"
                  disabled={saving}
                  onClick={() => setValue('avatar')('')}
                >
                  Remove avatar
                </Button>
              )}
            </Stack>
          </Stack>
        )
      },
      nameField,
      field('color', {
        label: 'Account color',
        description: 'Saved for future account color customization.',
        props: { type: 'color', sx: { width: 88, p: 0.5 } }
      })
    ],
    connection: [
      field('email', {
        label: 'Email',
        required: true,
        props: { type: 'email', placeholder: 'you@example.com' }
      }),
      { type: 'section', label: 'Incoming server (IMAP)' },
      {
        type: 'row',
        key: 'incoming-server',
        sx: serverRow,
        fields: [
          field('incomingServer', {
            label: 'Server',
            required: true,
            props: { placeholder: 'imap.example.com' }
          }),
          field('incomingPort', {
            label: 'Port',
            required: true,
            props: { type: 'number', slotProps: { input: { min: 1, max: 65535 } } }
          })
        ]
      },
      field('incomingUsername', {
        label: 'Username',
        required: true,
        props: { placeholder: 'you@example.com' }
      }),
      field('incomingPassword', {
        label: 'Password',
        required: !account,
        props: { type: 'password', placeholder: account ? '************' : '' }
      }),
      {
        type: 'checkbox',
        name: 'incomingTls',
        label: 'Use TLS',
        value: values.incomingTls,
        disabled: saving,
        onChange: setValue('incomingTls')
      },
      { type: 'section', label: 'Outgoing server (SMTP)' },
      {
        type: 'row',
        key: 'outgoing-server',
        sx: serverRow,
        fields: [
          field('outgoingServer', {
            label: 'Server',
            required: true,
            props: { placeholder: 'smtp.example.com' }
          }),
          field('outgoingPort', {
            label: 'Port',
            required: true,
            props: { type: 'number', slotProps: { input: { min: 1, max: 65535 } } }
          })
        ]
      },
      field('outgoingUsername', {
        label: 'Username',
        required: true,
        props: { placeholder: 'you@example.com' }
      }),
      field('outgoingPassword', {
        label: 'Password',
        required: !account,
        props: { type: 'password', placeholder: account ? '************' : '' }
      }),
      {
        type: 'checkbox',
        name: 'outgoingTls',
        label: 'Use TLS',
        value: values.outgoingTls,
        disabled: saving,
        onChange: setValue('outgoingTls')
      }
    ],
    personalization: [
      {
        type: 'switch',
        name: 'raw-footer',
        label: 'Edit raw HTML',
        value: values.footerMode === 'raw',
        disabled: saving,
        onChange: changeFooterMode,
        description: 'Use raw mode for HTML that the visual editor cannot represent.'
      },
      values.footerMode === 'raw'
        ? field('footerHtml', {
            type: 'textarea',
            label: 'HTML footer',
            props: { minRows: 9, placeholder: '<p></p>' }
          })
        : {
            type: 'richtext',
            name: 'footer',
            label: 'Email footer',
            initialValue: footer,
            disabled: saving,
            onChange: (nextFooter) => {
              setFooter(nextFooter)
              setValue('footerHtml')(richTextToHtml(nextFooter))
            },
            props: { placeholder: 'Add a footer to outgoing messages…' },
            sx: { minHeight: 260 }
          },
      {
        type: 'custom',
        key: 'footer-preview',
        render: () => <FooterPreview html={values.footerHtml} />
      }
    ]
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title={account ? 'Account settings' : 'Add account'}
      disabled={saving}
      component="form"
      onSubmit={save}
      dialogKey={account?.id || 'new-account'}
      sx={
        account
          ? { width: 760, height: 620, maxHeight: 'calc(100vh - 32px)', overflow: 'hidden' }
          : { width: 440 }
      }
    >
      {error && <Alert color="danger">{error}</Alert>}
      {account ? (
        <Box sx={{ display: 'flex', flex: 1, minHeight: 0 }}>
          <List sx={{ width: 170, pr: 1, flex: 0.4 }}>
            {panels.map(({ id, label, icon: Icon }) => (
              <ListItemButton
                key={id}
                type="button"
                selected={activePanel === id}
                disabled={saving}
                onClick={() => setActivePanel(id)}
                sx={{ borderRadius: 'sm', gap: 1 }}
              >
                <Icon />
                <Typography>{label}</Typography>
              </ListItemButton>
            ))}
          </List>
          <Divider orientation="vertical" />
          <Box sx={{ flex: 1, minWidth: 0, overflowY: 'auto', pl: 2.5, pr: 0.5 }}>
            <UniversalForm
              fields={fields[activePanel]}
              sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
            />
          </Box>
        </Box>
      ) : (
        <UniversalForm
          fields={[nameField, ...fields.connection]}
          sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
        />
      )}
      <Divider />
      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
        {account ? (
          <Button
            type="button"
            color="danger"
            variant="outlined"
            startDecorator={<DeleteForeverRounded />}
            disabled={saving}
            onClick={deleteAccount}
          >
            Delete account
          </Button>
        ) : (
          <span />
        )}
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            type="button"
            variant="outlined"
            color="neutral"
            disabled={saving}
            onClick={close}
          >
            Cancel
          </Button>
          <Button type="submit" loading={saving}>
            {account ? 'Save changes' : 'Add account'}
          </Button>
        </Box>
      </Box>
    </Modal>
  )
}

export default AccountModal
