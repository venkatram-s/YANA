import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

const rootEl = document.getElementById('root');
if (rootEl) {
  createRoot(rootEl).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
} else {
  // If we reach this, the DOM isn't ready. This helps avoid "black screen" crashes.
  window.addEventListener('DOMContentLoaded', () => {
    const el = document.getElementById('root');
    if (el) {
      createRoot(el).render(
        <StrictMode>
          <App />
        </StrictMode>
      );
    }
  });
}
