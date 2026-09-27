import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import type { GoogleError } from '@printagram/shared';
import {
  Banner,
  Button,
  Card,
  Pill,
  ProgressBar,
  ScreenHeader,
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
import { transferScreens } from '@/components/guideScreens';
import { getT, useLang, useT } from '@/i18n';

type Phase = 'guide' | 'waiting' | 'connected' | 'picking' | 'importing' | 'done' | 'error';
/** Sub-steps of the guide: the question, the Instagram how-to, and the sign-in. */
type GuideStep = 'ask' | 'howto' | 'ready';

function isGoogleError(e: string | null): e is GoogleError {
  return !!e && Object.hasOwn(getT().google.errors, e);
}

/**
 * Google Photos as a source: Instagram's own transfer tool puts the posts in Google Photos,
 * the user signs in with Google, picks the photos in Google's Picker, and the API copies them.
 */
export function GooglePhotos() {
  const nav = useNavigate();
  const t = useT();
  const tg = t.google;
  const [params, setParams] = useSearchParams();
  const adding = useDraft((d) => d.adding);
  const setSource = useDraft((d) => d.setSource);
  const startLibrary = useDraft((d) => d.startLibrary);
  const email = useDraft((d) => d.email);
  const user = useSession((x) => x.user);
  const refreshLibraries = useSession((x) => x.refreshLibraries);
  const ensureSession = useSession((x) => x.ensureSession);
  const setPhotos = useLibrary((l) => l.setPhotos);

  const [phase, setPhase] = useState<Phase>('guide');
  const [step, setStep] = useState<GuideStep>('ask');
  const lang = useLang((x) => x.lang);
  const transferShots = useMemo(() => transferScreens(lang), [lang]);
  const [err, setErr] = useState<GoogleError | null>(null);
  const [pct, setPct] = useState(0);
  const [libraryId, setLibraryId] = useState<string | null>(null);
  const [pickerUri, setPickerUri] = useState<string | null>(null);
  const [found, setFound] = useState<{
    photos: number;
    videos: number;
    years: string;
    sample: string[];
  } | null>(null);
  const [disconnected, setDisconnected] = useState(false);
  const [sent, setSent] = useState(false);
  const [askEmail, setAskEmail] = useState(false);
  const [emailInput, setEmailInput] = useState(email);
  const popup = useRef<Window | null>(null);
  const timers = useRef<number[]>([]);
  const cancelled = useRef(false);

  useEffect(() => {
    setSource('google');
  }, [setSource]);

  useEffect(
    () => () => {
      cancelled.current = true;
      timers.current.forEach((x) => window.clearTimeout(x));
    },
    [],
  );

  const fail = (e: GoogleError) => {
    setErr(e);
    setPhase('error');
  };

  const runImport = useCallback(
    async (libId: string) => {
      setPhase('importing');
      setPct(0);
      try {
        const { jobId, libraryId: realLib } = await api.startImport(libId);
        setLibraryId(realLib);
        let more = true;
        while (more && !cancelled.current) {
          const p = await api.runImport(jobId);
          if (p.status === 'failed') {
            if (p.error === 'GOOGLE_TOKEN_EXPIRED') return fail('expired');
            throw new Error(p.error ?? 'Import failed');
          }
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
        const years = [...new Set(photos.map((p) => p.year))].sort();
        setFound({
          photos: stills.length,
          videos: photos.length - stills.length,
          years:
            years.length > 1 ? `${years[0]}–${years[years.length - 1]}` : String(years[0] ?? ''),
          sample: stills.slice(0, 16).map((p) => p.thumbUrl),
        });
        timers.current.push(window.setTimeout(() => setPhase('done'), 500));
      } catch (e) {
        console.error(e);
        fail('unknown');
      }
    },
    [refreshLibraries, setPhotos, startLibrary],
  );

  // Poll the Picker session until the user has tapped Done in Google Photos, then copy.
  const waitForPick = useCallback(
    async (libId: string, intervalMs: number) => {
      setPhase('picking');
      let interval = intervalMs;
      try {
        for (;;) {
          if (cancelled.current) return;
          await new Promise((r) => timers.current.push(window.setTimeout(r, interval)));
          const s = await api.getGoogleSession();
          interval = s.pollIntervalMs;
          if (s.mediaItemsSet) break;
        }
        await runImport(libId);
      } catch (e) {
        console.error(e);
        fail('expired');
      }
    },
    [runImport],
  );

  const openPicker = async () => {
    try {
      await ensureSession();
      const s = await api.createGoogleSession();
      setLibraryId(s.libraryId);
      setPickerUri(s.pickerUri);
      try {
        // Google recommends `/autoclose` so the tab closes once the user taps Done.
        popup.current = window.open(`${s.pickerUri}/autoclose`, '_blank', 'noopener');
      } catch {
        popup.current = null;
      }
      void waitForPick(s.libraryId, s.pollIntervalMs);
    } catch (e) {
      console.error(e);
      fail('expired');
    }
  };

  // Return from Google: /google?connected=1&library=… or ?error=…
  useEffect(() => {
    const connected = params.get('connected');
    const error = params.get('error');
    if (!connected && !error) return;
    const lib = params.get('library');
    const x = window.setTimeout(() => {
      setParams({}, { replace: true });
      if (connected) {
        setLibraryId(lib);
        setPhase('connected');
      } else fail(isGoogleError(error) ? error : 'unknown');
    }, 0);
    return () => window.clearTimeout(x);
  }, [params, setParams]);

  // Coming back to this screen while the Google token is still good: skip the sign-in.
  useEffect(() => {
    if (params.get('connected') || params.get('error')) return;
    let alive = true;
    void api
      .googleStatus()
      .then((s) => {
        if (alive && s.connected && s.libraryId) {
          setLibraryId(s.libraryId);
          setPhase((p) => (p === 'guide' ? 'connected' : p));
        }
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startSignIn = async () => {
    setErr(null);
    setPhase('waiting');
    try {
      await ensureSession();
      const url = await api.googleStartUrl();
      window.location.assign(url);
    } catch (e) {
      console.error(e);
      fail('unknown');
    }
  };

  const emailSteps = async () => {
    const target = user?.email ?? emailInput ?? email;
    if (!target || !target.includes('@')) {
      setAskEmail(true);
      return;
    }
    await api.sendExportSteps(target, 'google');
    setAskEmail(false);
    setSent(true);
    timers.current.push(window.setTimeout(() => setSent(false), 2500));
  };

  const reopenPicker = () => {
    if (popup.current && !popup.current.closed) popup.current.focus();
    else if (pickerUri) window.open(`${pickerUri}/autoclose`, '_blank', 'noopener');
  };

  const cerr = err ? tg.errors[err] : null;
  const foundGo = () => nav(adding ? '/books' : '/select');

  return (
    <div className="screen screen--bar">
      <ScreenHeader title={tg.title}>
        <FlowProgress screen="google" />
      </ScreenHeader>

      <div className="container container--narrow stack stack-20" style={{ paddingTop: 8 }}>
        {phase === 'guide' && step === 'ask' && (
          <>
            <p className="muted pretty">{tg.intro}</p>
            <Card bordered radius="2xl" pad="mid" gap={14}>
              <div className="h3" style={{ fontSize: 20 }}>
                {tg.ask.question}
              </div>
              <div className="small muted pretty">{tg.ask.hint}</div>
              <div
                className="grid-auto"
                style={{
                  gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))',
                  gap: 10,
                }}
              >
                <Button size="lg" onClick={() => setStep('ready')}>
                  {tg.ask.yes}
                </Button>
                <Button size="lg" variant="secondary" onClick={() => setStep('howto')}>
                  {tg.ask.no}
                </Button>
              </div>
            </Card>
          </>
        )}

        {phase === 'guide' && step === 'howto' && (
          <>
            <div className="semibold">{tg.howTo}</div>
            <div className="stack stack-12">
              {tg.steps.map(({ title, text }, i) => (
                <StepCard
                  key={title}
                  n={i + 1}
                  title={title}
                  text={text}
                  shot={<GuideScreen spec={transferShots[i]!} />}
                />
              ))}
            </div>
            <Banner tone="info" title={tg.goodToKnow.title}>
              {tg.goodToKnow.text}
            </Banner>
            <div className="stack stack-10">
              <Button block size="xl" onClick={() => setStep('ready')}>
                {tg.started}
              </Button>
              {askEmail && (
                <input
                  type="email"
                  placeholder={tg.emailPlaceholder}
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  style={{
                    border: '1px solid var(--border)',
                    borderRadius: 12,
                    padding: '12px 14px',
                    fontSize: 16,
                    background: '#fff',
                  }}
                />
              )}
              <Button block variant="secondary" size="lg" onClick={emailSteps}>
                {sent ? tg.sent : askEmail ? tg.sendToAddress : tg.emailSteps}
              </Button>
            </div>
          </>
        )}

        {phase === 'guide' && step === 'ready' && (
          <>
            <Card bordered radius="2xl" pad="hero" center gap={16}>
              <div>
                <div className="h3">{tg.ready.title}</div>
                <div className="small muted pretty" style={{ marginTop: 6, maxWidth: '44ch' }}>
                  {tg.ready.text}
                </div>
              </div>
              <Button size="xl" style={{ width: '100%', maxWidth: 360 }} onClick={startSignIn}>
                {tg.signIn}
              </Button>
              <div className="tiny muted pretty">{tg.opensWindow}</div>
            </Card>
            <button type="button" className="link-button" onClick={() => setStep('howto')}>
              {tg.ready.back}
            </button>
          </>
        )}

        {phase === 'waiting' && (
          <Card bordered radius="2xl" pad="hero" center>
            <Spinner />
            <div className="semibold">{tg.opensWindow}</div>
          </Card>
        )}

        {phase === 'connected' && (
          <Card bordered radius="2xl" pad="hero" center gap={16}>
            <div className="check check--done">✓</div>
            <div>
              <div className="h3">{tg.signedIn.title}</div>
              <div className="small muted pretty" style={{ marginTop: 6, maxWidth: '44ch' }}>
                {tg.signedIn.text}
              </div>
            </div>
            <Button size="xl" style={{ width: '100%', maxWidth: 360 }} onClick={openPicker}>
              {tg.signedIn.pick}
            </Button>
            <div className="tiny muted pretty">{tg.signedIn.note}</div>
          </Card>
        )}

        {phase === 'picking' && (
          <Card bordered radius="2xl" pad="hero" center>
            <Spinner />
            <div className="semibold">{tg.picking.title}</div>
            <div className="small muted pretty" style={{ maxWidth: '40ch' }}>
              {tg.picking.text}
            </div>
            <button type="button" className="link-button" onClick={reopenPicker}>
              {tg.picking.reopen}
            </button>
          </Card>
        )}

        {phase === 'error' && cerr && (
          <Banner tone="error" title={cerr.title}>
            <div className="pretty">{cerr.text}</div>
            <div className="row row-wrap gap-8" style={{ marginTop: 6 }}>
              <Button size="sm" variant="danger-outline" onClick={startSignIn}>
                {tg.tryAgain}
              </Button>
              <Button size="sm" variant="danger-outline" onClick={() => nav('/export')}>
                {tg.useExport}
              </Button>
            </div>
          </Banner>
        )}

        {phase === 'importing' && (
          <Card bordered radius="2xl" style={{ padding: '28px 32px' }} gap={18}>
            <div className="row gap-14">
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  background: artGradient(5),
                  flex: 'none',
                }}
              />
              <div>
                <div className="semibold">Google Photos</div>
                <div className="tiny muted">{tg.importing.account}</div>
              </div>
              <Pill className="ml-auto">{tg.importing.connected}</Pill>
            </div>
            <div className="stack stack-10">
              <div className="row between" style={{ alignItems: 'baseline' }}>
                <div className="semibold">{tg.importing.copying}</div>
                <div className="small muted">{pct}%</div>
              </div>
              <ProgressBar pct={pct} />
              <div className="small muted pretty">{tg.importing.note}</div>
            </div>
          </Card>
        )}

        {phase === 'done' && found && (
          <>
            <Card bordered radius="2xl" pad="hero" center gap={16}>
              <div className="check check--done">✓</div>
              <div>
                <div className="h3">
                  {adding || !found.years
                    ? tg.found(found.photos)
                    : tg.foundFrom(found.photos, found.years)}
                </div>
                <div className="small muted" style={{ marginTop: 4 }}>
                  {tg.foundStats(found.videos)}
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
                {adding ? tg.backToBooks : tg.choosePhotos}
              </Button>
            </Card>
            <Card bordered pad="mid" style={{ padding: '14px 18px' }}>
              <div className="row row-wrap gap-12 small">
                {!disconnected ? (
                  <>
                    <span className="muted pretty" style={{ flex: 1, minWidth: 200 }}>
                      {tg.readUntil}
                    </span>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={async () => {
                        await api.disconnectGoogle();
                        setDisconnected(true);
                        await refreshLibraries();
                      }}
                    >
                      {tg.disconnectNow}
                    </Button>
                  </>
                ) : (
                  <>
                    <span className="check">✓</span>
                    <span className="muted">{tg.disconnected}</span>
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
          <span>{tg.storage}</span>
        </div>
        {libraryId && phase === 'done' && (
          <span className="sr-only">{tg.libraryReady(libraryId)}</span>
        )}
      </div>
      <WizardBar onBack={() => nav('/start')} />
    </div>
  );
}
