import { useCallback, useEffect, useState } from 'react';
import { BrowserRouter, Navigate, NavLink, Route, Routes } from 'react-router';
import { api, setSignedOutHandler } from './api';
import { Audit } from './pages/Audit';
import { Dashboard } from './pages/Dashboard';
import { Login } from './pages/Login';
import { OrderDetail, Orders } from './pages/Orders';
import { Promos } from './pages/Promos';
import { Settings } from './pages/Settings';
import { UserDetail } from './pages/UserDetail';
import { Users } from './pages/Users';
import { Vat } from './pages/Vat';
import { Visitors } from './pages/Visitors';

type Me = { id: string; email: string };

const NAV: [string, string][] = [
  ['/', 'Dashboard'],
  ['/users', 'Users'],
  ['/orders', 'Orders'],
  ['/vat', 'VAT report'],
  ['/visitors', 'Visitors'],
  ['/promos', 'Promo codes'],
  ['/audit', 'Audit log'],
  ['/settings', 'Settings'],
];

export function App() {
  const [me, setMe] = useState<Me | null | undefined>(undefined);

  const check = useCallback(() => {
    api<Me>('auth/me')
      .then(setMe)
      .catch(() => setMe(null));
  }, []);

  useEffect(() => {
    setSignedOutHandler(() => setMe(null));
    check();
  }, [check]);

  async function logout() {
    await api('auth/logout', { method: 'POST', body: {} }).catch(() => undefined);
    setMe(null);
  }

  if (me === undefined) return null;
  if (me === null) return <Login onSignedIn={check} />;

  return (
    <BrowserRouter>
      <div className="shell">
        <nav className="nav" aria-label="Main">
          <div className="brand">
            Inbunden <span>Admin</span>
          </div>
          {NAV.map(([to, label]) => (
            <NavLink key={to} to={to} end={to === '/'}>
              {label}
            </NavLink>
          ))}
          <div className="spacer" />
          <div className="who">{me.email}</div>
          <button className="btn" onClick={() => void logout()}>
            Sign out
          </button>
        </nav>
        <main>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/users" element={<Users />} />
            <Route path="/users/:id" element={<UserDetail me={me.id} />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/orders/:userId/:orderId" element={<OrderDetail />} />
            <Route path="/vat" element={<Vat />} />
            <Route path="/visitors" element={<Visitors />} />
            <Route path="/promos" element={<Promos />} />
            <Route path="/audit" element={<Audit />} />
            <Route path="/settings" element={<Settings onSignedOut={() => setMe(null)} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
