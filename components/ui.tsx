'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { LANGUAGES } from '@/lib/i18n';
import type { CategoryId, JobStatus, LangCode, TrustScore, Urgency } from '@/lib/types';
import { categoryById } from '@/lib/ai/taxonomy';
import { useActions, useT } from './store';

/* ------------------------------------------------------------------ shell */

export function Shell({ children, wide }: { children: React.ReactNode; wide?: boolean }) {
  return <div className={wide ? 'shell wide' : 'shell'}>{children}</div>;
}

export function TopBar({
  title,
  subtitle,
  back,
  right,
}: {
  title: string;
  subtitle?: string;
  back?: boolean | string;
  right?: React.ReactNode;
}) {
  const router = useRouter();
  return (
    <header className="topbar no-print">
      {back ? (
        <button
          className="iconbtn"
          aria-label="Back"
          onClick={() => (typeof back === 'string' ? router.push(back) : router.back())}
        >
          ←
        </button>
      ) : (
        <div className="brandmark">क</div>
      )}
      <div className="grow">
        <h1>{title}</h1>
        {subtitle ? <p className="sub">{subtitle}</p> : null}
      </div>
      {right}
    </header>
  );
}

export function LangButton() {
  const { lang } = useT();
  const { setLang } = useActions();
  const [open, setOpen] = React.useState(false);
  const current = LANGUAGES.find((l) => l.code === lang);
  return (
    <>
      <button className="iconbtn" onClick={() => setOpen(true)} aria-label="Change language">
        🌐 {current?.native}
      </button>
      {open ? (
        <Sheet onClose={() => setOpen(false)}>
          <h3 className="title">भाषा / Language</h3>
          <div className="stack" style={{ marginTop: 12 }}>
            {LANGUAGES.map((l) => (
              <button
                key={l.code}
                className={`opt${l.code === lang ? ' selected' : ''}`}
                onClick={() => {
                  setLang(l.code as LangCode);
                  setOpen(false);
                }}
              >
                <span className="emoji">🗣️</span>
                <span>
                  <span className="t">{l.native}</span>
                  <br />
                  <span className="d">{l.label}</span>
                </span>
                {l.code === lang ? <span className="check">✓</span> : null}
              </button>
            ))}
          </div>
        </Sheet>
      ) : null}
    </>
  );
}

export function Sheet({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(15,20,28,.45)', zIndex: 60,
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff', width: '100%', maxWidth: 520,
          borderRadius: '22px 22px 0 0', padding: '18px 16px 26px',
          maxHeight: '84dvh', overflowY: 'auto',
        }}
      >
        {children}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- navigation */

export function WorkerTabs() {
  const { t } = useT();
  const path = usePathname();
  const items = [
    { href: '/worker', ic: '🔎', label: t('w.nav.jobs') },
    { href: '/worker/mine', ic: '🧰', label: t('w.nav.mine') },
    { href: '/worker/profile', ic: '👤', label: t('w.nav.profile') },
  ];
  return (
    <nav className="tabbar no-print">
      {items.map((i) => (
        <Link key={i.href} href={i.href} className={path === i.href ? 'on' : ''}>
          <span className="ic">{i.ic}</span>
          {i.label}
        </Link>
      ))}
    </nav>
  );
}

export function ResidentTabs() {
  const { t } = useT();
  const path = usePathname();
  const items = [
    { href: '/resident', ic: '📋', label: t('r.nav.mine') },
    { href: '/resident/new', ic: '➕', label: t('r.nav.post') },
    { href: '/scrap', ic: '♻️', label: t('r.nav.scrap') },
  ];
  return (
    <nav className="tabbar no-print">
      {items.map((i) => (
        <Link key={i.href} href={i.href} className={path === i.href ? 'on' : ''}>
          <span className="ic">{i.ic}</span>
          {i.label}
        </Link>
      ))}
    </nav>
  );
}

export function Steps({ n, of }: { n: number; of: number }) {
  return (
    <div className="steps">
      {Array.from({ length: of }).map((_, i) => (
        <i key={i} className={i < n ? 'on' : ''} />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ atoms */

export function CategoryTag({ id }: { id: CategoryId }) {
  const { t } = useT();
  const def = categoryById(id);
  return (
    <span className="pill">
      {def.icon} {t(`cat.${id}` as any)}
    </span>
  );
}

export function UrgencyTag({ u }: { u: Urgency }) {
  const { t } = useT();
  const tone = u === 'emergency' ? 'red' : u === 'today' ? 'amber' : 'blue';
  return <span className={`pill ${tone}`}>{t(`u.${u}` as any)}</span>;
}

export function StatusTag({ s }: { s: JobStatus }) {
  const { t } = useT();
  const tone =
    s === 'completed' ? 'green' : s === 'open' ? 'blue' : s === 'cancelled' ? 'red' : 'amber';
  return <span className={`pill ${tone}`}>{t(`st.${s}` as any)}</span>;
}

export function Money({ amount }: { amount: number }) {
  return <>₹{Math.round(amount).toLocaleString('en-IN')}</>;
}

export function Avatar({ name }: { name: string }) {
  const initials = name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
  return <div className="avatar">{initials}</div>;
}

export function TrustBars({ trust }: { trust: TrustScore }) {
  const { t } = useT();
  if (!trust.reviewCount) {
    return <span className="pill amber">✨ {t('trust.new')}</span>;
  }
  const rows: [string, number][] = [
    [t('trust.reliability'), trust.reliability],
    [t('trust.skill'), trust.skillQuality],
    [t('trust.prof'), trust.professionalism],
  ];
  return (
    <div className="stack" style={{ gap: 8 }}>
      {rows.map(([label, v]) => (
        <div key={label}>
          <div className="row-between" style={{ marginBottom: 3 }}>
            <span className="tiny">{label}</span>
            <span className="tiny bold">{v.toFixed(1)}</span>
          </div>
          <div className="bar">
            <span style={{ width: `${(v / 5) * 100}%` }} />
          </div>
        </div>
      ))}
      <span className="tiny">
        ⭐ {trust.overall.toFixed(1)} · {trust.reviewCount} reviews
      </span>
    </div>
  );
}

export function Empty({ text, icon = '🗂️' }: { text: string; icon?: string }) {
  return (
    <div className="empty">
      <span className="big">{icon}</span>
      {text}
    </div>
  );
}

export function Loading({ text }: { text: string }) {
  return (
    <div className="empty">
      <span className="big">⏳</span>
      {text}
    </div>
  );
}
