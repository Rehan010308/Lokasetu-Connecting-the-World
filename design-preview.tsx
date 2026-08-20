/**
 * DESIGN PREVIEW — npm run preview
 *
 * Renders the real components, with real props, inside the real shell, and
 * writes a self-contained HTML file with `app/globals.css` inlined. Open it in
 * a browser to review the design system without a dev server.
 *
 * It is a review tool, not part of the app: nothing in `app/` imports it, and
 * it ships zero bytes to production.
 */

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync, writeFileSync } from 'node:fs';
import { Providers } from '@/components/providers';
import { AppShell } from '@/components/shell';
import { PostCard } from '@/components/post-card';
import { PersonRow } from '@/components/person-row';
import { OfferCard } from '@/components/offer';
import {
  Badge,
  Button,
  Card,
  CategoryTag,
  Chip,
  EmptyState,
  Field,
  Segment,
  SkeletonPost,
  Stat,
} from '@/components/ui';
import { Inbox, IndianRupee, Plus, Search, TrendingUp } from '@/components/icons';
import type { Connection, Offer, Post, Profile } from '@/lib/model';
import { rupees } from '@/lib/format';

/* --------------------------------------------------------------- fixtures */

const employer: Profile = {
  id: 'emp-1',
  created_at: '2025-02-01T00:00:00.000Z',
  updated_at: null,
  username: 'lokasetu_employer',
  full_name: 'Priya Menon',
  avatar_url: null,
  bio: 'Managing a 12-flat building in Koramangala.',
  location: 'Koramangala, Bengaluru',
  role: 'employer',
  skills: [],
  hourly_rate: null,
  verified: true,
};

const worker: Profile = {
  id: 'wrk-1',
  created_at: '2024-08-01T00:00:00.000Z',
  updated_at: null,
  username: 'lokasetu_worker',
  full_name: 'Ramesh Kumar',
  avatar_url: null,
  bio: 'Electrician, fourteen years. Switchboards, wiring, inverter installs.',
  location: 'Koramangala, Bengaluru',
  role: 'worker',
  skills: ['electrical', 'appliance'],
  hourly_rate: 450,
  verified: true,
};

const third: Profile = {
  ...worker,
  id: 'wrk-2',
  username: 'anita_rao',
  full_name: 'Anita Rao',
  skills: ['cleaning', 'cooking'],
  hourly_rate: 320,
  verified: false,
  location: 'HSR Layout, Bengaluru',
};

const jobPost: Post = {
  id: 1,
  created_at: new Date(Date.now() - 3 * 3600_000).toISOString(),
  user_id: employer.id,
  content:
    'Second-floor flat, Koramangala 5th Block. The kitchen switchboard sparks when the mixer and the kettle run together. Needs looking at today if possible — I can be home after 6pm.',
  media_url: null,
  title: 'Switchboard sparking in the kitchen',
  category: 'electrical',
  budget: 1200,
  location: 'Koramangala, Bengaluru',
  post_type: 'job',
  status: 'open',
  author: employer,
};

const updatePost: Post = {
  id: 2,
  created_at: new Date(Date.now() - 26 * 3600_000).toISOString(),
  user_id: worker.id,
  content:
    'Electrical work anywhere around Koramangala, HSR or Indiranagar. Switchboards, new points, fan and light installs, inverter wiring. I bring my own tools and give you the price before I start.',
  media_url: null,
  title: 'Free Thursday and Friday this week',
  category: 'electrical',
  budget: null,
  location: 'Koramangala, Bengaluru',
  post_type: 'update',
  status: 'open',
  author: worker,
};

function offer(over: Partial<Offer>): Offer {
  return {
    id: 1,
    created_at: new Date(Date.now() - 7200_000).toISOString(),
    updated_at: new Date(Date.now() - 1800_000).toISOString(),
    post_id: 1,
    employer_id: employer.id,
    worker_id: worker.id,
    offered_price: 900,
    status: 'pending',
    message: 'Can you do it for this? It is a single switchboard, should not take long.',
    round: 1,
    last_actor: employer.id,
    employer,
    worker,
    post: {
      id: 1,
      title: jobPost.title,
      content: jobPost.content,
      category: 'electrical',
      budget: 1200,
      post_type: 'job',
      status: 'open',
    },
    ...over,
  };
}

const connections: Connection[] = [
  {
    id: 1,
    created_at: '2026-05-02T00:00:00.000Z',
    requester_id: employer.id,
    receiver_id: worker.id,
    status: 'accepted',
    requester: employer,
    receiver: worker,
  },
];

/* ------------------------------------------------------------ the preview */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 34 }}>
      <div className="section-title">{title}</div>
      {children}
    </section>
  );
}

function Preview() {
  return (
    <AppShell title="Design preview">
      <div className="page-head">
        <h1>Work near you</h1>
        <p className="lede">Everything people have posted, newest first.</p>
      </div>

      <Section title="search and filters">
        <div className="stack">
          <div className="input-group">
            <span className="lead">
              <Search size={16} />
            </span>
            <input className="input" placeholder="Search work, skills, places" defaultValue="" />
          </div>
          <div className="row-wrap">
            <Chip on>Everything</Chip>
            <Chip>Jobs</Chip>
            <Chip>Updates</Chip>
            <span style={{ width: 1, height: 20, background: 'var(--line)', margin: '0 2px' }} />
            <CategoryTag id="electrical" />
            <CategoryTag id="plumbing" />
            <CategoryTag id="cleaning" />
            <CategoryTag id="cooking" />
          </div>
        </div>
      </Section>

      <Section title="posts">
        <div className="stack">
          <PostCard post={jobPost} compact />
          <PostCard post={updatePost} compact />
        </div>
      </Section>

      <Section title="a negotiation, from each side">
        <div className="stack">
          <OfferCard offer={offer({})} viewerId={worker.id} />
          <OfferCard offer={offer({ status: 'countered', offered_price: 1400, round: 2, last_actor: worker.id, message: 'I can do 1400. That includes replacing the board, not just the switch.' })} viewerId={worker.id} />
          <OfferCard offer={offer({ status: 'accepted', offered_price: 1400, round: 3, last_actor: worker.id })} viewerId={employer.id} />
        </div>
      </Section>

      <Section title="people">
        <Card pad={false} className="divide">
          <PersonRow person={worker} connections={connections} meId={employer.id} />
          <PersonRow person={third} connections={[]} meId={employer.id} />
        </Card>
      </Section>

      <Section title="earnings">
        <div className="grid-4" style={{ marginBottom: 14 }}>
          <Stat hero label="Lifetime" value={rupees(184500)} note="47 · Jobs done" />
          <Stat label="This month" value={rupees(21400)} />
          <Stat label="Average" value={rupees(3925)} />
          <Stat label="Best single job" value={rupees(14000)} />
        </div>
        <Card pad="lg">
          <div className="section-title" style={{ marginBottom: 0 }}>
            <TrendingUp size={15} />
            Last six months
          </div>
          <div className="chart">
            {[
              ['Jan', 42],
              ['Feb', 61],
              ['Mar', 28],
              ['Apr', 88],
              ['May', 54],
              ['Jun', 100],
            ].map(([label, height]) => (
              <div className="chart-col" key={String(label)}>
                <div className="chart-bar" style={{ height: `${height}%` }}>
                  {height === 100 ? <span className="bar-value">₹36k</span> : null}
                </div>
                <div className="chart-label">{label}</div>
              </div>
            ))}
          </div>
        </Card>
      </Section>

      <Section title="controls">
        <Card pad="lg">
          <div className="stack">
            <div className="row-wrap">
              <Button variant="primary">
                <Plus size={16} />
                Primary
              </Button>
              <Button>Default</Button>
              <Button variant="soft">Soft</Button>
              <Button variant="good">Accept</Button>
              <Button variant="danger">Decline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button disabled>Disabled</Button>
            </div>

            <div className="row-wrap">
              <Badge>Neutral</Badge>
              <Badge tone="ok" dot>Open</Badge>
              <Badge tone="warn" dot>Pending</Badge>
              <Badge tone="bad">Declined</Badge>
              <Badge tone="info" dot>Countered</Badge>
              <Badge tone="brand">Worker</Badge>
              <Badge tone="solid">Verified</Badge>
            </div>

            <Segment<string>
              value="job"
              onChange={() => {}}
              options={[
                { value: 'job', label: 'A job' },
                { value: 'update', label: 'An update' },
              ]}
            />

            <div className="grid-2">
              <Field label="Amount" htmlFor="p-amount">
                <div className="input-group">
                  <span className="lead">
                    <IndianRupee size={16} />
                  </span>
                  <input id="p-amount" className="input" defaultValue="1400" />
                </div>
              </Field>
              <Field label="Category" htmlFor="p-cat">
                <select id="p-cat" className="select" defaultValue="electrical">
                  <option value="electrical">Electrical</option>
                </select>
              </Field>
            </div>

            <Field label="Details" htmlFor="p-details" optional>
              <textarea id="p-details" className="textarea" defaultValue="What needs doing, when, and anything the worker should bring." />
            </Field>

            <div className="pick">
              <button type="button" className="pick-option" data-on="true">
                <div className="pick-title">Find work</div>
                <div className="pick-body">Show your skills, receive offers, negotiate the price.</div>
              </button>
              <button type="button" className="pick-option">
                <div className="pick-title">Hire someone</div>
                <div className="pick-body">Post the work, propose a price, agree on the number.</div>
              </button>
            </div>
          </div>
        </Card>
      </Section>

      <Section title="loading and empty">
        <div className="stack">
          <SkeletonPost />
          <EmptyState
            icon={<Inbox size={22} />}
            title="No negotiations yet"
            body="Open a job in the feed and propose a price, or wait for one to arrive."
            action={<Button variant="soft">Go to the feed</Button>}
          />
          <div className="banner">
            <span>Only the two people in an offer can see it.</span>
          </div>
          <div className="banner warn">
            <span>Supabase is not connected yet. Add the two values to .env.local.</span>
          </div>
        </div>
      </Section>
    </AppShell>
  );
}

/* ------------------------------------------------------------------ write */

const css = readFileSync('app/globals.css', 'utf8');
const body = renderToStaticMarkup(
  React.createElement(Providers, null, React.createElement(Preview)),
);

const theme = process.argv.includes('--dark') ? 'dark' : 'light';
const out = process.argv.includes('--dark') ? 'preview-dark.html' : 'preview.html';

writeFileSync(
  out,
  `<!doctype html>
<html lang="en" data-theme="${theme}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>LokaSetu — design preview (${theme})</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>${css}</style>
</head>
<body>${body}</body>
</html>
`,
);

console.log(`  wrote ${out} (${theme})`);
