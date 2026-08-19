'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { LANGUAGES } from '@/lib/i18n';
import type { Role } from '@/lib/types';
import { useActions, useT } from '@/components/store';
import { GlassCard, Reveal, Stagger, StaggerItem } from '@/components/aurora';
import { HeaderTools, PhoneOtp, Shell, TopBar } from '@/components/kit';

const ROLES = [
  { role: 'worker'   as Role, icon: '🧰', title: 'a.worker'   as const, desc: 'a.workerD'   as const, demo: 'a.demoWorker'   as const },
  { role: 'customer' as Role, icon: '🏠', title: 'a.customer' as const, desc: 'a.customerD' as const, demo: 'a.demoCustomer' as const },
  { role: 'society'  as Role, icon: '🏢', title: 'a.society'  as const, desc: 'a.societyD'  as const, demo: 'a.demoSociety'  as const },
  { role: 'business' as Role, icon: '🏪', title: 'a.business' as const, desc: 'a.businessD' as const, demo: 'a.demoBusiness' as const },
];

export default function Login() {
  const router = useRouter();
  const { t, lang } = useT();
  const { setLang, loginDemo, loginClient } = useActions();
  const [role, setRole] = React.useState<Role | null>(null);

  return (
    <Shell>
      <TopBar title={t('app.name')} subtitle={t('app.tagline')} right={<HeaderTools />} />
      <main className="page v-6" style={{ paddingTop: 4, paddingBottom: 40 }}>

        {!role ? (
          <>
            <Reveal>
              <div className="scroll-x">
                {LANGUAGES.map((l) => (
                  <button key={l.code} className={`chip${l.code === lang ? ' on' : ''}`} onClick={() => setLang(l.code)}>
                    {l.native}
                  </button>
                ))}
              </div>
            </Reveal>

            <Reveal delay={0.05}><h2 className="t-h1">{t('a.choose')}</h2></Reveal>

            <Stagger className="v-3" gap={0.06}>
              {ROLES.map((r) => (
                <StaggerItem key={r.role}>
                  <button className="choice" style={{ minHeight: 84 }} onClick={() => setRole(r.role)}>
                    <span className="lead" aria-hidden style={{ fontSize: 26 }}>{r.icon}</span>
                    <span>
                      <span className="ttl">{t(r.title)}</span><br />
                      <span className="sub">{t(r.desc)}</span>
                    </span>
                    <span className="mark" aria-hidden>›</span>
                  </button>
                </StaggerItem>
              ))}
            </Stagger>

            {/* One-tap demo accounts, so a judge never has to register. */}
            <Reveal delay={0.05}>
              <GlassCard className="pad" glow="gd">
                <h3 className="t-h3">👀 {t('a.demoTitle')}</h3>
                <p className="t-sm" style={{ marginTop: 4 }}>{t('a.demoDesc')}</p>
                <div className="grid-2" style={{ marginTop: 14 }}>
                  {ROLES.map((r) => (
                    <button
                      key={r.role}
                      className="btn ghost md"
                      style={{ width: '100%' }}
                      onClick={() => { loginDemo(r.role); router.push('/'); }}
                    >
                      {r.icon} {t(r.demo)}
                    </button>
                  ))}
                </div>
              </GlassCard>
            </Reveal>
          </>
        ) : (
          <>
            <button className="btn quiet" style={{ alignSelf: 'flex-start' }} onClick={() => setRole(null)}>
              ← {t('a.choose')}
            </button>

            {role === 'worker' ? (
              <GlassCard className="pad v-4">
                <h2 className="t-h2">🧰 {t('a.worker')}</h2>
                <p className="t-sm">{t('a.workerD')}</p>
                <button className="btn" onClick={() => router.push('/worker/onboarding')}>{t('c.continue')} →</button>
              </GlassCard>
            ) : (
              <GlassCard className="pad">
                <PhoneOtp
                  askName
                  askOrg={role === 'society' || role === 'business'}
                  onVerified={(phone, name, orgName) => {
                    loginClient(role as Exclude<Role, 'worker'>, phone, lang, name, orgName);
                    router.push('/');
                  }}
                />
              </GlassCard>
            )}
          </>
        )}
      </main>
    </Shell>
  );
}
