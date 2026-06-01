import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildAuthRedirectTo,
  getPasswordSignInErrorMessage,
  getEmailCodeRetrySeconds,
  normalizeEmailCode,
  validateEmailCodeSignInForm,
  validatePasswordResetRequestForm,
  validatePasswordResetVerificationForm,
  validatePasswordSignInForm,
  validatePasswordUpdateForm,
  validateRegistrationForm,
  validateAuthForm,
} from './auth-flow.ts';

test('login code request only requires an email', () => {
  assert.equal(
    validateAuthForm({
      mode: 'login',
      step: 'request-code',
      email: ' andreas@example.com ',
      userName: '',
      code: '',
    }),
    null
  );
});

test('register code request requires email and nickname', () => {
  assert.equal(
    validateAuthForm({
      mode: 'register',
      step: 'request-code',
      email: ' andreas@example.com ',
      userName: ' 子扬 ',
      code: '',
    }),
    null
  );
});

test('email code verification requires a six digit code', () => {
  assert.equal(
    validateAuthForm({
      mode: 'login',
      step: 'verify-code',
      email: 'andreas@example.com',
      code: '12345',
    }),
    '请输入 6 位邮箱验证码'
  );
});

test('email code normalization keeps only six digits', () => {
  assert.equal(normalizeEmailCode(' 12 3-4567 '), '123456');
});

test('email code retry helper returns remaining cooldown seconds', () => {
  assert.equal(getEmailCodeRetrySeconds(1_000, 30_000), 31);
  assert.equal(getEmailCodeRetrySeconds(1_000, 62_000), 0);
});

test('auth redirect keeps users inside the app', () => {
  assert.equal(
    buildAuthRedirectTo('https://cmimap.com', '/events/new?place=North%20Gate'),
    'https://cmimap.com/events/new?place=North%20Gate'
  );
  assert.equal(buildAuthRedirectTo('https://cmimap.com', 'https://evil.example'), 'https://cmimap.com/');
  assert.equal(buildAuthRedirectTo('https://cmimap.com', '//evil.example'), 'https://cmimap.com/');
});

test('password sign in requires email and password', () => {
  assert.equal(validatePasswordSignInForm({ email: '', password: 'secret123' }), '请输入邮箱');
  assert.equal(validatePasswordSignInForm({ email: 'andreas@example.com', password: '' }), '请输入密码');
  assert.equal(validatePasswordSignInForm({ email: 'andreas@example.com', password: 'secret123' }), null);
});

test('password sign in errors are readable for users', () => {
  assert.equal(
    getPasswordSignInErrorMessage(new Error('Invalid login credentials')),
    '邮箱或密码不正确，请检查后重新输入。'
  );
  assert.equal(
    getPasswordSignInErrorMessage(new Error('Email not confirmed')),
    '这个邮箱还没有完成验证，请先打开邮箱里的确认邮件。'
  );
});

test('registration requires email nickname matching password and confirmation code', () => {
  assert.equal(
    validateRegistrationForm({
      step: 'request-code',
      email: 'andreas@example.com',
      userName: '子扬',
      password: 'secret123',
      confirmPassword: 'secret123',
    }),
    null
  );
  assert.equal(
    validateRegistrationForm({
      step: 'request-code',
      email: 'andreas@example.com',
      userName: '子扬',
      password: 'short',
      confirmPassword: 'short',
    }),
    '密码至少 6 位'
  );
  assert.equal(
    validateRegistrationForm({
      step: 'request-code',
      email: 'andreas@example.com',
      userName: '子扬',
      password: 'secret123',
      confirmPassword: 'secret124',
    }),
    '两次输入的密码不一致'
  );
  assert.equal(
    validateRegistrationForm({
      step: 'verify-code',
      email: 'andreas@example.com',
      userName: '子扬',
      password: 'secret123',
      confirmPassword: 'secret123',
      code: '12345',
    }),
    '请输入 6 位邮箱验证码'
  );
});

test('email code sign in treats OTP as an optional login fallback', () => {
  assert.equal(
    validateEmailCodeSignInForm({
      step: 'request-code',
      email: 'andreas@example.com',
    }),
    null
  );
  assert.equal(
    validateEmailCodeSignInForm({
      step: 'verify-code',
      email: 'andreas@example.com',
      code: '123456',
    }),
    null
  );
});

test('password reset request only requires an email', () => {
  assert.equal(validatePasswordResetRequestForm({ email: '' }), '请输入邮箱');
  assert.equal(validatePasswordResetRequestForm({ email: 'andreas@example.com' }), null);
});

test('password reset verification requires email code and matching password', () => {
  assert.equal(
    validatePasswordResetVerificationForm({
      email: '',
      code: '123456',
      password: 'secret123',
      confirmPassword: 'secret123',
    }),
    '请输入邮箱'
  );
  assert.equal(
    validatePasswordResetVerificationForm({
      email: 'andreas@example.com',
      code: '12345',
      password: 'secret123',
      confirmPassword: 'secret123',
    }),
    '请输入 6 位邮箱验证码'
  );
  assert.equal(
    validatePasswordResetVerificationForm({
      email: 'andreas@example.com',
      code: '123456',
      password: 'secret123',
      confirmPassword: 'secret124',
    }),
    '两次输入的密码不一致'
  );
  assert.equal(
    validatePasswordResetVerificationForm({
      email: 'andreas@example.com',
      code: '123456',
      password: 'secret123',
      confirmPassword: 'secret123',
    }),
    null
  );
});

test('password update requires a six character matching password', () => {
  assert.equal(
    validatePasswordUpdateForm({ password: 'short', confirmPassword: 'short' }),
    '密码至少 6 位'
  );
  assert.equal(
    validatePasswordUpdateForm({ password: 'secret123', confirmPassword: 'secret124' }),
    '两次输入的密码不一致'
  );
  assert.equal(
    validatePasswordUpdateForm({ password: 'secret123', confirmPassword: 'secret123' }),
    null
  );
});
