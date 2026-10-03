import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Self-hosted fonts: Latin subsets only for maximum performance & minimal font payload
// Note: Cinzel 600 and Inter 400 are declared in globals.css and preloaded in index.html
import '@fontsource/cinzel/latin-700.css';
import '@fontsource/cormorant-garamond/latin-400.css';
import '@fontsource/cormorant-garamond/latin-600.css';
import '@fontsource/cormorant-garamond/latin-700.css';
import '@fontsource/inter/latin-500.css';
import '@fontsource/inter/latin-600.css';
import '@fontsource/inter/latin-700.css';

import './styles/globals.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
