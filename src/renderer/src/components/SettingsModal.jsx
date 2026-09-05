import { DeleteForeverRounded } from '@mui/icons-material'
import {
  Alert,
  Box,
  Button,
  Divider,
  FormControl,
  FormLabel,
  Option,
  Select,
  Stack,
  Typography
} from '@mui/joy'
import { useColorScheme } from '@mui/joy/styles'
import { useState } from 'react'
import Modal from './Modal.jsx'

function SettingsModal({ open, accounts, dateFormat, onDateFormatChange, onClose }) {
  const { mode, setMode } = useColorScheme()
  const [clearing, setClearing] = useState(false)
  const [error, setError] = useState('')

  async function clearAllData() {
    if (!window.confirm('Clear all accounts, downloaded mail, attachments, and preferences?'))
      return

    setClearing(true)
    setError('')
    try {
      await Promise.all(accounts.map((account) => window.mail.deleteAccount(account.id)))
      localStorage.clear()
      window.location.reload()
    } catch (clearError) {
      setError(clearError.message)
      setClearing(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => !clearing && onClose()}
      title="Settings"
      description="Customize this app."
      disabled={clearing}
    >
      <Stack spacing={2}>
        {error && <Alert color="danger">{error}</Alert>}

        <FormControl>
          <FormLabel>Display mode</FormLabel>
          <Select value={mode || 'dark'} onChange={(_event, value) => value && setMode(value)}>
            <Option value="light">Light</Option>
            <Option value="dark">Dark</Option>
            <Option value="system">System</Option>
          </Select>
        </FormControl>

        <FormControl>
          <FormLabel>Date display format</FormLabel>
          <Select
            value={dateFormat}
            onChange={(_event, value) => value && onDateFormatChange(value)}
          >
            <Option value="american">American (MM/DD/YYYY)</Option>
            <Option value="european">European (DD/MM/YYYY)</Option>
          </Select>
        </FormControl>

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography level="body-sm">Current app version</Typography>
          <Typography level="body-sm" fontWeight="lg">
            0.0.1
          </Typography>
        </Box>

        <Divider />
        <Button
          color="danger"
          variant="outlined"
          loading={clearing}
          startDecorator={<DeleteForeverRounded />}
          onClick={clearAllData}
        >
          Clear all data
        </Button>
      </Stack>
    </Modal>
  )
}

export default SettingsModal
