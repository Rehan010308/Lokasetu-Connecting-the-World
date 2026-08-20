-- =====================================================================
--  LokaSetu — optional demo content
--
--  YOU PROBABLY DO NOT NEED THIS FILE.
--
--  The app seeds itself: press "Quick login as a demo user" on /login and
--  the demo account is created (if it does not exist), signed in, and
--  given a few posts and one live negotiation. That path runs as the
--  signed-in user through Row Level Security, so it works on any project
--  with no SQL at all.
--
--  This file exists for the case where you want the demo data present
--  before anyone logs in, or you cleared it and want it back.
--
--  BEFORE RUNNING IT: sign in once as each demo account through the app,
--  so that the two auth users and their profiles exist. This script
--  refuses to run rather than guessing.
--
--  Safe to run repeatedly: it does nothing if the posts are already there.
-- =====================================================================

do $seed$
declare
  emp_id  uuid;
  wrk_id  uuid;
  job_id  bigint;
  existing int;
begin
  select id into emp_id from public.profiles where username = 'lokasetu_employer';
  select id into wrk_id from public.profiles where username = 'lokasetu_worker';

  if emp_id is null or wrk_id is null then
    raise notice '---------------------------------------------------------------';
    raise notice 'Demo profiles not found.';
    raise notice 'Open the app, go to /login, and press BOTH demo buttons once.';
    raise notice 'Then run this file again.';
    raise notice '---------------------------------------------------------------';
    return;
  end if;

  select count(*) into existing from public.posts where user_id in (emp_id, wrk_id);
  if existing > 0 then
    raise notice 'Demo content already present (% posts). Nothing to do.', existing;
    return;
  end if;

  -- Fill out the two profiles ------------------------------------------------
  update public.profiles
     set full_name   = 'Priya Menon',
         location    = 'Koramangala, Bengaluru',
         bio         = 'Managing a 12-flat building in Koramangala. I hire for repairs, deep cleaning and the occasional emergency at 11pm.',
         verified    = true
   where id = emp_id;

  update public.profiles
     set full_name   = 'Ramesh Kumar',
         location    = 'Koramangala, Bengaluru',
         bio         = 'Electrician, fourteen years. Switchboards, wiring, inverter installs. I carry my own tools and I quote before I start.',
         skills      = array['electrical', 'appliance'],
         hourly_rate = 450,
         verified    = true
   where id = wrk_id;

  -- Jobs, posted by the employer --------------------------------------------
  insert into public.posts (user_id, post_type, title, content, category, budget, location)
  values
    (emp_id, 'job', 'Switchboard sparking in the kitchen',
     'Second-floor flat, Koramangala 5th Block. The kitchen switchboard sparks when the mixer and the kettle run together. Needs looking at today if possible - I can be home after 6pm.',
     'electrical', 1200, 'Koramangala, Bengaluru')
  returning id into job_id;

  insert into public.posts (user_id, post_type, title, content, category, budget, location)
  values
    (emp_id, 'job', 'Deep clean before tenants move in',
     'Two-bedroom flat, empty, needs a full deep clean: bathrooms, kitchen chimney, balcony grills, windows inside and out. Roughly 900 sq ft. Saturday or Sunday.',
     'cleaning', 3500, 'Koramangala, Bengaluru'),
    (emp_id, 'job', 'Bathroom tap dripping for a week',
     'The hot water tap in the main bathroom drips constantly and the washer looks worn. Small job, but I would rather it was done properly than taped over.',
     'plumbing', 600, 'Koramangala, Bengaluru');

  -- Updates, posted by the worker -------------------------------------------
  insert into public.posts (user_id, post_type, title, content, category, location)
  values
    (wrk_id, 'update', 'Free Thursday and Friday this week',
     'Electrical work anywhere around Koramangala, HSR or Indiranagar. Switchboards, new points, fan and light installs, inverter wiring. I bring my own tools and give you the price before I start.',
     'electrical', 'Koramangala, Bengaluru'),
    (wrk_id, 'update', 'Finished a full rewiring in HSR Layout',
     'Three days, two-bedroom flat, all old aluminium wiring replaced with copper. The owner wanted every point tested in front of him, which is the right way to do it.',
     'electrical', 'HSR Layout, Bengaluru');

  -- One live negotiation, so the Offers screen is not empty -------------------
  insert into public.offers (post_id, employer_id, worker_id, offered_price, message, status)
  values (job_id, emp_id, wrk_id, 900,
          'Can you do it for this? It is a single switchboard, should not take long.',
          'pending');

  -- And one connection, already accepted ------------------------------------
  insert into public.connections (requester_id, receiver_id, status)
  values (emp_id, wrk_id, 'accepted')
  on conflict (requester_id, receiver_id) do nothing;

  raise notice 'Demo content created: 5 posts, 1 pending offer, 1 connection.';
end
$seed$;
