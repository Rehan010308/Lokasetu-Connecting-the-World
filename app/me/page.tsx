'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LANGUAGES, langNative } from '@/lib/i18n';
import { CITIES, city, geoOf } from '@/lib/cities';
import { categoryName, serviceName } from '@/lib/i18n-catalog';
import { servicesOf } from '@/lib/catalog';
import { telLink } from '@/lib/links';
import type { Availability } from '@/lib/types';
import { PAYMENT_METHODS } from '@/lib/payments';
import { BUILD, VERSION } from '@/lib/version';
import { useActions, useMe, useStore, useT } from '@/components/store';
import { Dock, GlassCard, Reveal } from '@/components/aurora';
import { Empty, HeaderTools, Initials, Shell, Stars, TopBar, VerifiedBadge } from '@/components/kit';
import { navNormal, navWorker } from '@/components/nav';
import { ClientPanel, WorkerPanel } from '@/components/panels';

export default function MePage() {
  const router = useRouter();
  const { ready, db } = useStore();
  const me = useMe();
  const { t, lang } = useT();
  const { setLang, logout, reset, updateWorker, updateClient } = useActions();

  React.useEffect(() => { if (ready && !me.role) router.replace('/login'); }, [ready, me.role, router]);
  if (!ready || !me.role) return <Shell><main className="page" style={{ paddingTop: 100 }}><Empty icon="⏳" text={t('c.loading')} /></main></Shell>;

  const w = me.worker;
  const c = me.client;
  const isWorker = me.role === 'worker';

  return (
    <Shell aside={isWorker && w ? <WorkerPanel worker={w} /> : <ClientPanel />}>
      <TopBar glassy title={t('n.profile')} right={<HeaderTools />} />
      <main className="page v-4" style={{ paddingTop: 4 }}>

        <Reveal>
          <GlassCard className="pad">
            <div className="h" style={{ gap: 14 }}>
              <Initials name={me.name} size="l" tone={isWorker ? undefined : 'in'} />
              <div className="grow" style={{ minWidth: 0 }}>
                <h1 className="t-h2">{me.name}</h1>
                <p className="t-xs" style={{ marginTop: 3 }}>
                  {c?.orgName ? `${c.orgName} · ` : ''}{isWorker && w ? categoryName(w.category, lang) : t(`a.${me.role}` as any)}
                </p>
                {isWorker && w?.reviewCount ? <div style={{ marginTop: 6 }}><Stars value={w.rating} count={w.reviewCount} /></div> : null}
                <div className="h-2 wrap" style={{ gap: 7, marginTop: 10 }}>
                  {w ? <VerifiedBadge v={w.verification} /> : null}
                  {me.demo ? <span className="tag gd">DEMO</span> : null}
                </div>
              </div>
            </div>
            <a className="btn ghost md" style={{ width: '100%', marginTop: 14 }} href={telLink(me.phone)}>
              📞 +91 {me.phone}
            </a>
          </GlassCard>
        </Reveal>

        {/* -------- worker: verification, services, radius, availability -------- */}
        {isWorker && w ? (
          <>
            {w.verification.status !== 'verified' ? (
              <Link href="/verify" style={{ display: 'block' }}>
                <GlassCard interactive className="pad-s" glow="gd">
                  <div className="between">
                    <span className="t-sm strong">🪪 {t('v.title')}</span>
                    <span aria-hidden style={{ color: 'var(--gd-600)' }}>›</span>
                  </div>
                </GlassCard>
              </Link>
            ) : null}

            <GlassCard className="pad v-4">
              <div>
                <p className="label">{t('w.services')}</p>
                <div className="h-2 wrap" style={{ gap: 8 }}>
                  {servicesOf(w.category).map((s) => {
                    const on = w.services.includes(s.id);
                    return (
                      <button key={s.id} className={`chip${on ? ' on' : ''}`} style={{ minHeight: 38, fontSize: 13.5 }}
                        onClick={() => updateWorker(w.id, {
                          services: on ? w.services.filter((x) => x !== s.id) : [...w.services, s.id],
                        })}>
                        {s.icon} {serviceName(s.id, lang)}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="label">📍 {t('o.where')}</p>
                <select className="input" value={w.geo.localityId ?? ''}
                  onChange={(e) => { const g = geoOf(e.target.value); if (g) updateWorker(w.id, { geo: g }); }}>
                  {(city(w.geo.cityId ?? 'blr')?.localities ?? []).map((l) => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <p className="label">{t('o.radius')}</p>
                <div className="grid-3">
                  {[2, 5, 10, 15].map((r) => (
                    <button key={r} className={`chip${w.radiusKm === r ? ' on' : ''}`}
                      style={{ minHeight: 50, justifyContent: 'center' }} onClick={() => updateWorker(w.id, { radiusKm: r })}>
                      {r} {t('c.km')}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="label">{t('w.availability')}</p>
                <div className="v-2">
                  {(['today', 'weekdays', 'anytime'] as Availability[]).map((v) => (
                    <button key={v} className={`choice${w.availability === v ? ' on' : ''}`} style={{ minHeight: 54 }}
                      onClick={() => updateWorker(w.id, { availability: v })}>
                      <span className="ttl">{t(`av.${v}` as any)}</span>
                      {w.availability === v ? <span className="mark">✓</span> : null}
                    </button>
                  ))}
                </div>
              </div>

              <Link href={`/worker/${w.id}`} className="btn ghost md" style={{ width: '100%' }}>
                👁️ {t('w.view')}
              </Link>
            </GlassCard>
          </>
        ) : null}

        {/* -------- customer, society, business: the account itself --------
            The spec asked for saved places, payment method, bookings, help and
            logout to live in one profile rather than being scattered through
            other screens. */}
        {!isWorker && c ? (
          <>
            <GlassCard className="pad v-4">
              <h2 className="t-h3">📍 {t('pr.places')}</h2>
              {(c.savedPlaces ?? []).length === 0 ? (
                <p className="t-xs">{t('pr.noPlaces')}</p>
              ) : (
                <div className="v-2">
                  {(c.savedPlaces ?? []).map((pl) => (
                    <div key={pl.id} className="choice" style={{ minHeight: 58 }}>
                      <span className="lead" aria-hidden>{pl.label === t('pr.home') ? '🏠' : pl.label === t('pr.work') ? '🏢' : '📍'}</span>
                      <span>
                        <span className="ttl">{pl.label}</span><br />
                        <span className="sub">{pl.geo.address ?? pl.geo.areaName}</span>
                      </span>
                      <button className="btn quiet" style={{ width: 'auto', marginLeft: 'auto' }}
                        aria-label={pl.label}
                        onClick={() => updateClient(c.id, { savedPlaces: (c.savedPlaces ?? []).filter((x) => x.id !== pl.id) })}>
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="h-2 wrap" style={{ gap: 8 }}>
                {[t('pr.home'), t('pr.work'), t('pr.other')].map((label) => (
                  <button key={label} className="chip" style={{ minHeight: 42 }}
                    onClick={() => updateClient(c.id, {
                      savedPlaces: [
                        ...(c.savedPlaces ?? []).filter((x) => x.label !== label),
                        { id: `pl_${label}_${c.id}`, label, geo: c.geo },
                      ],
                    })}>
                    ＋ {label}
                  </button>
                ))}
              </div>
            </GlassCard>

            <GlassCard className="pad v-3">
              <h2 className="t-h3">💳 {t('pr.payment')}</h2>
              <div className="h-2 wrap" style={{ gap: 8 }}>
                {PAYMENT_METHODS.map((m) => (
                  <button key={m.id} className={`chip${c.preferredPayment === m.id ? ' on' : ''}`}
                    style={{ minHeight: 44 }}
                    onClick={() => updateClient(c.id, { preferredPayment: m.id })}>
                    {m.icon} {t(m.key as any)}
                  </button>
                ))}
              </div>
              <p className="t-micro">🔒 {t('y.noteProtected')}</p>
            </GlassCard>

            <Link href="/jobs" className="choice" style={{ minHeight: 66 }}>
              <span className="lead" aria-hidden>📋</span>
              <span><span className="ttl">{t('pr.myBookings')}</span></span>
              <span className="mark" aria-hidden>›</span>
            </Link>
          </>
        ) : null}

        {/* -------- everyone: language + emergency contact -------- */}
        <GlassCard className="pad v-4">
          <div>
            <p className="label">🏙️ {t('c.city')}</p>
            <select
              className="input"
              value={me.geo.cityId ?? 'blr'}
              onChange={(e) => {
                const target = city(e.target.value);
                if (!target) return;
                const g = geoOf(target.localities[0].id)!;
                if (isWorker && w) updateWorker(w.id, { geo: g });
                else if (c) updateClient(c.id, { geo: g });
              }}
            >
              {CITIES.map((ct) => <option key={ct.id} value={ct.id}>{ct.name}</option>)}
            </select>
            <p className="t-micro" style={{ marginTop: 6 }}>📍 {me.geo.areaName}</p>
          </div>

          <div>
            <p className="label">🌐 {t('o.lang')}</p>
            <div className="h-2 wrap" style={{ gap: 8 }}>
              {LANGUAGES.map((l) => (
                <button key={l.code} className={`chip${l.code === lang ? ' on' : ''}`} onClick={() => setLang(l.code)}>
                  {l.native}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="label">🆘 {t('x.contact')}</p>
            <input
              className="input" inputMode="numeric" maxLength={10}
              placeholder={t('a.phonePh')}
              value={(isWorker ? w?.emergencyContact : c?.emergencyContact) ?? ''}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, '');
                if (isWorker && w) updateWorker(w.id, { emergencyContact: v });
                else if (c) updateClient(c.id, { emergencyContact: v });
              }}
            />
            <p className="t-xs" style={{ marginTop: 6 }}>{t('x.contactSet')}</p>
          </div>
        </GlassCard>

        <a href="https://wa.me/919000000000?text=KaamSetu%20help" target="_blank" rel="noopener noreferrer"
           className="choice" style={{ minHeight: 66 }}>
          <span className="lead" aria-hidden>🛟</span>
          <span><span className="ttl">{t('pr.help')}</span><br /><span className="sub">{t('ts.support')}</span></span>
          <span className="mark" aria-hidden>›</span>
        </a>

        <Link href="/trust" className="choice" style={{ minHeight: 66 }}>
          <span className="lead" aria-hidden>🛡️</span>
          <span>
            <span className="ttl">{t('ts.title')}</span><br />
            <span className="sub">{t('ts.sub')}</span>
          </span>
          <span className="mark" aria-hidden>›</span>
        </Link>

        <button className="btn ghost" onClick={() => { logout(); router.push('/login'); }}>{t('c.logout')}</button>
        <button className="btn quiet" onClick={() => { reset(); router.push('/login'); }}>♻️ Reset demo data</button>

        {/* Build stamp. Small, but it ends the "which version is this?"
            question that cost an afternoon. */}
        <p className="t-micro mid" style={{ opacity: .75 }}>
          KaamSetu v{VERSION} · {BUILD}
        </p>
      </main>
      <Dock items={isWorker ? navWorker(t) : navNormal(t)} />
    </Shell>
  );
}
