import {
  ArrowLeft,
  CheckCircle2,
  KeyRound,
  LockKeyhole,
  Mail,
  Sparkles,
  UserRound,
} from 'lucide-react';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import {
  type AuthStep,
  buildAuthRedirectTo,
  getEmailCodeRetrySeconds,
  type AuthMode,
  normalizeEmailCode,
  validateAuthForm,
  validatePasswordResetRequestForm,
  validatePasswordSignInForm,
  validatePasswordUpdateForm,
} from '@/features/auth/auth-flow';
import { cn } from '@/lib/utils';

type LoginLocationState = {
  from?: string;
};

type PasswordPanel = 'none' | 'sign-in' | 'forgot' | 'update';

const getRedirectOrigin = () => (typeof window === 'undefined' ? 'https://cmimap.com' : window.location.origin);

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    user,
    sendEmailCode,
    verifyEmailCode,
    signInWithEmail,
    signInWithGoogle,
    sendPasswordResetEmail,
    updatePassword,
  } = useAuth();
  const redirectPath = (location.state as LoginLocationState | null)?.from || '/';
  const isPasswordResetCallback = new URLSearchParams(location.search).get('auth') === 'reset-password';

  const [mode, setMode] = useState<AuthMode>('login');
  const [authStep, setAuthStep] = useState<AuthStep>('request-code');
  const [email, setEmail] = useState('');
  const [userName, setUserName] = useState('');
  const [emailCode, setEmailCode] = useState('');
  const [pendingEmail, setPendingEmail] = useState('');
  const [lastCodeSentAt, setLastCodeSentAt] = useState(0);
  const [passwordPanel, setPasswordPanel] = useState<PasswordPanel>(() =>
    isPasswordResetCallback ? 'update' : 'none'
  );
  const [passwordEmail, setPasswordEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [lastPasswordResetSentAt, setLastPasswordResetSentAt] = useState(0);
  const [loading, setLoading] = useState(false);

  const isRegister = mode === 'register';
  const isVerifyingCode = authStep === 'verify-code';
  const isUpdatingPassword = passwordPanel === 'update';
  const redirectTo = useMemo(
    () => buildAuthRedirectTo(getRedirectOrigin(), redirectPath),
    [redirectPath]
  );
  const passwordResetRedirectTo = useMemo(
    () => buildAuthRedirectTo(getRedirectOrigin(), '/login?auth=reset-password'),
    []
  );

  useEffect(() => {
    if (user && !isPasswordResetCallback) navigate(redirectPath, { replace: true });
  }, [isPasswordResetCallback, navigate, redirectPath, user]);

  useEffect(() => {
    if (isPasswordResetCallback) setPasswordPanel('update');
  }, [isPasswordResetCallback]);

  useEffect(() => {
    if (!location.hash) return;

    const hashParams = new URLSearchParams(location.hash.slice(1));
    const errorDescription = hashParams.get('error_description');
    if (errorDescription) toast.error(`登录失败: ${errorDescription}`);
  }, [location.hash]);

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setAuthStep('request-code');
    setEmailCode('');
    setPendingEmail('');
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const validationError = validateAuthForm({
      mode,
      step: authStep,
      email,
      userName,
      code: emailCode,
    });

    if (validationError) {
      toast.error(validationError);
      return;
    }

    setLoading(true);

    try {
      if (authStep === 'request-code') {
        const retrySeconds = getEmailCodeRetrySeconds(lastCodeSentAt, Date.now());
        if (retrySeconds > 0) {
          toast.error(`验证码刚刚发过，${retrySeconds} 秒后再试`);
          return;
        }

        const { error } = await sendEmailCode({
          email,
          userName: isRegister ? userName : undefined,
          redirectTo,
          shouldCreateUser: isRegister,
        });

        if (error) {
          toast.error(`验证码发送失败: ${error.message}`);
          return;
        }

        setPendingEmail(email.trim());
        setEmailCode('');
        setAuthStep('verify-code');
        setLastCodeSentAt(Date.now());
        toast.success('验证码已发送');
        return;
      }

      const { error } = await verifyEmailCode({
        email: pendingEmail || email.trim(),
        code: normalizeEmailCode(emailCode),
        redirectTo,
      });

      if (error) {
        toast.error(`验证码错误或已过期: ${error.message}`);
        return;
      }

      toast.success(isRegister ? '加入成功' : '登录成功');
      navigate(redirectPath, { replace: true });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);

    try {
      const { error } = await signInWithGoogle(redirectTo);
      if (error) {
        toast.error(`Google 登录失败: ${error.message}`);
        return;
      }

      toast.success('正在前往 Google 登录');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSignIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const signInEmail = passwordEmail.trim() || email.trim();
    const validationError = validatePasswordSignInForm({
      email: signInEmail,
      password,
    });

    if (validationError) {
      toast.error(validationError);
      return;
    }

    setLoading(true);

    try {
      const { error } = await signInWithEmail(signInEmail, password);
      if (error) {
        toast.error(`密码登录失败: ${error.message}`);
        return;
      }

      toast.success('登录成功');
      navigate(redirectPath, { replace: true });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordResetRequest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const resetEmail = passwordEmail.trim() || email.trim();
    const validationError = validatePasswordResetRequestForm({ email: resetEmail });

    if (validationError) {
      toast.error(validationError);
      return;
    }

    const retrySeconds = getEmailCodeRetrySeconds(lastPasswordResetSentAt, Date.now());
    if (retrySeconds > 0) {
      toast.error(`找回邮件刚刚发过，${retrySeconds} 秒后再试`);
      return;
    }

    setLoading(true);

    try {
      const { error } = await sendPasswordResetEmail({
        email: resetEmail,
        redirectTo: passwordResetRedirectTo,
      });

      if (error) {
        toast.error(`找回邮件发送失败: ${error.message}`);
        return;
      }

      setLastPasswordResetSentAt(Date.now());
      toast.success('找回邮件已发送，请去邮箱打开链接');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordUpdate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const validationError = validatePasswordUpdateForm({
      password: newPassword,
      confirmPassword: confirmNewPassword,
    });

    if (validationError) {
      toast.error(validationError);
      return;
    }

    setLoading(true);

    try {
      const { error } = await updatePassword(newPassword);
      if (error) {
        toast.error(`密码更新失败: ${error.message}`);
        return;
      }

      toast.success('密码已更新');
      navigate(redirectPath, { replace: true });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f6f6f2] px-4 py-8">
      <Card className="w-full max-w-[26rem] overflow-hidden rounded-[1.35rem] border-[#deded8] bg-white shadow-[0_18px_50px_rgba(31,31,35,0.08)]">
        <CardHeader className="space-y-5 px-6 pb-2 pt-6">
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#e5e5df] bg-white text-[#4b4b50] active:scale-95"
            onClick={() => navigate(-1)}
            aria-label="返回"
          >
            <ArrowLeft className="h-5 w-5" strokeWidth={2.4} />
          </button>

          <div>
            <p className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-[#18b99c]/10 px-3 py-1 text-xs font-black text-[#12967e]">
              <Sparkles className="h-3.5 w-3.5" strokeWidth={2.5} />
              CMI Map
            </p>
            <CardTitle className="text-[1.85rem] font-black leading-tight text-[#2f2f33]">
              {isUpdatingPassword
                ? '设置新密码'
                : isVerifyingCode
                  ? '输入邮箱验证码'
                  : isRegister
                    ? '加入清迈生活地图'
                    : '回到你的清迈地图'}
            </CardTitle>
            <CardDescription className="mt-2 text-[0.98rem] font-semibold leading-relaxed text-[#777777]">
              {isUpdatingPassword
                ? '从找回密码邮件回来后，在这里输入新密码。'
                : isVerifyingCode
                  ? `我们已经把 6 位验证码发到 ${pendingEmail || email.trim()}。`
                  : isRegister
                    ? '先留一个昵称和邮箱，收到验证码后就可以开始发帖、报名活动、补一句推荐。'
                    : '输入邮箱，收到验证码后回到你的清迈地图。'}
            </CardDescription>
          </div>

          {!isUpdatingPassword && (
            <div className="grid grid-cols-2 rounded-full bg-[#f0f0ec] p-1">
              {([
                ['login', '登录'],
                ['register', '快速加入'],
              ] as const).map(([nextMode, label]) => (
                <button
                  key={nextMode}
                  type="button"
                  className={cn(
                    'h-10 rounded-full text-sm font-black transition',
                    mode === nextMode ? 'bg-white text-[#242428] shadow-sm' : 'text-[#868681]'
                  )}
                  onClick={() => switchMode(nextMode)}
                  disabled={loading}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </CardHeader>

        <CardContent className="px-6 pb-7 pt-4">
          {isUpdatingPassword ? (
            <form onSubmit={handlePasswordUpdate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword" className="text-sm font-black text-[#3f3f42]">
                  新密码
                </Label>
                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#92928d]" />
                  <Input
                    id="newPassword"
                    type="password"
                    placeholder="至少 6 位"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    disabled={loading}
                    autoComplete="new-password"
                    className="h-12 rounded-2xl pl-10 text-base font-semibold"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmNewPassword" className="text-sm font-black text-[#3f3f42]">
                  再输入一次
                </Label>
                <div className="relative">
                  <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#92928d]" />
                  <Input
                    id="confirmNewPassword"
                    type="password"
                    placeholder="确认新密码"
                    value={confirmNewPassword}
                    onChange={(event) => setConfirmNewPassword(event.target.value)}
                    disabled={loading}
                    autoComplete="new-password"
                    className="h-12 rounded-2xl pl-10 text-base font-semibold"
                  />
                </div>
              </div>

              <div className="rounded-2xl bg-[#f5f6f3] px-4 py-3 text-sm font-semibold leading-relaxed text-[#6d6d68]">
                这个入口只用于找回密码邮件回跳后设置新密码。平时仍然可以直接用邮箱验证码登录。
              </div>

              <Button
                type="submit"
                className="h-12 w-full rounded-full text-base font-black"
                disabled={loading}
              >
                {loading ? '处理中...' : '更新密码'}
              </Button>

              <button
                type="button"
                className="w-full rounded-full py-2 text-sm font-black text-[#12967e] active:bg-[#18b99c]/8"
                onClick={() => setPasswordPanel('none')}
                disabled={loading}
              >
                返回验证码登录
              </button>
            </form>
          ) : (
            <>
              <form onSubmit={handleSubmit} className="space-y-4">
                {isRegister && !isVerifyingCode && (
                  <div className="space-y-2">
                    <Label htmlFor="userName" className="text-sm font-black text-[#3f3f42]">
                      昵称
                    </Label>
                    <div className="relative">
                      <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#92928d]" />
                      <Input
                        id="userName"
                        type="text"
                        placeholder="中文名可以用，不能和别人重复"
                        value={userName}
                        onChange={(event) => setUserName(event.target.value)}
                        disabled={loading}
                        maxLength={24}
                        autoComplete="nickname"
                        className="h-12 rounded-2xl pl-10 text-base font-semibold"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-black text-[#3f3f42]">
                    邮箱
                  </Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#92928d]" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      disabled={loading || isVerifyingCode}
                      autoComplete="email"
                      className="h-12 rounded-2xl pl-10 text-base font-semibold"
                    />
                  </div>
                </div>

                {isVerifyingCode && (
                  <div className="space-y-2">
                    <Label htmlFor="emailCode" className="text-sm font-black text-[#3f3f42]">
                      邮箱验证码
                    </Label>
                    <div className="relative">
                      <CheckCircle2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#92928d]" />
                      <Input
                        id="emailCode"
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        placeholder="6 位数字"
                        value={emailCode}
                        onChange={(event) => setEmailCode(normalizeEmailCode(event.target.value))}
                        disabled={loading}
                        autoComplete="one-time-code"
                        maxLength={6}
                        className="h-12 rounded-2xl pl-10 text-base font-semibold"
                      />
                    </div>
                  </div>
                )}

                <div className="rounded-2xl bg-[#f5f6f3] px-4 py-3 text-sm font-semibold leading-relaxed text-[#6d6d68]">
                  {isVerifyingCode
                    ? '验证码通常 1 小时内有效。没收到的话，等 60 秒后可以返回上一步重新发送。'
                    : '默认使用邮箱验证码，不需要设置或记住密码。邮箱只用于登录、活动报名和必要通知。'}
                </div>

                <Button
                  type="submit"
                  className="h-12 w-full rounded-full text-base font-black"
                  disabled={loading}
                >
                  {loading ? '处理中...' : isVerifyingCode ? '验证并进入' : '发送验证码'}
                </Button>

                {isVerifyingCode && (
                  <button
                    type="button"
                    className="w-full rounded-full py-2 text-sm font-black text-[#12967e] active:bg-[#18b99c]/8"
                    onClick={() => {
                      setAuthStep('request-code');
                      setEmailCode('');
                    }}
                    disabled={loading}
                  >
                    换邮箱或重新发送
                  </button>
                )}
              </form>

              <div className="my-5 flex items-center gap-3 text-xs font-black text-[#aaa9a3]">
                <span className="h-px flex-1 bg-[#ecece6]" />
                <span>其他方式</span>
                <span className="h-px flex-1 bg-[#ecece6]" />
              </div>

              <div className="space-y-3">
                <Button
                  type="button"
                  variant="outline"
                  className="h-12 w-full rounded-full border-[#deded8] text-base font-black"
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                >
                  <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-white text-sm font-black text-[#4285f4] shadow-sm">
                    G
                  </span>
                  用 Google 登录
                </Button>

                {passwordPanel === 'none' && (
                  <button
                    type="button"
                    className="w-full rounded-full py-2 text-sm font-black text-[#6f6f69] active:bg-[#f2f2ed]"
                    onClick={() => {
                      setPasswordPanel('sign-in');
                      setPasswordEmail((currentEmail) => currentEmail || email.trim());
                    }}
                    disabled={loading}
                  >
                    使用密码登录或找回密码
                  </button>
                )}

                {passwordPanel === 'sign-in' && (
                  <form
                    onSubmit={handlePasswordSignIn}
                    className="space-y-3 rounded-[1.2rem] border border-[#e5e5df] bg-[#fbfbf8] p-4"
                  >
                    <div className="space-y-2">
                      <Label htmlFor="passwordEmail" className="text-sm font-black text-[#3f3f42]">
                        邮箱
                      </Label>
                      <div className="relative">
                        <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#92928d]" />
                        <Input
                          id="passwordEmail"
                          type="email"
                          placeholder="your@email.com"
                          value={passwordEmail}
                          onChange={(event) => setPasswordEmail(event.target.value)}
                          disabled={loading}
                          autoComplete="email"
                          className="h-11 rounded-2xl pl-10 text-base font-semibold"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password" className="text-sm font-black text-[#3f3f42]">
                        密码
                      </Label>
                      <div className="relative">
                        <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#92928d]" />
                        <Input
                          id="password"
                          type="password"
                          placeholder="输入密码"
                          value={password}
                          onChange={(event) => setPassword(event.target.value)}
                          disabled={loading}
                          autoComplete="current-password"
                          className="h-11 rounded-2xl pl-10 text-base font-semibold"
                        />
                      </div>
                    </div>

                    <Button
                      type="submit"
                      variant="secondary"
                      className="h-11 w-full rounded-full text-sm font-black"
                      disabled={loading}
                    >
                      {loading ? '处理中...' : '密码登录'}
                    </Button>

                    <div className="flex items-center justify-between text-sm font-black">
                      <button
                        type="button"
                        className="text-[#12967e]"
                        onClick={() => setPasswordPanel('forgot')}
                        disabled={loading}
                      >
                        忘记密码？
                      </button>
                      <button
                        type="button"
                        className="text-[#8a8a84]"
                        onClick={() => setPasswordPanel('none')}
                        disabled={loading}
                      >
                        收起
                      </button>
                    </div>
                  </form>
                )}

                {passwordPanel === 'forgot' && (
                  <form
                    onSubmit={handlePasswordResetRequest}
                    className="space-y-3 rounded-[1.2rem] border border-[#e5e5df] bg-[#fbfbf8] p-4"
                  >
                    <div className="space-y-2">
                      <Label htmlFor="resetEmail" className="text-sm font-black text-[#3f3f42]">
                        接收找回邮件的邮箱
                      </Label>
                      <div className="relative">
                        <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#92928d]" />
                        <Input
                          id="resetEmail"
                          type="email"
                          placeholder="your@email.com"
                          value={passwordEmail}
                          onChange={(event) => setPasswordEmail(event.target.value)}
                          disabled={loading}
                          autoComplete="email"
                          className="h-11 rounded-2xl pl-10 text-base font-semibold"
                        />
                      </div>
                    </div>

                    <div className="text-sm font-semibold leading-relaxed text-[#777771]">
                      如果这个邮箱对应已有账户，我们会发送一封设置新密码的邮件。
                    </div>

                    <Button
                      type="submit"
                      variant="secondary"
                      className="h-11 w-full rounded-full text-sm font-black"
                      disabled={loading}
                    >
                      {loading ? '处理中...' : '发送找回邮件'}
                    </Button>

                    <button
                      type="button"
                      className="w-full rounded-full py-1.5 text-sm font-black text-[#8a8a84]"
                      onClick={() => setPasswordPanel('sign-in')}
                      disabled={loading}
                    >
                      返回密码登录
                    </button>
                  </form>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
