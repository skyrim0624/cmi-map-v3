import {
  AlertTriangle,
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
import confetti from 'canvas-confetti';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import {
  type AuthMode,
  type AuthStep,
  buildAuthRedirectTo,
  getPasswordSignInErrorMessage,
  getEmailCodeRetrySeconds,
  type LoginMethod,
  normalizeEmailCode,
  validateEmailCodeSignInForm,
  validatePasswordResetRequestForm,
  validatePasswordResetVerificationForm,
  validatePasswordSignInForm,
  validatePasswordUpdateForm,
  validateRegistrationForm,
} from '@/features/auth/auth-flow';
import { cn } from '@/lib/utils';

type LoginLocationState = {
  from?: string;
};

type PasswordPanel = 'none' | 'forgot' | 'update';
type PasswordResetStep = 'request-code' | 'verify-code';

const getRedirectOrigin = () =>
  typeof window === 'undefined' ? 'https://cmimap.com' : window.location.origin;

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    user,
    sendEmailCode,
    verifyEmailCode,
    signInWithEmail,
    signUpWithEmail,
    sendPasswordResetEmail,
    verifyPasswordResetCode,
    updatePassword,
  } = useAuth();
  const redirectPath = (location.state as LoginLocationState | null)?.from || '/';
  const isPasswordResetCallback = new URLSearchParams(location.search).get('auth') === 'reset-password';

  const [mode, setMode] = useState<AuthMode>('login');
  const [loginMethod, setLoginMethod] = useState<LoginMethod>('password');
  const [authStep, setAuthStep] = useState<AuthStep>('request-code');
  const [email, setEmail] = useState('');
  const [userName, setUserName] = useState('');
  const [password, setPassword] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [confirmRegisterPassword, setConfirmRegisterPassword] = useState('');
  const [emailCode, setEmailCode] = useState('');
  const [pendingEmail, setPendingEmail] = useState('');
  const [lastCodeSentAt, setLastCodeSentAt] = useState(0);
  const [passwordPanel, setPasswordPanel] = useState<PasswordPanel>(() =>
    isPasswordResetCallback ? 'update' : 'none'
  );
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordResetStep, setPasswordResetStep] = useState<PasswordResetStep>('request-code');
  const [passwordResetEmail, setPasswordResetEmail] = useState('');
  const [lastPasswordResetSentAt, setLastPasswordResetSentAt] = useState(0);
  const [passwordSignInError, setPasswordSignInError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showStamp, setShowStamp] = useState(false);

  const isRegister = mode === 'register';
  const isVerifyingCode = authStep === 'verify-code';
  const isUpdatingPassword = passwordPanel === 'update';
  const isPasswordResetCodeStep = passwordPanel === 'forgot' && passwordResetStep === 'verify-code';
  const isPasswordRecoveryActive = isPasswordResetCallback || passwordPanel !== 'none';
  const isEmailCodeLogin = mode === 'login' && loginMethod === 'code';
  const redirectTo = useMemo(
    () => buildAuthRedirectTo(getRedirectOrigin(), redirectPath),
    [redirectPath]
  );
  const passwordResetRedirectTo = useMemo(
    () => buildAuthRedirectTo(getRedirectOrigin(), '/login?auth=reset-password'),
    []
  );

  useEffect(() => {
    if (user && !isPasswordRecoveryActive) navigate(redirectPath, { replace: true });
  }, [isPasswordRecoveryActive, navigate, redirectPath, user]);

  useEffect(() => {
    if (isPasswordResetCallback) setPasswordPanel('update');
  }, [isPasswordResetCallback]);

  useEffect(() => {
    if (!location.hash) return;

    const hashParams = new URLSearchParams(location.hash.slice(1));
    const errorDescription = hashParams.get('error_description');
    if (errorDescription) toast.error(`登录失败: ${errorDescription}`);
  }, [location.hash]);

  const resetCodeState = () => {
    setAuthStep('request-code');
    setEmailCode('');
    setPendingEmail('');
  };

  const resetPasswordResetState = () => {
    setPasswordResetStep('request-code');
    setPasswordResetEmail('');
    setEmailCode('');
    setNewPassword('');
    setConfirmNewPassword('');
  };

  const openPasswordResetPanel = () => {
    setLoginMethod('password');
    setPasswordPanel('forgot');
    setPasswordSignInError('');
    resetPasswordResetState();
  };

  const closePasswordResetPanel = () => {
    setPasswordPanel('none');
    resetPasswordResetState();
  };

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setLoginMethod('password');
    setPasswordPanel('none');
    setPasswordSignInError('');
    resetPasswordResetState();
    resetCodeState();
  };

  const heading = isUpdatingPassword
    ? '设置新密码'
    : isRegister
      ? isVerifyingCode
        ? '输入注册验证码'
        : '注册 CMI Map'
      : isEmailCodeLogin
        ? isVerifyingCode
          ? '输入登录验证码'
          : '验证码登录'
        : '登录 CMI Map';

  const description = isUpdatingPassword
    ? '邮箱验证通过后，在这里输入新密码。'
    : isRegister
      ? isVerifyingCode
        ? `我们已经把 6 位验证码发到 ${pendingEmail || email.trim()}。`
        : '设置昵称、邮箱和密码，邮箱验证后再进入。'
      : isEmailCodeLogin
        ? isVerifyingCode
          ? `我们已经把 6 位验证码发到 ${pendingEmail || email.trim()}。`
          : '不用密码时，可以临时用邮箱验证码登录。'
        : isPasswordResetCodeStep
          ? `我们已经把 6 位找回验证码发到 ${passwordResetEmail}。`
          : '用邮箱和密码登录，也可以改用邮箱验证码。';

  const submitPasswordSignIn = async () => {
    setPasswordSignInError('');

    const validationError = validatePasswordSignInForm({
      email,
      password,
    });

    if (validationError) {
      toast.error(validationError);
      return;
    }

    setLoading(true);

    try {
      const { error } = await signInWithEmail(email.trim(), password);
      if (error) {
        const message = getPasswordSignInErrorMessage(error);
        setPasswordSignInError(message);
        toast.error(message);
        return;
      }

      toast.success('登录成功');
      setShowStamp(true);
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#18b99c', '#f59e0b', '#10b981', '#3b82f6']
      });
      setTimeout(() => {
        navigate(redirectPath, { replace: true });
      }, 1400);
    } finally {
      setLoading(false);
    }
  };

  const submitEmailCodeSignIn = async () => {
    const validationError = validateEmailCodeSignInForm({
      step: authStep,
      email,
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
          redirectTo,
          shouldCreateUser: false,
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

      toast.success('登录成功');
      setShowStamp(true);
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#18b99c', '#f59e0b', '#10b981', '#3b82f6']
      });
      setTimeout(() => {
        navigate(redirectPath, { replace: true });
      }, 1400);
    } finally {
      setLoading(false);
    }
  };

  const submitRegistration = async () => {
    const validationError = validateRegistrationForm({
      step: authStep,
      email,
      userName,
      password: registerPassword,
      confirmPassword: confirmRegisterPassword,
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

        const { error, needsEmailConfirmation } = await signUpWithEmail(
          email.trim(),
          registerPassword,
          userName,
          redirectTo
        );

        if (error) {
          toast.error(`注册失败: ${error.message}`);
          return;
        }

        if (!needsEmailConfirmation) {
          toast.success('注册成功');
          navigate(redirectPath, { replace: true });
          return;
        }

        setPendingEmail(email.trim());
        setEmailCode('');
        setAuthStep('verify-code');
        setLastCodeSentAt(Date.now());
        toast.success('注册验证码已发送');
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

      toast.success('注册成功');
      setShowStamp(true);
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#18b99c', '#f59e0b', '#10b981', '#3b82f6']
      });
      setTimeout(() => {
        navigate(redirectPath, { replace: true });
      }, 1400);
    } finally {
      setLoading(false);
    }
  };

  const handleMainSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isRegister) {
      await submitRegistration();
      return;
    }

    if (loginMethod === 'code') {
      await submitEmailCodeSignIn();
      return;
    }

    await submitPasswordSignIn();
  };

  const handlePasswordResetRequest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const resetEmail = (passwordResetEmail || email).trim();
    const validationError =
      passwordResetStep === 'request-code'
        ? validatePasswordResetRequestForm({ email: resetEmail })
        : validatePasswordResetVerificationForm({
            email: resetEmail,
            code: emailCode,
            password: newPassword,
            confirmPassword: confirmNewPassword,
          });

    if (validationError) {
      toast.error(validationError);
      return;
    }

    setLoading(true);

    try {
      if (passwordResetStep === 'request-code') {
        const retrySeconds = getEmailCodeRetrySeconds(lastPasswordResetSentAt, Date.now());
        if (retrySeconds > 0) {
          toast.error(`找回验证码刚刚发过，${retrySeconds} 秒后再试`);
          return;
        }

        const { error } = await sendPasswordResetEmail({
          email: resetEmail,
          redirectTo: passwordResetRedirectTo,
        });

        if (error) {
          toast.error(`找回验证码发送失败: ${error.message}`);
          return;
        }

        setPasswordResetEmail(resetEmail);
        setEmailCode('');
        setNewPassword('');
        setConfirmNewPassword('');
        setPasswordResetStep('verify-code');
        setLastPasswordResetSentAt(Date.now());
        toast.success('找回验证码已发送，请查看邮箱');
        return;
      }

      const { error: verifyError } = await verifyPasswordResetCode({
        email: resetEmail,
        code: normalizeEmailCode(emailCode),
      });

      if (verifyError) {
        toast.error(`验证码错误或已过期: ${verifyError.message}`);
        return;
      }

      const { error: updateError } = await updatePassword(newPassword);
      if (updateError) {
        toast.error(`密码更新失败: ${updateError.message}`);
        return;
      }

      toast.success('密码已更新');
      closePasswordResetPanel();
      navigate(redirectPath, { replace: true });
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

  const renderEmailField = () => (
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
          disabled={loading || isVerifyingCode || isPasswordResetCodeStep}
          autoComplete="email"
          className="h-12 rounded-2xl pl-10 text-base font-semibold"
        />
      </div>
    </div>
  );

  const renderCodeField = () => (
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
  );

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f6f6f2] px-4 py-8">
      <Card className="w-full max-w-[26rem] overflow-hidden rounded-2xl border-2 border-foreground bg-white shadow-[6px_6px_0_rgba(0,0,0,0.15)] transition-all duration-300">
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
              {heading}
            </CardTitle>
            <CardDescription className="mt-2 text-[0.98rem] font-semibold leading-relaxed text-[#777777]">
              {description}
            </CardDescription>
          </div>

          {!isUpdatingPassword && (
            <div className="flex gap-3">
              {([
                ['login', '我要登录'],
                ['register', '我是新人'],
              ] as const).map(([nextMode, label]) => (
                <button
                  key={nextMode}
                  type="button"
                  className={cn(
                    'flex-1 h-11 px-4 text-sm font-black transition-all rounded-xl border-2 border-foreground active:scale-95 touch-manipulation',
                    mode === nextMode
                      ? 'bg-[#1f9f58] text-white shadow-[3px_3px_0_#000] -translate-y-0.5'
                      : 'bg-white text-[#777771] hover:text-foreground shadow-[1px_1px_0_#000]'
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

              <Button
                type="submit"
                className="h-12 w-full rounded-xl border-2 border-foreground bg-[#1f9f58] text-base font-black text-white shadow-[3px_3px_0_#000] transition-all hover:translate-y-[-1px] hover:bg-[#18884d] hover:shadow-[4px_4px_0_#000] active:translate-y-[1px] active:shadow-[1px_1px_0_#000] touch-manipulation"
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
                返回登录
              </button>
            </form>
          ) : (
            <>
              <form onSubmit={handleMainSubmit} className="space-y-4">
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

                {!isVerifyingCode && renderEmailField()}

                {!isRegister && loginMethod === 'password' && (
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
                        onChange={(event) => {
                          setPassword(event.target.value);
                          if (passwordSignInError) setPasswordSignInError('');
                        }}
                        disabled={loading}
                        autoComplete="current-password"
                        aria-invalid={Boolean(passwordSignInError)}
                        aria-describedby={passwordSignInError ? 'passwordSignInError' : undefined}
                        className="h-12 rounded-2xl pl-10 text-base font-semibold"
                      />
                    </div>
                    {passwordSignInError && (
                      <div
                        id="passwordSignInError"
                        role="alert"
                        className="flex gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold leading-relaxed text-red-700"
                      >
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2.5} />
                        <span>{passwordSignInError}</span>
                      </div>
                    )}
                  </div>
                )}

                {isRegister && !isVerifyingCode && (
                  <>
                    <div className="space-y-2">
                      <Label
                        htmlFor="registerPassword"
                        className="text-sm font-black text-[#3f3f42]"
                      >
                        设置密码
                      </Label>
                      <div className="relative">
                        <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#92928d]" />
                        <Input
                          id="registerPassword"
                          type="password"
                          placeholder="至少 6 位"
                          value={registerPassword}
                          onChange={(event) => setRegisterPassword(event.target.value)}
                          disabled={loading}
                          autoComplete="new-password"
                          className="h-12 rounded-2xl pl-10 text-base font-semibold"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor="confirmRegisterPassword"
                        className="text-sm font-black text-[#3f3f42]"
                      >
                        确认密码
                      </Label>
                      <div className="relative">
                        <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#92928d]" />
                        <Input
                          id="confirmRegisterPassword"
                          type="password"
                          placeholder="再输入一次"
                          value={confirmRegisterPassword}
                          onChange={(event) => setConfirmRegisterPassword(event.target.value)}
                          disabled={loading}
                          autoComplete="new-password"
                          className="h-12 rounded-2xl pl-10 text-base font-semibold"
                        />
                      </div>
                    </div>
                  </>
                )}

                {(isVerifyingCode || isEmailCodeLogin) && isVerifyingCode && renderCodeField()}

                  <Button
                    type="submit"
                    className="h-12 w-full rounded-xl border-2 border-foreground bg-[#1f9f58] text-base font-black text-white shadow-[3px_3px_0_#000] transition-all hover:translate-y-[-1px] hover:bg-[#18884d] hover:shadow-[4px_4px_0_#000] active:translate-y-[1px] active:shadow-[1px_1px_0_#000] touch-manipulation"
                    disabled={loading}
                  >
                    {loading
                      ? '处理中...'
                      : isRegister
                        ? isVerifyingCode
                          ? '验证并完成注册'
                          : '发送注册验证码'
                        : loginMethod === 'code'
                          ? isVerifyingCode
                            ? '验证并登录'
                            : '发送登录验证码'
                          : '登录'}
                  </Button>

                {!isRegister && loginMethod === 'password' && (
                  <div className="flex items-center justify-between text-sm font-black">
                    <button
                      type="button"
                      className="text-[#12967e]"
                      onClick={openPasswordResetPanel}
                      disabled={loading}
                    >
                      忘记密码？
                    </button>
                    <button
                      type="button"
                      className="text-[#6f6f69]"
                      onClick={() => {
                        setLoginMethod('code');
                        setPasswordPanel('none');
                        setPasswordSignInError('');
                        resetPasswordResetState();
                        resetCodeState();
                      }}
                      disabled={loading}
                    >
                      用验证码登录
                    </button>
                  </div>
                )}

                {loginMethod === 'code' && (
                  <button
                    type="button"
                    className="w-full rounded-full py-2 text-sm font-black text-[#12967e] active:bg-[#18b99c]/8"
                    onClick={() => {
                      setLoginMethod('password');
                      setPasswordSignInError('');
                      resetPasswordResetState();
                      resetCodeState();
                    }}
                    disabled={loading}
                  >
                    改用密码登录
                  </button>
                )}

                {isRegister && isVerifyingCode && (
                  <button
                    type="button"
                    className="w-full rounded-full py-2 text-sm font-black text-[#12967e] active:bg-[#18b99c]/8"
                    onClick={resetCodeState}
                    disabled={loading}
                  >
                    修改注册信息
                  </button>
                )}
              </form>

              {passwordPanel === 'forgot' && (
                <form
                  onSubmit={handlePasswordResetRequest}
                  className="mt-4 space-y-3 rounded-[1.2rem] border border-[#e5e5df] bg-[#fbfbf8] p-4"
                >
                  <div className="text-sm font-semibold leading-relaxed text-[#777771]">
                    {passwordResetStep === 'request-code'
                      ? '输入上面的注册邮箱，我们会发送 6 位找回验证码。'
                      : `输入 ${passwordResetEmail} 收到的 6 位验证码，然后设置新密码。`}
                  </div>

                  {passwordResetStep === 'verify-code' && (
                    <>
                      {renderCodeField()}

                      <div className="space-y-2">
                        <Label htmlFor="resetNewPassword" className="text-sm font-black text-[#3f3f42]">
                          新密码
                        </Label>
                        <div className="relative">
                          <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#92928d]" />
                          <Input
                            id="resetNewPassword"
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
                        <Label htmlFor="resetConfirmNewPassword" className="text-sm font-black text-[#3f3f42]">
                          再输入一次
                        </Label>
                        <div className="relative">
                          <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#92928d]" />
                          <Input
                            id="resetConfirmNewPassword"
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
                    </>
                  )}

                  <Button
                    type="submit"
                    variant="secondary"
                    className="h-11 w-full rounded-xl border-2 border-foreground text-sm font-black bg-secondary text-secondary-foreground shadow-[2px_2px_0_#000] hover:translate-y-[-1px] hover:shadow-[3px_3px_0_#000] active:translate-y-[1px] active:shadow-[1px_1px_0_#000] transition-all touch-manipulation"
                    disabled={loading}
                  >
                    {loading
                      ? '处理中...'
                      : passwordResetStep === 'request-code'
                        ? '发送找回验证码'
                        : '验证并更新密码'}
                  </Button>

                  {passwordResetStep === 'verify-code' && (
                    <button
                      type="button"
                      className="w-full rounded-full py-1.5 text-sm font-black text-[#12967e]"
                      onClick={() => {
                        setPasswordResetStep('request-code');
                        setPasswordResetEmail('');
                        setEmailCode('');
                        setNewPassword('');
                        setConfirmNewPassword('');
                      }}
                      disabled={loading}
                    >
                      换一个邮箱
                    </button>
                  )}

                  <button
                    type="button"
                    className="w-full rounded-full py-1.5 text-sm font-black text-[#8a8a84]"
                    onClick={closePasswordResetPanel}
                    disabled={loading}
                  >
                    收起
                  </button>
                </form>
              )}

              </>
            )}
          </CardContent>
        </Card>

        {showStamp && (
          <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/85 backdrop-blur-md animate-in fade-in duration-300">
            <div className="relative flex flex-col items-center justify-center p-8 rounded-3xl border-4 border-foreground bg-[#fffdf9] shadow-[12px_12px_0_#000] max-w-[20rem] text-center animate-in zoom-in-75 duration-300">
              <div className="relative h-40 w-40 flex items-center justify-center">
                <img
                  src="/stickers/stamp-good-lucky.png"
                  alt="印章"
                  className="h-full w-full object-contain drop-shadow-[4px_8px_0_rgba(0,0,0,0.15)] animate-in zoom-in-150 duration-500 delay-100 ease-out"
                />
              </div>
              <h3 className="mt-6 text-2xl font-black tracking-wider text-foreground">
                手账已激活！
              </h3>
              <p className="mt-2 text-sm font-bold text-muted-foreground">
                开启你的清迈生活漫游旅程...
              </p>
            </div>
          </div>
        )}
      </div>
  );
}
