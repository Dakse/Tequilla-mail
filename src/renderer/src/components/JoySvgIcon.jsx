import { SvgIcon } from '@mui/joy'
import { forwardRef } from 'react'

export function createSvgIcon(path, displayName) {
  const Icon = forwardRef(function Icon(props, ref) {
    return (
      <SvgIcon ref={ref} {...props}>
        {path}
      </SvgIcon>
    )
  })

  Icon.displayName = `${displayName}Icon`
  return Icon
}

export default SvgIcon
