import { canHydrate } from './boot';
import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';
import { router } from './router';
import { initAnalytics } from './services/analytics';
import { trackVisits } from './services/visits';
import './styles/fonts.css';
import './styles/global.css';

trackVisits(router);
initAnalytics();

const root = document.getElementById('root')!;
const app = (
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
);

// Public pages arrive prerendered (scripts/prerender.ts): hydrate them so the text on screen
// stays put. The app shell and the 404 page start empty or in the wrong language: render fresh.
if (canHydrate && root.firstElementChild) {
  hydrateRoot(root, app, {
    onRecoverableError: (error) => console.warn('[hydrate]', error),
  });
} else {
  root.replaceChildren();
  createRoot(root).render(app);
}
