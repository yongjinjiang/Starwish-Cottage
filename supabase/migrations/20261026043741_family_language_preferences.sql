-- Interface preferences are separate from identity/roles and private content.
alter table public.family_members
  add column locale text check (locale in ('en', 'zh-CN'));

-- Existing family accounts start in their preferred language. New accounts with
-- a null preference use the same role-based default until they choose a language.
update public.family_members
set locale = case when role = 'parent' then 'zh-CN' else 'en' end
where locale is null;

-- Column privileges prevent changing a handle, role or user_id through this API.
grant update (locale) on public.family_members to authenticated;
create policy own_language_preference on public.family_members
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
