'use client';

import React from 'react';
import type { LangCode } from '@/lib/types';
import { speechLocale } from '@/lib/i18n';
import { useT } from './store';

/**
 * Voice capture using the browser's built-in Web Speech API.
 * - Works today in Chrome / Edge / Android Chrome / Safari iOS 14.5+ (webkit).
 * - Always falls back to a plain textarea, so a worker is never stuck.
 *
 * PHASE 2 upgrade path: record audio with MediaRecorder and POST it to
 * /api/transcribe (Whisper / Sarvam / Google STT) for far better accuracy on
 * Indian languages. The rest of the component does not change.
 */
export function VoiceInput({
  lang,
  value,
  onChange,
  hint,
  micLabel,
}: {
  lang: LangCode;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
  micLabel?: string;
}) {
  const { t } = useT();
  const [listening, setListening] = React.useState(false);
  const [supported, setSupported] = React.useState(true);
  const [typing, setTyping] = React.useState(false);
  const recRef = React.useRef<any>(null);
  const baseRef = React.useRef('');

  React.useEffect(() => {
    const SR =
      typeof window !== 'undefined' &&
      ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
    if (!SR) {
      setSupported(false);
      setTyping(true);
    }
    return () => {
      try { recRef.current?.stop(); } catch {}
    };
  }, []);

  function start() {
    const SR =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { setSupported(false); setTyping(true); return; }

    const rec = new SR();
    rec.lang = speechLocale(lang);
    rec.continuous = true;
    rec.interimResults = true;
    baseRef.current = value ? value + ' ' : '';

    rec.onresult = (e: any) => {
      let text = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        text += e.results[i][0].transcript;
      }
      onChange((baseRef.current + text).trim());
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);

    try {
      rec.start();
      recRef.current = rec;
      setListening(true);
    } catch {
      setListening(false);
    }
  }

  function stop() {
    try { recRef.current?.stop(); } catch {}
    setListening(false);
  }

  return (
    <div className="stack">
      {!typing ? (
        <div className="mic-wrap">
          <button
            className={`mic${listening ? ' live' : ''}`}
            onClick={listening ? stop : start}
            aria-label={micLabel ?? t('ob.voice.tap')}
          >
            {listening ? '⏹' : '🎤'}
          </button>
          <div className="bold" style={{ fontSize: 16 }}>
            {listening ? t('ob.voice.listening') : micLabel ?? t('ob.voice.tap')}
          </div>
          <div className="transcript">
            {value ? value : <span className="muted">{hint ?? t('ob.voice.example')}</span>}
          </div>
          <button className="btn ghost" onClick={() => setTyping(true)}>
            ⌨️ {t('ob.voice.type')}
          </button>
        </div>
      ) : (
        <>
          {!supported ? <div className="banner warn">{t('ob.voice.unsupported')}</div> : null}
          <textarea
            className="textarea"
            value={value}
            placeholder={hint ?? t('ob.voice.example')}
            onChange={(e) => onChange(e.target.value)}
          />
          {supported ? (
            <button className="btn ghost" onClick={() => setTyping(false)}>
              🎤 {t('ob.voice.tap')}
            </button>
          ) : null}
        </>
      )}
    </div>
  );
}
