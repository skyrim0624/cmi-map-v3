export type AuthMode = 'login' | 'register';
export type AuthStep = 'request-code' | 'verify-code';
export type LoginMethod = 'password' | 'code';

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

export interface RegistrationFormState {
  step: AuthStep;
  email: string;
  userName: string;
  password: string;
  confirmPassword: string;
  code?: string;
}

export interface EmailCodeSignInFormState {
  step: AuthStep;
  email: string;
  code?: string;
}

export interface PasswordResetRequestFormState {
  email: string;
}

export interface PasswordResetVerificationFormState {
  email: string;
  code: string;
  password: string;
  confirmPassword: string;
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

export const getPasswordSignInErrorMessage = (error: unknown) => {
  const rawMessage =
    error instanceof Error
      ? error.message
      : error && typeof error === 'object' && 'message' in error
        ? String((error as { message?: unknown }).message ?? '')
        : String(error ?? '');
  const normalizedMessage = rawMessage.toLocaleLowerCase();

  if (
    normalizedMessage.includes('invalid login credentials') ||
    normalizedMessage.includes('invalid credentials')
  ) {
    return '邮箱或密码不正确，请检查后重新输入。';
  }

  if (normalizedMessage.includes('email not confirmed')) {
    return '这个邮箱还没有完成验证，请先打开邮箱里的确认邮件。';
  }

  if (normalizedMessage.includes('too many requests') || normalizedMessage.includes('rate limit')) {
    return '登录尝试太频繁，请稍等一会儿再试。';
  }

  return rawMessage ? `登录失败：${rawMessage}` : '登录失败，请稍后再试。';
};

export const validateRegistrationForm = (state: RegistrationFormState) => {
  if (!state.email.trim()) return '请输入邮箱';

  if (state.step === 'verify-code') {
    if (normalizeEmailCode(state.code ?? '').length !== 6) return '请输入 6 位邮箱验证码';
    return null;
  }

  if (!state.userName.trim()) return '请输入昵称';
  if (state.password.length < MIN_PASSWORD_LENGTH) return `密码至少 ${MIN_PASSWORD_LENGTH} 位`;
  if (state.password !== state.confirmPassword) return '两次输入的密码不一致';
  return null;
};

export const validateEmailCodeSignInForm = (state: EmailCodeSignInFormState) => {
  if (!state.email.trim()) return '请输入邮箱';

  if (state.step === 'verify-code') {
    if (normalizeEmailCode(state.code ?? '').length !== 6) return '请输入 6 位邮箱验证码';
  }

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

export const validatePasswordResetVerificationForm = (
  state: PasswordResetVerificationFormState
) => {
  if (!state.email.trim()) return '请输入邮箱';
  if (normalizeEmailCode(state.code).length !== 6) return '请输入 6 位邮箱验证码';
  return validatePasswordUpdateForm({
    password: state.password,
    confirmPassword: state.confirmPassword,
  });
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
