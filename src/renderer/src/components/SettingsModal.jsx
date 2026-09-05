import {
  DarkModeRounded,
  DeleteForeverRounded,
  LightModeRounded,
  MonitorRounded,
  SystemUpdateAltRounded
} from '@mui/icons-material'
import { Alert, Button, Divider, Stack, Typography } from '@mui/joy'
import { useColorScheme } from '@mui/joy/styles'
import { useState } from 'react'
import Modal from './Modal.jsx'
import TooltipIconButton from './TooltipIconButton'
import UniversalForm from './UniversalForm'

function SettingsModal({
  open,
  accounts,
  dateFormat,
  dateSeparator,
  updateState,
  onDateFormatChange,
  onDateSeparatorChange,
  onClose
}) {
  const { mode, setMode } = useColorScheme()
  const [clearing, setClearing] = useState(false)
  const [installing, setInstalling] = useState(false)
  const [error, setError] = useState('')
  const fields = [
    {
      type: 'buttonGroup',
      name: 'displayMode',
      label: 'Display mode',
      value: mode || 'dark',
      onChange: setMode,
      options: [
        { value: 'light', label: 'Light mode', tooltip: 'Light mode', icon: LightModeRounded },
        { value: 'dark', label: 'Dark mode', tooltip: 'Dark mode', icon: DarkModeRounded },
        { value: 'system', label: 'System mode', tooltip: 'System mode', icon: MonitorRounded }
      ]
    },
    {
      type: 'radio',
      name: 'dateFormat',
      label: 'Date display format',
      value: dateFormat,
      onChange: onDateFormatChange,
      options: [
        { value: 'ymd', label: 'Year, Month, Day' },
        { value: 'dmy', label: 'Day, Month, Year' },
        { value: 'mdy', label: 'Month, Day, Year' }
      ]
    },
    {
      type: 'buttonGroup',
      name: 'dateSeparator',
      label: 'Date separator',
      value: dateSeparator,
      onChange: onDateSeparatorChange,
      options: [
        { value: '/', label: '/' },
        { value: '.', label: '.' },
        { value: '-', label: '-' }
      ]
    },
    {
      type: 'custom',
      key: 'version',
      sx: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
      render: () => (
        <>
          <Typography level="body-sm">Current app version</Typography>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography level="body-sm" fontWeight="lg">
              {updateState.currentVersion}
            </Typography>
            {updateState.availableVersion && (
              <TooltipIconButton
                aria-label={`Update to ${updateState.availableVersion}`}
                color="primary"
                variant="soft"
                loading={installing}
                onClick={installUpdate}
              >
                <SystemUpdateAltRounded />
              </TooltipIconButton>
            )}
          </Stack>
        </>
      )
    },
    {
      type: 'custom',
      key: 'divider',
      render: () => <Divider />
    }
  ]

  async function installUpdate() {
    setInstalling(true)
    setError('')
    try {
      if (!(await window.updater.install())) setInstalling(false)
    } catch (updateError) {
      setError(updateError.message)
      setInstalling(false)
    }
  }

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

        <UniversalForm
          fields={fields}
          actions={() => (
            <Button
              color="danger"
              variant="outlined"
              loading={clearing}
              startDecorator={<DeleteForeverRounded />}
              onClick={clearAllData}
            >
              Clear all data
            </Button>
          )}
        />
      </Stack>
    </Modal>
  )
}

export default SettingsModal
