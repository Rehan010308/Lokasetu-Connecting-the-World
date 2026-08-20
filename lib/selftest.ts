/**
 * npm test
 *
 * Assertions over the whole logic layer: the negotiation rules, the connection
 * state machine, the normalisers that sit between PostgREST and the UI, the
 * formatters, and the completeness of ten languages.
 *
 * Everything asserted here is pure, which is the point. The rules that decide
 * who may accept an offer live in one function and are checked here directly,
 * rather than by clicking through the app and hoping.
 *
 * Run with:  npm test
 */

import {
  CONNECTION_STATUSES,
  OFFER_STATUSES,
  POST_STATUSES,
  POST_TYPES,
  ROLES,
  PROFILE_FIELDS,
  OFFER_SELECT,
  CONNECTION_SELECT,
  POST_SELECT,
  TABLE,
} from './database.types';
import {
  acceptedPeers,
  avatarHue,
  compact,
  connectionWith,
  counterparty,
  displayName,
  earningsFor,
  handleOf,
  incomingRequests,
  initials,
  normalizeConnection,
  normalizeOffer,
  normalizePost,
  normalizeProfile,
  offerMovement,
  offerPermissions,
  outgoingRequests,
  type Connection,
  type Offer,
  type Profile,
} from './model';
import {
  compactNumber,
  isEmail,
  monthYear,
  normalizeUsername,
  parseAmount,
  rupees,
  timeAgo,
  truncate,
} from './format';
import { CATEGORIES, CATEGORY_IDS, CITIES, categoryById } from './catalog';
import { LANGS, LANG_CODES, T_KEYS, categoryKey, isLangCode, translate } from './i18n';
import { describeError } from './errors';
import {
  contactOwnerId,
  contactView,
  fullAddress,
  isPhone,
  locality,
  mapsUrl,
  normalizePhone,
  telUrl,
} from './contact';
import { DEMO_ACCOUNTS, DEMO_USERNAMES, demoAccountFor, isDemoUsername } from './demo-accounts';
import { VERSION } from './version';

let passed = 0;
const failures: string[] = [];

function ok(label: string, condition: boolean): void {
  if (condition) passed += 1;
  else failures.push(label);
}

function eq<T>(label: string, actual: T, expected: T): void {
  const same = JSON.stringify(actual) === JSON.stringify(expected);
  if (same) passed += 1;
  else failures.push(`${label}\n      expected ${JSON.stringify(expected)}\n      actual   ${JSON.stringify(actual)}`);
}

function section(name: string): void {
  console.log(`\n  ${name}`);
}

/* ================================================================ setup == */

const NOW = new Date('2026-06-15T10:00:00.000Z');

function profile(over: Partial<Profile> & { id: string }): Profile {
  return {
    id: over.id,
    created_at: '2025-01-10T00:00:00.000Z',
    updated_at: null,
    username: 'username' in over ? (over.username ?? null) : over.id,
    full_name: over.full_name ?? null,
    avatar_url: over.avatar_url ?? null,
    bio: over.bio ?? null,
    location: over.location ?? null,
    role: over.role ?? 'worker',
    skills: over.skills ?? [],
    hourly_rate: over.hourly_rate ?? null,
    verified: over.verified ?? false,
    city: over.city ?? null,
    area: over.area ?? null,
    society: over.society ?? null,
    preferred_language: over.preferred_language ?? 'en',
  };
}

const EMPLOYER = profile({ id: 'emp-1', role: 'employer', full_name: 'Priya Menon' });
const WORKER = profile({ id: 'wrk-1', role: 'worker', full_name: 'Ramesh Kumar', skills: ['electrical'] });
const STRANGER = profile({ id: 'oth-1', role: 'worker', full_name: 'Anita Rao' });

function offer(over: Partial<Offer> = {}): Offer {
  return {
    id: over.id ?? 1,
    created_at: over.created_at ?? '2026-06-01T09:00:00.000Z',
    updated_at: over.updated_at ?? '2026-06-01T09:00:00.000Z',
    post_id: over.post_id ?? 10,
    employer_id: over.employer_id ?? EMPLOYER.id,
    worker_id: over.worker_id ?? WORKER.id,
    offered_price: over.offered_price ?? 900,
    status: over.status ?? 'pending',
    message: over.message ?? null,
    round: over.round ?? 1,
    last_actor: over.last_actor === undefined ? EMPLOYER.id : over.last_actor,
    employer: over.employer ?? EMPLOYER,
    worker: over.worker ?? WORKER,
    post: over.post ?? null,
  };
}

function connection(over: Partial<Connection> & { id: number }): Connection {
  return {
    id: over.id,
    created_at: over.created_at ?? '2026-05-01T00:00:00.000Z',
    requester_id: over.requester_id ?? EMPLOYER.id,
    receiver_id: over.receiver_id ?? WORKER.id,
    status: over.status ?? 'pending',
    requester: over.requester ?? EMPLOYER,
    receiver: over.receiver ?? WORKER,
  };
}

/* ============================================== 1. the negotiation rules == */

section('negotiation rules');

{
  // An employer has just proposed 900. The worker may answer; the employer may not.
  const fresh = offer({ status: 'pending', last_actor: EMPLOYER.id });

  const asWorker = offerPermissions(fresh, WORKER.id);
  ok('worker is a party to the offer', asWorker.isParty);
  ok('worker is identified as the worker', asWorker.isWorker && !asWorker.isEmployer);
  ok('worker may accept a price the employer named', asWorker.canAccept);
  ok('worker may decline', asWorker.canDecline);
  ok('worker may counter', asWorker.canCounter);
  ok('worker may not withdraw the employer offer', !asWorker.canWithdraw);
  eq('the ball is in the worker court', asWorker.waitingOn, 'you');

  const asEmployer = offerPermissions(fresh, EMPLOYER.id);
  ok('employer may NOT accept their own number', !asEmployer.canAccept);
  ok('employer knows they named the current price', asEmployer.proposedCurrentPrice);
  ok('employer may withdraw a pending offer', asEmployer.canWithdraw);
  eq('employer is waiting on the other side', asEmployer.waitingOn, 'them');

  const asStranger = offerPermissions(fresh, STRANGER.id);
  ok('a third party is not a party', !asStranger.isParty);
  ok('a third party can do nothing', !asStranger.canAccept && !asStranger.canDecline && !asStranger.canCounter);
  eq('a third party is waiting on nobody', asStranger.waitingOn, 'nobody');

  const signedOut = offerPermissions(fresh, null);
  ok('a signed-out visitor is not a party', !signedOut.isParty);
  ok('a signed-out visitor cannot accept', !signedOut.canAccept);
}

{
  // The worker countered at 1400. Now the employer may answer and the worker may not.
  const countered = offer({ status: 'countered', offered_price: 1400, round: 2, last_actor: WORKER.id });

  ok('after a counter, the employer may accept', offerPermissions(countered, EMPLOYER.id).canAccept);
  ok('after a counter, the worker may not accept their own number', !offerPermissions(countered, WORKER.id).canAccept);
  eq('after a counter, it is the employer turn', offerPermissions(countered, EMPLOYER.id).waitingOn, 'you');
  eq('after a counter, the worker waits', offerPermissions(countered, WORKER.id).waitingOn, 'them');
  ok('a countered offer can no longer be withdrawn', !offerPermissions(countered, EMPLOYER.id).canWithdraw);
}

{
  for (const status of ['accepted', 'declined'] as const) {
    const settled = offer({ status });
    const can = offerPermissions(settled, WORKER.id);
    ok(`a ${status} offer is settled`, can.isSettled);
    ok(`a ${status} offer cannot be accepted again`, !can.canAccept);
    ok(`a ${status} offer cannot be declined again`, !can.canDecline);
    ok(`a ${status} offer cannot be countered`, !can.canCounter);
    eq(`a ${status} offer waits on nobody`, can.waitingOn, 'nobody');
  }
}

{
  // last_actor is what makes "nobody accepts their own number" enforceable.
  const noActor = offer({ last_actor: null });
  ok('with no recorded actor, the worker may still accept', offerPermissions(noActor, WORKER.id).canAccept);
  ok('with no recorded actor, the employer may also accept', offerPermissions(noActor, EMPLOYER.id).canAccept);
}

eq('counterparty of an employer view is the worker', counterparty(offer(), EMPLOYER.id)?.id, WORKER.id);
eq('counterparty of a worker view is the employer', counterparty(offer(), WORKER.id)?.id, EMPLOYER.id);
eq('counterparty for an outsider falls back to the employer', counterparty(offer(), STRANGER.id)?.id, EMPLOYER.id);

eq('movement from 1000 to 1400 is +40%', offerMovement(offer({ offered_price: 1400 }), 1000), 40);
eq('movement from 1000 to 800 is -20%', offerMovement(offer({ offered_price: 800 }), 1000), -20);
eq('movement without an opening price is unknown', offerMovement(offer(), null), null);
eq('movement from zero is unknown, not infinite', offerMovement(offer(), 0), null);

/* ============================================ 2. the connection machine == */

section('connections');

{
  const rows: Connection[] = [
    connection({ id: 1, requester_id: EMPLOYER.id, receiver_id: WORKER.id, status: 'pending' }),
    connection({ id: 2, requester_id: STRANGER.id, receiver_id: EMPLOYER.id, status: 'accepted', requester: STRANGER, receiver: EMPLOYER }),
  ];

  eq('a request I sent reads as outgoing', connectionWith(rows, EMPLOYER.id, WORKER.id).state, 'outgoing');
  eq('the same row reads as incoming from the other side', connectionWith(rows, WORKER.id, EMPLOYER.id).state, 'incoming');
  eq('an accepted row reads as connected', connectionWith(rows, EMPLOYER.id, STRANGER.id).state, 'connected');
  eq('no row means no relationship', connectionWith(rows, WORKER.id, STRANGER.id).state, 'none');
  eq('myself is never a connection', connectionWith(rows, EMPLOYER.id, EMPLOYER.id).state, 'none');
  eq('signed out has no relationships', connectionWith(rows, null, WORKER.id).state, 'none');

  eq('one accepted peer', acceptedPeers(rows, EMPLOYER.id).map((p) => p.id), [STRANGER.id]);
  eq('the peer list is from my point of view', acceptedPeers(rows, STRANGER.id).map((p) => p.id), [EMPLOYER.id]);
  eq('signed out has no peers', acceptedPeers(rows, null), []);

  eq('the worker has one request to answer', incomingRequests(rows, WORKER.id).map((c) => c.id), [1]);
  eq('the employer has one request outstanding', outgoingRequests(rows, EMPLOYER.id).map((c) => c.id), [1]);
  eq('the employer has nothing to answer', incomingRequests(rows, EMPLOYER.id), []);

  const rejected = [connection({ id: 3, status: 'rejected' })];
  eq('a rejected row is not pending', connectionWith(rejected, EMPLOYER.id, WORKER.id).state, 'rejected');
  eq('a rejected row is not an incoming request', incomingRequests(rejected, WORKER.id), []);

  const blocked = [connection({ id: 4, status: 'blocked' })];
  eq('a blocked row reads as blocked', connectionWith(blocked, EMPLOYER.id, WORKER.id).state, 'blocked');
}

/* ============================================== 3. row normalisation == */

section('normalising what PostgREST returns');

{
  // PostgREST returns an embedded one-to-one as an object OR a one-element
  // array depending on how it resolved the relationship. Both must work.
  const asObject = normalizePost({ id: 7, user_id: 'u1', content: 'hi', author: { id: 'u1', role: 'worker' } });
  const asArray = normalizePost({ id: 7, user_id: 'u1', content: 'hi', author: [{ id: 'u1', role: 'worker' }] });
  eq('an embedded object becomes an author', asObject?.author?.id, 'u1');
  eq('an embedded array becomes the same author', asArray?.author?.id, 'u1');
  eq('an empty embed becomes null', normalizePost({ id: 7, user_id: 'u1', content: 'x', author: [] })?.author, null);

  eq('a numeric budget arriving as a string becomes a number', normalizePost({ id: 1, user_id: 'u', content: 'c', budget: '250.50' })?.budget, 250.5);
  eq('an empty budget is null, not zero', normalizePost({ id: 1, user_id: 'u', content: 'c', budget: '' })?.budget, null);
  eq('a missing budget is null', normalizePost({ id: 1, user_id: 'u', content: 'c' })?.budget, null);
  eq('an unknown post type falls back to job', normalizePost({ id: 1, user_id: 'u', content: 'c', post_type: 'nonsense' })?.post_type, 'job');
  eq('an unknown status falls back to open', normalizePost({ id: 1, user_id: 'u', content: 'c', status: 'weird' })?.status, 'open');
  eq('a row with no id is dropped', normalizePost({ user_id: 'u', content: 'c' }), null);
  eq('null in, null out', normalizePost(null), null);

  eq('an unknown role falls back to worker', normalizeProfile({ id: 'x', role: 'admin' })?.role, 'worker');
  eq('skills default to an empty array', normalizeProfile({ id: 'x' })?.skills, []);
  eq('non-string skills are discarded', normalizeProfile({ id: 'x', skills: ['electrical', 7, null] })?.skills, ['electrical']);
  eq('verified is a boolean, never undefined', normalizeProfile({ id: 'x' })?.verified, false);
  eq('a profile with no id is dropped', normalizeProfile({ username: 'ghost' }), null);

  const normalised = normalizeOffer({
    id: '12',
    employer_id: 'e',
    worker_id: 'w',
    offered_price: '1450.00',
    status: 'countered',
    round: '3',
    employer: [{ id: 'e', role: 'employer' }],
    worker: { id: 'w', role: 'worker' },
    post: [{ id: 5, content: 'job', post_type: 'job' }],
  });
  eq('a bigint id becomes a number', normalised?.id, 12);
  eq('a numeric price becomes a number', normalised?.offered_price, 1450);
  eq('a round count becomes a number', normalised?.round, 3);
  eq('the employer embed is flattened', normalised?.employer?.id, 'e');
  eq('the worker embed is flattened', normalised?.worker?.id, 'w');
  eq('the post embed is flattened', normalised?.post?.id, 5);
  eq('an offer with no price is zero, not NaN', normalizeOffer({ id: 1, employer_id: 'e', worker_id: 'w' })?.offered_price, 0);
  eq('an unknown offer status falls back to pending', normalizeOffer({ id: 1, employer_id: 'e', worker_id: 'w', status: 'zzz' })?.status, 'pending');

  eq('an unknown connection status falls back to pending', normalizeConnection({ id: 1, requester_id: 'a', receiver_id: 'b', status: '??' })?.status, 'pending');
  eq('compact drops the nulls', compact([1, null, 2, null]), [1, 2]);
}

/* ====================================================== 4. earnings == */

section('earnings');

{
  const accepted = [
    offer({ id: 1, status: 'accepted', offered_price: 1200, updated_at: '2026-06-02T00:00:00.000Z' }),
    offer({ id: 2, status: 'accepted', offered_price: 800, updated_at: '2026-05-11T00:00:00.000Z' }),
    offer({ id: 3, status: 'accepted', offered_price: 3000, updated_at: '2026-04-04T00:00:00.000Z' }),
    offer({ id: 4, status: 'declined', offered_price: 9999, updated_at: '2026-06-03T00:00:00.000Z' }),
    offer({ id: 5, status: 'pending', offered_price: 9999, updated_at: '2026-06-04T00:00:00.000Z' }),
    offer({ id: 6, status: 'accepted', offered_price: 5000, worker_id: STRANGER.id, updated_at: '2026-06-05T00:00:00.000Z' }),
  ];

  const mine = earningsFor(accepted, WORKER.id, NOW);
  eq('only accepted offers count', mine.jobs, 3);
  eq('lifetime is the sum of accepted offers', mine.lifetime, 5000);
  eq('somebody else earnings are not mine', mine.lifetime < 10000, true);
  eq('this month is only this month', mine.thisMonth, 1200);
  eq('the average is rounded', mine.average, 1667);
  eq('the best single job is the largest', mine.best, 3000);
  eq('six buckets by default', mine.buckets.length, 6);
  eq('the last bucket is the current month', mine.buckets[5].label, 'Jun');
  eq('the first bucket is five months back', mine.buckets[0].label, 'Jan');
  eq('June holds one job', mine.buckets[5].count, 1);
  eq('May holds 800', mine.buckets[4].total, 800);
  eq('April holds 3000', mine.buckets[3].total, 3000);
  eq('March is empty, not missing', mine.buckets[2].total, 0);

  const nothing = earningsFor([], WORKER.id, NOW);
  eq('no offers means no money', nothing.lifetime, 0);
  eq('no offers means no jobs', nothing.jobs, 0);
  eq('an average over zero jobs is zero, not NaN', nothing.average, 0);
  eq('the empty chart still has six months', nothing.buckets.length, 6);

  const signedOut = earningsFor(accepted, null, NOW);
  eq('a null viewer earns nothing', signedOut.lifetime, 0);

  const twelve = earningsFor(accepted, WORKER.id, NOW, 12);
  eq('the range is configurable', twelve.buckets.length, 12);
}

/* ====================================================== 5. formatting == */

section('formatting');

eq('rupees group the Indian way', rupees(1250000), '₹12,50,000');
eq('a round amount has no decimals', rupees(1200), '₹1,200');
eq('paise survive', rupees(1200.5), '₹1,200.50');
eq('zero is zero, not blank', rupees(0), '₹0');
eq('null has no amount', rupees(null), '—');
eq('NaN has no amount', rupees(NaN), '—');

eq('thousands compact', compactNumber(1200), '1.2k');
eq('a round thousand loses the .0', compactNumber(5000), '5k');
eq('lakhs compact', compactNumber(250000), '2.5L');
eq('crores compact', compactNumber(12000000), '1.2Cr');
eq('small numbers stay whole', compactNumber(42), '42');

eq('seconds are just now', timeAgo(new Date(NOW.getTime() - 20_000).toISOString(), NOW), 'just now');
eq('minutes are minutes', timeAgo(new Date(NOW.getTime() - 12 * 60_000).toISOString(), NOW), '12m');
eq('hours are hours', timeAgo(new Date(NOW.getTime() - 5 * 3_600_000).toISOString(), NOW), '5h');
eq('days are days', timeAgo(new Date(NOW.getTime() - 3 * 86_400_000).toISOString(), NOW), '3d');
ok('a month ago becomes a date', /\d/.test(timeAgo('2026-01-02T00:00:00.000Z', NOW)));
eq('no timestamp, no output', timeAgo(null, NOW), '');
eq('rubbish in, nothing out', timeAgo('not a date', NOW), '');

ok('month and year read as words', monthYear('2026-03-01T00:00:00.000Z').includes('2026'));
eq('no date, no month', monthYear(null), '');

eq('a plain number parses', parseAmount('1200'), 1200);
eq('commas are ignored', parseAmount('1,200'), 1200);
eq('a rupee sign is ignored', parseAmount('₹1200'), 1200);
eq('surrounding space is ignored', parseAmount('  1200  '), 1200);
eq('two decimal places are kept', parseAmount('1200.50'), 1200.5);
eq('letters are refused', parseAmount('12ab'), null);
eq('an empty string is refused', parseAmount(''), null);
eq('zero is refused as a price', parseAmount('0'), null);
eq('a negative is refused', parseAmount('-50'), null);
eq('three decimal places are refused', parseAmount('12.345'), null);

eq('a username is lowercased', normalizeUsername('RameshKumar'), 'rameshkumar');
eq('punctuation is stripped', normalizeUsername('ramesh.kumar!'), 'rameshkumar');
eq('underscores survive', normalizeUsername('ramesh_kumar'), 'ramesh_kumar');
eq('a username is capped at 24', normalizeUsername('a'.repeat(40)).length, 24);

ok('a real address is an email', isEmail('worker@lokasetu.com'));
ok('no at sign, no email', !isEmail('worker.lokasetu.com'));
ok('no domain, no email', !isEmail('worker@'));
ok('a space is not an email', !isEmail('a b@c.com'));

eq('short text is left alone', truncate('hello', 20), 'hello');
ok('long text is cut at a word', truncate('the quick brown fox jumps over', 12).endsWith('…'));
ok('truncation does not split a word', !truncate('the quick brown fox jumps over', 12).includes('brow…'));

/* ====================================================== 6. people == */

section('people');

eq('a full name wins', displayName(profile({ id: 'a', full_name: 'Ramesh Kumar', username: 'rk' })), 'Ramesh Kumar');
eq('a username is the fallback', displayName(profile({ id: 'a', full_name: null, username: 'rk' })), 'rk');
eq('nobody is Someone', displayName(null), 'Someone');
eq('a handle carries the at sign', handleOf(profile({ id: 'a', username: 'rk' })), '@rk');
eq('no username, no handle', handleOf(profile({ id: 'a', username: null })), '');

eq('two names give two initials', initials('Ramesh Kumar'), 'RK');
eq('one name gives two letters', initials('Ramesh'), 'RA');
eq('a middle name is skipped', initials('Ravi Shankar Prasad'), 'RP');
eq('empty gives a question mark', initials('   '), '?');

eq('the same person always gets the same colour', avatarHue('wrk-1'), avatarHue('wrk-1'));
ok('different people usually differ', avatarHue('wrk-1') !== avatarHue('emp-1'));
ok('a hue is a hue', avatarHue('anything') >= 0 && avatarHue('anything') < 360);

/* ================================================ 7. error messages == */

section('error translation');

eq('a duplicate connection is explained', describeError({ code: '23505', message: 'duplicate key value violates unique constraint "unique_connection"' }), 'You have already sent this person a request.');
eq('a taken username is explained', describeError({ code: '23505', message: 'duplicate key value violates unique constraint "profiles_username_key"' }), 'That username is taken. Try another.');
eq('a missing table names the fix', describeError({ code: '42P01', message: 'relation "public.offers" does not exist' }), 'The database tables are missing. Run supabase/schema.sql in the Supabase SQL editor.');
ok('a missing column names the fix', describeError({ code: '42703', message: 'column posts.post_type does not exist' }).includes('supabase/schema.sql'));
eq('a trigger message reaches the user', describeError({ code: 'P0001', message: 'the side that proposed this price cannot also accept it' }), 'the side that proposed this price cannot also accept it');
eq('bad credentials are plain English', describeError({ message: 'Invalid login credentials' }), 'That email and password do not match an account.');
ok('an unconfirmed email names the setting', describeError({ message: 'Email not confirmed' }).includes('Confirm email'));
eq('a duplicate account suggests signing in', describeError({ message: 'User already registered' }), 'An account with that email already exists. Sign in instead.');
ok('a network failure names the variable', describeError({ message: 'Failed to fetch' }).includes('NEXT_PUBLIC_SUPABASE_URL'));
eq('no error still returns a sentence', describeError(null), 'Something went wrong.');
eq('an unknown error keeps its message', describeError({ message: 'kaboom' }), 'kaboom');

/* ============================================ 7b. contact and address == */

section('contact reveal');

{
  const pending = offer({ status: 'pending' });
  const accepted = offer({ status: 'accepted' });

  ok('a pending offer reveals nothing to the worker', !contactView(pending, WORKER.id).revealed);
  ok('a pending offer reveals nothing to the employer', !contactView(pending, EMPLOYER.id).revealed);
  ok('an accepted offer reveals contact to the worker', contactView(accepted, WORKER.id).revealed);
  ok('an accepted offer reveals contact to the employer', contactView(accepted, EMPLOYER.id).revealed);
  ok('an accepted offer reveals nothing to a stranger', !contactView(accepted, STRANGER.id).revealed);
  ok('an accepted offer reveals nothing when signed out', !contactView(accepted, null).revealed);
  ok('a declined offer reveals nothing', !contactView(offer({ status: 'declined' }), WORKER.id).revealed);
  ok('a countered offer reveals nothing', !contactView(offer({ status: 'countered' }), WORKER.id).revealed);

  ok('the worker gets the address', contactView(accepted, WORKER.id).seesAddress);
  ok('the employer does not need an address', !contactView(accepted, EMPLOYER.id).seesAddress);
  eq('the worker sees the employer', contactView(accepted, WORKER.id).person?.id, EMPLOYER.id);
  eq('the employer sees the worker', contactView(accepted, EMPLOYER.id).person?.id, WORKER.id);
  eq('a stranger sees nobody', contactView(accepted, STRANGER.id).person, null);

  eq('the worker reads the employer private row', contactOwnerId(accepted, WORKER.id), EMPLOYER.id);
  eq('the employer reads the worker private row', contactOwnerId(accepted, EMPLOYER.id), WORKER.id);
  eq('a stranger reads nobody', contactOwnerId(accepted, STRANGER.id), null);
}

{
  const resident = profile({
    id: 'r1',
    role: 'employer',
    city: 'Bengaluru',
    area: 'Koramangala',
    society: 'Green Valley Apartments',
    location: 'Koramangala, Bengaluru',
  });

  eq('locality is area and city only', locality(resident), 'Koramangala, Bengaluru');
  eq('locality never includes the society', locality(resident).includes('Green Valley'), false);
  eq('locality falls back to the free-text location', locality(profile({ id: 'x', location: 'Mumbai' })), 'Mumbai');
  eq('nobody has no locality', locality(null), '');

  const details = { id: 1, owner_id: 'r1', post_id: 5, phone: '+919876543210', flat_number: 'B-402', landmark: 'opposite the water tank', notes: null, created_at: '', updated_at: '' };
  eq('the full address assembles in order', fullAddress(resident, details), 'B-402, Green Valley Apartments, Koramangala, near opposite the water tank, Bengaluru');
  eq('a missing private row still yields the locality parts', fullAddress(resident, null), 'Green Valley Apartments, Koramangala, Bengaluru');
  eq('no profile and no details is empty', fullAddress(null, null), '');
}

ok('the maps link is the documented universal URL', mapsUrl('B-402, Koramangala').startsWith('https://www.google.com/maps/search/?api=1&query='));
ok('the maps query is encoded', mapsUrl('B-402, Koramangala').includes('B-402%2C%20Koramangala'));
eq('no address, no link', mapsUrl('   '), '');
ok('the maps link needs no API key', !mapsUrl('anywhere').includes('key='));

eq('a ten digit number is a phone', isPhone('9876543210'), true);
eq('spaces and dashes are ignored', isPhone('98765-43210'), true);
eq('nine digits is not a phone', isPhone('987654321'), false);
eq('fourteen digits is not a phone', isPhone('98765432101234'), false);
eq('a ten digit number gains +91', normalizePhone('9876543210'), '+919876543210');
eq('an existing country code is kept once', normalizePhone('+91 98765 43210'), '+919876543210');
eq('nothing normalises to nothing', normalizePhone(''), '');
eq('the dial link strips punctuation', telUrl('+91 98765-43210'), 'tel:+919876543210');
eq('no number, no dial link', telUrl(null), '');

/* ================================================ 8. schema agreement == */

section('schema agreement');

eq('two roles', [...ROLES], ['worker', 'employer']);
eq('two post types', [...POST_TYPES], ['job', 'update']);
eq('four post statuses', POST_STATUSES.length, 4);
eq('four connection statuses', CONNECTION_STATUSES.length, 4);
eq('four offer statuses', OFFER_STATUSES.length, 4);
eq('the table names are the schema table names', Object.values(TABLE), ['profiles', 'posts', 'connections', 'offers', 'private_details']);

ok('the profile field list has no trailing comma', !PROFILE_FIELDS.trim().endsWith(','));
ok('the offer select names the employer relationship explicitly', OFFER_SELECT.includes('offers_employer_id_fkey'));
ok('the offer select names the worker relationship explicitly', OFFER_SELECT.includes('offers_worker_id_fkey'));
ok('the connection select names both relationships', CONNECTION_SELECT.includes('connections_requester_id_fkey') && CONNECTION_SELECT.includes('connections_receiver_id_fkey'));
ok('the post select embeds one author', POST_SELECT.includes('author:profiles('));
ok('every select asks for the columns the row type declares', PROFILE_FIELDS.includes('hourly_rate') && PROFILE_FIELDS.includes('verified') && PROFILE_FIELDS.includes('role'));

/* ================================================ 9. catalog and cities == */

section('catalog');

eq('fifteen categories', CATEGORIES.length, 15);
eq('category ids are unique', new Set(CATEGORY_IDS).size, CATEGORIES.length);
ok('every category has an icon', CATEGORIES.every((c) => c.icon.length > 0));
ok('every hue is a hue', CATEGORIES.every((c) => c.hue >= 0 && c.hue < 360));
eq('a known id resolves', categoryById('electrical')?.id, 'electrical');
eq('an unknown id resolves to nothing', categoryById('zzz'), null);
eq('null resolves to nothing', categoryById(null), null);
eq('city names are unique', new Set(CITIES).size, CITIES.length);
ok('there are at least ten cities', CITIES.length >= 10);

/* ================================================ 10. ten languages == */

section('ten languages');

eq('ten languages', LANGS.length, 10);
eq('ten language codes', LANG_CODES.length, 10);
eq('language codes are unique', new Set(LANG_CODES).size, 10);
ok('english is one of them', LANG_CODES.includes('en'));
ok('a real code is recognised', isLangCode('ta'));
ok('a fake code is not', !isLangCode('xx'));
ok('a non-string is not a code', !isLangCode(42));

{
  const missing: string[] = [];
  const blank: string[] = [];
  for (const key of T_KEYS) {
    for (const code of LANG_CODES) {
      const value = translate(key, code);
      if (value === undefined || value === null) missing.push(`${key}.${code}`);
      else if (String(value).trim() === '') blank.push(`${key}.${code}`);
    }
  }
  eq('no translation is missing', missing, []);
  eq('no translation is blank', blank, []);
}

ok('there are at least 150 strings', T_KEYS.length >= 150);
eq('every string exists in every language', T_KEYS.length * LANG_CODES.length, T_KEYS.length * 10);

{
  // The dictionary must cover every category id, or a chip renders as a raw id.
  const uncovered = CATEGORY_IDS.filter((id) => categoryKey(id) === 'cat_other' && id !== 'other');
  eq('every category has its own translation key', uncovered, []);
  eq('an unknown category falls back rather than crashing', categoryKey('not-a-category'), 'cat_other');
}

{
  // A sample, to catch a copy-paste that left English in a translated slot.
  const englishInHindi = ['navFeed', 'accept', 'decline', 'counter'].filter(
    (key) => translate(key as any, 'hi') === translate(key as any, 'en'),
  );
  eq('the Hindi column is not a copy of the English one', englishInHindi, []);
}

/* ================================================ 11. demo accounts == */

section('demo accounts');

eq('exactly two demo accounts', DEMO_ACCOUNTS.length, 2);
eq('one of each role', DEMO_ACCOUNTS.map((a) => a.role).sort(), ['employer', 'worker']);
eq('the emails are distinct', new Set(DEMO_ACCOUNTS.map((a) => a.email)).size, 2);
eq('the usernames are distinct', new Set(DEMO_USERNAMES).size, 2);
ok('every demo password is long enough for Supabase', DEMO_ACCOUNTS.every((a) => a.password.length >= 6));
ok('the demo emails are the documented ones', DEMO_ACCOUNTS.map((a) => a.email).includes('employer@lokasetu.com') && DEMO_ACCOUNTS.map((a) => a.email).includes('worker@lokasetu.com'));
ok('demo usernames are namespaced so a real signup cannot take them', DEMO_USERNAMES.every((u) => u.startsWith('lokasetu_')));
ok('a demo username is recognised', isDemoUsername('lokasetu_worker'));
ok('an ordinary username is not', !isDemoUsername('ramesh'));
ok('null is not a demo username', !isDemoUsername(null));
eq('an account can be found by username', demoAccountFor('lokasetu_worker')?.role, 'worker');
eq('an unknown username finds nothing', demoAccountFor('nobody'), null);
ok('the demo worker has skills to show', (demoAccountFor('lokasetu_worker')?.skills.length ?? 0) > 0);
ok('every demo skill is a real category', DEMO_ACCOUNTS.every((a) => a.skills.every((s) => CATEGORY_IDS.includes(s))));

/* ================================================ 12. version stamp == */

section('version');

ok('the version looks like a version', /^\d+\.\d+\.\d+$/.test(VERSION));
ok('the private details table is named', Object.values(TABLE).includes('private_details'));

/* ====================================================== the verdict == */

console.log('');
if (failures.length) {
  console.log(`  ${failures.length} assertion(s) failed:\n`);
  for (const failure of failures) console.log(`   ✗ ${failure}`);
  console.log(`\n  ${passed} passed, ${failures.length} failed\n`);
  process.exit(1);
}
console.log(`  ✅ ${passed} assertions passed\n`);
