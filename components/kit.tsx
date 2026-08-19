'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { LANGUAGES, speechLocale } from '@/lib/i18n';
import type { LangCode, Verification } from '@/lib/types';
import { useActions, useT } from './store';
import { ThemeToggle } from './theme';
import { GlassCard, Sheet, VoiceOrb, AudioBars } from './aurora';

/* --------------------------------------------------------------- structure */

export function Shell({ children, wide }: { children: React.ReactNode; wide?: boolean }) {
  return <div className={wide ? 'shell wide' : 'shell'}>{children}</div>;
}

export function TopBar({
  title, subtitle, back, right, glassy,
}: {
  title?: string; subtitle?: string; back?: boolean | string;
  right?: React.ReactNode; glassy?: boolean;
}) {
  const router = useRouter();
  const { t } = useT();
  return (
    <header className={`topbar${glassy ? ' glassy' : ''} no-print`}>
      {back ? (
        <button className="icon-btn" aria-label={t('c.back')}
          onClick={() => (typeof back === 'string' ? router.push(back) : router.back())}>←</button>
      ) : <div className="mark" aria-hidden>क</div>}
      <div className="grow" style={{ minWidth: 0 }}>
        {title ? <h1 className="t-h3" style={ellipsis}>{title}</h1> : null}
        {subtitle ? <p className="t-xs" style={ellipsis}>{subtitle}</p> : null}
      </div>
      {right}
    </header>
  );
}

const ellipsis: React.CSSProperties = { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' };

/* ---------------------------------------------------------------- language */

export function LangButton() {
  const { lang } = useT();
  const { setLang } = useActions();
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <button className="icon-btn" onClick={() => setOpen(true)} aria-label="Change language">
        🌐 {LANGUAGES.find((l) => l.code === lang)?.native}
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title="भाषा / Language">
        <div className="v-3">
          {LANGUAGES.map((l) => (
            <button key={l.code} className={`choice${l.code === lang ? ' on' : ''}`}
              onClick={() => { setLang(l.code); setOpen(false); }}>
              <span className="lead" aria-hidden>🗣️</span>
              <span><span className="ttl">{l.native}</span><br /><span className="sub">{l.label}</span></span>
              {l.code === lang ? <span className="mark">✓</span> : null}
            </button>
          ))}
        </div>
      </Sheet>
    </>
  );
}

export function HeaderTools() {
  return <><LangButton /><ThemeToggle /></>;
}

/* ------------------------------------------------------------------- voice */

/**
 * Voice capture that KEEPS THE SPOKEN LANGUAGE.
 * V1 sometimes returned English because the recogniser locale was not set
 * from the chosen language. Here `rec.lang` is always the user's language, so
 * Hindi speech comes back in Devanagari, Tamil in Tamil script, and so on.
 */
export function useSpeech(lang: LangCode, onText: (t: string) => void) {
  const [listening, setListening] = React.useState(false);
  const [supported, setSupported] = React.useState(true);
  const recRef = React.useRef<any>(null);
  const baseRef = React.useRef('');

  React.useEffect(() => {
    const SR = typeof window !== 'undefined' &&
      ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
    if (!SR) setSupported(false);
    return () => { try { recRef.current?.stop(); } catch {} };
  }, []);

  const stop = React.useCallback(() => {
    try { recRef.current?.stop(); } catch {}
    setListening(false);
  }, []);

  const start = React.useCallback((existing = '') => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { setSupported(false); return; }
    const rec = new SR();
    rec.lang = speechLocale(lang);          // ← the fix
    rec.continuous = true;
    rec.interimResults = true;
    baseRef.current = existing ? existing + ' ' : '';
    rec.onresult = (e: any) => {
      let txt = '';
      for (let i = e.resultIndex; i < e.results.length; i++) txt += e.results[i][0].transcript;
      onText((baseRef.current + txt).trim());
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    try { rec.start(); recRef.current = rec; setListening(true); } catch { setListening(false); }
  }, [lang, onText]);

  return { listening, supported, start, stop };
}

/** Mic + textarea, always both. The mic is primary; typing never disappears. */
export function VoiceField({
  lang, value, onChange, placeholder, orbSize = 132,
}: {
  lang: LangCode; value: string; onChange: (v: string) => void;
  placeholder?: string; orbSize?: number;
}) {
  const { t } = useT();
  const { listening, supported, start, stop } = useSpeech(lang, onChange);
  return (
    <div className="v-4">
      <VoiceOrb size={orbSize} live={listening} onClick={() => (listening ? stop() : start(value))} />
      <div className="mid v-2" style={{ marginTop: -12 }}>
        {listening ? <div className="h-2" style={{ justifyContent: 'center' }}><AudioBars /></div> : null}
        <p className="t-h3">{listening ? t('o.listening') : t('o.tapSpeak')}</p>
      </div>
      {!supported ? <p className="note gd">{t('o.noMic')}</p> : null}
      <textarea
        className="textarea" style={{ minHeight: 92 }}
        value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? t('o.example')}
        aria-label={placeholder ?? t('o.example')}
      />
    </div>
  );
}

/* --------------------------------------------------------------- phone/OTP */

export function PhoneOtp({
  onVerified, askName, askOrg,
}: {
  onVerified: (phone: string, name: string, orgName?: string) => void;
  askName?: boolean; askOrg?: boolean;
}) {
  const { t } = useT();
  const [phone, setPhone] = React.useState('');
  const [name, setName] = React.useState('');
  const [org, setOrg] = React.useState('');
  const [sent, setSent] = React.useState(false);
  const [code, setCode] = React.useState('');
  const [err, setErr] = React.useState('');
  const ok = /^[6-9]\d{9}$/.test(phone);

  if (!sent) {
    return (
      <div className="v-4">
        <div>
          <h2 className="t-h2">{t('a.phoneTitle')}</h2>
          <p className="t-sm" style={{ marginTop: 4 }}>{t('a.phoneSub')}</p>
        </div>
        <div>
          <label className="label" htmlFor="ph">📱 {t('a.phoneTitle')}</label>
          <input id="ph" className="input" inputMode="numeric" maxLength={10}
            placeholder={t('a.phonePh')} value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))} />
          {phone.length > 0 && !ok ? <p className="t-xs" style={{ marginTop: 6, color: 'var(--danger)' }}>{t('e.phone')}</p> : null}
        </div>
        {askName ? (
          <div>
            <label className="label" htmlFor="nm">🙋 {t('a.nameLabel')}</label>
            <input id="nm" className="input" placeholder={t('a.namePh')} value={name} onChange={(e) => setName(e.target.value)} />
          </div>
        ) : null}
        {askOrg ? (
          <div>
            <label className="label" htmlFor="og">🏢 {t('a.orgLabel')}</label>
            <input id="og" className="input" placeholder={t('a.orgPh')} value={org} onChange={(e) => setOrg(e.target.value)} />
          </div>
        ) : null}
        <button className="btn" disabled={!ok} onClick={() => setSent(true)}>{t('a.sendCode')}</button>
      </div>
    );
  }

  return (
    <div className="v-4">
      <div>
        <h2 className="t-h2">{t('a.otpTitle')}</h2>
        <p className="t-sm" style={{ marginTop: 4 }}>{t('a.otpSub')} +91 {phone}</p>
      </div>
      <input className="input otp" inputMode="numeric" maxLength={6} placeholder="••••••"
        aria-label={t('a.otpTitle')} value={code}
        onChange={(e) => { setCode(e.target.value.replace(/\D/g, '')); setErr(''); }} />
      <p className="note">🔐 {t('a.otpDemo')}</p>
      {err ? <p className="note gd">{err}</p> : null}
      <button className="btn" disabled={code.length !== 6}
        onClick={() => (code === '123456' ? onVerified(phone, name, org) : setErr(t('a.otpWrong')))}>
        {t('a.verify')}
      </button>
      <button className="btn quiet" onClick={() => { setSent(false); setCode(''); setErr(''); }}>← {t('c.back')}</button>
    </div>
  );
}

/* ------------------------------------------------------------------ badges */

export function VerifiedBadge({ v, small }: { v: Verification; small?: boolean }) {
  const { t } = useT();
  const map = {
    verified:   { cls: 'em',  icon: '✅', key: 'w.verified' as const },
    pending:    { cls: 'gd',  icon: '⏳', key: 'w.pending' as const },
    failed:     { cls: 'red', icon: '⚠️', key: 'w.failed' as const },
    unverified: { cls: '',    icon: '○',  key: 'w.unverified' as const },
  }[v.status];
  return (
    <span className={`tag ${map.cls}`} style={small ? { fontSize: 11.5, padding: '4px 9px' } : undefined}>
      {map.icon} {t(map.key)}
    </span>
  );
}

export function Stars({ value, count }: { value: number; count?: number }) {
  const full = Math.round(value);
  return (
    <span className="h-2" style={{ gap: 6 }}>
      <span aria-label={`${value.toFixed(1)} out of 5`} style={{ color: 'var(--gd-500)', fontWeight: 700, letterSpacing: 1 }}>
        {'★'.repeat(full)}<span style={{ opacity: 0.25 }}>{'★'.repeat(Math.max(0, 5 - full))}</span>
      </span>
      <span className="t-xs"><b className="strong">{value.toFixed(1)}</b>{count != null ? ` (${count})` : ''}</span>
    </span>
  );
}

export function Initials({ name, size = 'm', tone }: { name: string; size?: 's' | 'm' | 'l'; tone?: 'gd' | 'in' }) {
  const i = name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
  return <div className={`av ${size}${tone ? ' ' + tone : ''}`}>{i}</div>;
}

export function Money({ amount }: { amount: number }) {
  return <>₹{Math.round(amount).toLocaleString('en-IN')}</>;
}

export function Empty({ text, icon = '🔎' }: { text: string; icon?: string }) {
  return <div className="empty"><span className="big" aria-hidden>{icon}</span>{text}</div>;
}
