import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './styles/shared/keyframes.css'
import App from './App.tsx'
import { AutoLockProvider } from './functions/AutoLockProvider.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AutoLockProvider>
      <App />
    </AutoLockProvider>
  </StrictMode>,
)
