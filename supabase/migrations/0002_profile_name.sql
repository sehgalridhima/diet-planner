-- What to call them.
--
-- Nullable, because it is the one thing on this table that is not
-- needed to work a plan out. Everything else here feeds an equation;
-- a name only changes how the page reads, so an empty one has to be
-- an ordinary state rather than a gap to nag about.
--
-- Sixty characters is well past any real name and short enough that
-- a header cannot be used as a billboard.
alter table public.profiles
  add column if not exists name text check (char_length(name) <= 60);

comment on column public.profiles.name is
  'Display name. Seeded from the Google account on first sign-in, editable after. Never used in any calculation.';
