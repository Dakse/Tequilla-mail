import { CssBaseline } from '@mui/joy'
import { CssVarsProvider } from '@mui/joy/styles'
import Layout from './components/Layout'

function App() {
  const ipcHandle = () => window.electron.ipcRenderer.send('ping')

  return (
    <CssVarsProvider defaultMode="dark">
      <CssBaseline />
      <Layout>
        {/* <div className="action">
          <a target="_blank" rel="noreferrer" onClick={ipcHandle}>
            Send IPC
          </a>
        </div> */}
        Rendered email here
      </Layout>
    </CssVarsProvider>
  )
}

export default App
