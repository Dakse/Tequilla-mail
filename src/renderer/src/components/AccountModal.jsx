import { DeleteForeverRounded } from '@mui/icons-material'
import {
  Alert,
  Box,
  Button,
  Checkbox,
  FormControl,
  FormLabel,
  Input,
  Stack,
  Typography
} from '@mui/joy'
import { useState } from 'react'
import Modal from './Modal.jsx'

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

        <FormControl required>
          <FormLabel>Name</FormLabel>
          <Input
            name="name"
            placeholder="Personal account"
            defaultValue={account?.name}
            autoFocus
          />
        </FormControl>

        <FormControl required>
          <FormLabel>Email</FormLabel>
          <Input
            name="email"
            type="email"
            placeholder="you@example.com"
            defaultValue={account?.email}
          />
        </FormControl>

        <Typography level="title-sm">Incoming server (IMAP)</Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: 1.5 }}>
          <FormControl required>
            <FormLabel>Server</FormLabel>
            <Input
              name="incomingServer"
              placeholder="imap.example.com"
              defaultValue={account?.incomingServer}
            />
          </FormControl>
          <FormControl required>
            <FormLabel>Port</FormLabel>
            <Input
              name="incomingPort"
              type="number"
              defaultValue={account?.incomingPort || 993}
              slotProps={{ input: { min: 1, max: 65535 } }}
            />
          </FormControl>
        </Box>

        <FormControl required>
          <FormLabel>Username</FormLabel>
          <Input
            name="incomingUsername"
            placeholder="you@example.com"
            defaultValue={account?.incomingUsername}
          />
        </FormControl>
        <FormControl required={!account}>
          <FormLabel>Password</FormLabel>
          <Input
            name="incomingPassword"
            type="password"
            placeholder={account ? '************' : ''}
          />
        </FormControl>
        <Checkbox
          name="incomingTls"
          label="Use TLS"
          defaultChecked={account ? account.incomingTls : true}
        />

        <Typography level="title-sm">Outgoing server (SMTP)</Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: 1.5 }}>
          <FormControl required>
            <FormLabel>Server</FormLabel>
            <Input
              name="outgoingServer"
              placeholder="smtp.example.com"
              defaultValue={account?.outgoingServer}
            />
          </FormControl>
          <FormControl required>
            <FormLabel>Port</FormLabel>
            <Input
              name="outgoingPort"
              type="number"
              defaultValue={account?.outgoingPort || 465}
              slotProps={{ input: { min: 1, max: 65535 } }}
            />
          </FormControl>
        </Box>

        <FormControl required>
          <FormLabel>Username</FormLabel>
          <Input
            name="outgoingUsername"
            placeholder="you@example.com"
            defaultValue={account?.outgoingUsername}
          />
        </FormControl>
        <FormControl required={!account}>
          <FormLabel>Password</FormLabel>
          <Input
            name="outgoingPassword"
            type="password"
            placeholder={account ? '************' : ''}
          />
        </FormControl>
        <Checkbox
          name="outgoingTls"
          label="Use TLS"
          defaultChecked={account ? account.outgoingTls : true}
        />

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
      </Stack>
    </Modal>
  )
}

export default AccountModal
