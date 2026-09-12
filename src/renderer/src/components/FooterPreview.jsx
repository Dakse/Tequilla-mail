import { Accordion, AccordionDetails, AccordionGroup, AccordionSummary, Typography } from '@mui/joy'
import { htmlDocument } from './EmailDisplay'

function FooterPreview({ html }) {
  return (
    <AccordionGroup>
      <Accordion>
        <AccordionSummary slotProps={{ button: { type: 'button' } }}>
          Preview
        </AccordionSummary>
        <AccordionDetails sx={{ p: 0, overflow: 'hidden' }}>
          {html ? (
            <iframe
              title="Rendered footer preview"
              sandbox=""
              srcDoc={htmlDocument(html)}
              style={{
                display: 'block',
                width: '100%',
                height: 180,
                border: 0,
                background: '#fff',
                colorScheme: 'light'
              }}
            />
          ) : (
            <Typography level="body-sm" sx={{ p: 2, color: 'text.tertiary' }}>
              No footer configured.
            </Typography>
          )}
        </AccordionDetails>
      </Accordion>
    </AccordionGroup>
  )
}

export default FooterPreview
