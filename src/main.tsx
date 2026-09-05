import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App'
import { requestPersistentStorage } from './lib/authStorage'

requestPersistentStorage()

const authCallback = /[?&](code|token)=/.test(window.location.search)
if (!authCallback) registerSW({ immediate: true })
else {
  // Finish the magic-link exchange before the service worker can reload the page.
  window.addEventListener(
    'load',
    () => {
      window.setTimeout(() => registerSW({ immediate: true }), 2500)
    },
    { once: true },
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
