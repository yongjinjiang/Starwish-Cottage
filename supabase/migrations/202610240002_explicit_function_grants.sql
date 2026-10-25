-- Hosted Supabase grants functions directly to anon/authenticated by default.
-- Remove those inherited defaults before granting this API's exact audience.
revoke all on function public.cottage_info(), public.publish_gift(uuid), public.withdraw_gift(uuid), public.family_gallery(), public.publish_quiz(), public.close_quiz(), public.get_public_quiz(text), public.submit_quiz(text,text,jsonb,uuid), public.quiz_results() from public,anon,authenticated;
grant execute on function public.cottage_info(), public.get_public_quiz(text), public.submit_quiz(text,text,jsonb,uuid) to anon,authenticated;
grant execute on function public.publish_gift(uuid), public.withdraw_gift(uuid), public.family_gallery(), public.publish_quiz(), public.close_quiz(), public.quiz_results() to authenticated;
