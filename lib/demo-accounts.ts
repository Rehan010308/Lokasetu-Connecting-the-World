/**
 * The two demo accounts, as data.
 *
 * Separated from `lib/demo.ts` (which performs the sign-in and the seeding) so
 * that this file imports nothing — the test suite and any server-side code can
 * read it without dragging in the Supabase browser client.
 *
 * These are deliberately public credentials for a public demo. They are not a
 * back door: they sign in through the same call as anybody else and are bound
 * by exactly the same Row Level Security policies.
 */

import type { Role } from './database.types';

export interface DemoAccount {
  role: Role;
  email: string;
  password: string;
  username: string;
  fullName: string;
  location: string;
  bio: string;
  skills: string[];
  hourlyRate: number | null;
}

export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    role: 'employer',
    email: 'employer@lokasetu.com',
    password: 'DemoPass123!',
    username: 'lokasetu_employer',
    fullName: 'Priya Menon',
    location: 'Koramangala, Bengaluru',
    bio: 'Managing a 12-flat building in Koramangala. I hire for repairs, deep cleaning and the occasional emergency at 11pm.',
    skills: [],
    hourlyRate: null,
  },
  {
    role: 'worker',
    email: 'worker@lokasetu.com',
    password: 'DemoPass123!',
    username: 'lokasetu_worker',
    fullName: 'Ramesh Kumar',
    location: 'Koramangala, Bengaluru',
    bio: 'Electrician, fourteen years. Switchboards, wiring, inverter installs. I carry my own tools and I quote before I start.',
    skills: ['electrical', 'appliance'],
    hourlyRate: 450,
  },
];

export const DEMO_USERNAMES: string[] = DEMO_ACCOUNTS.map((a) => a.username);

export function isDemoUsername(username: string | null | undefined): boolean {
  return Boolean(username && DEMO_USERNAMES.includes(username));
}

export function demoAccountFor(username: string | null | undefined): DemoAccount | null {
  if (!username) return null;
  return DEMO_ACCOUNTS.find((a) => a.username === username) ?? null;
}
