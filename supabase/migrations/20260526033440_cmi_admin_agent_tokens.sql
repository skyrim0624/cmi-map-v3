create table if not exists public.cmi_agent_tokens (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  token_name text not null,
  token_prefix text not null unique,
  token_hash text not null unique,
  scopes text[] not null default array['events:write']::text[],
  last_used_at timestamp with time zone,
  expires_at timestamp with time zone,
  revoked_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint cmi_agent_tokens_name_check
    check (char_length(btrim(token_name)) between 1 and 80),
  constraint cmi_agent_tokens_prefix_check
    check (char_length(btrim(token_prefix)) between 10 and 40),
  constraint cmi_agent_tokens_hash_check
    check (token_hash ~ '^[a-f0-9]{64}$'),
  constraint cmi_agent_tokens_scopes_check
    check (
      array_length(scopes, 1) between 1 and 8
      and scopes <@ array['events:write', 'events:review', 'events:manage']::text[]
    )
);

create index if not exists cmi_agent_tokens_owner_idx
  on public.cmi_agent_tokens (owner_id, created_at desc);

create index if not exists cmi_agent_tokens_active_idx
  on public.cmi_agent_tokens (revoked_at, expires_at)
  where revoked_at is null;

drop trigger if exists touch_cmi_agent_tokens_updated_at on public.cmi_agent_tokens;
create trigger touch_cmi_agent_tokens_updated_at
before update on public.cmi_agent_tokens
for each row execute function public.touch_updated_at();

alter table public.cmi_agent_tokens enable row level security;

revoke all on public.cmi_agent_tokens from public, anon, authenticated;
grant all on public.cmi_agent_tokens to service_role;

create or replace function public.create_cmi_agent_token(
  p_token_name text,
  p_token_prefix text,
  p_token_hash text,
  p_scopes text[] default array['events:write']::text[],
  p_expires_at timestamp with time zone default null
)
returns table (
  id uuid,
  owner_id uuid,
  token_name text,
  token_prefix text,
  scopes text[],
  created_at timestamp with time zone,
  expires_at timestamp with time zone,
  revoked_at timestamp with time zone,
  last_used_at timestamp with time zone
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null or not public.is_admin() then
    raise exception 'Only admins can create CMI agent tokens';
  end if;

  if p_expires_at is not null and p_expires_at <= timezone('utc'::text, now()) then
    raise exception 'Token expiry must be in the future';
  end if;

  return query
  insert into public.cmi_agent_tokens (
    owner_id,
    token_name,
    token_prefix,
    token_hash,
    scopes,
    expires_at
  )
  values (
    current_user_id,
    btrim(p_token_name),
    btrim(p_token_prefix),
    lower(btrim(p_token_hash)),
    coalesce(p_scopes, array['events:write']::text[]),
    p_expires_at
  )
  returning
    cmi_agent_tokens.id,
    cmi_agent_tokens.owner_id,
    cmi_agent_tokens.token_name,
    cmi_agent_tokens.token_prefix,
    cmi_agent_tokens.scopes,
    cmi_agent_tokens.created_at,
    cmi_agent_tokens.expires_at,
    cmi_agent_tokens.revoked_at,
    cmi_agent_tokens.last_used_at;
end;
$$;

create or replace function public.list_cmi_agent_tokens()
returns table (
  id uuid,
  owner_id uuid,
  owner_name text,
  owner_email text,
  token_name text,
  token_prefix text,
  scopes text[],
  created_at timestamp with time zone,
  expires_at timestamp with time zone,
  revoked_at timestamp with time zone,
  last_used_at timestamp with time zone
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Only admins can list CMI agent tokens';
  end if;

  return query
  select
    token.id,
    token.owner_id,
    profile.user_name as owner_name,
    profile.email as owner_email,
    token.token_name,
    token.token_prefix,
    token.scopes,
    token.created_at,
    token.expires_at,
    token.revoked_at,
    token.last_used_at
  from public.cmi_agent_tokens token
  left join public.profiles profile on profile.id = token.owner_id
  order by token.created_at desc;
end;
$$;

create or replace function public.revoke_cmi_agent_token(p_token_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  changed_count integer;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Only admins can revoke CMI agent tokens';
  end if;

  update public.cmi_agent_tokens
  set revoked_at = coalesce(revoked_at, timezone('utc'::text, now()))
  where id = p_token_id;

  get diagnostics changed_count = row_count;
  return changed_count > 0;
end;
$$;

revoke all on function public.create_cmi_agent_token(text, text, text, text[], timestamp with time zone) from public, anon;
revoke all on function public.list_cmi_agent_tokens() from public, anon;
revoke all on function public.revoke_cmi_agent_token(uuid) from public, anon;

grant execute on function public.create_cmi_agent_token(text, text, text, text[], timestamp with time zone) to authenticated;
grant execute on function public.list_cmi_agent_tokens() to authenticated;
grant execute on function public.revoke_cmi_agent_token(uuid) to authenticated;
