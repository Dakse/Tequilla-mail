import { DialogContent, DialogTitle, Modal as JoyModal, ModalClose, ModalDialog } from '@mui/joy'

function Modal({
  open,
  onClose,
  title,
  description,
  disabled,
  component,
  onSubmit,
  dialogKey,
  children,
  sx
}) {
  return (
    <JoyModal open={open} onClose={onClose}>
      <ModalDialog
        key={dialogKey}
        component={component}
        onSubmit={onSubmit}
        sx={{ width: 420, maxWidth: 'calc(100vw - 32px)', ...sx }}
      >
        <ModalClose disabled={disabled} />
        <DialogTitle>{title}</DialogTitle>
        {description && <DialogContent>{description}</DialogContent>}
        {children}
      </ModalDialog>
    </JoyModal>
  )
}

export default Modal
