'use client';

/**
 * The frame every signed-in screen sits in.
 *
 * Two layouts, not one stretched: a persistent rail with counts on the
 * desktop, a top bar plus a bottom tab bar on a phone. Both are driven by the
 * same nav list, so a new destination is one entry, not two.
 */

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LANGS, useAuth, useLang, useTheme } from './providers';
import { usePendingCount } from './data';
import { Avatar, Button, IconButton, Menu } from './ui';
import {
  ArrowLeft,
  ArrowLeftRight,
  Check,
  Globe,
  Home,
  LogOut,
  Moon,
  Plus,
  Sun,
  User,
  Users,
  Wallet,
} from './icons';
import { displayName, handleOf } from '@/lib/model';
import type { TKey } from '@/lib/i18n';
import { VERSION } from '@/lib/version';

interface NavItem {
  href: string;
  key: TKey;
  Icon: React.ComponentType<{ size?: number }>;
  workerOnly?: boolean;
  badge?: boolean;
}

const NAV: NavItem[] = [
  { href: '/feed', key: 'navFeed', Icon: Home },
  { href: '/network', key: 'navNetwork', Icon: Users },
  { href: '/offers', key: 'navOffers', Icon: ArrowLeftRight, badge: true },
  { href: '/earnings', key: 'navEarnings', Icon: Wallet, workerOnly: true },
  { href: '/me', key: 'navProfile', Icon: User },
];

export function Brandmark({ large = false }: { large?: boolean }) {
  return (
    <span className={`brandmark ${large ? 'lg' : ''}`}>
      <span className="glyph" aria-hidden="true">
        ल
      </span>
      LokaSetu
    </span>
  );
}

/* ------------------------------------------------------------- pickers */

export function LanguagePicker() {
  const { lang, setLang, t } = useLang();

  return (
    <Menu
      trigger={({ toggle }) => (
        <IconButton label={t('language')} onClick={toggle}>
          <Globe size={18} />
        </IconButton>
      )}
    >
      {(close) => (
        <>
          <div className="menu-label">{t('language')}</div>
          {LANGS.map((entry) => (
            <button
              key={entry.code}
              type="button"
              data-on={entry.code === lang}
              onClick={() => {
                setLang(entry.code);
                close();
              }}
            >
              <span className="grow">{entry.native}</span>
              {entry.code === lang ? <Check size={15} /> : null}
            </button>
          ))}
        </>
      )}
    </Menu>
  );
}

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const { t } = useLang();
  return (
    <IconButton label={t('appearance')} onClick={toggle}>
      {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
    </IconButton>
  );
}

function AccountMenu() {
  const { profile, signOut } = useAuth();
  const { t } = useLang();
  const router = useRouter();

  return (
    <Menu
      trigger={({ toggle }) => (
        <button
          type="button"
          onClick={toggle}
          aria-label={t('navProfile')}
          style={{ borderRadius: 13, lineHeight: 0 }}
        >
          <Avatar profile={profile} size="sm" />
        </button>
      )}
    >
      {(close) => (
        <>
          <div className="menu-label">{displayName(profile)}</div>
          <Link href="/me" onClick={close}>
            <User size={16} />
            {t('navProfile')}
          </Link>
          {profile?.username ? (
            <Link href={`/profile/${profile.username}`} onClick={close}>
              <ArrowLeftRight size={16} />
              {handleOf(profile)}
            </Link>
          ) : null}
          <div className="menu-sep" />
          <button
            type="button"
            onClick={async () => {
              close();
              await signOut();
              router.push('/');
            }}
          >
            <LogOut size={16} />
            {t('signOut')}
          </button>
        </>
      )}
    </Menu>
  );
}

/* --------------------------------------------------------------- shell */

export function AppShell({
  title,
  back,
  action,
  children,
  wide = false,
}: {
  title?: string;
  /** Show a back arrow instead of the title on a phone. */
  back?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  wide?: boolean;
}) {
  const pathname = usePathname();
  const { profile, status } = useAuth();
  const { t } = useLang();
  const pending = usePendingCount();

  const items = NAV.filter((item) => !item.workerOnly || profile?.role !== 'employer');

  return (
    <div className="app">
      <aside className="sidebar">
        <Link href="/feed" aria-label="LokaSetu">
          <Brandmark />
        </Link>

        <nav>
          {items.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link key={item.href} href={item.href} data-active={active}>
                <item.Icon size={19} />
                {t(item.key)}
                {item.badge && pending > 0 ? <span className="count">{pending}</span> : null}
              </Link>
            );
          })}
        </nav>

        <div style={{ marginTop: 16 }}>
          <Link href="/post/new">
            <Button variant="primary" block>
              <Plus size={17} />
              {t('navNewPost')}
            </Button>
          </Link>
        </div>

        <div className="sidebar-foot">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span className="tiny dim">v{VERSION}</span>
            <div className="row" style={{ gap: 2 }}>
              <LanguagePicker />
              <ThemeToggle />
            </div>
          </div>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          {back ? (
            <Link href={back} className="iconbtn" aria-label={t('backHome')}>
              <ArrowLeft size={19} />
            </Link>
          ) : null}

          <span className="topbar-title truncate">
            {title ?? <Brandmark />}
          </span>

          <div className="topbar-actions">
            {action}
            <span className="only-mobile row" style={{ gap: 2 }}>
              <LanguagePicker />
              <ThemeToggle />
            </span>
            {status === 'signedIn' ? <AccountMenu /> : null}
          </div>
        </header>

        <main className={`page ${wide ? 'wide' : ''}`}>{children}</main>
      </div>

      <nav className="tabbar">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link key={item.href} href={item.href} data-active={active}>
              <item.Icon size={20} />
              {t(item.key)}
              {item.badge && pending > 0 ? <span className="tab-badge">{pending}</span> : null}
            </Link>
          );
        })}
      </nav>

      <Link href="/post/new" className="fab" aria-label={t('navNewPost')}>
        <Plus size={24} />
      </Link>
    </div>
  );
}
