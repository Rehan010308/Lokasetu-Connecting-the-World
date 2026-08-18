'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { AREAS } from '@/lib/geo';
import { categoryById } from '@/lib/ai/taxonomy';
import type { Availability } from '@/lib/types';
import { useActions, useCurrentWorker, useStore, useT } from '@/components/store';
import { Avatar, LangButton, Loading, Shell, TopBar, TrustBars, WorkerTabs } from '@/components/ui';

export default function WorkerProfile() {
  const router = useRouter();
  const { ready } = useStore();
  const me = useCurrentWorker();
  const { t } = useT();
  const { updateWorker, logout } = useActions();

  React.useEffect(() => {
    if (ready && !me) router.replace('/worker/onboarding');
  }, [ready, me, router]);

  if (!ready || !me) return <Shell><Loading text="…" /></Shell>;

  return (
    <Shell>
      <TopBar title={t('w.nav.profile')} right={<LangButton />} />
      <div className="page stack">
        <div className="card">
          <div className="row" style={{ gap: 12 }}>
            <Avatar name={me.name} />
            <div className="grow">
              <div className="bold" style={{ fontSize: 18 }}>{me.name}</div>
              <div className="muted">
                {categoryById(me.category).icon} {t(`cat.${me.category}` as any)} · {me.experienceYears} {t('c.years')}
              </div>
            </div>
          </div>
          <div className="divider" style={{ margin: '14px 0' }} />
          <div className="chips">
            {me.skills.map((s) => <span key={s} className="chip on">{s}</span>)}
          </div>
          <div className="tiny" style={{ marginTop: 12 }}>🎙️ &ldquo;{me.rawSpeech}&rdquo;</div>
        </div>

        <div className="card">
          <h3 className="title">⭐ Trust</h3>
          <div className="spacer" />
          <TrustBars trust={me.trust} />
          <div className="kv" style={{ marginTop: 10 }}>
            <span className="k">{t('w.profile.jobsDone')}</span>
            <span className="v">{me.jobsDone}</span>
          </div>
        </div>

        <div className="card">
          <h3 className="title">📍 {me.geo.areaName}</h3>
          <label className="lbl" style={{ marginTop: 12 }}>{t('ob.loc.pick')}</label>
          <select
            className="select"
            value={me.geo.areaName}
            onChange={(e) => {
              const a = AREAS.find((x) => x.areaName === e.target.value);
              if (a) updateWorker(me.id, { geo: a });
            }}
          >
            {AREAS.map((a) => <option key={a.areaName} value={a.areaName}>{a.areaName}</option>)}
          </select>

          <label className="lbl" style={{ marginTop: 14 }}>{t('w.profile.radius')}</label>
          <div className="grid3">
            {[2, 5, 10].map((r) => (
              <button
                key={r}
                className={`chip${me.radiusKm === r ? ' on' : ''}`}
                style={{ minHeight: 50, justifyContent: 'center' }}
                onClick={() => updateWorker(me.id, { radiusKm: r })}
              >
                {r} km
              </button>
            ))}
          </div>

          <label className="lbl" style={{ marginTop: 14 }}>{t('w.profile.availability')}</label>
          <div className="stack">
            {(['today', 'weekdays', 'anytime'] as Availability[]).map((v) => (
              <button
                key={v}
                className={`opt${me.availability === v ? ' selected' : ''}`}
                style={{ minHeight: 52 }}
                onClick={() => updateWorker(me.id, { availability: v })}
              >
                <span className="t">{t(`ob.avail.${v}` as any)}</span>
                {me.availability === v ? <span className="check">✓</span> : null}
              </button>
            ))}
          </div>
        </div>

        <button className="btn ghost" onClick={() => { logout(); router.push('/'); }}>
          {t('c.logout')}
        </button>
      </div>
      <WorkerTabs />
    </Shell>
  );
}
