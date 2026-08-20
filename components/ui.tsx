'use client';

/**
 * The primitives. Small, unopinionated, and styled entirely by the classes in
 * `app/globals.css` — no inline colour, no per-component stylesheet, so the
 * whole product changes appearance from one file.
 */

import React, { useEffect, useRef, useState } from 'react';
import { categoryById } from '@/lib/catalog';
import { avatarHue, displayName, initials, type Profile } from '@/lib/model';
import { categoryKey } from '@/lib/i18n';
import { styleWith, vars } from '@/lib/style';
import { useT } from './providers';
import { BadgeCheck, Check, ChevronDown, Loader2, X, iconByName } from './icons';

/* ============================================================= button == */

type ButtonVariant = 'default' | 'primary' | 'ghost' | 'soft' | 'good' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  block?: boolean;
}

export function Button({
  variant = 'default',
  size = 'md',
  loading = false,
  block = false,
  className = '',
  disabled,
  children,
  ...rest
}: ButtonProps) {
  const classes = [
    'btn',
    variant === 'default' ? '' : variant,
    size === 'md' ? '' : size,
    block ? 'block' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button className={classes} disabled={disabled || loading} {...rest}>
      {loading ? <Loader2 size={16} className="spin-icon" /> : null}
      {children}
    </button>
  );
}

export function IconButton({
  label,
  className = '',
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button className={`iconbtn ${className}`} aria-label={label} title={label} {...rest}>
      {children}
    </button>
  );
}

/* =============================================================== card == */

export function Card({
  pad = true,
  hoverable = false,
  className = '',
  children,
  ...rest
}: React.HTMLAttributes<HTMLDivElement> & { pad?: boolean | 'lg'; hoverable?: boolean }) {
  const padClass = pad === 'lg' ? 'pad-l' : pad ? 'pad' : '';
  return (
    <div className={`card ${padClass} ${hoverable ? 'hoverable' : ''} ${className}`} {...rest}>
      {children}
    </div>
  );
}

/* ============================================================== badge == */

export function Badge({
  tone = 'default',
  dot = false,
  live = false,
  className = '',
  children,
}: {
  tone?: 'default' | 'ok' | 'warn' | 'bad' | 'info' | 'brand' | 'solid';
  dot?: boolean;
  live?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span className={`badge ${tone === 'default' ? '' : tone} ${live ? 'live' : ''} ${className}`}>
      {dot || live ? <i className="dot" /> : null}
      {children}
    </span>
  );
}

/* ============================================================= avatar == */

export function Avatar({
  profile,
  size = 'md',
  showTick = true,
}: {
  profile: Profile | null | undefined;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showTick?: boolean;
}) {
  const name = displayName(profile);
  const hue = avatarHue(profile?.id || name);
  const sizeClass = size === 'md' ? '' : size;

  return (
    <div className={`avatar ${sizeClass}`} style={vars({ '--hue': hue })} aria-hidden="true">
      {profile?.avatar_url ? (
        // A plain <img>: avatar URLs are arbitrary user input, and next/image
        // would need every possible host allow-listed at build time.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={profile.avatar_url} alt="" loading="lazy" />
      ) : (
        initials(name)
      )}
      {showTick && profile?.verified ? (
        <span className="tick">
          <Check size={10} strokeWidth={3.5} />
        </span>
      ) : null}
    </div>
  );
}

export function VerifiedMark({ verified }: { verified: boolean }) {
  if (!verified) return null;
  return <BadgeCheck size={14} className="verified-mark" style={{ color: 'var(--brand)' }} />;
}

/* =========================================================== skeleton == */

export function Skeleton({
  kind = 'line',
  width,
  className = '',
}: {
  kind?: 'line' | 'title' | 'avatar' | 'block';
  width?: number | string;
  className?: string;
}) {
  return <div className={`skeleton ${kind} ${className}`} style={width ? { width } : undefined} />;
}

export function SkeletonPost() {
  return (
    <div className="card pad">
      <div className="row" style={{ marginBottom: 12 }}>
        <Skeleton kind="avatar" />
        <div className="stack-s grow">
          <Skeleton kind="line" width="42%" />
          <Skeleton kind="line" width="26%" />
        </div>
      </div>
      <div className="stack-s">
        <Skeleton kind="title" width="72%" />
        <Skeleton kind="line" />
        <Skeleton kind="line" width="88%" />
      </div>
    </div>
  );
}

export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="stack">
      {Array.from({ length: count }, (_, i) => (
        <SkeletonPost key={i} />
      ))}
    </div>
  );
}

export function SkeletonRows({ count = 4 }: { count?: number }) {
  return (
    <div className="card divide" style={{ padding: 0 }}>
      {Array.from({ length: count }, (_, i) => (
        <div className="person" key={i}>
          <Skeleton kind="avatar" />
          <div className="stack-s grow">
            <Skeleton kind="line" width="36%" />
            <Skeleton kind="line" width="54%" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function Spinner({ large = false }: { large?: boolean }) {
  return <span className={`spinner ${large ? 'lg' : ''}`} aria-hidden="true" />;
}

/* ============================================================== field == */

export function Field({
  label,
  hint,
  error,
  optional = false,
  htmlFor,
  children,
}: {
  label: string;
  hint?: string;
  error?: string | null;
  optional?: boolean;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  const t = useT();
  return (
    <div className="field">
      <label htmlFor={htmlFor}>
        {label}
        {optional ? <span className="opt">{t('optional')}</span> : null}
      </label>
      {children}
      {error ? <span className="error-text">{error}</span> : hint ? <span className="hint">{hint}</span> : null}
    </div>
  );
}

/* ============================================================ segment == */

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
}

export function Segment<T extends string>({
  options,
  value,
  onChange,
  block = false,
}: {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  block?: boolean;
}) {
  return (
    <div className={`segment ${block ? 'block' : ''}`} role="tablist">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="tab"
          aria-selected={option.value === value}
          data-on={option.value === value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

/* =============================================================== chip == */

export function Chip({
  on = false,
  hue,
  className = '',
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { on?: boolean; hue?: number }) {
  return (
    <button
      type="button"
      className={`chip ${hue !== undefined ? 'tinted' : ''} ${className}`}
      data-on={on}
      style={hue !== undefined ? vars({ '--hue': hue }) : undefined}
      {...rest}
    >
      {children}
    </button>
  );
}

/** A read-only category label with its icon and its colour. */
export function CategoryTag({ id }: { id: string | null | undefined }) {
  const t = useT();
  const category = categoryById(id);
  if (!category) return null;
  const Icon = iconByName(category.icon);
  return (
    <span className="chip tinted" style={styleWith({ cursor: 'default' }, { '--hue': category.hue })}>
      <Icon size={13} />
      {t(categoryKey(category.id))}
    </span>
  );
}

/* ======================================================== empty/banner == */

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  body?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="empty">
      {icon ? <div className="empty-icon">{icon}</div> : null}
      <h3>{title}</h3>
      {body ? <p>{body}</p> : null}
      {action ? <div style={{ marginTop: 12 }}>{action}</div> : null}
    </div>
  );
}

export function Banner({
  tone = 'info',
  icon,
  title,
  children,
}: {
  tone?: 'info' | 'ok' | 'warn' | 'bad';
  icon?: React.ReactNode;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`banner ${tone === 'info' ? '' : tone}`} role={tone === 'bad' ? 'alert' : undefined}>
      {icon}
      <div>
        {title ? <strong>{title}</strong> : null}
        {children}
      </div>
    </div>
  );
}

/* ============================================================== modal == */

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  const t = useT();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="modal-scrim"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal">
        <div className="modal-head">
          <div className="grow">
            <h3>{title}</h3>
            {description ? <p>{description}</p> : null}
          </div>
          <IconButton label={t('close')} onClick={onClose}>
            <X size={18} />
          </IconButton>
        </div>
        {children}
      </div>
    </div>
  );
}

/* =============================================================== menu == */

/** A dropdown that closes on outside click and on Escape. */
export function Menu({
  trigger,
  children,
  align = 'right',
}: {
  trigger: (props: { open: boolean; toggle: () => void }) => React.ReactNode;
  children: (close: () => void) => React.ReactNode;
  align?: 'left' | 'right';
}) {
  const [open, setOpen] = useState(false);
  const host = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (host.current && !host.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="anchor" ref={host}>
      {trigger({ open, toggle: () => setOpen((v) => !v) })}
      {open ? (
        <div className="menu" style={align === 'left' ? { right: 'auto', left: 0 } : undefined}>
          {children(() => setOpen(false))}
        </div>
      ) : null}
    </div>
  );
}

export { ChevronDown };

/* =============================================================== stat == */

export function Stat({
  label,
  value,
  note,
  hero = false,
}: {
  label: string;
  value: React.ReactNode;
  note?: string;
  hero?: boolean;
}) {
  return (
    <div className={`stat ${hero ? 'hero' : ''}`}>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {note ? <div className="stat-note">{note}</div> : null}
    </div>
  );
}
