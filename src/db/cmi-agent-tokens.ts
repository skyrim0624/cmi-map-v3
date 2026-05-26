import { supabase } from '@/db/supabase';

export interface CmiAgentToken {
  id: string;
  ownerId: string;
  ownerName: string | null;
  ownerEmail: string | null;
  tokenName: string;
  tokenPrefix: string;
  scopes: string[];
  createdAt: string;
  expiresAt: string | null;
  revokedAt: string | null;
  lastUsedAt: string | null;
}

export interface CreatedCmiAgentToken extends CmiAgentToken {
  rawToken: string;
}

interface CmiAgentTokenRow {
  id: string;
  owner_id: string;
  owner_name?: string | null;
  owner_email?: string | null;
  token_name: string;
  token_prefix: string;
  scopes: string[];
  created_at: string;
  expires_at: string | null;
  revoked_at: string | null;
  last_used_at: string | null;
}

const TOKEN_PREFIX = 'cmiagt';
const DEFAULT_SCOPES = ['events:write', 'events:review'];

const toAgentToken = (row: CmiAgentTokenRow): CmiAgentToken => ({
  id: row.id,
  ownerId: row.owner_id,
  ownerName: row.owner_name ?? null,
  ownerEmail: row.owner_email ?? null,
  tokenName: row.token_name,
  tokenPrefix: row.token_prefix,
  scopes: Array.isArray(row.scopes) ? row.scopes : [],
  createdAt: row.created_at,
  expiresAt: row.expires_at,
  revokedAt: row.revoked_at,
  lastUsedAt: row.last_used_at,
});

const base64Url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');

const generateRawAgentToken = () => {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return `${TOKEN_PREFIX}_${base64Url(bytes)}`;
};

const sha256Hex = async (value: string) => {
  const encoded = new TextEncoder().encode(value);
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(hashBuffer))
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
};

export const listCmiAgentTokens = async (): Promise<CmiAgentToken[]> => {
  const { data, error } = await supabase.rpc('list_cmi_agent_tokens');
  if (error) throw new Error(error.message);

  return Array.isArray(data)
    ? (data as CmiAgentTokenRow[]).map(toAgentToken)
    : [];
};

export const createCmiAgentToken = async (tokenName: string): Promise<CreatedCmiAgentToken> => {
  const rawToken = generateRawAgentToken();
  const tokenHash = await sha256Hex(rawToken);
  const tokenPrefix = `${rawToken.slice(0, 18)}...`;

  const { data, error } = await supabase.rpc('create_cmi_agent_token', {
    p_token_name: tokenName.trim(),
    p_token_prefix: tokenPrefix,
    p_token_hash: tokenHash,
    p_scopes: DEFAULT_SCOPES,
    p_expires_at: null,
  });

  if (error) throw new Error(error.message);

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error('Agent Token 创建失败');

  return {
    ...toAgentToken(row as CmiAgentTokenRow),
    rawToken,
  };
};

export const revokeCmiAgentToken = async (tokenId: string): Promise<void> => {
  const { error } = await supabase.rpc('revoke_cmi_agent_token', {
    p_token_id: tokenId,
  });

  if (error) throw new Error(error.message);
};
