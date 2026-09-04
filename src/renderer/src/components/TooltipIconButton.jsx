import { IconButton, Tooltip } from '@mui/joy'

function TooltipIconButton({ 'aria-label': label, ...props }) {
  return (
    <Tooltip title={label}>
      <IconButton aria-label={label} {...props} />
    </Tooltip>
  )
}

export default TooltipIconButton
