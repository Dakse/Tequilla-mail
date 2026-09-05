import { DeleteForeverRounded } from '@mui/icons-material'
import { Alert, Box, Button, Stack } from '@mui/joy'
import { useState } from 'react'
import Modal from './Modal.jsx'
import UniversalForm from './UniversalForm'

function accountFields(account) {
  const serverRow = { display: 'grid', gridTemplateColumns: '1fr 120px', gap: 1.5 }
  return [
    {
      name: 'name',
      label: 'Name',
      required: true,
      defaultValue: account?.name,
      props: { placeholder: 'Personal account', autoFocus: true }
    },
    {
      name: 'email',
      label: 'Email',
      required: true,
      defaultValue: account?.email,
      props: { type: 'email', placeholder: 'you@example.com' }
    },
    { type: 'section', label: 'Incoming server (IMAP)' },
    {
      type: 'row',
      key: 'incoming-server',
      sx: serverRow,
      fields: [
        {
          name: 'incomingServer',
          label: 'Server',
          required: true,
          defaultValue: account?.incomingServer,
          props: { placeholder: 'imap.example.com' }
        },
        {
          name: 'incomingPort',
          label: 'Port',
          required: true,
          defaultValue: account?.incomingPort || 993,
          props: { type: 'number', slotProps: { input: { min: 1, max: 65535 } } }
        }
      ]
    },
    {
      name: 'incomingUsername',
      label: 'Username',
      required: true,
      defaultValue: account?.incomingUsername,
      props: { placeholder: 'you@example.com' }
    },
    {
      name: 'incomingPassword',
      label: 'Password',
      required: !account,
      props: { type: 'password', placeholder: account ? '************' : '' }
    },
    {
      type: 'checkbox',
      name: 'incomingTls',
      label: 'Use TLS',
      defaultValue: account ? account.incomingTls : true
    },
    { type: 'section', label: 'Outgoing server (SMTP)' },
    {
      type: 'row',
      key: 'outgoing-server',
      sx: serverRow,
      fields: [
        {
          name: 'outgoingServer',
          label: 'Server',
          required: true,
          defaultValue: account?.outgoingServer,
          props: { placeholder: 'smtp.example.com' }
        },
        {
          name: 'outgoingPort',
          label: 'Port',
          required: true,
          defaultValue: account?.outgoingPort || 465,
          props: { type: 'number', slotProps: { input: { min: 1, max: 65535 } } }
        }
      ]
    },
    {
      name: 'outgoingUsername',
      label: 'Username',
      required: true,
      defaultValue: account?.outgoingUsername,
      props: { placeholder: 'you@example.com' }
    },
    {
      name: 'outgoingPassword',
      label: 'Password',
      required: !account,
      props: { type: 'password', placeholder: account ? '************' : '' }
    },
    {
      type: 'checkbox',
      name: 'outgoingTls',
      label: 'Use TLS',
      defaultValue: account ? account.outgoingTls : true
    }
  ]
}

function AccountModal({ open, account, onClose, onSaved, onDeleted }) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function close() {
    if (saving) return
    setError('')
    onClose()
  }

  async function save(event) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setSaving(true)
    setError('')

    try {
      const values = {
        name: form.get('name'),
        email: form.get('email'),
        incomingServer: form.get('incomingServer'),
        incomingPort: form.get('incomingPort'),
        incomingUsername: form.get('incomingUsername'),
        incomingPassword: form.get('incomingPassword'),
        incomingTls: form.has('incomingTls'),
        outgoingServer: form.get('outgoingServer'),
        outgoingPort: form.get('outgoingPort'),
        outgoingUsername: form.get('outgoingUsername'),
        outgoingPassword: form.get('outgoingPassword'),
        outgoingTls: form.has('outgoingTls')
      }
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

  return (
    <Modal
      open={open}
      onClose={close}
      title={account ? 'Account settings' : 'Add account'}
      description={
        account
          ? 'Modify the account and mail server info.'
          : 'Enter the account and mail server info.'
      }
      disabled={saving}
      component="form"
      onSubmit={save}
      dialogKey={account?.id || 'new-account'}
      sx={{ width: 440, maxHeight: 'calc(100vh - 32px)', overflowY: 'auto' }}
    >
      <Stack spacing={2}>
        {error && <Alert color="danger">{error}</Alert>}
        <UniversalForm
          fields={accountFields(account)}
          actions={() => (
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
          )}
        />
      </Stack>
    </Modal>
  )
}

export default AccountModal
