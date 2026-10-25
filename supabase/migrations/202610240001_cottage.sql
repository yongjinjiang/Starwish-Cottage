-- All surprise content and answer keys are protected in the database, not by UI visibility.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create table public.cottage_event (
  id boolean primary key default true check (id),
  title text not null default 'Sonya 的十二岁生日',
  reveal_at timestamptz not null default '2026-10-27T00:00:00Z',
  timezone text not null default 'America/Denver'
);
insert into public.cottage_event (id) values (true);
alter table public.cottage_event enable row level security;
revoke all on public.cottage_event from anon, authenticated;

create table public.family_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  handle text not null unique check (handle in ('sonya12','Mia14','Aletheia10','mom45','dad51')),
  display_name text not null check (length(display_name) between 1 and 40),
  role text not null check (role in ('celebrant','contributor','parent')),
  check ((handle = 'sonya12' and role = 'celebrant') or (handle in ('Mia14','Aletheia10') and role = 'contributor') or (handle in ('mom45','dad51') and role = 'parent'))
);
alter table public.family_members enable row level security;
revoke all on public.family_members from anon, authenticated;
grant select on public.family_members to authenticated;
create policy own_membership on public.family_members for select to authenticated using (user_id = (select auth.uid()));

create function private.is_family() returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.family_members where user_id = (select auth.uid()));
$$;
create function private.is_sonya() returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.family_members where user_id = (select auth.uid()) and role = 'celebrant');
$$;
create function private.is_contributor() returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.family_members where user_id = (select auth.uid()) and role in ('contributor','parent'));
$$;
create function private.revealed() returns boolean language sql stable security definer set search_path = '' as $$
  select now() >= reveal_at from public.cottage_event where id;
$$;
revoke all on function private.is_family(), private.is_sonya(), private.is_contributor(), private.revealed() from public;
grant execute on function private.is_family(), private.is_sonya(), private.is_contributor(), private.revealed() to authenticated;

create function public.cottage_info() returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('title',title,'reveal_at',reveal_at,'timezone',timezone,'server_now',clock_timestamp()) from public.cottage_event where id;
$$;
revoke all on function public.cottage_info() from public;
grant execute on function public.cottage_info() to anon, authenticated;

create table public.gift_drafts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.family_members(user_id),
  title text not null default '' check(length(title) <= 120),
  body text not null default '' check(length(body) <= 10000),
  theme text not null default 'starlight' check(theme in ('starlight','garden','moon')),
  image_paths text[] not null default '{}' check(cardinality(image_paths) <= 5),
  updated_at timestamptz not null default now()
);
create function private.prepare_gift() returns trigger language plpgsql set search_path = '' as $$
begin
  if exists(select 1 from unnest(new.image_paths) p where p not like new.author_id::text || '/%' or p like '%..%') then raise exception 'invalid_image'; end if;
  new.updated_at := clock_timestamp();
  return new;
end;
$$;
create trigger gift_validation before insert or update on public.gift_drafts for each row execute function private.prepare_gift();
alter table public.gift_drafts enable row level security;
revoke all on public.gift_drafts from anon, authenticated;
grant select, insert, update on public.gift_drafts to authenticated;
create policy own_gifts_select on public.gift_drafts for select to authenticated using (author_id = (select auth.uid()) and private.is_contributor());
create policy own_gifts_insert on public.gift_drafts for insert to authenticated with check (author_id = (select auth.uid()) and private.is_contributor());
create policy own_gifts_update on public.gift_drafts for update to authenticated using (author_id = (select auth.uid()) and private.is_contributor()) with check (author_id = (select auth.uid()) and private.is_contributor());

create table public.gift_publications (
  id uuid primary key references public.gift_drafts(id),
  author_id uuid not null references public.family_members(user_id),
  title text not null,
  body text not null,
  theme text not null,
  image_paths text[] not null,
  published_at timestamptz not null default now()
);
alter table public.gift_publications enable row level security;
revoke all on public.gift_publications from anon, authenticated;
grant select on public.gift_publications to authenticated;
create policy released_gifts on public.gift_publications for select to authenticated using (
  author_id = (select auth.uid()) or (private.is_family() and private.revealed())
);
create function public.publish_gift(p_id uuid) returns void language plpgsql security definer set search_path = '' as $$
declare draft public.gift_drafts;
begin
  if not private.is_contributor() then raise exception 'family_only'; end if;
  select * into draft from public.gift_drafts where id = p_id and author_id = auth.uid() for update;
  if not found then raise exception 'not_owner'; end if;
  if length(trim(draft.title)) = 0 or (length(trim(draft.body)) = 0 and cardinality(draft.image_paths) = 0) then raise exception 'not_ready'; end if;
  if exists(select 1 from unnest(draft.image_paths) p where not exists(select 1 from storage.objects o where o.bucket_id = 'family-art' and o.name = p)) then raise exception 'invalid_image'; end if;
  insert into public.gift_publications (id,author_id,title,body,theme,image_paths,published_at)
    values (draft.id,draft.author_id,draft.title,draft.body,draft.theme,draft.image_paths,clock_timestamp())
    on conflict (id) do update set title=excluded.title,body=excluded.body,theme=excluded.theme,image_paths=excluded.image_paths,published_at=excluded.published_at;
end;
$$;
create function public.withdraw_gift(p_id uuid) returns void language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_contributor() then raise exception 'family_only'; end if;
  if not exists(select 1 from public.gift_drafts where id=p_id and author_id=auth.uid()) then raise exception 'not_owner'; end if;
  delete from public.gift_publications where id=p_id and author_id=auth.uid();
end;
$$;
create function public.family_gallery() returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.is_family() then raise exception 'family_only'; end if;
  if not private.revealed() then return '[]'::jsonb; end if;
  return coalesce((select jsonb_agg(to_jsonb(p) || jsonb_build_object('author_name',m.display_name) order by p.published_at) from public.gift_publications p join public.family_members m on m.user_id=p.author_id),'[]'::jsonb);
end;
$$;
revoke all on function public.publish_gift(uuid), public.withdraw_gift(uuid), public.family_gallery() from public;
grant execute on function public.publish_gift(uuid), public.withdraw_gift(uuid), public.family_gallery() to authenticated;

-- Public API clients can never read answer keys directly.
create table public.quiz_drafts (
  owner_id uuid primary key references public.family_members(user_id),
  title text not null check(length(title) between 1 and 120),
  questions jsonb not null check(jsonb_typeof(questions)='array' and octet_length(questions::text) <= 30000),
  updated_at timestamptz not null default now()
);
alter table public.quiz_drafts enable row level security;
revoke all on public.quiz_drafts from anon, authenticated;
grant select,insert,update on public.quiz_drafts to authenticated;
create policy sonya_quiz_select on public.quiz_drafts for select to authenticated using (private.is_sonya() and owner_id = (select auth.uid()));
create policy sonya_quiz_insert on public.quiz_drafts for insert to authenticated with check (private.is_sonya() and owner_id = (select auth.uid()));
create policy sonya_quiz_update on public.quiz_drafts for update to authenticated using (private.is_sonya() and owner_id = (select auth.uid())) with check (private.is_sonya() and owner_id = (select auth.uid()));

create table public.quiz_publications (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.family_members(user_id),
  title text not null,
  questions jsonb not null,
  share_token text not null unique default replace(gen_random_uuid()::text || gen_random_uuid()::text,'-',''),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create unique index one_active_quiz on public.quiz_publications (owner_id) where active;
alter table public.quiz_publications enable row level security;
revoke all on public.quiz_publications from anon, authenticated;
grant select on public.quiz_publications to authenticated;
create policy sonya_published_quiz on public.quiz_publications for select to authenticated using (private.is_sonya() and owner_id = (select auth.uid()));

create function private.validate_quiz(p_questions jsonb) returns void language plpgsql set search_path = '' as $$
declare q jsonb; choice jsonb; seen text[] := '{}'; a integer;
begin
  if jsonb_typeof(p_questions) is distinct from 'array' or jsonb_array_length(p_questions) not between 1 and 12 then raise exception 'not_ready'; end if;
  for q in select value from jsonb_array_elements(p_questions) loop
    if jsonb_typeof(q->'id') is distinct from 'string' or length(q->>'id') not between 1 and 80 or (q->>'id') = any(seen) then raise exception 'not_ready'; end if;
    seen := array_append(seen,q->>'id');
    if jsonb_typeof(q->'prompt') is distinct from 'string' or length(trim(q->>'prompt')) not between 1 and 500 or jsonb_typeof(q->'options') is distinct from 'array' then raise exception 'not_ready'; end if;
    if jsonb_array_length(q->'options') not between 2 and 6 then raise exception 'not_ready'; end if;
    for choice in select value from jsonb_array_elements(q->'options') loop
      if jsonb_typeof(choice) <> 'string' or length(trim(choice #>> '{}')) not between 1 and 200 then raise exception 'not_ready'; end if;
    end loop;
    if jsonb_typeof(q->'answer') is distinct from 'number' or (q->>'answer') !~ '^[0-9]+$' then raise exception 'not_ready'; end if;
    a := (q->>'answer')::integer;
    if a < 0 or a >= jsonb_array_length(q->'options') then raise exception 'not_ready'; end if;
  end loop;
end;
$$;
revoke all on function private.validate_quiz(jsonb) from public;
create function public.publish_quiz() returns jsonb language plpgsql security definer set search_path = '' as $$
declare draft public.quiz_drafts; published public.quiz_publications;
begin
  if not private.is_sonya() then raise exception 'sonya_only'; end if;
  select * into draft from public.quiz_drafts where owner_id=auth.uid() for update;
  if not found or length(trim(draft.title))=0 then raise exception 'not_ready'; end if;
  perform private.validate_quiz(draft.questions);
  update public.quiz_publications set active=false where owner_id=auth.uid() and active;
  insert into public.quiz_publications (owner_id,title,questions) values (auth.uid(),draft.title,draft.questions) returning * into published;
  return jsonb_build_object('id',published.id,'share_token',published.share_token,'title',published.title,'active',published.active);
end;
$$;
create function public.close_quiz() returns void language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_sonya() then raise exception 'sonya_only'; end if;
  update public.quiz_publications set active=false where owner_id=auth.uid();
end;
$$;
create function public.get_public_quiz(p_token text) returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare paper public.quiz_publications;
begin
  if p_token is null or p_token !~ '^[a-f0-9]{64}$' then raise exception 'not_found'; end if;
  select * into paper from public.quiz_publications where share_token=p_token and active;
  if not found then raise exception 'not_found'; end if;
  return jsonb_build_object('id',paper.id,'title',paper.title,'questions',(
    select jsonb_agg(jsonb_build_object('id',q->>'id','prompt',q->>'prompt','options',q->'options') order by ord)
    from jsonb_array_elements(paper.questions) with ordinality as x(q,ord)
  ));
end;
$$;

create table public.quiz_submissions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quiz_publications(id),
  request_id uuid not null,
  nickname text not null check(length(nickname) between 1 and 32),
  answers jsonb not null,
  score integer not null,
  total integer not null,
  submitted_at timestamptz not null default now(),
  reward_status text not null default 'pending' check(reward_status in ('pending','prepared','given')),
  unique(quiz_id,request_id)
);
alter table public.quiz_submissions enable row level security;
revoke all on public.quiz_submissions from anon, authenticated;
grant select on public.quiz_submissions to authenticated;
grant update(reward_status) on public.quiz_submissions to authenticated;
create policy sonya_results_select on public.quiz_submissions for select to authenticated using (private.is_sonya() and exists(select 1 from public.quiz_publications q where q.id=quiz_id and q.owner_id=(select auth.uid())));
create policy sonya_reward_update on public.quiz_submissions for update to authenticated using (private.is_sonya() and exists(select 1 from public.quiz_publications q where q.id=quiz_id and q.owner_id=(select auth.uid()))) with check (private.is_sonya());

create function public.submit_quiz(p_token text,p_nickname text,p_answers jsonb,p_request_id uuid) returns jsonb language plpgsql security definer set search_path = '' as $$
declare paper public.quiz_publications; existing public.quiz_submissions; q jsonb; a text; score integer := 0; result_id uuid; total integer;
begin
  if p_token is null or p_token !~ '^[a-f0-9]{64}$' then raise exception 'not_found'; end if;
  -- The publication lock serializes its cap check and submissions, including retries.
  select * into paper from public.quiz_publications where share_token=p_token for update;
  if not found then raise exception 'not_found'; end if;
  select * into existing from public.quiz_submissions where quiz_id=paper.id and request_id=p_request_id;
  if found then
    if existing.nickname is distinct from trim(p_nickname) or existing.answers is distinct from p_answers then raise exception 'invalid_answers'; end if;
    return jsonb_build_object('id',existing.id,'score',existing.score,'total',existing.total);
  end if;
  if not paper.active then raise exception 'not_found'; end if;
  if p_request_id is null or p_nickname is null or length(trim(p_nickname)) not between 1 and 32 or jsonb_typeof(p_answers) is distinct from 'object' then raise exception 'invalid_answers'; end if;
  total := jsonb_array_length(paper.questions);
  if (select count(*) from jsonb_object_keys(p_answers)) <> total then raise exception 'invalid_answers'; end if;
  for q in select value from jsonb_array_elements(paper.questions) loop
    a := p_answers->>(q->>'id');
    if jsonb_typeof(p_answers->(q->>'id')) is distinct from 'number' or a is null or a !~ '^[0-9]+$' then raise exception 'invalid_answers'; end if;
    if length(a)>1 or a::integer >= jsonb_array_length(q->'options') then raise exception 'invalid_answers'; end if;
    if a::integer = (q->>'answer')::integer then score := score+1; end if;
  end loop;
  if (select count(*) from public.quiz_submissions where quiz_id=paper.id) >= 200 then raise exception 'quiz_full'; end if;
  insert into public.quiz_submissions (quiz_id,request_id,nickname,answers,score,total) values (paper.id,p_request_id,trim(p_nickname),p_answers,score,total) returning id into result_id;
  return jsonb_build_object('id',result_id,'score',score,'total',total);
end;
$$;
create function public.quiz_results() returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.is_sonya() then raise exception 'sonya_only'; end if;
  return coalesce((select jsonb_agg(to_jsonb(s) || jsonb_build_object('quiz_title',q.title,'questions',q.questions) order by s.submitted_at desc) from public.quiz_submissions s join public.quiz_publications q on s.quiz_id=q.id where q.owner_id=auth.uid()),'[]'::jsonb);
end;
$$;
revoke all on function public.publish_quiz(), public.close_quiz(), public.get_public_quiz(text), public.submit_quiz(text,text,jsonb,uuid), public.quiz_results() from public;
grant execute on function public.publish_quiz(), public.close_quiz(), public.quiz_results() to authenticated;
grant execute on function public.get_public_quiz(text), public.submit_quiz(text,text,jsonb,uuid) to anon, authenticated;

-- Private image files have the same release boundary as their published pages.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('family-art','family-art',false,5242880,array['image/jpeg','image/png','image/webp']);
create function private.can_read_art(p_name text) returns boolean language sql stable security definer set search_path = '' as $$
  select private.is_family() and (
    (private.is_contributor() and split_part(p_name,'/',1)=auth.uid()::text)
    or (private.revealed() and exists(select 1 from public.gift_publications where p_name=any(image_paths)))
  );
$$;
revoke all on function private.can_read_art(text) from public;
grant execute on function private.can_read_art(text) to authenticated;
create policy family_art_read on storage.objects for select to authenticated using (bucket_id='family-art' and private.can_read_art(name));
create policy family_art_upload on storage.objects for insert to authenticated with check (bucket_id='family-art' and private.is_contributor() and split_part(name,'/',1)=(select auth.uid())::text and name not like '%..%');
-- No UPDATE policy: uploading never overwrites an already published asset.
-- No DELETE policy: a published snapshot cannot be broken by deleting its draft's file.
