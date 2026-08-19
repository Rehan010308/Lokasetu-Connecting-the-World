import type { DockItem } from './aurora';
import type { TKey } from '@/lib/i18n';

type T = (k: TKey) => string;

/** Navigation for customers, societies and businesses. */
export function navNormal(t: T): DockItem[] {
  return [
    { href: '/', icon: '🏠', label: t('n.home') },
    { href: '/search', icon: '🔎', label: t('n.search') },
    { href: '/jobs', icon: '📋', label: t('n.jobs') },
    { href: '/me', icon: '👤', label: t('n.profile') },
  ];
}

/** Navigation for workers. */
export function navWorker(t: T): DockItem[] {
  return [
    { href: '/', icon: '🔎', label: t('n.home') },
    { href: '/jobs', icon: '🧰', label: t('n.jobs') },
    { href: '/me', icon: '👤', label: t('n.profile') },
  ];
}
