export type AuthMode = 'login' | 'register';
export type AuthStep = 'request-code' | 'verify-code';

export interface AuthFormState {
  mode: AuthMode;
  step: AuthStep;
  email: string;
  userName?: string;
  code?: string;
}

export interface PasswordSignInFormState {
  email: string;
  password: string;
}

export interface PasswordResetRequestFormState {
  email: string;
}

export interface PasswordUpdateFormState {
  password: string;
  confirmPassword: string;
}

export const MIN_PASSWORD_LENGTH = 6;

export const normalizeEmailCode = (value: string) =>
  value.replace(/\D/g, '').slice(0, 6);

export const getEmailCodeRetrySeconds = (
  lastSentAt: number,
  now: number,
  cooldownMs = 60_000
) => {
  if (!lastSentAt) return 0;
  const remainingMs = cooldownMs - (now - lastSentAt);
  return remainingMs > 0 ? Math.ceil(remainingMs / 1000) : 0;
};

export const validateAuthForm = (state: AuthFormState) => {
  if (!state.email.trim()) return '请输入邮箱';

  if (state.step === 'verify-code') {
    if (normalizeEmailCode(state.code ?? '').length !== 6) return '请输入 6 位邮箱验证码';
    return null;
  }

  if (state.mode === 'register' && !state.userName?.trim()) return '请输入昵称';

  return null;
};

export const validatePasswordSignInForm = (state: PasswordSignInFormState) => {
  if (!state.email.trim()) return '请输入邮箱';
  if (!state.password) return '请输入密码';
  return null;
};

export const validatePasswordResetRequestForm = (state: PasswordResetRequestFormState) => {
  if (!state.email.trim()) return '请输入邮箱';
  return null;
};

export const validatePasswordUpdateForm = (state: PasswordUpdateFormState) => {
  if (state.password.length < MIN_PASSWORD_LENGTH) return `密码至少 ${MIN_PASSWORD_LENGTH} 位`;
  if (state.password !== state.confirmPassword) return '两次输入的密码不一致';
  return null;
};

const sanitizeRedirectPath = (redirectPath: string) => {
  const trimmedPath = redirectPath.trim();
  if (!trimmedPath.startsWith('/') || trimmedPath.startsWith('//')) return '/';
  return trimmedPath;
};

export const buildAuthRedirectTo = (origin: string, redirectPath: string) => {
  try {
    return new URL(sanitizeRedirectPath(redirectPath), origin).toString();
  } catch {
    return '/';
  }
};
