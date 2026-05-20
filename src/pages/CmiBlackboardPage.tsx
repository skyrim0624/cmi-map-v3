import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { CmiBlackboard } from '@/features/home/blackboard/cmi-blackboard';

export default function CmiBlackboardPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-[100dvh] bg-[linear-gradient(180deg,#fbfaff_0%,#f8f7fb_55%,#ffffff_100%)]">
      <header className="sticky top-0 z-30 border-b border-border/80 bg-background/95 px-4 pb-3 pt-[calc(env(safe-area-inset-top)+0.85rem)] backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-border bg-white text-foreground shadow-sm"
            onClick={() => navigate('/')}
            aria-label="返回首页"
          >
            <ArrowLeft className="h-5 w-5" strokeWidth={2.5} />
          </button>
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-black leading-tight text-foreground">
              一起出发！
            </h1>
            <p className="truncate text-xs font-black text-muted-foreground">
              约搭子、求助、拼车，先放在这里。
            </p>
          </div>
        </div>
      </header>

      <main className="px-4 pb-[calc(env(safe-area-inset-bottom)+2rem)] pt-4">
        <CmiBlackboard />
      </main>
    </div>
  );
}
