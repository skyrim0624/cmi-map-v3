import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signInWithEmail, signUpWithEmail } = useAuth();
  
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [userName, setUserName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 表单验证
    if (!email.trim()) {
      toast.error('请输入邮箱');
      return;
    }

    if (!password.trim()) {
      toast.error('请输入密码');
      return;
    }

    if (!isLogin) {
      if (!userName.trim()) {
        toast.error('请输入昵称');
        return;
      }

      if (password !== confirmPassword) {
        toast.error('两次输入的密码不一致');
        return;
      }

      if (!agreedToTerms) {
        toast.error('请同意用户协议和隐私政策');
        return;
      }
    }

    setLoading(true);

    try {
      if (isLogin) {
        // 登录
        const { error } = await signInWithEmail(email, password);
        if (error) {
          toast.error(`登录失败: ${error.message}`);
          return;
        }
        toast.success('登录成功！');
        
        // 跳转到之前的页面或首页
        const from = (location.state as any)?.from || '/';
        navigate(from, { replace: true });
      } else {
        // 注册
        const { error } = await signUpWithEmail(email, password, userName.trim());
        if (error) {
          toast.error(`注册失败: ${error.message}`);
          return;
        }
        toast.success('注册成功！正在登录...');
        
        // 注册成功后自动登录
        const { error: loginError } = await signInWithEmail(email, password);
        if (loginError) {
          toast.error('自动登录失败，请手动登录');
          setIsLogin(true);
          return;
        }
        
        // 跳转到首页
        navigate('/', { replace: true });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            {isLogin ? '登录' : '注册'} CMI Map
          </CardTitle>
          <CardDescription className="text-center">
            {isLogin ? '欢迎回来！' : '加入清迈华人社区'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">邮箱</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>

            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="userName">昵称</Label>
                <Input
                  id="userName"
                  type="text"
                  placeholder="你希望社区怎么称呼你"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  disabled={loading}
                  maxLength={24}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="password">密码</Label>
              <Input
                id="password"
                type="password"
                placeholder="请输入密码"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>

            {!isLogin && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">确认密码</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="请再次输入密码"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={loading}
                  />
                </div>

                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="terms"
                    checked={agreedToTerms}
                    onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
                    disabled={loading}
                  />
                  <label
                    htmlFor="terms"
                    className="text-sm text-muted-foreground leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    我已阅读并同意{' '}
                    <span className="text-primary underline cursor-pointer">用户协议</span>
                    {' '}和{' '}
                    <span className="text-primary underline cursor-pointer">隐私政策</span>
                  </label>
                </div>
              </>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? '处理中...' : isLogin ? '登录' : '注册'}
            </Button>

            <div className="text-center text-sm">
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setUserName('');
                  setConfirmPassword('');
                  setAgreedToTerms(false);
                }}
                className="text-primary hover:underline"
                disabled={loading}
              >
                {isLogin ? '还没有账号？立即注册' : '已有账号？立即登录'}
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
