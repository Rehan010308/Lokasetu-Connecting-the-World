'use client';

/**
 * Two things that would otherwise be copy-pasted onto every screen: the notice
 * shown when Supabase has not been connected yet, and the gate that keeps a
 * signed-out visitor out of a signed-in screen.
 */

import React from 'react';
import Link from 'next/link';
import { useAuth, useLang } from './providers';
import { Banner, Button, SkeletonList } from './ui';
import { AlertTriangle, Lock } from './icons';
import { SETUP_HINT } from '@/utils/supabase/config';

export function SetupNotice() {
  const { configured } = useAuth();
  const { t } = useLang();
  if (configured) return null;

  return (
    <div style={{ marginBottom: 16 }}>
      <Banner tone="warn" icon={<AlertTriangle size={17} />} title={t('setupTitle')}>
        {t('setupBody')}
        <div className="tiny" style={{ marginTop: 6, opacity: 0.85 }}>
          {SETUP_HINT}
        </div>
      </Banner>
    </div>
  );
}

/**
 * Gate a screen behind a session.
 *
 * The loading state renders skeletons rather than a spinner, because the
 * skeleton is the shape of the thing that is coming and a spinner is not.
 */
export function Guard({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  const { t } = useLang();

  if (status === 'loading') {
    return (
      <>
        <SetupNotice />
        <SkeletonList count={3} />
      </>
    );
  }

  if (status === 'signedOut') {
    return (
      <>
        <SetupNotice />
        <div className="empty">
          <div className="empty-icon">
            <Lock size={22} />
          </div>
          <h3>{t('signInToContinue')}</h3>
          <p>{t('authSignInSub')}</p>
          <div style={{ marginTop: 12 }}>
            <Link href="/login">
              <Button variant="primary">{t('signIn')}</Button>
            </Link>
          </div>
        </div>
      </>
    );
  }

  return <>{children}</>;
}
