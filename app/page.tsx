'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CATEGORIES } from '@/lib/catalog';
import { categoryName, serviceName } from '@/lib/i18n-catalog';
import { matchServices } from '@/lib/catalog';
import { rankWorkers, etaMinutes } from '@/lib/ai/match';
import { formatDistance } from '@/lib/geo';
import { useMe, useStore, useT } from '@/components/store';
import { useSpeech } from '@/components/kit';
import { Dock, GlassCard, Magnetic, PullToRefresh, Reveal, Stagger, StaggerItem, VoiceOrb } from '@/components/aurora';
import { Empty, HeaderTools, Initials, Money, Shell, Stars, TopBar, VerifiedBadge } from '@/components/kit';
import { navNormal, navWorker } from '@/components/nav';
import { ClientPanel, WorkerPanel } from '@/components/panels';

/** Statuses that mean the job is over, one way or another. */
const DEAD_STATUSES: string[] = ['completed', 'cancelled_by_client', 'cancelled_by_worker', 'expired'];

/* The six things people actually search for most. Fewer, bigger targets. */
const QUICK = ['fan_repair', 'leak_repair', 'home_cleaning', 'maid', 'ac_service', 'car_driver'];

export default function Home() {
  const router = useRouter();
  const { db, ready } = useStore();
  const me = useMe();
  const { t, lang } = useT();
  const [q, setQ] = React.useState('');
  const speech = useSpeech(lang, setQ);

  /* Not signed in yet → send them to pick a role. */
  React.useEffect(() => {
    if (ready && !me.role) router.replace('/login');
  }, [ready, me.role, router]);

  if (!ready || !me.role) {
    return <Shell><main className="page" style={{ paddingTop: 100 }}><Empty icon="⏳" text={t('c.loading')} /></main></Shell>;
  }

  return me.role === 'worker' ? <WorkerHome /> : <ClientHome q={q} setQ={setQ} speech={speech} />;
}

/* =========================================================== CLIENT HOME */

function ClientHome({ q, setQ, speech }: { q: string; setQ: (v: string) => void; speech: ReturnType<typeof useSpeech> }) {
  const router = useRouter();
  const { db, refresh } = useStore();
  const me = useMe();
  const { t, lang } = useT();

  const myJobs = db.jobs
    .filter((j) => j.clientId === me.id && !DEAD_STATUSES.includes(j.status))
    .slice(0, 3);

  /** Search jumps straight to the best-matching service — never a dead end. */
  function submit() {
    const text = q.trim();
    if (!text) return;
    const hits = matchServices(text);
    if (hits.length) {
      router.push(`/search?cat=${hits[0].service.category}&svc=${hits[0].service.id}`);
    } else {
      router.push(`/book?q=${encodeURIComponent(text)}`);
    }
  }

  const orgLine = me.client?.orgName ? `${me.client.orgName} · ` : '';

  return (
    <Shell aside={<ClientPanel />}>
      <TopBar title={me.name} subtitle={`${orgLine}📍 ${me.geo.areaName.split(',')[0]}`} right={<HeaderTools />} />
      <PullToRefresh onRefresh={refresh}>
      <main className="page v-6" style={{ paddingTop: 4 }}>

        <Reveal>
          <h1 className="t-display">{t('h.greeting')}</h1>
        </Reveal>

        <Reveal delay={0.05}>
          <form className="field hero-search" onSubmit={(e) => { e.preventDefault(); submit(); }}>
            <span aria-hidden style={{ fontSize: 20, opacity: 0.5 }}>🔎</span>
            <input
              className="input bare grow"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t('h.searchPh')}
              aria-label={t('h.searchPh')}
            />
            <Magnetic>
              <VoiceOrb
                compact size={46} live={speech.listening}
                label={t('h.speak')}
                onClick={() => (speech.listening ? speech.stop() : speech.start(q))}
              />
            </Magnetic>
          </form>
        </Reveal>

        {q.trim() ? (
          <Reveal><button className="btn" onClick={submit}>{t('p.find')} →</button></Reveal>
        ) : null}

        {/* common needs — the fastest path for someone who cannot type */}
        <section className="v-3">
          <div className="between">
            <h2 className="t-h3">{t('h.popular')}</h2>
            <Link href="/search" className="t-xs strong" style={{ color: 'var(--em-600)' }}>{t('h.browse')} →</Link>
          </div>
          <Stagger className="grid-3" gap={0.04}>
            {QUICK.map((sid) => {
              const cat = CATEGORIES.find((c) => c.services.includes(sid));
              if (!cat) return null;
              return (
                <StaggerItem key={sid}>
                  <Link href={`/search?cat=${cat.id}&svc=${sid}`} style={{ display: 'block' }}>
                    <GlassCard interactive className="pad-s mid" style={{ minHeight: 100 }}>
                      <div style={{ fontSize: 26 }} aria-hidden>{cat.icon}</div>
                      <div className="t-xs strong" style={{ marginTop: 6, lineHeight: 1.25 }}>
                        {serviceName(sid, lang)}
                      </div>
                    </GlassCard>
                  </Link>
                </StaggerItem>
              );
            })}
          </Stagger>
        </section>

        {/* live jobs for this account */}
        {myJobs.length ? (
          <section className="v-3">
            <div className="between">
              <h2 className="t-h3">{t('h.myJobs')}</h2>
              <Link href="/jobs" className="t-xs strong" style={{ color: 'var(--em-600)' }}>{t('h.viewAll')} →</Link>
            </div>
            <div className="v-3 grid-cards">
            {myJobs.map((j) => {
              const w = j.assignedWorkerId ? db.workers.find((x) => x.id === j.assignedWorkerId) : null;
              return (
                <Link key={j.id} href={`/job/${j.id}`} style={{ display: 'block' }}>
                  <GlassCard interactive className="pad-s">
                    <div className="between">
                      <div className="grow" style={{ minWidth: 0 }}>
                        <div className="t-sm strong clamp-2">
                          {j.title}
                        </div>
                        <div className="t-xs" style={{ marginTop: 3 }}>
                          {w ? `👷 ${w.name}` : t('j.requested')}
                        </div>
                      </div>
                      <span className={`tag ${j.status === 'requested' ? 'in' : 'em'}`}>{t(`j.${j.status}` as any)}</span>
                    </div>
                  </GlassCard>
                </Link>
              );
            })}
            </div>
          </section>
        ) : null}

        {/* society and business get their own hiring entry point */}
        {me.role === 'society' || me.role === 'business' ? (
          <Reveal>
            <Link href="/hire" style={{ display: 'block' }}>
              <GlassCard interactive sheen className="pad-l">
                <div className="h-4">
                  <div className="av m in" aria-hidden style={{ fontSize: 22 }}>
                    {me.role === 'society' ? '🏢' : '🏪'}
                  </div>
                  <div className="grow">
                    <h2 className="t-h3">{t(me.role === 'society' ? 'g.socTitle' : 'g.bizTitle')}</h2>
                    <p className="t-xs" style={{ marginTop: 3 }}>
                      {t(me.role === 'society' ? 'g.socSub' : 'g.bizSub')}
                    </p>
                  </div>
                  <span aria-hidden style={{ fontSize: 22, color: 'var(--em-600)' }}>›</span>
                </div>
              </GlassCard>
            </Link>
          </Reveal>
        ) : null}
      </main>
      </PullToRefresh>
      <Dock items={navNormal(t)} />
    </Shell>
  );
}

/* =========================================================== WORKER HOME */

/**
 * FIND A JOB
 *
 * The old version led with a 148px microphone and nothing else — an
 * impressive demo and a poor tool. A worker opening this screen wants to see
 * work: what is near, what pays, what is urgent. So the page leads with the
 * jobs, gives them a search box and four filters, and keeps voice as a small
 * button INSIDE the search field for the many workers who would rather speak
 * than type. Voice assists; it no longer occupies the fold.
 */
function WorkerHome() {
  const { db, refresh } = useStore();
  const me = useMe();
  const { t, lang } = useT();
  const w = me.worker!;

  const [q, setQ] = React.useState('');
  const [sort, setSort] = React.useState<'all' | 'closest' | 'urgent' | 'paid'>('all');
  const speech = useSpeech(lang, setQ);

  /* Only this worker's trade, only inside the radius they chose. The filter
     lives in rankWorkers so there is exactly one rule, tested in selftest. */
  let feed = db.jobs
    .filter((j) => j.status === 'requested')
    .map((j) => {
      const [m] = rankWorkers({ geo: j.geo, category: j.category, serviceId: j.serviceId }, [w]);
      return m ? { job: j, km: m.km } : null;
    })
    .filter(Boolean) as { job: typeof db.jobs[number]; km: number }[];

  const text = q.trim().toLowerCase();
  if (text) {
    feed = feed.filter(({ job }) =>
      job.title.toLowerCase().includes(text) ||
      job.rawRequest.toLowerCase().includes(text) ||
      (job.serviceId ? serviceName(job.serviceId, lang).toLowerCase().includes(text) : false));
  }

  if (sort === 'closest') feed = [...feed].sort((a, b) => a.km - b.km);
  if (sort === 'paid') feed = [...feed].sort((a, b) => b.job.priceMax - a.job.priceMax);
  if (sort === 'urgent') feed = feed.filter(({ job }) => job.urgency === 'emergency' || job.urgency === 'today');

  const active = db.jobs.filter((j) => j.assignedWorkerId === w.id && !DEAD_STATUSES.includes(j.status));

  const FILTERS = [
    { id: 'all', label: t('f.all') },
    { id: 'closest', label: `📍 ${t('f.closest')}` },
    { id: 'urgent', label: `⚡ ${t('f.urgent')}` },
    { id: 'paid', label: `💰 ${t('f.bestPaid')}` },
  ] as const;

  return (
    <Shell aside={<WorkerPanel worker={w} />}>
      <TopBar title={w.name} subtitle={`📍 ${w.geo.areaName} · ${w.radiusKm} ${t('c.km')}`} right={<HeaderTools />} />
      <PullToRefresh onRefresh={refresh}>
      <main className="page v-4" style={{ paddingTop: 4 }}>

        {/* work in hand comes before work on offer */}
        {active.length ? (
          <section className="v-3">
            <h2 className="t-h3">{t('d.active')}</h2>
            <div className="v-3 grid-cards">
              {active.map((j) => (
                <Link key={j.id} href={`/job/${j.id}`} style={{ display: 'block' }}>
                  <GlassCard interactive className="pad-s" glow="em">
                    <div className="between">
                      <div className="grow" style={{ minWidth: 0 }}>
                        <div className="t-sm strong clamp-2">{j.title}</div>
                        <div className="t-xs" style={{ marginTop: 3 }}>{j.geo.address ?? j.geo.areaName}</div>
                      </div>
                      <span className="tag em">{t(`j.${j.status}` as any)}</span>
                    </div>
                  </GlassCard>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        {/* verification nudge — the single highest-value action for a worker */}
        {w.verification.status !== 'verified' ? (
          <Reveal>
            <Link href="/verify" style={{ display: 'block' }}>
              <GlassCard interactive className="pad-s" glow="gd">
                <div className="h-4">
                  <div style={{ fontSize: 24 }} aria-hidden>🪪</div>
                  <div className="grow">
                    <div className="t-sm strong">{t('v.title')}</div>
                    <p className="t-xs" style={{ marginTop: 2 }}>{t('v.sub')}</p>
                  </div>
                  <span aria-hidden style={{ fontSize: 20, color: 'var(--gd-600)' }}>›</span>
                </div>
              </GlassCard>
            </Link>
          </Reveal>
        ) : null}

        <div className="between">
          <h1 className="t-h1">{t('f.title')}</h1>
          <span className="tag">{feed.length}</span>
        </div>

        {/* search, with the microphone as a button inside it rather than a
            148px orb above it */}
        <form className="field hero-search" onSubmit={(e) => e.preventDefault()}>
          <span aria-hidden style={{ fontSize: 18, opacity: 0.5 }}>🔎</span>
          <input
            className="input bare grow"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t('f.searchPh')}
            aria-label={t('f.searchPh')}
          />
          <VoiceOrb
            compact size={40} live={speech.listening}
            label={t('h.speak')}
            onClick={() => (speech.listening ? speech.stop() : speech.start(q))}
          />
        </form>

        <div className="scroll-x">
          {FILTERS.map((f) => (
            <button key={f.id} className={`chip${sort === f.id ? ' on' : ''}`} onClick={() => setSort(f.id as any)}>
              {f.label}
            </button>
          ))}
        </div>

        <p className="t-micro">🔒 {t('f.yourTrade')} · {categoryName(w.category, lang)}</p>

        {feed.length === 0 ? (
          <Empty
            icon="🧰"
            title={text ? t('f.noMatch') : t('x.noFeedTitle')}
            text={text ? t('x.noResBody') : t('x.noFeedBody')}
            tips={text ? undefined : workerTips(w, t)}
            action={text ? { href: '/', label: t('f.all') } : undefined}
          />
        ) : (
          <Stagger className="v-3 grid-cards" gap={0.06}>
            {feed.map(({ job, km }) => (
              <StaggerItem key={job.id}>
                <Link href={`/job/${job.id}`} style={{ display: 'block' }}>
                  <GlassCard interactive className="pad">
                    <div className="t-h3 clamp-2" style={{ lineHeight: 1.3 }}>{job.title}</div>
                    <div className="h-2 wrap" style={{ gap: 7, marginTop: 10 }}>
                      <span className="tag in">{t(`u.${job.urgency}` as any)}</span>
                      <span className="tag">📍 {formatDistance(km, t('c.nearby'))}</span>
                      <span className="tag">~{etaMinutes(km)} {t('c.min')}</span>
                      {job.serviceId ? <span className="tag">{serviceName(job.serviceId, lang)}</span> : null}
                    </div>
                    <hr className="rule" style={{ margin: '13px 0' }} />
                    <div className="between">
                      <div>
                        <div className="t-xs">{t('p.estimate')}</div>
                        <div className="t-sm strong t-num"><Money amount={job.priceMin} />–<Money amount={job.priceMax} /></div>
                      </div>
                      <span className="btn sm">{t('j.accept')}</span>
                    </div>
                  </GlassCard>
                </Link>
              </StaggerItem>
            ))}
          </Stagger>
        )}
      </main>
      </PullToRefresh>
      <Dock items={navWorker(t)} />
    </Shell>
  );
}

/* ---------------------------------------------------------------- helpers */

/**
 * What this particular worker should do next, most valuable first.
 * An empty feed is not the worker's fault, but these three things genuinely
 * change how much work reaches them — so the empty screen says so instead of
 * shrugging.
 */
function workerTips(w: NonNullable<ReturnType<typeof useMe>['worker']>, t: (k: any) => string) {
  const tips: { icon: string; text: string; href: string }[] = [];
  if (w.verification.status !== 'verified') tips.push({ icon: '🪪', text: t('x.tipVerify'), href: '/verify' });
  if (w.services.length < 3) tips.push({ icon: '🧰', text: t('x.tipSkills'), href: '/me' });
  if (w.radiusKm < 8) tips.push({ icon: '📍', text: t('x.tipRadius'), href: '/me' });
  tips.push({ icon: '🛡️', text: t('ts.title'), href: '/trust' });
  return tips;
}
