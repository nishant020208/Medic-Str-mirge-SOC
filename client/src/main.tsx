import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Self-hosted fonts to strictly maintain CSP with zero external CDN dependencies
import '@fontsource/cinzel/400.css';
import '@fontsource/cinzel/700.css';
import '@fontsource/cormorant-garamond/400.css';
import '@fontsource/cormorant-garamond/600.css';
import '@fontsource/cormorant-garamond/700.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';

import './styles/globals.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
