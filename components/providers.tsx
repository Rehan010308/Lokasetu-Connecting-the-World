'use client';

/**
 * The four things every screen needs: a theme, a language, a way to say
 * something briefly, and the identity of whoever is signed in.
 *
 * All of it is written to survive a server render. Nothing here touches
 * `window` or `localStorage` while rendering — only inside effects, which do
 * not run on the server. That is why `npm run ssr` passes: the first paint on
 * the server is the loading state, and the browser fills it in a beat later.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  LANGS,
  STORAGE_KEY_LANG,
  STORAGE_KEY_THEME,
  isLangCode,
  translate,
  type LangCode,
  type TKey,
} from '@/lib/i18n';
import { ensureProfile, signOut as signOutQuery, updateProfile } from '@/lib/queries';
import { isDemoProfile, seedDemoContent } from '@/lib/demo';
import { supabase } from '@/utils/supabase/client';
import { isSupabaseConfigured } from '@/utils/supabase/config';
import type { Profile } from '@/lib/model';
import { AlertTriangle, CheckCircle2, Info } from './icons';

/* ============================================================== theme == */

type Theme = 'light' | 'dark';

interface ThemeCtx {
  theme: Theme;
  toggle: () => void;
  set: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeCtx>({ theme: 'light', toggle: () => {}, set: () => {} });

export const useTheme = () => useContext(ThemeContext);

function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY_THEME);
    const initial: Theme =
      stored === 'light' || stored === 'dark'
        ? stored
        : window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light';
    setTheme(initial);
    document.documentElement.dataset.theme = initial;
  }, []);

  const set = useCallback((next: Theme) => {
    setTheme(next);
    document.documentElement.dataset.theme = next;
    try {
      window.localStorage.setItem(STORAGE_KEY_THEME, next);
    } catch {
      /* private browsing, or storage disabled — the theme still applies */
    }
  }, []);

  const value = useMemo<ThemeCtx>(
    () => ({ theme, set, toggle: () => set(theme === 'dark' ? 'light' : 'dark') }),
    [theme, set],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/* =========================================================== language == */

interface LangCtx {
  lang: LangCode;
  setLang: (l: LangCode) => void;
  t: (key: TKey) => string;
}

const LangContext = createContext<LangCtx>({
  lang: 'en',
  setLang: () => {},
  t: (key) => translate(key, 'en'),
});

export const useLang = () => useContext(LangContext);

/** The common case: you only want `t`. */
export function useT(): (key: TKey) => string {
  return useContext(LangContext).t;
}

function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<LangCode>('en');

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY_LANG);
    if (isLangCode(stored)) {
      setLangState(stored);
      document.documentElement.lang = stored;
      return;
    }
    // Fall back to the phone's own language when it is one we speak.
    const guess = (navigator.language || 'en').slice(0, 2);
    if (isLangCode(guess)) {
      setLangState(guess);
      document.documentElement.lang = guess;
    }
  }, []);

  const setLang = useCallback((next: LangCode) => {
    setLangState(next);
    document.documentElement.lang = next;
    try {
      window.localStorage.setItem(STORAGE_KEY_LANG, next);
    } catch {
      /* nothing to do; the choice still applies for this session */
    }
  }, []);

  const value = useMemo<LangCtx>(
    () => ({ lang, setLang, t: (key: TKey) => translate(key, lang) }),
    [lang, setLang],
  );

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export { LANGS };

/* ============================================================== toast == */

type ToastKind = 'info' | 'ok' | 'bad';

interface ToastItem {
  id: number;
  kind: ToastKind;
  text: string;
}

interface ToastCtx {
  toast: (text: string, kind?: ToastKind) => void;
}

const ToastContext = createContext<ToastCtx>({ toast: () => {} });

export const useToast = () => useContext(ToastContext).toast;

function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const seq = useRef(0);

  const toast = useCallback((text: string, kind: ToastKind = 'info') => {
    seq.current += 1;
    const id = seq.current;
    setItems((list) => [...list, { id, kind, text }]);
    window.setTimeout(() => setItems((list) => list.filter((i) => i.id !== id)), 4200);
  }, []);

  const value = useMemo<ToastCtx>(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-host" role="status" aria-live="polite">
        {items.map((item) => (
          <div key={item.id} className={`toast ${item.kind === 'info' ? '' : item.kind}`}>
            {item.kind === 'ok' ? <CheckCircle2 size={17} /> : null}
            {item.kind === 'bad' ? <AlertTriangle size={17} /> : null}
            {item.kind === 'info' ? <Info size={17} /> : null}
            <span>{item.text}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/* =============================================================== auth == */

export type AuthStatus = 'loading' | 'signedOut' | 'signedIn';

interface AuthCtx {
  status: AuthStatus;
  userId: string | null;
  email: string | null;
  profile: Profile | null;
  /** Re-read the profile row, e.g. after an edit. */
  refreshProfile: () => Promise<void>;
  /** Replace the cached profile without a round trip. */
  setProfile: (p: Profile) => void;
  signOut: () => Promise<void>;
  configured: boolean;
}

const AuthContext = createContext<AuthCtx>({
  status: 'loading',
  userId: null,
  email: null,
  profile: null,
  refreshProfile: async () => {},
  setProfile: () => {},
  signOut: async () => {},
  configured: false,
});

export const useAuth = () => useContext(AuthContext);

function AuthProvider({ children }: { children: React.ReactNode }) {
  const { lang, setLang } = useContext(LangContext);
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [profile, setProfileState] = useState<Profile | null>(null);
  const seeded = useRef<Set<string>>(new Set());
  // Read inside loadProfile without making it depend on `lang`, which would
  // rebuild the callback on every language change and refetch the profile.
  const langRef = useRef<LangCode>('en');
  langRef.current = lang;

  const configured = isSupabaseConfigured();

  const loadProfile = useCallback(
    async (id: string, mail: string | null) => {
      const result = await ensureProfile(id, { email: mail });
      if (result.data) {
        setProfileState(result.data);

        // The language choice follows the account, not the browser: sign in on
        // a borrowed phone and the app is still in your language.
        const saved = result.data.preferred_language;
        if (isLangCode(saved) && saved !== langRef.current) setLang(saved);

        // Demo accounts get their sample content the first time they appear.
        // Guarded by a ref so a re-render never triggers a second pass.
        if (isDemoProfile(result.data) && !seeded.current.has(id)) {
          seeded.current.add(id);
          void seedDemoContent(result.data);
        }
      }
    },
    [setLang],
  );

  // Persist a language change back to the profile, so it survives a new device.
  useEffect(() => {
    if (!profile || profile.preferred_language === lang) return;
    setProfileState({ ...profile, preferred_language: lang });
    void updateProfile(profile.id, { preferred_language: lang });
  }, [lang, profile]);

  useEffect(() => {
    if (!configured) {
      setStatus('signedOut');
      return;
    }

    let alive = true;
    const client = supabase();

    client.auth
      .getSession()
      .then(({ data }) => {
        if (!alive) return;
        const user = data.session?.user ?? null;
        if (user) {
          setUserId(user.id);
          setEmail(user.email ?? null);
          setStatus('signedIn');
          void loadProfile(user.id, user.email ?? null);
        } else {
          setStatus('signedOut');
        }
      })
      .catch(() => {
        if (alive) setStatus('signedOut');
      });

    const { data: sub } = client.auth.onAuthStateChange((_event, session) => {
      if (!alive) return;
      const user = session?.user ?? null;
      if (user) {
        setUserId(user.id);
        setEmail(user.email ?? null);
        setStatus('signedIn');
        void loadProfile(user.id, user.email ?? null);
      } else {
        setUserId(null);
        setEmail(null);
        setProfileState(null);
        setStatus('signedOut');
      }
    });

    return () => {
      alive = false;
      sub?.subscription?.unsubscribe?.();
    };
  }, [configured, loadProfile]);

  const refreshProfile = useCallback(async () => {
    if (userId) await loadProfile(userId, email);
  }, [userId, email, loadProfile]);

  const doSignOut = useCallback(async () => {
    await signOutQuery();
    setUserId(null);
    setEmail(null);
    setProfileState(null);
    setStatus('signedOut');
  }, []);

  const value = useMemo<AuthCtx>(
    () => ({
      status,
      userId,
      email,
      profile,
      refreshProfile,
      setProfile: setProfileState,
      signOut: doSignOut,
      configured,
    }),
    [status, userId, email, profile, refreshProfile, doSignOut, configured],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/* ============================================================== root == */

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <LangProvider>
        <ToastProvider>
          <AuthProvider>{children}</AuthProvider>
        </ToastProvider>
      </LangProvider>
    </ThemeProvider>
  );
}
