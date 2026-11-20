-- Inkwell database schema. Run once in the Supabase SQL Editor of a NEW project.

create table public.users (
  id            uuid primary key default gen_random_uuid(),
  name          text not null check (char_length(name) between 1 and 60),
  email         text not null unique,
  password_hash text not null,
  token_version integer not null default 0,
  created_at    timestamptz not null default now()
);

create table public.posts (
  id         uuid primary key default gen_random_uuid(),
  type       text not null default 'article',
  title      text,
  category   text,
  content    text not null,
  author_id  uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  constraint posts_type_check check (type in ('article', 'thought')),
  constraint posts_shape_check check (
    (type = 'article'
       and title is not null and char_length(title) between 1 and 100
       and category in ('Technology', 'Security', 'Tutorial', 'Life')
       and char_length(content) between 30 and 5000)
    or
    (type = 'thought'
       and title is null and category is null
       and char_length(content) between 1 and 280)
  )
);

create index posts_created_at_idx on public.posts (created_at desc);
create index posts_author_idx     on public.posts (author_id);
create index posts_type_idx       on public.posts (type, created_at desc);

-- Lock both tables: with RLS on and no policies, the public (anon) key can read
-- and write nothing. Only the backend's secret key can.
alter table public.users enable row level security;
alter table public.posts enable row level security;

-- Optional demo content: a team account nobody can log in as, plus sample posts
insert into public.users (id, name, email, password_hash) values
  ('00000000-0000-0000-0000-000000000001', 'Inkwell Team', 'team@inkwell.dev', 'LOGIN_DISABLED');

insert into public.posts (type, title, category, content, author_id, created_at) values
  ('article', 'Getting started with web security', 'Security',
   'Always validate input, escape output, and never trust data that comes from the browser. These three habits prevent a huge share of common web vulnerabilities.',
   '00000000-0000-0000-0000-000000000001', '2026-10-01'),
  ('article', 'Why responsive design matters', 'Tutorial',
   'More than half of web traffic comes from phones. Designing mobile-first with flexible grids and media queries keeps your layout usable everywhere.',
   '00000000-0000-0000-0000-000000000001', '2026-10-05'),
  ('article', 'JavaScript tips for beginners', 'Technology',
   'Learn const and let, understand the DOM, and practise with small projects. Consistency beats cramming every time.',
   '00000000-0000-0000-0000-000000000001', '2026-10-10');

insert into public.posts (type, content, author_id, created_at) values
  ('thought', 'The best drafts start as bad sentences you were brave enough to write down.',
   '00000000-0000-0000-0000-000000000001', now() - interval '2 hours'),
  ('thought', 'Read one thing this week that disagrees with you. It is good exercise.',
   '00000000-0000-0000-0000-000000000001', now() - interval '1 day');