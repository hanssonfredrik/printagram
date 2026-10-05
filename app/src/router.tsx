import type { ReactElement } from 'react';
import { createBrowserRouter, type RouteObject } from 'react-router';
import { AppShell, PublicLayout, SessionGate } from './routes/AppShell';
import { Landing } from './routes/landing/Landing';
import { NotFound } from './routes/NotFound';
import { About } from './routes/about/About';
import { LegalPage } from './routes/legal/LegalPage';
import { GuidePage, GuidesIndex } from './routes/guides/Guides';
import { allPublicPaths, GUIDE_KEYS, type GuideKey, type PageKey } from './seo/routes';

const PUBLIC_PAGES: Record<PageKey, ReactElement> = {
  landing: <Landing />,
  about: <About />,
  privacy: <LegalPage doc="privacy" />,
  terms: <LegalPage doc="terms" />,
  guides: <GuidesIndex />,
  ...(Object.fromEntries(GUIDE_KEYS.map((k) => [k, <GuidePage key={k} guide={k} />])) as Record<
    GuideKey,
    ReactElement
  >),
};

/**
 * App screens load on demand, so the public pages (what visitors and crawlers see first) don't
 * download the editor, drag and drop and the PDF code.
 */
function screen<M extends Record<string, unknown>>(load: () => Promise<M>, name: keyof M & string) {
  return async () => ({ Component: (await load())[name] as React.ComponentType });
}

/** Every public page in both languages (src/seo/routes.ts); the URL decides the language. */
const publicRoutes: RouteObject[] = allPublicPaths().map(({ key, path }) =>
  path === '/' ? { index: true, element: PUBLIC_PAGES[key] } : { path, element: PUBLIC_PAGES[key] },
);

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      {
        element: <PublicLayout />,
        children: [...publicRoutes, { path: '*', element: <NotFound /> }],
      },
      {
        element: <SessionGate />,
        children: [
          {
            path: 'start',
            lazy: screen(() => import('./routes/choose/ChooseSource'), 'ChooseSource'),
          },
          { path: 'connect', lazy: screen(() => import('./routes/connect/Connect'), 'Connect') },
          {
            path: 'google',
            lazy: screen(() => import('./routes/google/GooglePhotos'), 'GooglePhotos'),
          },
          {
            path: 'export',
            lazy: screen(() => import('./routes/export/ExportGuide'), 'ExportGuide'),
          },
          {
            path: 'export/waiting',
            lazy: screen(() => import('./routes/export/Waiting'), 'Waiting'),
          },
          { path: 'export/upload', lazy: screen(() => import('./routes/export/Upload'), 'Upload') },
          { path: 'select', lazy: screen(() => import('./routes/select/Select'), 'Select') },
          { path: 'preview', lazy: screen(() => import('./routes/preview/Preview'), 'Preview') },
          {
            path: 'checkout',
            lazy: screen(() => import('./routes/checkout/Checkout'), 'Checkout'),
          },
          { path: 'done', lazy: screen(() => import('./routes/done/Done'), 'Done') },
          { path: 'done/:orderId', lazy: screen(() => import('./routes/done/Done'), 'Done') },
          { path: 'signin', lazy: screen(() => import('./routes/auth/SignIn'), 'SignIn') },
          {
            path: 'r/:token',
            lazy: screen(() => import('./routes/auth/ReturnLink'), 'ReturnLink'),
          },
          {
            path: 'reset/:token',
            lazy: screen(() => import('./routes/auth/ResetPassword'), 'ResetPassword'),
          },
          { path: 'books', lazy: screen(() => import('./routes/books/Books'), 'Books') },
          { path: 's/:token', lazy: screen(() => import('./routes/share/Share'), 'Share') },
        ],
      },
    ],
  },
]);
