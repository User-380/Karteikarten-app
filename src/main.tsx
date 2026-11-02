import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import 'katex/dist/katex.min.css';
import './styles.css';
import App from './App';
import { applyTheme, loadTheme } from './lib/theme';

applyTheme(loadTheme());

// Browser bitten, unsere Daten nicht automatisch zu löschen,
// wenn der Speicher knapp wird.
if (navigator.storage?.persist) {
  navigator.storage.persist().catch(() => {});
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
