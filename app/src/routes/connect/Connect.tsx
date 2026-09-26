import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { professionalDashboard, switchScreens } from '@/components/guideScreens';
import { getT, useLang, useT } from '@/i18n';

type Conn = 'idle' | 'waiting' | 'error' | 'importing' | 'done';

/** Connect errors the OAuth return can report (the texts live in the dictionary). */
function isConnectError(e: string | null): e is ConnectError {
  return !!e && Object.hasOwn(getT().connect.errors, e);
}

export function Connect() {
  const nav = useNavigate();
  const t = useT();
  const tc = t.connect;
  const lang = useLang((x) => x.lang);
  const switchShots = useMemo(() => switchScreens(lang), [lang]);
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
    const error = params.get('error');
    if (!connected && !error) return;
    const lib = params.get('library');
    // Defer so the OAuth return is handled as an event rather than a render-phase state update.
    const t = window.setTimeout(() => {
      setParams({}, { replace: true });
      if (connected) void runImport(lib);
      else {
        setErr(isConnectError(error) ? error : 'unknown');
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

  const connErrors: Record<ConnectError, { title: string; text: string }> = tc.errors;
  const cerr = err ? connErrors[err] : null;
  const foundGo = () => {
    if (adding) nav('/books');
    else nav('/select');
  };

  return (
    <div className="screen screen--bar">
      <ScreenHeader title={tc.title}>
        <FlowProgress screen="connect" />
      </ScreenHeader>

      <div className="container container--narrow stack stack-20" style={{ paddingTop: 8 }}>
        {conn === 'idle' && (
          <>
            <p className="muted pretty">{tc.intro}</p>
            <div className="stack stack-10">
              <div className="semibold">{tc.acctQuestion}</div>
              <Segmented
                value={acct}
                onChange={setAcct}
                options={[
                  { value: 'pro', label: tc.acct.pro },
                  { value: 'personal', label: tc.acct.personal },
                  { value: 'unsure', label: tc.acct.unsure },
                ]}
              />
            </div>

            {acct === 'pro' && (
              <>
                <Card bordered pad="mid" gap={12}>
                  <div className="semibold">{tc.askFor.title}</div>
                  <div className="stack stack-10">
                    <Bullet>{tc.askFor.profile}</Bullet>
                    <Bullet>{tc.askFor.posts}</Bullet>
                    <Bullet>{tc.askFor.readOnly}</Bullet>
                  </div>
                </Card>
                <div className="stack stack-10">
                  <Button block size="xl" onClick={startConnect}>
                    {tc.continue}
                  </Button>
                  <div className="tiny muted center pretty">{tc.opensWindow}</div>
                </div>
              </>
            )}

            {acct === 'personal' && (
              <>
                <Banner tone="warn" title={tc.switchFirst.title}>
                  {tc.switchFirst.text}
                </Banner>
                <div className="stack stack-12">
                  {tc.switchSteps.map(({ title, text }, i) => (
                    <StepCard
                      key={title}
                      n={i + 1}
                      title={title}
                      text={text}
                      shot={<GuideScreen spec={switchShots[i]!} />}
                    />
                  ))}
                </div>
                <Banner tone="info" title={tc.goodToKnow.title}>
                  {tc.goodToKnow.text}
                </Banner>
                <div className="stack stack-10">
                  <Button block size="xl" onClick={startConnect}>
                    {tc.switched}
                  </Button>
                  <Button block variant="secondary" onClick={() => nav('/export')}>
                    {tc.keepAccount}
                  </Button>
                </div>
              </>
            )}

            {acct === 'unsure' && (
              <>
                <StepCard
                  title={tc.quickCheck.title}
                  text={tc.quickCheck.text}
                  shot={<GuideScreen spec={professionalDashboard(lang)} />}
                />
                <div
                  className="grid-auto"
                  style={{
                    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))',
                    gap: 10,
                  }}
                >
                  <Button size="lg" onClick={() => setAcct('pro')}>
                    {tc.seeButton}
                  </Button>
                  <Button size="lg" variant="secondary" onClick={() => setAcct('personal')}>
                    {tc.noButton}
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
              <div className="semibold">{tc.waiting.title}</div>
              <div className="small muted pretty" style={{ maxWidth: '40ch' }}>
                {tc.waiting.text}
              </div>
              <button type="button" className="link-button" onClick={reopen}>
                {tc.waiting.reopen}
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
                  {tc.showSwitch}
                </Button>
              )}
              <Button size="sm" variant="danger-outline" onClick={startConnect}>
                {tc.tryAgain}
              </Button>
              <Button size="sm" variant="danger-outline" onClick={() => nav('/export')}>
                {tc.useExport}
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
                <div className="tiny muted">{tc.importing.account}</div>
              </div>
              <Pill className="ml-auto">{tc.importing.connected}</Pill>
            </div>
            <div className="stack stack-10">
              <div className="row between" style={{ alignItems: 'baseline' }}>
                <div className="semibold">{tc.importing.copying}</div>
                <div className="small muted">{pct}%</div>
              </div>
              <ProgressBar pct={pct} />
              <div className="small muted pretty">{tc.importing.note}</div>
            </div>
          </Card>
        )}

        {conn === 'done' && found && (
          <>
            <Card bordered radius="2xl" pad="hero" center gap={16}>
              <div className="check check--done">✓</div>
              <div>
                <div className="h3">
                  {adding ? tc.found(found.photos) : tc.foundFrom(found.photos, found.years)}
                </div>
                <div className="small muted" style={{ marginTop: 4 }}>
                  {tc.foundStats(found.posts, found.carousels, found.videos)}
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
                {adding ? tc.backToBooks : tc.choosePhotos}
              </Button>
            </Card>
            <Card bordered pad="mid" style={{ padding: '14px 18px' }}>
              <div className="row row-wrap gap-12 small">
                {!disconnected ? (
                  <>
                    <span className="muted pretty" style={{ flex: 1, minWidth: 200 }}>
                      {tc.readUntil}
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
                      {tc.disconnectNow}
                    </Button>
                  </>
                ) : (
                  <>
                    <span className="check">✓</span>
                    <span className="muted">{tc.disconnected}</span>
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
          <span>{tc.storage}</span>
        </div>
        {libraryId && conn === 'done' && (
          <span className="sr-only">{tc.libraryReady(libraryId)}</span>
        )}
      </div>
      <WizardBar onBack={() => nav('/start')} />
    </div>
  );
}
