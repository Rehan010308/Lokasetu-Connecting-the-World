'use client';

import React from 'react';
import type { Geo } from '@/lib/types';
import { CITIES, city, geoOf } from '@/lib/cities';
import { useT } from './store';
import { Sheet } from './aurora';

/* ===========================================================================
   WHERE AM I
   ---------------------------------------------------------------------------
   Every screen that shows nearby work depends on one answer: which city. It
   used to be answered for you — loginClient() hardcoded Koramangala, so a
   customer signing up in Mumbai was quietly placed in Bengaluru and shown
   Bengaluru workers 800km away.

   Now it is asked, and it stays visible and tappable in the header the way it
   does in every app that depends on it.
   =========================================================================== */

export function CityPicker({
  value, onChange, compact,
}: {
  value: Geo | null;
  onChange: (g: Geo) => void;
  compact?: boolean;
}) {
  const { t } = useT();
  const [cityId, setCityId] = React.useState(value?.cityId ?? 'blr');
  const localities = city(cityId)?.localities ?? [];

  return (
    <div className="v-4">
      <div>
        <p className="label">🏙️ {t('c.pickCity')}</p>
        <div className="h-2 wrap" style={{ gap: 8 }}>
          {CITIES.map((c) => (
            <button
              key={c.id}
              className={`chip${cityId === c.id ? ' on' : ''}`}
              style={{ minHeight: compact ? 42 : 46 }}
              onClick={() => setCityId(c.id)}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="label">📍 {t('c.pickArea')}</p>
        <div className="h-2 wrap" style={{ gap: 8 }}>
          {localities.map((l) => (
            <button
              key={l.id}
              className={`chip${value?.localityId === l.id ? ' on' : ''}`}
              style={{ minHeight: compact ? 42 : 46 }}
              onClick={() => onChange(geoOf(l.id)!)}
            >
              {l.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * The header control. Shows where you are and opens the picker — the thing
 * that makes multi-city support visible rather than merely present.
 */
export function CityButton({ geo, onChange }: { geo: Geo; onChange: (g: Geo) => void }) {
  const { t } = useT();
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <button className="city-btn" onClick={() => setOpen(true)} aria-label={t('c.changeCity')}>
        <span aria-hidden>📍</span>
        <span className="nm">{geo.areaName}</span>
        <span aria-hidden className="cv">▾</span>
      </button>

      <Sheet open={open} onClose={() => setOpen(false)} title={t('c.changeCity')}>
        <CityPicker
          value={geo}
          onChange={(g) => { onChange(g); setOpen(false); }}
        />
      </Sheet>
    </>
  );
}
