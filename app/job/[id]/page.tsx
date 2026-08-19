'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { serviceName } from '@/lib/i18n-catalog';
import { etaMinutes } from '@/lib/ai/match';
import { distanceKm, formatKm } from '@/lib/geo';
import {
  telLink, waLink, waShare, jobShareText, navigateLink, origin,
  emergencyCallLink, sosMessage, getPosition,
} from '@/lib/links';
import type { JobStatus, MessageKind, PaymentMethod } from '@/lib/types';
import { useActions, useMe, useStore, useT } from '@/components/store';
import { useSpeech } from '@/components/kit';
import { CardSkeleton, Dock, GlassCard, Reveal, SPRING, Sheet } from '@/components/aurora';
import { HeaderTools, Initials, Money, Shell, Stars, TopBar, VerifiedBadge } from '@/components/kit';
import { navNormal, navWorker } from '@/components/nav';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';

const METHODS: PaymentMethod[] = ['upi', 'gpay', 'phonepe', 'paytm', 'cash'];

/** Quick replies are stored as translation KEYS, so each side reads their own language. */
const QUICK_KEYS = ['m.onWay', 'm.reached', 'm.late', 'm.callMe', 'm.finished', 'm.ok'] as const;

export default function JobPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { db, ready } = useStore();
  const me = useMe();
  const { t, lang } = useT();
  const actions = useActions();

  const job = db.jobs.find((j) => j.id === params?.id);
  const [sosOpen, setSosOpen] = React.useState(false);
  const [rateOpen, setRateOpen] = React.useState(false);

  if (!ready) return <Shell><div className="page" style={{ paddingTop: 90 }}><CardSkeleton /></div></Shell>;
  if (!job) return <Shell><TopBar back title="—" /><main className="page"><p className="t-body">{t('e.generic')}</p></main></Shell>;

  const worker = job.assignedWorkerId ? db.workers.find((w) => w.id === job.assignedWorkerId) : null;
  const client = db.clients.find((c) => c.id === job.clientId);
  const iAmWorker = me.role === 'worker';
  const other = iAmWorker ? client : worker;
  const km = worker ? distanceKm(job.geo, worker.geo) : 0;
  const review = db.reviews.find((r) => r.jobId === job.id);

  function setStatus(s: JobStatus) { actions.setStatus(job!.id, s); }

  return (
    <Shell>
      <TopBar glassy back title={job.title} subtitle={t(`j.${job.status}` as any)} right={<HeaderTools />} />
      <main className="page v-4" style={{ paddingTop: 4 }}>

        {/* ---------------- what and when ---------------- */}
        <Reveal>
          <GlassCard className="pad">
            <div className="h-2 wrap" style={{ gap: 7, marginBottom: 11 }}>
              <span className="tag in">{t(`u.${job.urgency}` as any)}</span>
              {job.serviceId ? <span className="tag">{serviceName(job.serviceId, lang)}</span> : null}
              <span className="tag em">{t(`j.${job.status}` as any)}</span>
            </div>
            <p className="t-body" style={{ color: 'var(--ink)' }}>&ldquo;{job.rawRequest}&rdquo;</p>
            <hr className="rule" style={{ margin: '13px 0' }} />
            {job.whenText ? <div className="kv"><span className="k">🕐</span><span className="v">{job.whenText}</span></div> : null}
            <div className="kv"><span className="k">{t('j.address')}</span><span className="v">{job.geo.address ?? job.geo.areaName}</span></div>
            <div className="kv">
              <span className="k">{t('p.estimate')}</span>
              <span className="v t-num"><Money amount={job.priceMin} />–<Money amount={job.priceMax} /></span>
            </div>
          </GlassCard>
        </Reveal>

        {/* ---------------- the other person + contact ---------------- */}
        {other ? (
          <Reveal delay={0.04}>
            <GlassCard className="pad">
              <div className="h" style={{ gap: 13 }}>
                <Initials name={other.name} />
                <div className="grow" style={{ minWidth: 0 }}>
                  <div className="t-h3">{other.name}</div>
                  {worker && !iAmWorker ? (
                    <div style={{ marginTop: 4 }}>
                      {worker.reviewCount ? <Stars value={worker.rating} count={worker.reviewCount} /> : <span className="t-xs">{t('w.noReviews')}</span>}
                    </div>
                  ) : (
                    <div className="t-xs" style={{ marginTop: 4 }}>{client?.orgName ?? job.geo.areaName}</div>
                  )}
                </div>
                {worker && !iAmWorker ? <VerifiedBadge v={worker.verification} small /> : null}
              </div>

              <div className="h-2" style={{ gap: 9, marginTop: 14 }}>
                <a className="btn ghost md grow" href={telLink(other.phone)}>📞 {t('w.callNow')}</a>
                <a className="btn ghost md grow" href={waLink(other.phone, job.title)} target="_blank" rel="noopener noreferrer">
                  💬 {t('w.whatsapp')}
                </a>
              </div>

              {/* navigation is the worker's most-used control while travelling */}
              {iAmWorker ? (
                <a className="btn md" style={{ width: '100%', marginTop: 10 }}
                  href={navigateLink(job.geo)} target="_blank" rel="noopener noreferrer">
                  🧭 {t('j.navigate')} · ~{etaMinutes(km)} {t('c.min')}
                </a>
              ) : (
                <a className="btn ghost md" style={{ width: '100%', marginTop: 10 }}
                  href={navigateLink(job.geo)} target="_blank" rel="noopener noreferrer">
                  🗺️ {t('j.openMaps')}
                </a>
              )}
            </GlassCard>
          </Reveal>
        ) : null}

        {/* ---------------- worker accepting an open job ---------------- */}
        {iAmWorker && job.status === 'open' ? (
          <button className="btn" onClick={() => actions.hire(job.id, me.id!, Math.round((job.priceMin + job.priceMax) / 2))}>
            ✓ {t('j.accept')}
          </button>
        ) : null}

        {/* ---------------- job progress ---------------- */}
        {worker && job.status !== 'open' ? (
          <Reveal delay={0.04}>
            <GlassCard className="pad v-3">
              <p className="t-micro">{t('n.jobs')}</p>
              {iAmWorker ? (
                <>
                  {job.status === 'assigned' ? <button className="btn" onClick={() => setStatus('on_the_way')}>🛵 {t('j.track')}</button> : null}
                  {job.status === 'on_the_way' ? <button className="btn" onClick={() => setStatus('working')}>📍 {t('j.arrived')}</button> : null}
                  {job.status === 'working' ? <button className="btn" onClick={() => setStatus('worker_done')}>✓ {t('j.finish')}</button> : null}
                  {job.status === 'worker_done' ? <p className="note gd">{t('j.worker_done')}</p> : null}
                  {job.status === 'completed' ? <p className="note em">🎉 {t('j.completed')}</p> : null}
                </>
              ) : (
                <>
                  {job.status === 'on_the_way' ? <p className="note">🛵 {t('j.on_the_way')} · ~{etaMinutes(km)} {t('c.min')}</p> : null}
                  {job.status === 'working' ? <p className="note">🔧 {t('j.working')}</p> : null}
                  {job.status === 'worker_done' ? <button className="btn" onClick={() => { setStatus('completed'); setRateOpen(true); }}>✓ {t('j.confirm')}</button> : null}
                  {job.status === 'completed' && !review ? <button className="btn ghost" onClick={() => setRateOpen(true)}>⭐ {t('r.title')}</button> : null}
                  {job.status === 'completed' && review ? <p className="note em">🙏 {t('r.thanks')}</p> : null}
                </>
              )}
            </GlassCard>
          </Reveal>
        ) : null}

        {/* ---------------- payment ---------------- */}
        {worker && job.status !== 'open' ? (
          <Reveal delay={0.04}>
            <GlassCard className="flat pad">
              <p className="t-micro" style={{ marginBottom: 10 }}>{t('y.title')}</p>
              <div className="kv"><span className="k">{t('y.agreed')}</span><span className="v t-num"><Money amount={job.agreedAmount ?? job.priceMin} /></span></div>
              <div className="kv"><span className="k">{t('c.done')}</span><span className="v">{job.paymentStatus === 'paid' ? `✅ ${t('y.paid')}` : `⏳ ${t('y.pending')}`}</span></div>
              {!iAmWorker ? (
                <>
                  <p className="label" style={{ marginTop: 14 }}>{t('y.method')}</p>
                  <div className="h-2 wrap" style={{ gap: 8 }}>
                    {METHODS.map((m) => (
                      <button key={m} className={`chip${job.paymentMethod === m ? ' on' : ''}`}
                        onClick={() => actions.setPayment(job.id, m, job.paymentStatus === 'paid')}>
                        {m === 'cash' ? t('y.cash') : m.toUpperCase()}
                      </button>
                    ))}
                  </div>
                  {job.paymentMethod && job.paymentStatus !== 'paid' ? (
                    <button className="btn ghost md" style={{ width: '100%', marginTop: 12 }}
                      onClick={() => actions.setPayment(job.id, job.paymentMethod!, true)}>
                      ✓ {t('y.markPaid')}
                    </button>
                  ) : null}
                </>
              ) : null}
            </GlassCard>
          </Reveal>
        ) : null}

        {/* ---------------- messages ---------------- */}
        {worker && job.status !== 'open' ? <Chat jobId={job.id} /> : null}

        {/* ---------------- share ---------------- */}
        <a className="btn quiet" href={waShare(jobShareText(job.title, job.geo.areaName, origin(), job.id))}
          target="_blank" rel="noopener noreferrer">
          ↗ {t('c.share')}
        </a>
      </main>

      {/* ---------------- SOS ---------------- */}
      {job.status === 'on_the_way' || job.status === 'working' ? (
        <SosButton onOpen={() => setSosOpen(true)} />
      ) : null}
      <SosSheet open={sosOpen} onClose={() => setSosOpen(false)} jobId={job.id} context={job.title} />

      <RateSheet open={rateOpen} onClose={() => setRateOpen(false)} jobId={job.id} workerId={job.assignedWorkerId} />

      <Dock items={iAmWorker ? navWorker(t) : navNormal(t)} />
    </Shell>
  );
}

/* ============================================================ CHAT */

function Chat({ jobId }: { jobId: string }) {
  const { db } = useStore();
  const me = useMe();
  const { t, lang } = useT();
  const { sendMessage } = useActions();
  const [draft, setDraft] = React.useState('');
  const [recording, setRecording] = React.useState(false);
  const startedRef = React.useRef(0);
  const speech = useSpeech(lang, setDraft);
  const endRef = React.useRef<HTMLDivElement>(null);

  const msgs = db.messages.filter((m) => m.jobId === jobId).sort((a, b) => a.createdAt - b.createdAt);
  const myRole: 'worker' | 'client' = me.role === 'worker' ? 'worker' : 'client';

  React.useEffect(() => { endRef.current?.scrollIntoView({ block: 'nearest' }); }, [msgs.length]);

  function send(kind: MessageKind, text: string, dur?: number) {
    const clean = text.trim();
    if (!clean) return;
    sendMessage(jobId, myRole, me.id!, kind, clean, lang, dur);
    setDraft('');
  }

  function toggleVoice() {
    if (recording) {
      speech.stop();
      setRecording(false);
      const secs = Math.max(1, Math.round((Date.now() - startedRef.current) / 1000));
      if (draft.trim()) send('voice', draft, secs);
      return;
    }
    startedRef.current = Date.now();
    setRecording(true);
    speech.start('');
  }

  return (
    <GlassCard className="pad">
      <p className="t-micro" style={{ marginBottom: 10 }}>💬 {t('m.title')}</p>

      <div className="msgs">
        {msgs.length === 0 ? <p className="t-xs">{t('m.empty')}</p> : null}
        {msgs.map((m) => {
          const mine = m.fromRole === myRole && m.fromId === me.id;
          /* A quick reply is a key, so it renders in the READER's language. */
          const body = m.kind === 'quick' ? t(m.text as any) : m.text;
          return (
            <div key={m.id} className={`msg ${mine ? 'me' : 'them'}`}>
              {m.kind === 'voice' ? <span aria-hidden>🎤 </span> : null}
              {body}
              {m.kind === 'voice' && m.durationSec ? <span className="orig">{m.durationSec}s · {t('m.voice')}</span> : null}
              {m.kind === 'quick' && m.lang !== lang ? <span className="orig">🌐 {t('m.translated')}</span> : null}
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      <div className="h-2 wrap" style={{ gap: 8, margin: '10px 0 12px' }}>
        {QUICK_KEYS.map((k) => (
          <button key={k} className="chip" style={{ minHeight: 38, fontSize: 13.5 }} onClick={() => send('quick', k)}>
            {t(k)}
          </button>
        ))}
      </div>

      <div className="h-2" style={{ gap: 9 }}>
        <input className="input grow" placeholder={t('m.ph')} value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') send('text', draft); }} />
        <button className={`icon-btn${recording ? ' ' : ''}`} onClick={toggleVoice}
          aria-label={t('m.voice')} aria-pressed={recording}
          style={recording ? { background: 'var(--danger)', color: '#fff' } : undefined}>
          {recording ? '⏹' : '🎤'}
        </button>
        <button className="btn sm" onClick={() => send('text', draft)}>{t('c.send')}</button>
      </div>
      {recording ? <p className="t-xs" style={{ marginTop: 8 }}>{t('m.recording')}</p> : null}
    </GlassCard>
  );
}

/* ============================================================ SOS */

function SosButton({ onOpen }: { onOpen: () => void }) {
  const { t } = useT();
  return (
    <button
      onClick={onOpen}
      aria-label={t('x.title')}
      style={{
        position: 'fixed', right: 16, bottom: 'calc(96px + env(safe-area-inset-bottom))', zIndex: 46,
        width: 58, height: 58, borderRadius: '50%', border: 'none', cursor: 'pointer',
        background: 'linear-gradient(135deg, #E5484D, #F5A623)', color: '#fff',
        fontWeight: 800, fontSize: 13, letterSpacing: '.04em',
        boxShadow: '0 10px 30px -8px rgba(229,72,77,.75), inset 0 1px 0 rgba(255,255,255,.3)',
      }}
    >
      SOS
    </button>
  );
}

function SosSheet({ open, onClose, jobId, context }: { open: boolean; onClose: () => void; jobId: string; context: string }) {
  const { t } = useT();
  const me = useMe();
  const { raiseSos } = useActions();
  const reduce = useReducedMotion();
  const [held, setHeld] = React.useState(0);
  const [sent, setSent] = React.useState(false);
  const [coords, setCoords] = React.useState<{ lat: number; lng: number } | null>(null);
  const timer = React.useRef<any>(null);

  React.useEffect(() => { if (!open) { setHeld(0); setSent(false); } }, [open]);

  function down() {
    timer.current = setInterval(() => {
      setHeld((h) => {
        if (h >= 100) { clearInterval(timer.current); fire(); return 100; }
        return h + 5;
      });
    }, 100);
  }
  function up() { clearInterval(timer.current); if (!sent) setHeld(0); }

  async function fire() {
    const pos = await getPosition();
    const lat = pos?.coords.latitude;
    const lng = pos?.coords.longitude;
    if (lat != null && lng != null) setCoords({ lat, lng });
    raiseSos(jobId, me.role === 'worker' ? 'worker' : 'client', lat, lng);
    setSent(true);
  }

  const msg = sosMessage(me.name || 'A KaamSetu user', coords?.lat, coords?.lng, context);

  return (
    <Sheet open={open} onClose={onClose} title={t('x.title')}>
      <div className="v-4">
        {!sent ? (
          <>
            <p className="t-sm">{t('x.sub')}</p>
            <div className="mid v-3" style={{ padding: '12px 0' }}>
              <motion.button
                onPointerDown={down} onPointerUp={up} onPointerLeave={up}
                whileTap={reduce ? undefined : { scale: 0.95 }}
                transition={SPRING.snap}
                aria-label={t('x.hold')}
                style={{
                  width: 150, height: 150, borderRadius: '50%', border: 'none', cursor: 'pointer',
                  background: `conic-gradient(#E5484D ${held}%, rgba(229,72,77,.18) 0)`,
                  display: 'grid', placeItems: 'center', margin: '0 auto',
                }}
              >
                <span style={{
                  width: 126, height: 126, borderRadius: '50%', display: 'grid', placeItems: 'center',
                  background: 'linear-gradient(135deg, #E5484D, #F5A623)', color: '#fff',
                  fontWeight: 800, fontSize: 26, letterSpacing: '.04em',
                }}>SOS</span>
              </motion.button>
              <p className="t-xs">{t('x.hold')}</p>
            </div>
          </>
        ) : (
          <AnimatePresence>
            <motion.div
              initial={reduce ? false : { scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={SPRING.bouncy}
              className="v-3"
            >
              <p className="note gd" style={{ fontSize: 15 }}>🆘 {t('x.sent')}</p>
              <p className="t-sm">{t('x.sentSub')}</p>
            </motion.div>
          </AnimatePresence>
        )}

        <a className="btn" style={{ background: 'linear-gradient(135deg,#E5484D,#F5A623)' }} href={emergencyCallLink()}>
          📞 {t('x.call112')}
        </a>
        <a className="btn ghost" href={`https://wa.me/?text=${encodeURIComponent(msg)}`} target="_blank" rel="noopener noreferrer">
          📍 {t('x.shareLoc')}
        </a>
        <button className="btn quiet" onClick={onClose}>{t('c.close')}</button>
      </div>
    </Sheet>
  );
}

/* ============================================================ RATING */

function RateSheet({ open, onClose, jobId, workerId }: { open: boolean; onClose: () => void; jobId: string; workerId?: string }) {
  const { t } = useT();
  const me = useMe();
  const { addReview } = useActions();
  const [stars, setStars] = React.useState(0);
  const [text, setText] = React.useState('');
  const [tags, setTags] = React.useState<string[]>([]);
  const TAGS = ['punctual', 'clean', 'skilled', 'polite'] as const;

  if (!workerId) return null;

  return (
    <Sheet open={open} onClose={onClose} title={t('r.title')}>
      <div className="v-4">
        <div>
          <p className="t-sm" style={{ marginBottom: 10 }}>{t('r.stars')}</p>
          <div className="h-2" style={{ gap: 6, justifyContent: 'center' }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} onClick={() => setStars(n)} aria-label={`${n}`}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer', padding: 4,
                  fontSize: 38, lineHeight: 1,
                  color: n <= stars ? 'var(--gd-500)' : 'var(--hairline)',
                }}>★</button>
            ))}
          </div>
        </div>

        <div className="h-2 wrap" style={{ gap: 8, justifyContent: 'center' }}>
          {TAGS.map((tag) => (
            <button key={tag} className={`chip${tags.includes(tag) ? ' on' : ''}`}
              onClick={() => setTags((p) => (p.includes(tag) ? p.filter((x) => x !== tag) : [...p, tag]))}>
              {t(`r.${tag}` as any)}
            </button>
          ))}
        </div>

        <div>
          <label className="label" htmlFor="rv">{t('r.write')}</label>
          <textarea id="rv" className="textarea" style={{ minHeight: 90 }} value={text}
            placeholder={t('r.ph')} onChange={(e) => setText(e.target.value)} />
        </div>

        <button className="btn" disabled={stars === 0}
          onClick={() => { addReview(jobId, workerId, me.name || 'A neighbour', stars, text.trim(), tags); onClose(); }}>
          {t('r.submit')}
        </button>
      </div>
    </Sheet>
  );
}
