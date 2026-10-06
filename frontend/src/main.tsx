import '@fontsource-variable/geist'
import '@fontsource-variable/geist-mono'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { setFetcher, USE_MOCKS } from './api/client'
import App from './App'
import './index.css'

async function bootstrap() {
  if (USE_MOCKS) {
    const { mockFetch } = await import('./api/mock')
    setFetcher(mockFetch)
    console.info('[portfolio] Using in-browser mock API (VITE_USE_MOCKS=true). Content is sample data.')
  }
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </StrictMode>,
  )
}

void bootstrap()
