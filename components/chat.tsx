'use client';

import React from 'react';
import type { LangCode } from '@/lib/types';
import { quickPhrases, translateText } from '@/lib/ai/translate';
import { useActions, useStore, useT } from './store';

/**
 * AI FEATURE #4 - the multilingual conversation.
 * Every incoming message is rendered in the reader's own language, with the
 * original one tap away so nothing is hidden.
 */
export function Chat({
  jobId,
  meRole,
  meId,
  meLang,
}: {
  jobId: string;
  meRole: 'worker' | 'resident';
  meId: string;
  meLang: LangCode;
}) {
  const { db } = useStore();
  const { sendMessage } = useActions();
  const { t } = useT();
  const [draft, setDraft] = React.useState('');
  const [showOrig, setShowOrig] = React.useState<Record<string, boolean>>({});
  const [translated, setTranslated] = React.useState<Record<string, string>>({});
  const endRef = React.useRef<HTMLDivElement>(null);

  const messages = React.useMemo(
    () => db.messages.filter((m) => m.jobId === jobId).sort((a, b) => a.createdAt - b.createdAt),
    [db.messages, jobId]
  );

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const next: Record<string, string> = {};
      for (const m of messages) {
        if (m.lang === meLang || translated[m.id]) continue;
        const r = await translateText(m.text, m.lang, meLang);
        if (r.translated) next[m.id] = r.text;
      }
      if (!cancelled && Object.keys(next).length) {
        setTranslated((prev) => ({ ...prev, ...next }));
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length, meLang]);

  React.useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'nearest' });
  }, [messages.length]);

  function send(text: string) {
    const clean = text.trim();
    if (!clean) return;
    sendMessage(jobId, meRole, meId, clean, meLang);
    setDraft('');
  }

  return (
    <div className="card">
      <h3 className="title">💬 {t('chat.title')}</h3>
      <div className="msgs">
        {messages.length === 0 ? (
          <p className="muted" style={{ padding: '8px 0' }}>
            {t('chat.auto')} — {meLang.toUpperCase()}
          </p>
        ) : null}
        {messages.map((m) => {
          const mine = m.fromRole === meRole && m.fromId === meId;
          const trans = translated[m.id];
          const canToggle = Boolean(trans);
          const showingOriginal = showOrig[m.id];
          const body = canToggle && !showingOriginal ? trans : m.text;
          return (
            <div key={m.id} className={`msg ${mine ? 'me' : 'them'}`}>
              {body}
              {canToggle ? (
                <button
                  className="orig"
                  style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'inherit', textAlign: 'left' }}
                  onClick={() => setShowOrig((p) => ({ ...p, [m.id]: !p[m.id] }))}
                >
                  {showingOriginal ? `🌐 ${t('chat.trans')}` : `🌐 ${t('chat.auto')} · ${t('chat.orig')}`}
                </button>
              ) : null}
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      <div className="chips" style={{ margin: '8px 0 12px' }}>
        {quickPhrases(meLang).slice(0, 8).map((p) => (
          <button key={p} className="chip" onClick={() => send(p)}>
            {p}
          </button>
        ))}
      </div>

      <div className="row">
        <input
          className="input grow"
          placeholder={t('chat.ph')}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') send(draft); }}
        />
        <button className="btn sm" onClick={() => send(draft)}>
          {t('c.send')}
        </button>
      </div>
    </div>
  );
}
