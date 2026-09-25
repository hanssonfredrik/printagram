import { createBrowserRouter } from 'react-router';
import { AppShell } from './routes/AppShell';
import { Landing } from './routes/landing/Landing';
import { ChooseSource } from './routes/choose/ChooseSource';
import { Connect } from './routes/connect/Connect';
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

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <Landing /> },
      { path: 'start', element: <ChooseSource /> },
      { path: 'connect', element: <Connect /> },
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
      { path: '*', element: <NotFound /> },
    ],
  },
]);
