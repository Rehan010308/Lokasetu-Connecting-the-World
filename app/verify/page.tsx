'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { isValidAadhaarFormat, verifyIdentity } from '@/lib/verify';
import { useActions, useMe, useStore, useT } from '@/components/store';
import { GlassCard, Reveal, SPRING } from '@/components/aurora';
import { HeaderTools, Shell, TopBar, VerifiedBadge } from '@/components/kit';
import { motion, useReducedMotion } from 'motion/react';

/**
 * Aadhaar verification — simulated, and honest about it on screen.
 * The number never leaves this component: only the last four digits are
 * handed to the store. See lib/verify.ts for the production swap point.
 */
export default function VerifyPage() {
  const router = useRouter();
  const { ready } = useStore();
  const me = useMe();
  const { t } = useT();
  const { setVerification } = useActions();
  const reduce = useReducedMotion();

  const [aadhaar, setAadhaar] = React.useState('');
  const [consent, setConsent] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [result, setResult] = React.useState<'ok' | 'fail' | null>(null);

  React.useEffect(() => {
    if (ready && me.role !== 'worker') router.replace('/login');
  }, [ready, me.role, router]);

  const digits = aadhaar.replace(/\D/g, '');
  const looksValid = digits.length === 12;

  async function run() {
    if (!me.worker) return;
    setBusy(true);
    setVerification(me.worker.id, { status: 'pending', method: 'simulated', checkedAt: Date.now() });
    const r = await verifyIdentity(digits, me.worker.name);
    setVerification(me.worker.id, r.verification);
    setResult(r.ok ? 'ok' : 'fail');
    setBusy(false);
  }

  const pretty = digits.replace(/(\d{4})(?=\d)/g, '$1 ').trim();

  return (
    <Shell>
      <TopBar back="/" title={t('v.title')} right={<HeaderTools />} />
      <main className="page v-4" style={{ paddingTop: 4 }}>

        {result === 'ok' ? (
          <Reveal>
            <GlassCard className="pad-l mid v-4" glow="em">
              <motion.div
                initial={reduce ? false : { scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={SPRING.bouncy}
                style={{ fontSize: 52 }}
              >✅</motion.div>
              <h1 className="t-h1">{t('v.ok')}</h1>
              <p className="t-sm">{t('v.okSub')}</p>
              {me.worker ? <div className="h-2" style={{ justifyContent: 'center' }}><VerifiedBadge v={me.worker.verification} /></div> : null}
              <button className="btn" onClick={() => router.push('/')}>{t('c.continue')} →</button>
            </GlassCard>
          </Reveal>
        ) : (
          <>
            <div>
              <h1 className="t-h1">🪪 {t('v.title')}</h1>
              <p className="t-sm" style={{ marginTop: 6 }}>{t('v.sub')}</p>
            </div>

            {result === 'fail' ? (
              <GlassCard className="pad-s" style={{ borderColor: 'rgba(229,72,77,.4)' }}>
                <p className="t-sm strong" style={{ color: 'var(--danger)' }}>⚠️ {t('v.fail')}</p>
                <p className="t-xs" style={{ marginTop: 4 }}>{t('v.failSub')}</p>
              </GlassCard>
            ) : null}

            <div>
              <label className="label" htmlFor="aadhaar">🪪 {t('v.ph')}</label>
              <input
                id="aadhaar"
                className="input t-num"
                inputMode="numeric"
                maxLength={14}
                value={pretty}
                placeholder="0000 0000 0000"
                onChange={(e) => { setAadhaar(e.target.value.replace(/\D/g, '').slice(0, 12)); setResult(null); }}
                style={{ letterSpacing: '.12em', fontSize: 20, fontWeight: 700 }}
              />
              {digits.length === 12 && !isValidAadhaarFormat(digits) ? (
                <p className="t-xs" style={{ marginTop: 6, color: 'var(--danger)' }}>{t('e.aadhaar')}</p>
              ) : null}
            </div>

            <button
              className={`choice${consent ? ' on' : ''}`}
              onClick={() => setConsent((c) => !c)}
              role="checkbox"
              aria-checked={consent}
              style={{ minHeight: 72, alignItems: 'flex-start' }}
            >
              <span className="lead" aria-hidden>{consent ? '☑️' : '⬜'}</span>
              <span className="t-sm" style={{ color: 'var(--ink)', lineHeight: 1.45 }}>{t('v.consent')}</span>
            </button>

            <p className="note em">🔒 {t('v.privacy')}</p>
            <p className="note gd">🧪 {t('v.simNote')}</p>

            <button className="btn" disabled={!looksValid || !consent || busy} onClick={run}>
              {busy ? `⏳ ${t('v.checking')}` : t('v.now')}
            </button>
            <button className="btn quiet" onClick={() => router.push('/')}>{t('v.later')}</button>
          </>
        )}
      </main>
    </Shell>
  );
}
