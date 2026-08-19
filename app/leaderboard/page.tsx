'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { AREAS } from '@/lib/geo';
import { categoryById } from '@/lib/ai/taxonomy';
import { leaderboard, TIERS, tierOf } from '@/lib/tiers';
import { useStore, useT } from '@/components/store';
import { ThemeToggle } from '@/components/theme';
import { Counter, Dock, GlassCard, Reveal, Stagger, StaggerItem, TierBadge } from '@/components/aurora';

const MEDALS = ['🥇', '🥈', '🥉'];

export default function Leaderboard() {
  const router = useRouter();
  const { db } = useStore();
  const { t } = useT();
  const [area, setArea] = React.useState<string>('all');

  const rows = React.useMemo(
    () => leaderboard(db.workers, area === 'all' ? undefined : area, 10),
    [db.workers, area]
  );

  return (
    <div className="shell">
      <header className="topbar glassy">
        <button className="icon-btn" onClick={() => router.push('/')} aria-label={t('c.back')}>←</button>
        <div className="grow">
          <h1 className="t-h3">Community ranks</h1>
          <p className="t-xs">Earned by finishing jobs well, not by paying</p>
        </div>
        <ThemeToggle />
      </header>

      <main className="page v-4" style={{ paddingTop: 4 }}>
        <div className="scroll-x">
          <button className={`chip${area === 'all' ? ' on' : ''}`} onClick={() => setArea('all')}>🌏 All areas</button>
          {AREAS.map((a) => (
            <button key={a.areaName} className={`chip${area === a.areaName ? ' on' : ''}`} onClick={() => setArea(a.areaName)}>
              📍 {a.areaName.split(',')[0]}
            </button>
          ))}
        </div>

        <Stagger className="v-3" gap={0.05}>
          {rows.map((r) => (
            <StaggerItem key={r.worker.id}>
              <GlassCard interactive className="pad-s" glow={r.rank === 1 ? 'gd' : undefined}>
                <div className="h" style={{ gap: 12 }}>
                  <div style={{ width: 34, textAlign: 'center', fontSize: r.rank <= 3 ? 24 : 15, fontWeight: 800, color: 'var(--ink-3)' }}>
                    {MEDALS[r.rank - 1] ?? r.rank}
                  </div>
                  <div className={`av s${r.rank === 1 ? ' gd' : ''}`}>
                    {r.worker.name.split(' ').map((p) => p[0]).slice(0, 2).join('')}
                  </div>
                  <div className="grow" style={{ minWidth: 0 }}>
                    <div className="t-sm strong" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {r.worker.name}
                    </div>
                    <div className="t-xs">
                      {categoryById(r.worker.category).icon} {t(`cat.${r.worker.category}` as any)} · {r.worker.geo.areaName.split(',')[0]}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="t-sm strong t-num"><Counter to={r.points} /></div>
                    <div className="t-xs">points</div>
                  </div>
                </div>
                <div className="h-2" style={{ marginTop: 10, gap: 7 }}>
                  <TierBadge tier={r.tier} />
                  <span className="tag">⭐ {r.worker.trust.overall.toFixed(1)}</span>
                  <span className="tag">{r.worker.jobsDone} jobs</span>
                </div>
              </GlassCard>
            </StaggerItem>
          ))}
        </Stagger>

        <Reveal>
          <GlassCard className="flat pad">
            <h2 className="t-h3" style={{ marginBottom: 12 }}>How ranks are earned</h2>
            <div className="v-3">
              {TIERS.map((tier) => (
                <div key={tier.id} className="between">
                  <TierBadge tier={tier} />
                  <span className="t-xs" style={{ textAlign: 'right' }}>{tier.blurb}</span>
                </div>
              ))}
            </div>
            <p className="note" style={{ marginTop: 14 }}>
              Points = jobs completed × 10 + rating × 40 + reviews × 4. No paid boosts, ever —
              a rank you can buy is a rank nobody trusts.
            </p>
          </GlassCard>
        </Reveal>
      </main>

      <Dock items={[
        { href: '/', icon: '🏠', label: 'Home' },
        { href: '/discover', icon: '🔎', label: 'Find' },
        { href: '/leaderboard', icon: '🏆', label: 'Ranks' },
        { href: '/resident', icon: '👤', label: 'You' },
      ]} />
    </div>
  );
}
