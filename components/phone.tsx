'use client';

import React from 'react';
import { useT } from './store';

/**
 * Phone + OTP step.
 * PHASE 1: the code is always 123456 so anyone can demo the flow.
 * PHASE 2: POST the number to /api/otp/send (MSG91, Twilio, Firebase Auth)
 * and verify at /api/otp/verify. The component's props do not change.
 */
export function PhoneOtp({
  onVerified,
  askName,
}: {
  onVerified: (phone: string, name: string) => void;
  askName?: boolean;
}) {
  const { t } = useT();
  const [phone, setPhone] = React.useState('');
  const [name, setName] = React.useState('');
  const [sent, setSent] = React.useState(false);
  const [code, setCode] = React.useState('');
  const [err, setErr] = React.useState('');

  const phoneOk = /^[6-9]\d{9}$/.test(phone);

  if (!sent) {
    return (
      <div className="stack-lg">
        <div>
          <h2 className="title">{t('ob.phone.title')}</h2>
          <p className="sub">{t('ob.phone.sub')}</p>
        </div>
        <div>
          <label className="lbl">📱 {t('ob.phone.title')}</label>
          <input
            className="input"
            inputMode="numeric"
            maxLength={10}
            placeholder={t('ob.phone.ph')}
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
          />
        </div>
        {askName ? (
          <div>
            <label className="lbl">🙋 {t('ob.name.label')}</label>
            <input
              className="input"
              placeholder={t('ob.name.ph')}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
        ) : null}
        <button className="btn" disabled={!phoneOk} onClick={() => setSent(true)}>
          {t('ob.phone.send')}
        </button>
      </div>
    );
  }

  return (
    <div className="stack-lg">
      <div>
        <h2 className="title">{t('ob.otp.title')}</h2>
        <p className="sub">
          {t('ob.otp.sub')} +91 {phone}
        </p>
      </div>
      <input
        className="input otp"
        inputMode="numeric"
        maxLength={6}
        placeholder="––––––"
        value={code}
        onChange={(e) => { setCode(e.target.value.replace(/\D/g, '')); setErr(''); }}
      />
      <div className="banner">🔐 {t('ob.otp.demo')}</div>
      {err ? <div className="banner warn">{err}</div> : null}
      <button
        className="btn"
        disabled={code.length !== 6}
        onClick={() => {
          if (code === '123456') onVerified(phone, name);
          else setErr(t('ob.otp.wrong'));
        }}
      >
        {t('ob.otp.verify')}
      </button>
      <button className="btn ghost" onClick={() => { setSent(false); setCode(''); setErr(''); }}>
        ← {t('c.back')}
      </button>
    </div>
  );
}
