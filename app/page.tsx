'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LANGUAGES, speechLocale } from '@/lib/i18n';
import { CATEGORIES, categoryById } from '@/lib/ai/taxonomy';
import { distanceKm, formatKm } from '@/lib/geo';
import { etaMinutes } from '@/lib/tiers';
import { buildActivity } from '@/lib/activity';
import { useActions, useStore, useT } from '@/components/store';
import { ThemeToggle } from '@/components/theme';
import {
  Counter, Dock, GlassCard, LiveFeed, Magnetic, RadarMap, Reveal, Sheet,
  Stagger, StaggerItem, VoiceOrb, type RadarPin,
} from '@/components/aurora';

/* Fixed schematic positions — a radar, not a street map. Kept off the centre
   and off each other so no two pins ever collide. */
const PIN_SPOTS = [
  { x: 27, y: 30 }, { x: 70, y: 27 }, { x: 33, y: 73 },
  { x: 76, y: 68 }, { x: 62, y: 54 }, { x: 22, y: 55 },
];

export default function Home() {
  const router = useRouter();
  const { t, lang } = useT();
  const { setLang } = useActions();
  const { db } = useStore();
  const [q, setQ] = React.useState('');
  const [langOpen, setLangOpen] = React.useState(false);
  const [listening, setListening] = React.useState(false);
  const recRef = React.useRef<any>(null);

  React.useEffect(() => () => { try { recRef.current?.stop(); } catch {} }, []);

  /* Voice search. Falls back silently to the text field where the Web Speech
     API is missing, so the button is never a dead end. */
  function toggleVoice() {
    if (listening) { try { recRef.current?.stop(); } catch {} setListening(false); return; }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.lang = speechLocale(lang);
    rec.interimResults = true;
    rec.onresult = (e: any) => {
      let txt = '';
      for (let i = e.resultIndex; i < e.results.length; i++) txt += e.results[i][0].transcript;
      setQ(txt);
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    try { rec.start(); recRef.current = rec; setListening(true); } catch { setListening(false); }
  }

  const here = db.residents[0]?.geo ?? db.workers[0].geo;

  /* Workers ranked by pure proximity for the radar + the "nearest" line. */
  const near = React.useMemo(() => {
    return db.workers
      .map((w) => ({ w, km: distanceKm(here, w.geo) }))
      .sort((a, b) => a.km - b.km);
  }, [db.workers, here]);

  const pins: RadarPin[] = near.slice(0, 6).map((n, i) => ({
    id: n.w.id,
    icon: categoryById(n.w.category).icon,
    label: `${n.w.name} · ${formatKm(n.km)}`,
    ...PIN_SPOTS[i],
  }));

  const available = db.workers.filter((w) => w.availability === 'anytime').length;
  const activity = React.useMemo(() => buildActivity(db, 10), [db]);
  const nearest = near[0];

  function search(text: string) {
    const clean = text.trim();
    if (!clean) return;
    router.push(`/discover?q=${encodeURIComponent(clean)}`);
  }

  return (
    <div className="shell">
      <header className="topbar">
        <div className="mark" aria-hidden>क</div>
        <div className="grow">
          <div className="t-h3">{t('app.name')}</div>
          <div className="t-xs">काम सेतु · {t('app.tagline')}</div>
        </div>
        <button className="icon-btn" onClick={() => setLangOpen(true)} aria-label="Change language">
          🌐 {lang.toUpperCase()}
        </button>
        <ThemeToggle />
      </header>

      <main className="page v-6" style={{ paddingTop: 4 }}>

        {/* ------------------------------------------------ hero */}
        <section className="v-4">
          <Reveal y={10}>
            <div className="h-2">
              <span className="live-dot" />
              <p className="t-micro">
                {here.areaName.split(',')[0]} · {available} workers online
              </p>
            </div>
          </Reveal>

          <Reveal delay={0.05}>
            <h1 className="t-display">
              Need help<br />
              <span className="t-grad">today?</span>
            </h1>
          </Reveal>

          <Reveal delay={0.1}>
            <p className="t-body">
              Tell us in your own words — speak or type, in any language. We find someone
              trusted, close by, in about a minute.
            </p>
          </Reveal>

          <Reveal delay={0.15}>
            <form
              className="field"
              onSubmit={(e) => { e.preventDefault(); search(q); }}
            >
              <span aria-hidden style={{ fontSize: 20, opacity: 0.5 }}>🔎</span>
              <input
                className="input bare grow"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Fan not working, need electrician…"
                aria-label="Describe what you need"
              />
              <Magnetic>
                <VoiceOrb compact size={46} live={listening} label="Speak your request" onClick={toggleVoice} />
              </Magnetic>
            </form>
          </Reveal>

          <Stagger className="scroll-x" gap={0.04}>
            {CATEGORIES.filter((c) => c.id !== 'other').slice(0, 7).map((c) => (
              <StaggerItem key={c.id}>
                <Link href={`/discover?cat=${c.id}`} className="chip">
                  {c.icon} {t(`cat.${c.id}` as any)}
                </Link>
              </StaggerItem>
            ))}
          </Stagger>
        </section>

        {/* ------------------------------------------------ radar */}
        <Reveal delay={0.05}>
          <GlassCard className="pad">
            <div className="between" style={{ marginBottom: 14 }}>
              <div>
                <h2 className="t-h3">Workers near you</h2>
                <p className="t-xs">Within 2 km of {here.areaName.split(',')[0]}</p>
              </div>
              <span className="tag em"><span className="live-dot" />{available} available</span>
            </div>

            <RadarMap pins={pins} />

            {nearest ? (
              <div className="between" style={{ marginTop: 14 }}>
                <span className="t-xs">
                  Nearest · <b className="strong">{nearest.w.name.split(' ')[0]}</b> {formatKm(nearest.km)}
                </span>
                <span className="tag cy">~{etaMinutes(nearest.km)} min away</span>
              </div>
            ) : null}
          </GlassCard>
        </Reveal>

        {/* ------------------------------------------------ live activity */}
        <Reveal delay={0.05}>
          <GlassCard className="pad-s">
            <div className="h-2" style={{ marginBottom: 8 }}>
              <span className="live-dot" />
              <p className="t-micro">Happening now</p>
            </div>
            <LiveFeed items={activity} />
          </GlassCard>
        </Reveal>

        {/* ------------------------------------------------ worker entry */}
        <Reveal delay={0.05}>
          <Link href="/worker/onboarding" style={{ display: 'block' }}>
            <GlassCard interactive sheen className="pad-l">
              <div className="h-4">
                <div className="av m gd" aria-hidden style={{ fontSize: 22 }}>🧰</div>
                <div className="grow">
                  <h2 className="t-h3">{t('home.iWorker')}</h2>
                  <p className="t-xs" style={{ marginTop: 3 }}>
                    Speak once. We build your profile and send you nearby jobs — free, forever.
                  </p>
                </div>
                <span aria-hidden style={{ fontSize: 22, color: 'var(--em-600)' }}>›</span>
              </div>
            </GlassCard>
          </Link>
        </Reveal>

        {/* ------------------------------------------------ proof */}
        <Reveal delay={0.05}>
          <GlassCard className="flat pad-s">
            <div className="grid-3">
              <div className="stat">
                <div className="n t-grad"><Counter to={db.workers.reduce((s, w) => s + w.jobsDone, 0)} /></div>
                <div className="l">Jobs done</div>
              </div>
              <div className="stat">
                <div className="n t-grad"><Counter to={4.8} decimals={1} /></div>
                <div className="l">Avg rating</div>
              </div>
              <div className="stat">
                <div className="n t-grad"><Counter to={LANGUAGES.length} /></div>
                <div className="l">Languages</div>
              </div>
            </div>
          </GlassCard>
        </Reveal>

        <Reveal delay={0.05}>
          <div className="grid-2">
            <Link href="/scrap"><GlassCard interactive className="pad-s mid">
              <div style={{ fontSize: 26 }} aria-hidden>♻️</div>
              <div className="t-xs" style={{ marginTop: 6 }}>{t('home.scrap')}</div>
            </GlassCard></Link>
            <Link href="/leaderboard"><GlassCard interactive className="pad-s mid">
              <div style={{ fontSize: 26 }} aria-hidden>🏆</div>
              <div className="t-xs" style={{ marginTop: 6 }}>Community ranks</div>
            </GlassCard></Link>
          </div>
        </Reveal>
      </main>

      <Dock items={[
        { href: '/', icon: '🏠', label: 'Home' },
        { href: '/discover', icon: '🔎', label: 'Find' },
        { href: '/leaderboard', icon: '🏆', label: 'Ranks' },
        { href: '/resident', icon: '👤', label: 'You' },
      ]} />

      <Sheet open={langOpen} onClose={() => setLangOpen(false)} title="भाषा / Language">
        <div className="v-3">
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              className={`choice${l.code === lang ? ' on' : ''}`}
              onClick={() => { setLang(l.code); setLangOpen(false); }}
            >
              <span className="lead" aria-hidden>🗣️</span>
              <span>
                <span className="ttl">{l.native}</span><br />
                <span className="sub">{l.label}</span>
              </span>
              {l.code === lang ? <span className="mark">✓</span> : null}
            </button>
          ))}
        </div>
      </Sheet>
    </div>
  );
}
