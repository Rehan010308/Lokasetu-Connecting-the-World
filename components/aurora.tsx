'use client';

/* ===========================================================================
   AURORA COMPONENT LIBRARY
   Motion primitives + surfaces for KaamSetu.

   Motion contract (every animation in the app obeys these):
     • transform + opacity only — never width/height/top/left
     • springs for anything a finger caused, eases for anything time caused
     • one motion per intent; nothing animates just because it can
     • useReducedMotion is respected everywhere, no exceptions
   =========================================================================== */

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion, useMotionValue, useReducedMotion, useSpring } from 'motion/react';

/* ------------------------------------------------------------ motion tokens */

export const SPRING = {
  /** finger-driven UI: snappy, barely overshoots */
  snap:  { type: 'spring', stiffness: 420, damping: 32, mass: 0.7 },
  /** cards and sheets: has some weight to it */
  soft:  { type: 'spring', stiffness: 240, damping: 26, mass: 0.9 },
  /** playful, for rewards and badges only */
  bouncy:{ type: 'spring', stiffness: 300, damping: 15, mass: 0.8 },
} as const;

export const EASE = {
  out:   [0.22, 1, 0.36, 1],
  inOut: [0.65, 0, 0.35, 1],
} as const;

/* ---------------------------------------------------------------- reveal/stagger */

export function Reveal({
  children, delay = 0, y = 18, className, style,
}: {
  children: React.ReactNode; delay?: number; y?: number; className?: string; style?: React.CSSProperties;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      style={style}
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.55, ease: EASE.out, delay }}
    >
      {children}
    </motion.div>
  );
}

/** Children animate in one after another. Use for lists and chip rows. */
export function Stagger({
  children, gap = 0.055, className, style,
}: { children: React.ReactNode; gap?: number; className?: string; style?: React.CSSProperties }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      style={style}
      initial={reduce ? false : 'hide'}
      animate="show"
      variants={{ show: { transition: { staggerChildren: gap } } }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children, className, style,
}: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <motion.div
      className={className}
      style={style}
      variants={{ hide: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE.out } } }}
    >
      {children}
    </motion.div>
  );
}

/* -------------------------------------------------------------------- magnetic */

/**
 * Pointer-following wrapper. Subtle by design — 6px of travel reads as
 * "responsive", 20px reads as a toy. Disabled entirely on touch, where there
 * is no hover to respond to.
 */
export function Magnetic({
  children, strength = 0.22, className,
}: { children: React.ReactNode; strength?: number; className?: string }) {
  const reduce = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 260, damping: 18, mass: 0.5 });
  const sy = useSpring(y, { stiffness: 260, damping: 18, mass: 0.5 });
  const ref = React.useRef<HTMLDivElement>(null);

  function onMove(e: React.PointerEvent) {
    if (reduce || e.pointerType !== 'mouse' || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    x.set(Math.max(-8, Math.min(8, (e.clientX - (r.left + r.width / 2)) * strength)));
    y.set(Math.max(-8, Math.min(8, (e.clientY - (r.top + r.height / 2)) * strength)));
  }
  function reset() { x.set(0); y.set(0); }

  return (
    <motion.div
      ref={ref}
      className={className}
      style={{ x: sx, y: sy }}
      onPointerMove={onMove}
      onPointerLeave={reset}
    >
      {children}
    </motion.div>
  );
}

/* --------------------------------------------------------------------- counter */

/** Counts up on mount. rAF rather than a motion value so it is dependency-free. */
export function Counter({
  to, duration = 1100, decimals = 0, prefix = '', suffix = '',
}: { to: number; duration?: number; decimals?: number; prefix?: string; suffix?: string }) {
  const reduce = useReducedMotion();
  const [n, setN] = React.useState(reduce ? to : 0);

  React.useEffect(() => {
    if (reduce) { setN(to); return; }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setN(to * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, duration, reduce]);

  const shown = decimals
    ? n.toFixed(decimals)
    : Math.round(n).toLocaleString('en-IN');
  return <span className="t-num">{prefix}{shown}{suffix}</span>;
}

/* ------------------------------------------------------------------ score ring */

export function Ring({
  value, size = 'm', tone, label, sublabel,
}: {
  value: number; size?: 's' | 'm' | 'l'; tone?: 'cy' | 'gd'; label?: string; sublabel?: string;
}) {
  const reduce = useReducedMotion();
  const [pct, setPct] = React.useState(reduce ? value : 0);
  React.useEffect(() => {
    if (reduce) { setPct(value); return; }
    const id = setTimeout(() => setPct(value), 90);
    return () => clearTimeout(id);
  }, [value, reduce]);

  return (
    <div
      className={`ring ${size}${tone ? ' ' + tone : ''}`}
      style={{ ['--pct' as any]: pct }}
      role="img"
      aria-label={label ?? `${Math.round(value)} out of 100`}
    >
      <div style={{ textAlign: 'center', lineHeight: 1.1 }}>
        <div className="val"><Counter to={value} /></div>
        {sublabel ? <div className="t-micro" style={{ fontSize: 9, marginTop: 1 }}>{sublabel}</div> : null}
      </div>
    </div>
  );
}

export function Meter({ value, tone }: { value: number; tone?: 'gd' | 'cy' }) {
  return (
    <div className={`meter${tone ? ' ' + tone : ''}`}>
      <i style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

/* -------------------------------------------------------------------- surfaces */

export function GlassCard({
  children, className = '', interactive, glow, sheen, as = 'div', ...rest
}: any) {
  const cls = [
    'glass',
    interactive ? 'lift' : '',
    sheen ? 'sheen' : '',
    glow ? `glow-${glow}` : '',
    className,
  ].filter(Boolean).join(' ');
  const El: any = as;
  return <El className={cls} {...rest}>{children}</El>;
}

/* ------------------------------------------------------------------ voice orb */

export function VoiceOrb({
  live, onClick, size = 148, label, compact,
}: { live?: boolean; onClick?: () => void; size?: number; label?: string; compact?: boolean }) {
  const reduce = useReducedMotion();
  return (
    <div className={`orb-wrap${live ? ' live' : ''}`} style={compact ? { padding: 0 } : undefined}>
      {!reduce && live ? (
        <>
          <span className="orb-ring r1" style={{ width: size, height: size }} />
          <span className="orb-ring r2" style={{ width: size, height: size }} />
          <span className="orb-ring r3" style={{ width: size, height: size }} />
        </>
      ) : null}
      <motion.button
        type="button"
        className="orb"
        style={{
          width: size, height: size, fontSize: size * 0.35,
          boxShadow: compact
            ? '0 8px 22px -6px rgba(5,150,105,.7), inset 0 1px 0 rgba(255,255,255,.3)'
            : undefined,
        }}
        onClick={onClick}
        aria-label={label ?? (live ? 'Stop listening' : 'Start speaking')}
        aria-pressed={!!live}
        whileTap={{ scale: 0.94 }}
        whileHover={reduce ? undefined : { scale: 1.04 }}
        transition={SPRING.snap}
      >
        {live ? '⏹' : '🎤'}
      </motion.button>
    </div>
  );
}

export function AudioBars() {
  return (
    <div className="bars" aria-hidden>
      <i /><i /><i /><i /><i />
    </div>
  );
}

/* ------------------------------------------------------------------ radar map */

export interface RadarPin { id: string; icon: string; x: number; y: number; label: string }

/**
 * A schematic proximity view, not a street map. Deliberate: a worker's exact
 * home address is not shown to a stranger, and a low-literacy user reads
 * "close to me" from a ring far faster than from a road network.
 */
export function RadarMap({ pins, centerIcon = '🏠' }: { pins: RadarPin[]; centerIcon?: string }) {
  const reduce = useReducedMotion();
  return (
    <div className="radar">
      <div className="radar-grid" />
      {!reduce ? <div className="radar-sweep" /> : null}
      <div className="radar-rings" aria-hidden>
        <i style={{ width: '44%' }} />
        <i style={{ width: '74%' }} />
      </div>
      <div className="pin me" style={{ left: '50%', top: '50%' }} title="You">{centerIcon}</div>
      {pins.map((p, i) => (
        <motion.div
          key={p.id}
          className="pin"
          style={{ left: `${p.x}%`, top: `${p.y}%`, animationDelay: `${i * 0.4}s` }}
          initial={reduce ? false : { opacity: 0, scale: 0.4 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ ...SPRING.bouncy, delay: 0.15 + i * 0.08 }}
          title={p.label}
        >
          {p.icon}
        </motion.div>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------- live feed */

export function LiveFeed({ items, interval = 3400 }: { items: any[]; interval?: number }) {
  const reduce = useReducedMotion();
  const [i, setI] = React.useState(0);

  React.useEffect(() => {
    if (!items.length) return;
    const id = setInterval(() => setI((p) => (p + 1) % items.length), interval);
    return () => clearInterval(id);
  }, [items.length, interval]);

  if (!items.length) return null;
  const it = items[i];

  return (
    <div className="feed">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={it.id}
          className="feed-item"
          initial={reduce ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? undefined : { opacity: 0, y: -16 }}
          transition={{ duration: 0.42, ease: EASE.out }}
        >
          <div className="av s" aria-hidden>{it.icon}</div>
          <div className="grow" style={{ minWidth: 0 }}>
            <div className="line">{it.line}</div>
            <div className="t-xs">{it.meta}</div>
          </div>
          <span className={`tag ${it.tone}`}>{it.badge}</span>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/* --------------------------------------------------------------- tier badge */

export function TierBadge({ tier }: { tier: { id: string; label: string; icon: string } }) {
  return (
    <span className={`tier ${tier.id}`}>
      <span className="dot" aria-hidden>{tier.icon}</span>
      {tier.label}
    </span>
  );
}

/** The rank-up moment: badge scales in with a single bouncy spring. */
export function TierUp({ tier, show }: { tier: { id: string; label: string; icon: string }; show: boolean }) {
  const reduce = useReducedMotion();
  return (
    <AnimatePresence>
      {show ? (
        <motion.div
          initial={reduce ? false : { scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={SPRING.bouncy}
        >
          <TierBadge tier={tier} />
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

/* ---------------------------------------------------------------- floating dock */

export interface DockItem { href: string; icon: string; label: string }

export function Dock({ items }: { items: DockItem[] }) {
  const path = usePathname();
  const active = items.reduce(
    (best, it) => (path === it.href || (it.href !== '/' && path?.startsWith(it.href)) ? it.href : best),
    items[0].href
  );

  return (
    <nav className="dock no-print" aria-label="Main">
      {items.map((it) => {
        const on = it.href === active;
        return (
          <Link
            key={it.href}
            href={it.href}
            className={`dock-item${on ? ' on' : ''}`}
            aria-current={on ? 'page' : undefined}
          >
            {on ? (
              <motion.span
                layoutId="dock-pill"
                className="dock-pill"
                transition={SPRING.soft}
              />
            ) : null}
            <span className="ic" aria-hidden>{it.icon}</span>
            <span className="lbl">{it.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

/* ------------------------------------------------------------ page transition */

export function PageFade({ children }: { children: React.ReactNode }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE.out }}
      style={{ display: 'contents' }}
    >
      {children}
    </motion.div>
  );
}

/* -------------------------------------------------------------- bottom sheet */

export function Sheet({
  open, onClose, children, title,
}: { open: boolean; onClose: () => void; children: React.ReactNode; title?: string }) {
  const reduce = useReducedMotion();

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.div
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.24 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(6,10,17,.55)', backdropFilter: 'blur(6px)', zIndex: 70 }}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={reduce ? false : { y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={SPRING.soft}
            drag={reduce ? false : 'y'}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.5 }}
            onDragEnd={(_, info) => { if (info.offset.y > 110) onClose(); }}
            style={{
              position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 71,
              maxWidth: 520, margin: '0 auto',
              background: 'var(--glass-2)',
              backdropFilter: 'blur(40px) saturate(180%)',
              WebkitBackdropFilter: 'blur(40px) saturate(180%)',
              borderTopLeftRadius: 30, borderTopRightRadius: 30,
              borderTop: '1px solid var(--glass-border)',
              boxShadow: 'var(--lift-3)',
              padding: '10px 18px calc(26px + env(safe-area-inset-bottom))',
              maxHeight: '86dvh', overflowY: 'auto',
            }}
          >
            <div style={{ width: 40, height: 4, borderRadius: 99, background: 'var(--hairline)', margin: '0 auto 14px' }} />
            {title ? <h2 className="t-h2" style={{ marginBottom: 14 }}>{title}</h2> : null}
            {children}
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}

/* ----------------------------------------------------------------- skeletons */

export function CardSkeleton() {
  return (
    <div className="glass pad v-3" aria-hidden>
      <div className="h" style={{ gap: 12 }}>
        <div className="skeleton" style={{ width: 52, height: 52, borderRadius: '50%' }} />
        <div className="grow v-2">
          <div className="skeleton" style={{ height: 15, width: '55%' }} />
          <div className="skeleton" style={{ height: 12, width: '35%' }} />
        </div>
      </div>
      <div className="skeleton" style={{ height: 44, borderRadius: 14 }} />
    </div>
  );
}
