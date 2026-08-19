'use client';

import React from 'react';
import type { Geo } from '@/lib/types';
import { etaMinutes } from '@/lib/ai/match';
import { distanceKm, formatDistance } from '@/lib/geo';
import { navigateLink } from '@/lib/links';
import {
  ATTRIBUTION, fitZoom, lerpGeo, midpoint, tilesFor, toPixel, travelProgress,
} from '@/lib/tiles';
import { useT } from './store';

/* ===========================================================================
   LIVE MAP
   ---------------------------------------------------------------------------
   Real map tiles, a route line, a moving worker and a counting-down ETA — with
   no mapping SDK and no API key anywhere in the bundle. Tiles are ordinary
   <img> requests; if the tile server is unreachable (offline, blocked network,
   a demo on aeroplane wifi) every image simply fails and the styled backdrop
   underneath carries the route on its own. The screen never breaks.

   See lib/tiles.ts for the projection maths and for the one honest caveat:
   the customer's view of the worker is interpolated from the departure time,
   not reported by the worker's phone. There is no realtime channel in this
   build, and the UI says so rather than implying a GPS feed that isn't there.
   =========================================================================== */

const H = 210;

export function LiveMap({
  from, to, travelStartedAt, live, workerName, showRoute = true,
}: {
  /** where the worker set off from */
  from: Geo;
  /** where the job is */
  to: Geo;
  travelStartedAt?: number;
  /** true while the worker is actually travelling */
  live?: boolean;
  workerName?: string;
  showRoute?: boolean;
}) {
  const { t } = useT();
  const boxRef = React.useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = React.useState(0);
  const [now, setNow] = React.useState(0);

  /* measure, and keep measuring — the box is 640px on a laptop, 340 on a phone */
  React.useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const set = () => setWidth(el.clientWidth);
    set();
    const ro = new ResizeObserver(set);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* tick only while something is actually moving */
  React.useEffect(() => {
    setNow(Date.now());
    if (!live) return;
    const id = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(id);
  }, [live]);

  const km = distanceKm(from, to);
  const totalEta = etaMinutes(km);
  const progress = live ? travelProgress(travelStartedAt, totalEta, now || Date.now()) : 0;
  const remaining = Math.max(1, Math.round(totalEta * (1 - progress)));
  const at = live ? lerpGeo(from, to, progress) : from;

  const centre = midpoint(from, to);
  const z = width ? fitZoom(from, to, width, H) : 13;

  const tiles = width ? tilesFor(centre, z, width, H) : [];
  const pFrom = width ? toPixel(at.lat, at.lng, centre, z, width, H) : null;
  const pTo = width ? toPixel(to.lat, to.lng, centre, z, width, H) : null;

  return (
    <div className="v-2">
      <div ref={boxRef} className="map" style={{ height: H }} role="img"
        aria-label={`${formatDistance(km, t('c.nearby'))} — ${remaining} ${t('c.min')}`}>

        {/* Tiles are background images on plain divs, not <img>. A failed <img>
            paints a broken-page glyph for as long as it takes an error handler
            to run; a failed background paints nothing at all, so the styled
            backdrop underneath is what shows and the map degrades silently. */}
        {tiles.map((tile) => (
          <div
            key={tile.key}
            aria-hidden
            className="map-tile"
            style={{ left: tile.left, top: tile.top, backgroundImage: `url(${tile.url})` }}
          />
        ))}

        {/* route + markers, drawn over whatever survived */}
        {pFrom && pTo ? (
          <svg className="map-ink" viewBox={`0 0 ${width} ${H}`} aria-hidden>
            {showRoute ? (
              <>
                <line x1={pFrom.left} y1={pFrom.top} x2={pTo.left} y2={pTo.top}
                  stroke="rgba(6,10,17,.25)" strokeWidth={7} strokeLinecap="round" />
                <line x1={pFrom.left} y1={pFrom.top} x2={pTo.left} y2={pTo.top}
                  stroke="var(--em-500)" strokeWidth={4} strokeLinecap="round"
                  strokeDasharray="1 9" />
              </>
            ) : null}
            <circle cx={pTo.left} cy={pTo.top} r={9} fill="var(--gd-500)" stroke="#fff" strokeWidth={3} />
            <circle cx={pFrom.left} cy={pFrom.top} r={10} fill="var(--em-600)" stroke="#fff" strokeWidth={3} />
            {live ? (
              <circle cx={pFrom.left} cy={pFrom.top} r={10} fill="none"
                stroke="var(--em-500)" strokeWidth={2} className="map-ping" />
            ) : null}
          </svg>
        ) : null}

        <span className="map-credit">{ATTRIBUTION}</span>

        {live ? (
          <div className="map-eta">
            <span className="live-dot" />
            <b>{remaining} {t('c.min')}</b>
            <span className="sep">·</span>
            <span>{formatDistance(km * (1 - progress), t('c.nearby'))}</span>
          </div>
        ) : null}
      </div>

      <div className="between">
        <p className="t-xs" style={{ maxWidth: '72%' }}>
          {live
            ? `🛵 ${workerName ? `${workerName} — ` : ''}${t('mp.estimated')}`
            : `📍 ${to.address ?? to.areaName}`}
        </p>
        <a className="t-xs strong" style={{ color: 'var(--em-600)' }}
          href={navigateLink(to)} target="_blank" rel="noopener noreferrer">
          {t('j.openMaps')} →
        </a>
      </div>
    </div>
  );
}
