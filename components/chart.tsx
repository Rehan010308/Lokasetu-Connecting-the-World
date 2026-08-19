'use client';

import React from 'react';
import type { Bucket } from '@/lib/earnings';
import { compact, niceMax } from '@/lib/earnings';
import { useT } from './store';

/* ===========================================================================
   EARNINGS BAR CHART
   ---------------------------------------------------------------------------
   One series, so no legend box — the heading already says what is plotted.
   Specs applied deliberately rather than by taste:

     - bars capped at 24px, the band's leftover left as air
     - 4px rounded cap, square at the baseline (money grows from zero)
     - a 2px surface-coloured gap between neighbours, no strokes
     - hairline solid gridlines, one step off the surface, recessive
     - ONE direct label, on the best bucket; the axis carries the rest
     - a hover tooltip on every bar, with a hit target wider than the bar
     - a list view for anyone who cannot use the chart at all

   Colour: emerald 600 in BOTH themes. The instinct is to brighten a series
   for dark mode, but emerald 400 measures L 0.773 against this canvas, outside
   the 0.48–0.67 band a dark surface needs. Checked with the validator rather
   than guessed at.
   =========================================================================== */

const BAR_MAX = 24;
const H = 168;

export function EarningsChart({ buckets, best }: { buckets: Bucket[]; best: Bucket | null }) {
  const { t } = useT();
  const [hover, setHover] = React.useState<number | null>(null);
  const [asTable, setAsTable] = React.useState(false);

  const max = niceMax(Math.max(...buckets.map((b) => b.amount), 0));
  const ticks = [0, max / 2, max];
  const empty = buckets.every((b) => b.amount === 0);

  if (asTable) {
    return (
      <div className="v-3">
        <table className="data">
          <thead>
            <tr><th>{t('e.period')}</th><th>{t('e.earned')}</th><th>{t('n.jobs')}</th></tr>
          </thead>
          <tbody>
            {buckets.map((b) => (
              <tr key={b.from}>
                <td>{b.label}</td>
                <td className="t-num">₹{b.amount.toLocaleString('en-IN')}</td>
                <td className="t-num">{b.jobs}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <button className="btn quiet" onClick={() => setAsTable(false)}>📊 {t('e.title')}</button>
      </div>
    );
  }

  return (
    <div className="v-3">
      <div className="chart" style={{ height: H }}>
        {/* gridlines carry every value that is not directly labelled */}
        {ticks.map((v, i) => (
          <div key={v} className="chart-grid" style={{ bottom: `${(i / (ticks.length - 1)) * 100}%` }}>
            <span className="chart-tick">{compact(v)}</span>
          </div>
        ))}

        <div className="chart-bars">
          {buckets.map((b, i) => {
            const pct = max ? (b.amount / max) * 100 : 0;
            const isBest = best !== null && b.from === best.from;
            return (
              <div
                key={b.from}
                className="chart-slot"
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
                tabIndex={0}
                role="img"
                aria-label={`${b.label}: ₹${b.amount.toLocaleString('en-IN')}, ${b.jobs} ${t('n.jobs')}`}
              >
                {/* the one direct label — on the biggest bucket only */}
                {isBest && b.amount > 0 ? (
                  <span className="chart-peak">₹{compact(b.amount)}</span>
                ) : null}

                <div
                  className={`chart-bar${hover === i ? ' hot' : ''}`}
                  style={{ height: `${Math.max(pct, b.amount > 0 ? 2 : 0)}%`, maxWidth: BAR_MAX }}
                />

                {hover === i ? (
                  <div className="chart-tip" role="tooltip">
                    <b className="t-num">₹{b.amount.toLocaleString('en-IN')}</b>
                    <span>{b.label} · {b.jobs} {t('n.jobs')}</span>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      <div className="chart-axis">
        {buckets.map((b, i) => (
          <span key={b.from} className="chart-xlabel">
            {/* thin out labels so 30 days does not become a smear */}
            {buckets.length <= 8 || i % Math.ceil(buckets.length / 7) === 0 ? b.label : ''}
          </span>
        ))}
      </div>

      {empty ? <p className="t-xs mid">{t('e.noneYet')}</p> : null}

      <button className="btn quiet" onClick={() => setAsTable(true)}>☰ {t('e.table')}</button>
    </div>
  );
}
