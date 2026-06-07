drop function if exists public.get_cmi_companion_contact_label(uuid);

drop table if exists public.cmi_companion_applications cascade;
drop table if exists public.cmi_companion_invites cascade;

drop table if exists public.cmi_theme_submissions cascade;
drop table if exists public.cmi_theme_tasks cascade;
drop table if exists public.cmi_map_themes cascade;
