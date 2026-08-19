'use client';

import React from 'react';
import Link from 'next/link';
import { POLICY_ROWS } from '@/lib/cancellation';
import { useMe, useT } from '@/components/store';
import { Dock, GlassCard, Reveal, Stagger, StaggerItem } from '@/components/aurora';
import { HeaderTools, Panel, Shell, TopBar } from '@/components/kit';
import { navNormal, navWorker } from '@/components/nav';

/* ===========================================================================
   TRUST & SAFETY CENTRE
   ---------------------------------------------------------------------------
   One page that answers the question both sides actually have before they let
   a stranger into a house, or walk into one: what happens if this goes wrong?

   Every claim here maps to something the code really does — escrow states in
   lib/payments.ts, last-4-only storage in lib/verify.ts, the fee schedule in
   lib/cancellation.ts. Nothing on this page is marketing.
   =========================================================================== */

type Section = { icon: string; titleKey: any; bodyKey: any; href?: string; hrefLabel?: string };

const SECTIONS: Section[] = [
  { icon: '🔒', titleKey: 'ts.securePay',      bodyKey: 'tb.pay' },
  { icon: '✅', titleKey: 'ts.verifiedWorker', bodyKey: 'tb.verify',  href: '/verify', hrefLabel: 'v.title' },
  { icon: '🆘', titleKey: 'ts.emergency',      bodyKey: 'tb.sos' },
  { icon: '🕵️', titleKey: 'ts.fraud',          bodyKey: 'tb.fraud' },
  { icon: '🔐', titleKey: 'ts.privacy',        bodyKey: 'tb.privacy' },
  { icon: '🚩', titleKey: 'ts.report',         bodyKey: 'tb.report' },
  { icon: '🤝', titleKey: 'ts.guidelines',     bodyKey: 'tb.rules' },
];

export default function TrustPage() {
  const me = useMe();
  const { t } = useT();
  const isWorker = me.role === 'worker';

  return (
    <Shell aside={<TrustAside />}>
      <TopBar glassy title={t('ts.title')} subtitle={t('ts.sub')} back right={<HeaderTools />} />
      <main className="page v-4">

        <Reveal>
          <GlassCard sheen className="pad-l" glow="em">
            <div className="h-4">
              <div style={{ fontSize: 34 }} aria-hidden>🛡️</div>
              <div className="grow">
                <h2 className="t-h2">{t('ts.protected')}</h2>
                <p className="t-sm" style={{ marginTop: 4 }}>{t('tb.pay')}</p>
              </div>
            </div>
          </GlassCard>
        </Reveal>

        <Stagger className="v-3" gap={0.05}>
          {SECTIONS.map((s) => (
            <StaggerItem key={s.titleKey}>
              <GlassCard className="pad">
                <div className="h-4 top">
                  <div style={{ fontSize: 26, lineHeight: 1 }} aria-hidden>{s.icon}</div>
                  <div className="grow">
                    <h3 className="t-h3">{t(s.titleKey)}</h3>
                    <p className="t-sm" style={{ marginTop: 6 }}>{t(s.bodyKey)}</p>
                    {s.href ? (
                      <Link href={s.href} className="btn sm ghost" style={{ marginTop: 12 }}>
                        {t(s.hrefLabel)} →
                      </Link>
                    ) : null}
                  </div>
                </div>
              </GlassCard>
            </StaggerItem>
          ))}
        </Stagger>

        {/* the cancellation schedule, straight from lib/cancellation.ts */}
        <Reveal>
          <GlassCard className="pad">
            <h3 className="t-h3">🔄 {t('ts.cancelPol')}</h3>
            <p className="t-sm" style={{ margin: '6px 0 12px' }}>{t('tb.cancel')}</p>
            {POLICY_ROWS.map((r) => (
              <div key={r.whenKey} className="kv">
                <span className="k"><span aria-hidden>{r.icon}</span> {t(r.whenKey as any)}</span>
                <span className="v">{t(r.costKey as any)}</span>
              </div>
            ))}
          </GlassCard>
        </Reveal>

        <p className="note">🔐 {t('y.simNote')}</p>
      </main>
      <Dock items={isWorker ? navWorker(t) : navNormal(t)} />
    </Shell>
  );
}

function TrustAside() {
  const { t } = useT();
  return (
    <>
      <Panel title={t('d.quick')} icon="⚡">
        <div className="v-2">
          <a href="tel:112" className="btn sm" style={{ background: 'var(--danger)' }}>🆘 112</a>
          <Link href="/verify" className="btn sm ghost">🪪 {t('v.title')}</Link>
        </div>
      </Panel>
      <Panel title={t('ts.privacy')} icon="🔐">
        <p className="t-xs">{t('tb.privacy')}</p>
      </Panel>
    </>
  );
}
