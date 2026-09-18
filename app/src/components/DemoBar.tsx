import { useLocation, useNavigate } from 'react-router';
import { useDemo } from '@/state/demo';
import { useDraft } from '@/state/draft';
import { API_MODE } from '@/services';
import { cx, uiStyles as s } from './ui';

export function DemoBar() {
  const d = useDemo();
  const nav = useNavigate();
  const { pathname } = useLocation();
  const setEmail = useDraft((x) => x.setEmail);
  const email = useDraft((x) => x.email);
  if (!d.visible) return null;
  const lifted = pathname === '/select' || pathname === '/preview';

  return (
    <div className={s.demo} style={{ bottom: lifted ? 96 : 12 }} aria-label="Demo controls">
      <span className={s.demo__label}>Demo · {API_MODE}</span>
      <button
        type="button"
        className={s.demo__btn}
        onClick={() => {
          if (!email) setEmail('mara@example.com');
          nav('/email-preview');
        }}
      >
        Reminder email
      </button>
      <button
        type="button"
        className={cx(s.demo__btn, d.comingSoon && s['demo__btn--on'])}
        onClick={() => d.toggle('comingSoon')}
      >
        Connect: {d.comingSoon ? 'coming soon' : 'live'}
      </button>
      <button
        type="button"
        className={cx(s.demo__btn, d.personal && s['demo__btn--on'])}
        onClick={() => {
          d.toggle('personal');
          nav('/connect');
        }}
      >
        Personal account
      </button>
      <button
        type="button"
        className={cx(s.demo__btn, d.empty && s['demo__btn--on'])}
        onClick={() => {
          d.toggle('empty');
          nav('/select');
        }}
      >
        No photos
      </button>
      <button
        type="button"
        className={cx(s.demo__btn, d.payFail && s['demo__btn--on'])}
        onClick={() => {
          d.toggle('payFail');
          nav('/checkout');
        }}
      >
        Payment fails
      </button>
      <button
        type="button"
        className={cx(s.demo__btn, s['demo__btn--ghost'])}
        onClick={() => {
          d.reset();
          nav('/');
        }}
      >
        Reset
      </button>
      <button
        type="button"
        className={cx(s.demo__btn, s['demo__btn--ghost'])}
        onClick={d.hide}
        aria-label="Hide demo bar"
      >
        ×
      </button>
    </div>
  );
}
