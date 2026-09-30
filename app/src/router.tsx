import type { ReactElement } from 'react';
import { createBrowserRouter, type RouteObject } from 'react-router';
import { AppShell, PublicLayout, SessionGate } from './routes/AppShell';
import { Landing } from './routes/landing/Landing';
import { ChooseSource } from './routes/choose/ChooseSource';
import { Connect } from './routes/connect/Connect';
import { GooglePhotos } from './routes/google/GooglePhotos';
import { ExportGuide } from './routes/export/ExportGuide';
import { Waiting } from './routes/export/Waiting';
import { Upload } from './routes/export/Upload';
import { Select } from './routes/select/Select';
import { Preview } from './routes/preview/Preview';
import { Checkout } from './routes/checkout/Checkout';
import { Done } from './routes/done/Done';
import { SignIn } from './routes/auth/SignIn';
import { ReturnLink } from './routes/auth/ReturnLink';
import { ResetPassword } from './routes/auth/ResetPassword';
import { Books } from './routes/books/Books';
import { Share } from './routes/share/Share';
import { NotFound } from './routes/NotFound';
import { About } from './routes/about/About';
import { LegalPage } from './routes/legal/LegalPage';
import { GuidePage, GuidesIndex } from './routes/guides/Guides';
import { allPublicPaths, type PageKey } from './seo/routes';

const PUBLIC_PAGES: Record<PageKey, ReactElement> = {
  landing: <Landing />,
  about: <About />,
  privacy: <LegalPage doc="privacy" />,
  terms: <LegalPage doc="terms" />,
  guides: <GuidesIndex />,
  guideInstagramBook: <GuidePage guide="guideInstagramBook" />,
  guideInstagramExport: <GuidePage guide="guideInstagramExport" />,
  guidePrint: <GuidePage guide="guidePrint" />,
};

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
          { path: 'start', element: <ChooseSource /> },
          { path: 'connect', element: <Connect /> },
          { path: 'google', element: <GooglePhotos /> },
          { path: 'export', element: <ExportGuide /> },
          { path: 'export/waiting', element: <Waiting /> },
          { path: 'export/upload', element: <Upload /> },
          { path: 'select', element: <Select /> },
          { path: 'preview', element: <Preview /> },
          { path: 'checkout', element: <Checkout /> },
          { path: 'done', element: <Done /> },
          { path: 'done/:orderId', element: <Done /> },
          { path: 'signin', element: <SignIn /> },
          { path: 'r/:token', element: <ReturnLink /> },
          { path: 'reset/:token', element: <ResetPassword /> },
          { path: 'books', element: <Books /> },
          { path: 's/:token', element: <Share /> },
        ],
      },
    ],
  },
]);
