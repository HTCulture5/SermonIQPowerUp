import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Synchronize visual viewport height with CSS variable for software keyboard layout shift prevention
function syncVisualViewportHeight() {
  if (typeof window === 'undefined') return;
  const height = window.visualViewport ? window.visualViewport.height : window.innerHeight;
  document.documentElement.style.setProperty('--app-dvh', `${height}px`);
}

if (typeof window !== 'undefined') {
  syncVisualViewportHeight();
  window.addEventListener('resize', syncVisualViewportHeight, { passive: true });
  window.addEventListener('orientationchange', syncVisualViewportHeight, { passive: true });
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', syncVisualViewportHeight, { passive: true });
    window.visualViewport.addEventListener('scroll', syncVisualViewportHeight, { passive: true });
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

