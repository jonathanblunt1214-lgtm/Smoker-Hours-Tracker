import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import { installAuthenticatedAdminFetch } from './utils/installAuthenticatedAdminFetch.ts';
import './index.css';

// Transitional bridge for legacy admin fetch calls. Authorization is still
// enforced by verified Firebase claims on the server.
installAuthenticatedAdminFetch();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary fallbackTitle="SmokeStack Application Recovered">
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
