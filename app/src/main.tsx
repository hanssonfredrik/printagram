import './boot';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';
import { router } from './router';
import { initAnalytics } from './services/analytics';
import { trackVisits } from './services/visits';
import './styles/global.css';

trackVisits(router);
initAnalytics();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
