create or replace function public.get_cmi_companion_contact_label(p_invite_id uuid)
returns text
language sql
security definer
set search_path = public
as $$
  select invite.contact_label
  from public.cmi_companion_invites invite
  where invite.id = p_invite_id
    and (
      invite.creator_id = auth.uid()
      or exists (
        select 1
        from public.cmi_companion_applications application
        where application.invite_id = invite.id
          and application.applicant_id = auth.uid()
          and application.status = 'approved'
      )
    )
  limit 1
$$;

revoke all on function public.get_cmi_companion_contact_label(uuid) from public;
grant execute on function public.get_cmi_companion_contact_label(uuid) to authenticated;
