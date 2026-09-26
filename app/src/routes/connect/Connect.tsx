import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import type { ConnectError } from '@printagram/shared';
import {
  Banner,
  Bullet,
  Button,
  Card,
  Pill,
  ProgressBar,
  ScreenHeader,
  Segmented,
  Spinner,
  StepCard,
  WizardBar,
} from '@/components/ui';
import { FlowProgress } from '@/components/Progress';
import { api } from '@/services';
import { useDraft } from '@/state/draft';
import { useSession } from '@/state/session';
import { useLibrary } from '@/state/library';
import { artGradient } from '@/components/art';
import { GuideScreen } from '@/components/guideArt';
import { PROFESSIONAL_DASHBOARD, SWITCH_SCREENS } from '@/components/guideScreens';

type Conn = 'idle' | 'waiting' | 'error' | 'importing' | 'done';

const SWITCH_STEPS: [string, string][] = [
  [
    'Open Settings and activity',
    'In the Instagram app, go to your profile, tap the menu (☰) top right, then Settings and activity.',
  ],
  ['Account type and tools', 'Scroll down to For professionals and tap Account type and tools.'],
  [
    'Switch to professional account',
    'Tap Switch to professional account and continue through the intro screens.',
  ],
  [
    'Pick a category',
    'Choose whatever fits — Photographer, Blogger, Personal blog. You can hide it from your profile.',
  ],
  [
    'Choose Creator',
    "Creator is the simplest fit for a personal profile; Business works too. Skip the contact details and the Facebook link if you're asked.",
  ],
];

const CONN_ERRORS: Record<ConnectError, { title: string; text: string }> = {
  personal: {
    title: "Instagram didn't let us connect",
    text: 'Instagram only connects Creator and Business accounts, and it shows a vague error when an account is personal. If you switched just now, give Instagram a few minutes and try again.',
  },
  denied: {
    title: 'No access was granted',
    text: "The Instagram window was closed or you tapped Cancel, so nothing was shared with Printagram. Try again whenever you're ready, or use the export instead.",
  },
  expired: {
    title: 'The connection timed out',
    text: 'Instagram did not answer in time. Try again, or use the export instead.',
  },
  unknown: {
    title: 'Something went wrong on Instagram',
    text: 'Instagram returned an error we did not expect. Try again in a minute, or use the export instead.',
  },
};

export function Connect() {
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const acct = useDraft((d) => d.acct);
  const setAcct = useDraft((d) => d.setAcct);
  const adding = useDraft((d) => d.adding);
  const setSource = useDraft((d) => d.setSource);
  const startLibrary = useDraft((d) => d.startLibrary);
  const refreshLibraries = useSession((x) => x.refreshLibraries);
  const ensureSession = useSession((x) => x.ensureSession);
  const setPhotos = useLibrary((l) => l.setPhotos);

  const [conn, setConn] = useState<Conn>('idle');
  const [err, setErr] = useState<ConnectError | null>(null);
  const [pct, setPct] = useState(0);
  const [username, setUsername] = useState<string | null>(null);
  const [libraryId, setLibraryId] = useState<string | null>(null);
  const [found, setFound] = useState<{
    photos: number;
    posts: number;
    carousels: number;
    videos: number;
    years: string;
    sample: string[];
  } | null>(null);
  const [disconnected, setDisconnected] = useState(false);
  const popup = useRef<Window | null>(null);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    setSource('connect');
  }, [setSource]);

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  const runImport = useCallback(
    async (libId: string | null) => {
      setConn('importing');
      setPct(0);
      try {
        await ensureSession();
        const status = await api.instagramStatus();
        const targetLib = libId ?? status.libraryId ?? 'new';
        const { jobId, libraryId: realLib } = await api.startInstagramImport(targetLib);
        setLibraryId(realLib);
        setUsername(status.username ?? 'mara.linde');
        let more = true;
        while (more) {
          const p = await api.runInstagramImport(jobId);
          if (p.status === 'failed') throw new Error(p.error ?? 'Import failed');
          if (p.total) setPct(Math.round((p.processed / p.total) * 100));
          more = p.more;
        }
        setPct(100);
        const lib = await api.getLibrary(realLib);
        const photos = await api.listPhotos(realLib);
        setPhotos(realLib, lib, photos);
        startLibrary(realLib, photos);
        await refreshLibraries();
        const stills = photos.filter((p) => !p.isVideo);
        const posts = new Set(photos.map((p) => p.postId)).size;
        const carousels = new Set(photos.filter((p) => p.carouselCount > 1).map((p) => p.postId))
          .size;
        const videos = photos.filter((p) => p.isVideo).length;
        const years = [...new Set(photos.map((p) => p.year))].sort();
        setFound({
          photos: stills.length,
          posts,
          carousels,
          videos,
          years:
            years.length > 1 ? `${years[0]}–${years[years.length - 1]}` : String(years[0] ?? ''),
          sample: stills.slice(0, 16).map((p) => p.thumbUrl),
        });
        timers.current.push(window.setTimeout(() => setConn('done'), 500));
      } catch (e) {
        setErr('unknown');
        setConn('error');
        console.error(e);
      }
    },
    [ensureSession, refreshLibraries, setPhotos, startLibrary],
  );

  // Return from the real OAuth redirect: /connect?connected=1&library=… or ?error=…
  useEffect(() => {
    const connected = params.get('connected');
    const error = params.get('error') as ConnectError | null;
    if (!connected && !error) return;
    const lib = params.get('library');
    // Defer so the OAuth return is handled as an event rather than a render-phase state update.
    const t = window.setTimeout(() => {
      setParams({}, { replace: true });
      if (connected) void runImport(lib);
      else {
        setErr(error && CONN_ERRORS[error] ? error : 'unknown');
        setConn('error');
      }
    }, 0);
    return () => window.clearTimeout(t);
  }, [params, setParams, runImport]);

  const startConnect = async () => {
    setErr(null);
    setConn('waiting');
    try {
      await ensureSession();
      const url = await api.instagramStartUrl();
      // Real OAuth: full-page redirect (the cookie session survives the round trip).
      window.location.assign(url);
    } catch (e) {
      console.error(e);
      setErr('unknown');
      setConn('error');
    }
  };

  const reopen = () => {
    if (popup.current && !popup.current.closed) popup.current.focus();
    else void startConnect();
  };

  const cerr = err ? CONN_ERRORS[err] : null;
  const foundGo = () => {
    if (adding) nav('/books');
    else nav('/select');
  };

  return (
    <div className="screen screen--bar">
      <ScreenHeader title="Connect your Instagram">
        <FlowProgress screen="connect" />
      </ScreenHeader>

      <div className="container container--narrow stack stack-20" style={{ paddingTop: 8 }}>
        {conn === 'idle' && (
          <>
            <p className="muted pretty">
              You'll log in on instagram.com and allow Printagram to read your posts. Instagram only
              lets Creator and Business accounts connect, so first a quick check.
            </p>
            <div className="stack stack-10">
              <div className="semibold">What kind of account do you have?</div>
              <Segmented
                value={acct}
                onChange={setAcct}
                options={[
                  { value: 'pro', label: 'Creator or Business' },
                  { value: 'personal', label: 'Personal' },
                  { value: 'unsure', label: 'Not sure' },
                ]}
              />
            </div>

            {acct === 'pro' && (
              <>
                <Card bordered pad="mid" gap={12}>
                  <div className="semibold">What Printagram will ask for</div>
                  <div className="stack stack-10">
                    <Bullet>Your username and profile picture</Bullet>
                    <Bullet>Your posts — photos, captions, dates and likes</Bullet>
                    <Bullet>
                      Read‑only. No posting, no messages, no followers. Disconnect anytime — access
                      also ends by itself after 60 days.
                    </Bullet>
                  </div>
                </Card>
                <div className="stack stack-10">
                  <Button block size="xl" onClick={startConnect}>
                    Continue with Instagram
                  </Button>
                  <div className="tiny muted center pretty">
                    Opens instagram.com in a new window. You log in there — we never see your
                    password.
                  </div>
                </div>
              </>
            )}

            {acct === 'personal' && (
              <>
                <Banner tone="warn" title="Switch to a Professional account first">
                  Free, about two minutes, reversible, and nobody is notified. One thing changes: a
                  private account becomes public, and pending follow requests are accepted. Prefer
                  to stay private? Use the export instead — it works for every account.
                </Banner>
                <div className="stack stack-12">
                  {SWITCH_STEPS.map(([title, text], i) => (
                    <StepCard
                      key={title}
                      n={i + 1}
                      title={title}
                      text={text}
                      shot={<GuideScreen spec={SWITCH_SCREENS[i]!} />}
                    />
                  ))}
                </div>
                <Banner tone="info" title="Good to know">
                  On a computer the same setting is at instagram.com → More → Settings → Account
                  type and tools. Just switched? Instagram can take a few minutes to register the
                  change. Switch back anytime under Account type and tools → Switch to personal
                  account.
                </Banner>
                <div className="stack stack-10">
                  <Button block size="xl" onClick={startConnect}>
                    I've switched — continue with Instagram
                  </Button>
                  <Button block variant="secondary" onClick={() => nav('/export')}>
                    Keep my account as it is — use the export
                  </Button>
                </div>
              </>
            )}

            {acct === 'unsure' && (
              <>
                <StepCard
                  title="A quick way to check"
                  text="Open your own profile in the Instagram app. If there's a Professional dashboard button under your bio, you have a Creator or Business account. If there isn't, it's personal."
                  shot={<GuideScreen spec={PROFESSIONAL_DASHBOARD} />}
                />
                <div
                  className="grid-auto"
                  style={{
                    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))',
                    gap: 10,
                  }}
                >
                  <Button size="lg" onClick={() => setAcct('pro')}>
                    I see the button — it's Professional
                  </Button>
                  <Button size="lg" variant="secondary" onClick={() => setAcct('personal')}>
                    No button — it's personal
                  </Button>
                </div>
              </>
            )}
          </>
        )}

        {conn === 'waiting' && (
          <>
            <Card bordered radius="2xl" pad="hero" center>
              <Spinner />
              <div className="semibold">Waiting for Instagram…</div>
              <div className="small muted pretty" style={{ maxWidth: '40ch' }}>
                A window opened at instagram.com. Log in there and tap Allow. This page updates by
                itself.
              </div>
              <button type="button" className="link-button" onClick={reopen}>
                Nothing opened? Open Instagram again
              </button>
            </Card>
          </>
        )}

        {conn === 'error' && cerr && (
          <Banner tone="error" title={cerr.title}>
            <div className="pretty">{cerr.text}</div>
            <div className="row row-wrap gap-8" style={{ marginTop: 6 }}>
              {err === 'personal' && (
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => {
                    setAcct('personal');
                    setConn('idle');
                    setErr(null);
                  }}
                >
                  Show me how to switch
                </Button>
              )}
              <Button size="sm" variant="danger-outline" onClick={startConnect}>
                Try again
              </Button>
              <Button size="sm" variant="danger-outline" onClick={() => nav('/export')}>
                Use the export instead
              </Button>
            </div>
          </Banner>
        )}

        {conn === 'importing' && (
          <Card bordered radius="2xl" style={{ padding: '28px 32px' }} gap={18}>
            <div className="row gap-14">
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  background: artGradient(3),
                  flex: 'none',
                }}
              />
              <div>
                <div className="semibold">@{username ?? '…'}</div>
                <div className="tiny muted">Creator account · connected just now</div>
              </div>
              <Pill className="ml-auto">Connected</Pill>
            </div>
            <div className="stack stack-10">
              <div className="row between" style={{ alignItems: 'baseline' }}>
                <div className="semibold">Copying your posts…</div>
                <div className="small muted">{pct}%</div>
              </div>
              <ProgressBar pct={pct} />
              <div className="small muted pretty">
                We copy your photos once, at full size. Instagram's links expire, so we keep the
                copies until your book is done — then they're deleted.
              </div>
            </div>
          </Card>
        )}

        {conn === 'done' && found && (
          <>
            <Card bordered radius="2xl" pad="hero" center gap={16}>
              <div className="check check--done">✓</div>
              <div>
                <div className="h3">
                  {adding
                    ? `Found ${found.photos} photos`
                    : `Found ${found.photos} photos from ${found.years}`}
                </div>
                <div className="small muted" style={{ marginTop: 4 }}>
                  {found.posts} posts · {found.carousels} carousels · {found.videos} videos skipped
                  by default · likes included
                </div>
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(8, 1fr)',
                  gap: 4,
                  width: '100%',
                  maxWidth: 400,
                }}
              >
                {found.sample.map((src, i) => (
                  <img
                    key={i}
                    src={src}
                    alt=""
                    style={{ aspectRatio: '1', borderRadius: 4, width: '100%', objectFit: 'cover' }}
                  />
                ))}
              </div>
              <Button size="xl" style={{ width: '100%', maxWidth: 320 }} onClick={foundGo}>
                {adding ? 'Back to My books' : 'Choose photos'}
              </Button>
            </Card>
            <Card bordered pad="mid" style={{ padding: '14px 18px' }}>
              <div className="row row-wrap gap-12 small">
                {!disconnected ? (
                  <>
                    <span className="muted pretty" style={{ flex: 1, minWidth: 200 }}>
                      Printagram can read your posts until you disconnect, or automatically after 60
                      days.
                    </span>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={async () => {
                        await api.disconnectInstagram();
                        setDisconnected(true);
                        await refreshLibraries();
                      }}
                    >
                      Disconnect now
                    </Button>
                  </>
                ) : (
                  <>
                    <span className="check">✓</span>
                    <span className="muted">
                      Disconnected. Your copied photos stay until your book is done, then they're
                      deleted.
                    </span>
                  </>
                )}
              </div>
            </Card>
          </>
        )}

        <div
          className="row gap-10 tiny muted"
          style={{ alignItems: 'flex-start', padding: '0 4px' }}
        >
          <span className="check">✓</span>
          <span>
            Your photos are stored only to build your books, kept for 3 months, and deletable by you
            at any time. Instagram never shares your password with us.
          </span>
        </div>
        {libraryId && conn === 'done' && <span className="sr-only">Library {libraryId} ready</span>}
      </div>
      <WizardBar onBack={() => nav('/start')} />
    </div>
  );
}
