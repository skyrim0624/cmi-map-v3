import { ArrowLeft, Check, Copy, KeyRound, Loader2, RefreshCw, ShieldCheck, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import {
  createCmiAgentToken,
  listCmiAgentTokens,
  revokeCmiAgentToken,
  type CmiAgentToken,
  type CreatedCmiAgentToken,
} from '@/db/cmi-agent-tokens';

const formatBangkokTime = (value: string | null) => {
  if (!value) return '从未';
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Bangkok',
  }).format(new Date(value));
};

const getTokenStatus = (token: CmiAgentToken) => {
  if (token.revokedAt) return { label: '已撤销', className: 'border-stone-200 bg-stone-100 text-stone-500' };
  if (token.expiresAt && new Date(token.expiresAt).getTime() <= Date.now()) {
    return { label: '已过期', className: 'border-stone-200 bg-stone-100 text-stone-500' };
  }
  return { label: '可用', className: 'border-emerald-200 bg-emerald-50 text-emerald-700' };
};

export default function AdminAgentTokens() {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();
  const [tokens, setTokens] = useState<CmiAgentToken[]>([]);
  const [tokenName, setTokenName] = useState('CMI 活动发布 Agent');
  const [createdToken, setCreatedToken] = useState<CreatedCmiAgentToken | null>(null);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const isAdmin = profile?.role === 'admin';
  const activeCount = useMemo(
    () => tokens.filter(token => !token.revokedAt && (!token.expiresAt || new Date(token.expiresAt).getTime() > Date.now())).length,
    [tokens]
  );

  const loadTokens = async () => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      setTokens(await listCmiAgentTokens());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '读取 Agent Token 失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) void loadTokens();
  }, [isAdmin]);

  const handleCreate = async () => {
    const normalizedName = tokenName.trim();
    if (!normalizedName) {
      toast.error('请输入 Token 名称');
      return;
    }

    setCreating(true);
    try {
      const nextToken = await createCmiAgentToken(normalizedName);
      setCreatedToken(nextToken);
      setTokens(current => [nextToken, ...current]);
      toast.success('Agent Token 已生成');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '生成失败');
    } finally {
      setCreating(false);
    }
  };

  const handleCopy = async (value: string, message = '已复制') => {
    await navigator.clipboard.writeText(value);
    toast.success(message);
  };

  const handleRevoke = async (tokenId: string) => {
    setRevokingId(tokenId);
    try {
      await revokeCmiAgentToken(tokenId);
      await loadTokens();
      if (createdToken?.id === tokenId) setCreatedToken(null);
      toast.success('Agent Token 已撤销');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '撤销失败');
    } finally {
      setRevokingId(null);
    }
  };

  if (authLoading || !user || !profile) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#f8f1df]">
        <Loader2 className="h-8 w-8 animate-spin text-[#3f6e52]" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-[100dvh] bg-[#f8f1df] px-5 py-5">
        <Button variant="outline" className="h-11 rounded-full bg-white" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
          返回
        </Button>
        <div className="mt-24 text-center">
          <ShieldCheck className="mx-auto h-12 w-12 text-stone-400" />
          <h1 className="mt-5 text-xl font-black text-[#26231d]">没有管理员权限</h1>
          <p className="mt-3 text-sm font-bold leading-relaxed text-stone-500">当前账号不能管理 Agent Token。</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-[#f8f1df] pb-10">
      <div className="sticky top-0 z-20 border-b border-[#2e2a23]/10 bg-[#f8f1df]/95 px-5 py-4 backdrop-blur">
        <div className="flex items-center justify-between">
          <Button variant="outline" size="icon" className="h-11 w-11 rounded-full bg-white" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="text-center">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#8f7248]">CMI Admin</p>
            <h1 className="text-xl font-black text-[#26231d]">Agent Token</h1>
          </div>
          <Button variant="outline" size="icon" className="h-11 w-11 rounded-full bg-white" onClick={loadTokens} disabled={loading}>
            <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      <div className="space-y-5 px-5 pt-5">
        <section className="rounded-[1.5rem] border border-[#2e2a23]/10 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-black text-[#26231d]">生成 Token</p>
              <p className="mt-1 text-xs font-bold text-stone-500">当前可用 {activeCount} 个</p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#e7f1e8] text-[#3f6e52]">
              <KeyRound className="h-5 w-5" />
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <Input
              value={tokenName}
              onChange={event => setTokenName(event.target.value)}
              className="h-12 rounded-2xl border-[#2e2a23]/12 bg-[#fffaf0] text-sm font-bold"
              placeholder="Token 名称"
            />
            <Button className="h-12 shrink-0 rounded-2xl bg-[#3f6e52] px-4 font-black" onClick={handleCreate} disabled={creating}>
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              生成
            </Button>
          </div>
        </section>

        {createdToken && (
          <section className="rounded-[1.5rem] border border-emerald-200 bg-[#f0f8f1] p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-black text-[#244d36]">新 Token</p>
                <p className="mt-1 text-xs font-bold text-[#5f7d69]">只显示一次</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full bg-white font-black"
                onClick={() => handleCopy(createdToken.rawToken, 'Token 已复制')}
              >
                <Copy className="h-4 w-4" />
                复制
              </Button>
            </div>
            <div className="mt-4 break-all rounded-2xl border border-emerald-200 bg-white p-3 font-mono text-xs font-bold leading-relaxed text-[#244d36]">
              {createdToken.rawToken}
            </div>
            <div className="mt-3 rounded-2xl bg-white/70 p-3 font-mono text-[11px] font-bold leading-relaxed text-stone-600">
              CMI_MAP_ADMIN_AGENT_TOKEN={createdToken.rawToken}
            </div>
          </section>
        )}

        <section className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-black text-[#26231d]">Token 列表</h2>
            {loading && <Loader2 className="h-4 w-4 animate-spin text-stone-400" />}
          </div>

          {!loading && tokens.length === 0 && (
            <div className="rounded-[1.5rem] border border-dashed border-[#2e2a23]/15 bg-white/60 p-8 text-center text-sm font-bold text-stone-500">
              暂无 Token
            </div>
          )}

          {tokens.map(token => {
            const status = getTokenStatus(token);
            const isActive = status.label === '可用';

            return (
              <article key={token.id} className="rounded-[1.5rem] border border-[#2e2a23]/10 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex min-w-0 items-center gap-2">
                      <p className="truncate text-sm font-black text-[#26231d]">{token.tokenName}</p>
                      <Badge variant="outline" className={status.className}>{status.label}</Badge>
                    </div>
                    <p className="mt-1 font-mono text-xs font-bold text-stone-500">{token.tokenPrefix}</p>
                  </div>
                  {isActive && (
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-10 w-10 shrink-0 rounded-full bg-white text-red-600"
                      onClick={() => handleRevoke(token.id)}
                      disabled={revokingId === token.id}
                    >
                      {revokingId === token.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    </Button>
                  )}
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 text-xs font-bold text-stone-500">
                  <div className="rounded-2xl bg-[#f8f1df] px-3 py-2">
                    <p className="text-[10px] uppercase tracking-[0.12em] text-stone-400">Owner</p>
                    <p className="mt-1 truncate text-[#26231d]">{token.ownerName || token.ownerEmail || 'Admin'}</p>
                  </div>
                  <div className="rounded-2xl bg-[#f8f1df] px-3 py-2">
                    <p className="text-[10px] uppercase tracking-[0.12em] text-stone-400">Last Used</p>
                    <p className="mt-1 text-[#26231d]">{formatBangkokTime(token.lastUsedAt)}</p>
                  </div>
                  <div className="rounded-2xl bg-[#f8f1df] px-3 py-2">
                    <p className="text-[10px] uppercase tracking-[0.12em] text-stone-400">Created</p>
                    <p className="mt-1 text-[#26231d]">{formatBangkokTime(token.createdAt)}</p>
                  </div>
                  <div className="rounded-2xl bg-[#f8f1df] px-3 py-2">
                    <p className="text-[10px] uppercase tracking-[0.12em] text-stone-400">Scopes</p>
                    <p className="mt-1 truncate text-[#26231d]">{token.scopes.join(', ')}</p>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      </div>
    </div>
  );
}
