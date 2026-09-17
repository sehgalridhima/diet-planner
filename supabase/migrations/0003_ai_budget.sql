-- ==============================================================
-- THE DAILY AI BUDGET
-- ==============================================================
-- Two rate limits already exist in the app, one for plans and one
-- for Zenith, and both are a Map in a serverless instance's memory.
-- Each instance keeps its own, and how many instances exist is
-- Vercel's decision, so "five an hour" has always really meant "five
-- per instance per hour" — weakest exactly when traffic is heaviest.
--
-- Those stay. They stop one person hammering the form, which is a
-- real thing to stop. What they could never be is a ceiling for the
-- whole site, and that is what this is.
--
-- No user data lives here. One row per day per kind, holding a count.
-- Not who asked, not what they asked, not what came back. The tables
-- in 0001 are locked to their owner by RLS because they hold health
-- data; this one holds nothing worth protecting and is reachable by
-- the anon key on purpose, through functions that can only spend it.
--
-- Underneath all of it, unchanged: the Anthropic balance with
-- auto-reload off. Spending cannot exceed what has been paid for, so
-- the worst case was never a bill. It is Eloquence going quiet — and
-- because one key and one balance are shared with Lead Scout and
-- Money Reader, a day spent in any of them is a day the other two do
-- not have. That is the thing this paces.
-- ==============================================================

create table if not exists public.ai_budget (
  day   date not null,
  -- 'plan' or 'coach'. A plan runs on Opus and costs roughly twenty
  -- times what a Zenith answer costs on Haiku, so one shared number
  -- would be wrong for whichever of them it was not written for.
  kind  text not null check (kind in ('plan', 'coach')),
  count integer not null default 0,
  primary key (day, kind)
);

alter table public.ai_budget enable row level security;
-- No policies, deliberately. Every read and write goes through the
-- security-definer functions below, so the anon key can spend the
-- budget and can do nothing else to the table.

/*
 * THE LIMITS LIVE HERE. This is the only copy.
 *
 * It was tempting to pass them in as arguments, which would have kept
 * each number next to the code that cares about it. That would also
 * have let anyone holding the anon key — which is everyone, it is
 * public — call claim_ai('plan', 1000000). A limit you can pass as an
 * argument is not a limit.
 *
 *   plan   A fresh week from Opus 5. Result caching means many
 *          requests never get here at all — inputs are rounded before
 *          becoming the cache key, so similar bodies with the same
 *          goal share one plan. Eight fresh plans a day is the worst
 *          case, and the worst case is the only one worth writing a
 *          limit for.
 *
 *   coach  Measured at about Rs 0.53 a question with a plan attached.
 *          Forty a day is roughly Rs 21.
 *
 * These are pacing, not protection — see the note at the top. Tune
 * them against the real figures: every AI call already logs its token
 * usage and rupee cost to the server console, so the numbers to put
 * here are the ones being printed, not estimates.
 */
create or replace function public.ai_daily_limit(p_kind text)
returns integer
language sql
immutable
as $$
  select case p_kind
    when 'plan'  then 8
    when 'coach' then 40
    else 0
  end
$$;

/* The day as this database reckons it. India, not UTC — a day that
 * ends at 5:30am is nobody's idea of a day. Written once, so the
 * spender and the reporter cannot disagree about when midnight is and
 * then agree perfectly whenever anyone checks during office hours. */
create or replace function public.ai_budget_today()
returns date
language sql
stable
as $$ select (now() at time zone 'Asia/Kolkata')::date $$;

/*
 * Claim one call of a kind, or refuse.
 *
 * Claiming and asking are the same act on purpose: a check that does
 * not consume can be raced, and two requests arriving together would
 * both be told yes.
 */
create or replace function public.claim_ai(p_kind text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  claimed boolean;
  today   date := ai_budget_today();
begin
  -- An unknown kind has a limit of zero, so it can never claim. That
  -- is the right answer for a typo: refuse, rather than invent an
  -- allowance for a name nothing recognises.
  if ai_daily_limit(p_kind) <= 0 then
    return false;
  end if;

  -- One statement, so it is atomic. If the day's count has already
  -- reached the limit the ON CONFLICT update matches no row, nothing
  -- is returned, and `claimed` stays null.
  insert into public.ai_budget (day, kind, count)
  values (today, p_kind, 1)
  on conflict (day, kind) do update
    set count = ai_budget.count + 1
    where ai_budget.count < ai_daily_limit(p_kind)
  returning true into claimed;

  return coalesce(claimed, false);
end;
$$;

grant execute on function public.claim_ai(text) to anon;

/* Read a kind's state for today without spending any of it. */
create or replace function public.ai_budget_status(p_kind text)
returns table (spent integer, allowed integer)
language sql
security definer
set search_path = public
as $$
  select
    coalesce(b.count, 0),
    ai_daily_limit(p_kind)
  from (select ai_budget_today() as day) d
  left join public.ai_budget b on b.day = d.day and b.kind = p_kind;
$$;

grant execute on function public.ai_budget_status(text) to anon;

-- Old rows are of no use to anyone; this keeps the table from growing
-- forever.
--
-- NOTHING CALLS THIS. It needs a schedule and there is not one, which
-- is fine: two rows a day is a few hundred a year of three small
-- columns. It is here so that the day it does matter, the answer is
-- already written.
create or replace function public.prune_ai_budget()
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.ai_budget
  where day < ai_budget_today() - 7;
$$;
