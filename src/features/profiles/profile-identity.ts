export interface PublicProfileIdentity {
  id: string;
  handle?: string | null;
  user_name?: string | null;
  avatar_url?: string | null;
}

const HANDLE_MIN_LENGTH = 3;
const HANDLE_MAX_LENGTH = 32;

export const normalizeProfileHandle = (value: string) => {
  const normalized = value
    .normalize('NFKC')
    .trim()
    .toLocaleLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/_+/g, '_')
    .replace(/^[-_]+|[-_]+$/g, '')
    .slice(0, HANDLE_MAX_LENGTH)
    .replace(/[-_]+$/g, '');

  return normalized.length >= HANDLE_MIN_LENGTH ? normalized : '';
};

export const createDefaultProfileHandle = ({
  userName,
  email,
  userId,
}: {
  userName?: string | null;
  email?: string | null;
  userId: string;
}) => {
  const emailLocalPart = email?.split('@')[0] ?? '';
  const fallbackUserId = userId.replace(/-/g, '').slice(0, 8);
  const candidates = [userName ?? '', emailLocalPart, fallbackUserId ? `user-${fallbackUserId}` : ''];

  for (const candidate of candidates) {
    const handle = normalizeProfileHandle(candidate);
    if (handle) return handle;
  }

  return '';
};

export const getStableProfileIdentity = (profile: PublicProfileIdentity) =>
  normalizeProfileHandle(profile.handle ?? '') || profile.id;
