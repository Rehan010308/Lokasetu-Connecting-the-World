'use client';

import { useRouter } from 'next/navigation';
import { LANGUAGES } from '@/lib/i18n';
import { useActions, useT } from '@/components/store';
import { PhoneOtp } from '@/components/phone';
import { Shell, TopBar } from '@/components/ui';

export default function ResidentLogin() {
  const router = useRouter();
  const { t, lang } = useT();
  const { setLang, loginResident } = useActions();

  return (
    <Shell>
      <TopBar title={t('home.iResident')} back="/" />
      <div className="page stack-lg">
        <div className="chips">
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              className={`chip${l.code === lang ? ' on' : ''}`}
              onClick={() => setLang(l.code)}
            >
              {l.native}
            </button>
          ))}
        </div>

        <PhoneOtp
          askName
          onVerified={(phone, name) => {
            loginResident(phone, lang, name);
            router.push('/resident');
          }}
        />

        <div className="banner">
          💡 Try phone <b>9000000001</b> to sign in as the demo resident who already has jobs posted.
        </div>
      </div>
    </Shell>
  );
}
