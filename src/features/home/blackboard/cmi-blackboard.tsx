import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import type { ReactNode } from 'react';
import {
  CarFront,
  Check,
  Clock3,
  HelpCircle,
  MapPin,
  Megaphone,
  Plus,
  Sparkles,
  Sun,
  Users,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type BlackboardCategory = 'companion' | 'help' | 'ride';
type BlackboardFilter = 'all' | BlackboardCategory;

interface BlackboardPost {
  id: string;
  category: BlackboardCategory;
  title: string;
  body: string;
  author: string;
  authorInitial: string;
  createdLabel: string;
  timeLabel: string;
  locationLabel: string;
  peopleLabel: string;
  confirmedCount?: number;
  interestedCount: number;
}

interface BlackboardDraft {
  category: BlackboardCategory;
  title: string;
  body: string;
  timeLabel: string;
  locationLabel: string;
  peopleLabel: string;
}

interface CategoryMeta {
  id: BlackboardFilter;
  label: string;
  Icon: LucideIcon;
}

const POST_TITLE_LIMIT = 24;
const POST_BODY_LIMIT = 120;

const CATEGORY_META: CategoryMeta[] = [
  { id: 'all', label: '全部', Icon: Sparkles },
  { id: 'companion', label: '找搭子', Icon: Sun },
  { id: 'help', label: '求助', Icon: HelpCircle },
  { id: 'ride', label: '拼车', Icon: CarFront },
];

const CATEGORY_LABELS: Record<BlackboardCategory, string> = {
  companion: '找搭子',
  help: '求助',
  ride: '拼车',
};

const CATEGORY_TONES: Record<BlackboardCategory, string> = {
  companion: 'bg-primary/10 text-primary border-primary/20',
  help: 'bg-[#eef3ff] text-[#4a6a9e] border-[#4a6a9e]/15',
  ride: 'bg-[#fff2cf] text-[#8a641b] border-[#8a641b]/15',
};

const QR_ENTRIES = [
  {
    id: 'andreas',
    title: '子扬微信',
    action: '扫码添加',
    imageUrl: '/cmi-home/qr-andreas.jpg',
    alt: '子扬微信二维码',
  },
  {
    id: 'community-group',
    title: '社区群 #5',
    action: '扫码进群',
    imageUrl: '/cmi-home/qr-community-group-5.jpg',
    alt: '清迈客栈社区群 #5 群聊二维码',
  },
  {
    id: 'linke',
    title: '林可微信',
    action: '扫码添加',
    imageUrl: '/cmi-home/qr-linke.jpg',
    alt: '林可微信二维码',
  },
];

const INITIAL_POSTS: BlackboardPost[] = [
  {
    id: 'sticky-waterfall',
    category: 'companion',
    title: '明天去粘粘瀑布',
    body: '想找 2-3 个人一起去，上午 10 点出发，下午回。可以包车，也可以有人骑车带路。',
    author: '林可',
    authorInitial: '林',
    createdLabel: '12 分钟前',
    timeLabel: '明天 10:00',
    locationLabel: '粘粘瀑布',
    peopleLabel: '2',
    confirmedCount: 1,
    interestedCount: 2,
  },
  {
    id: 'jing-jai-market',
    category: 'companion',
    title: '周六早上逛 JJ',
    body: '想去 Jing Jai 买菜和喝咖啡，顺便补几个 CMI Map 点位。慢慢逛，不赶时间。',
    author: '小北',
    authorInitial: '小',
    createdLabel: '36 分钟前',
    timeLabel: '周六 09:30',
    locationLabel: 'Jing Jai Market',
    peopleLabel: '1',
    interestedCount: 1,
  },
  {
    id: 'print-shop-help',
    category: 'help',
    title: '哪里打印靠谱',
    body: '需要打印几份签证材料，最好能中文沟通，离古城或宁曼近一点。',
    author: '远山',
    authorInitial: '远',
    createdLabel: '2 小时前',
    timeLabel: '今天',
    locationLabel: '古城 / 宁曼',
    peopleLabel: '0',
    interestedCount: 0,
  },
  {
    id: 'airport-ride',
    category: 'ride',
    title: '周五凌晨拼车去机场',
    body: '航班 6 点多，想 4 点左右从宁曼出发，有差不多时间的可以一起。',
    author: 'Echo',
    authorInitial: 'E',
    createdLabel: '3 小时前',
    timeLabel: '周五 04:00',
    locationLabel: '宁曼 → 机场',
    peopleLabel: '0',
    interestedCount: 0,
  },
];

const createEmptyDraft = (): BlackboardDraft => ({
  category: 'companion',
  title: '',
  body: '',
  timeLabel: '',
  locationLabel: '',
  peopleLabel: '',
});

function getActionLabel(category: BlackboardCategory) {
  if (category === 'help') return '我能帮';
  return '我也想去';
}

function getPostCount(posts: BlackboardPost[], filter: BlackboardFilter) {
  if (filter === 'all') return posts.length;
  return posts.filter(post => post.category === filter).length;
}

function CommunityQrCard({ entry }: { entry: (typeof QR_ENTRIES)[number] }) {
  return (
    <a
      href={entry.imageUrl}
      target="_blank"
      rel="noreferrer"
      className="flex min-h-[8.9rem] flex-col items-center justify-start rounded-[0.95rem] border border-primary/15 bg-white px-2 py-2 text-center shadow-[0_10px_24px_rgba(65,51,112,0.08)] transition-transform active:scale-[0.99]"
      aria-label={entry.alt}
    >
      <img
        src={entry.imageUrl}
        alt={entry.alt}
        loading="lazy"
        className="h-[5.55rem] w-[5.55rem] rounded-[0.55rem] border border-primary/10 object-cover"
      />
      <strong className="mt-1.5 text-[12px] font-black leading-tight text-foreground">
        {entry.title}
      </strong>
      <span className="mt-0.5 text-[10.5px] font-bold leading-none text-muted-foreground">
        {entry.action}
      </span>
    </a>
  );
}

function CommunityEntry() {
  return (
    <section className="rounded-[1.35rem] border border-primary/15 bg-white/85 p-3 shadow-[0_16px_38px_rgba(65,51,112,0.10)]">
      <div className="mb-2.5 flex items-center justify-between gap-3">
        <h3 className="text-base font-black text-foreground">社区入口</h3>
        <span className="text-xs font-black text-muted-foreground">加微信 / 进群</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {QR_ENTRIES.map(entry => (
          <CommunityQrCard key={entry.id} entry={entry} />
        ))}
      </div>
    </section>
  );
}

function PostMeta({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <span className="inline-flex min-h-7 items-center gap-1 rounded-full border border-border bg-background/78 px-2.5 text-xs font-black text-muted-foreground">
      <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={2.4} />
      {children}
    </span>
  );
}

function BlackboardPostCard({
  post,
  onJoin,
}: {
  post: BlackboardPost;
  onJoin: (post: BlackboardPost) => void;
}) {
  return (
    <article className="rounded-[1.35rem] border border-border bg-white p-4 shadow-[0_12px_30px_rgba(32,25,54,0.08)]">
      <div className="flex items-start justify-between gap-3">
        <h3 className="min-w-0 text-xl font-black leading-tight text-foreground">{post.title}</h3>
        <span
          className={cn(
            'shrink-0 rounded-full border px-3 py-1 text-xs font-black',
            CATEGORY_TONES[post.category]
          )}
        >
          {CATEGORY_LABELS[post.category]}
        </span>
      </div>

      <p className="mt-3 text-[15px] font-semibold leading-relaxed text-foreground/80">
        {post.body}
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <PostMeta icon={Clock3}>{post.timeLabel}</PostMeta>
        <PostMeta icon={MapPin}>{post.locationLabel}</PostMeta>
        <PostMeta icon={Users}>人 {post.peopleLabel}</PostMeta>
        {typeof post.confirmedCount === 'number' && (
          <PostMeta icon={Check}>已确认 {post.confirmedCount}</PostMeta>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-black text-primary">
            {post.authorInitial}
          </span>
          <span className="min-w-0 truncate text-sm font-black text-muted-foreground">
            {post.author} · {post.createdLabel}
          </span>
        </div>
        <button
          type="button"
          className="shrink-0 rounded-full bg-primary px-4 py-2.5 text-sm font-black text-primary-foreground shadow-[0_10px_22px_rgba(111,90,168,0.22)] transition-transform active:scale-[0.98]"
          onClick={() => onJoin(post)}
        >
          {getActionLabel(post.category)}
        </button>
      </div>
    </article>
  );
}

function SheetShell({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-foreground/35 px-0" role="presentation">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="关闭"
        onClick={onClose}
      />
      <section
        className="relative max-h-[88dvh] w-full max-w-[480px] overflow-y-auto rounded-t-[1.6rem] border border-border bg-background p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] shadow-[0_-18px_48px_rgba(32,25,54,0.22)]"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-2xl font-black leading-tight text-foreground">{title}</h3>
          <button
            type="button"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-border bg-white text-foreground"
            onClick={onClose}
            aria-label="关闭"
          >
            <X className="h-5 w-5" strokeWidth={2.4} />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

function ComposerSheet({
  draft,
  onDraftChange,
  onSubmit,
  onClose,
}: {
  draft: BlackboardDraft;
  onDraftChange: (draft: BlackboardDraft) => void;
  onSubmit: () => void;
  onClose: () => void;
}) {
  const isValid = draft.title.trim().length > 0 && draft.body.trim().length > 0;

  const updateDraft = <Field extends keyof BlackboardDraft>(
    field: Field,
    value: BlackboardDraft[Field]
  ) => {
    onDraftChange({ ...draft, [field]: value });
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isValid) return;
    onSubmit();
  };

  return (
    <SheetShell title="发一条" onClose={onClose}>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="grid grid-cols-3 gap-2">
          {CATEGORY_META.filter(item => item.id !== 'all').map(({ id, label, Icon }) => {
            const categoryId = id as BlackboardCategory;

            return (
              <button
                key={id}
                type="button"
                className={cn(
                  'flex min-h-11 items-center justify-center gap-1.5 rounded-full border px-3 text-sm font-black transition-colors',
                  draft.category === categoryId
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-white text-muted-foreground'
                )}
                onClick={() => updateDraft('category', categoryId)}
              >
                <Icon className="h-4 w-4" strokeWidth={2.4} />
                {label}
              </button>
            );
          })}
        </div>

        <label className="block">
          <span className="text-sm font-black text-foreground">标题</span>
          <input
            value={draft.title}
            maxLength={POST_TITLE_LIMIT}
            onChange={event => updateDraft('title', event.target.value)}
            className="mt-2 h-12 w-full rounded-2xl border border-border bg-white px-4 text-base font-bold text-foreground outline-none focus:border-primary"
            placeholder="比如：明天去粘粘瀑布"
          />
        </label>

        <label className="block">
          <span className="flex items-center justify-between gap-3 text-sm font-black text-foreground">
            内容
            <span className="text-xs text-muted-foreground">{draft.body.length}/{POST_BODY_LIMIT}</span>
          </span>
          <textarea
            value={draft.body}
            maxLength={POST_BODY_LIMIT}
            onChange={event => updateDraft('body', event.target.value)}
            className="mt-2 min-h-[7.4rem] w-full resize-none rounded-2xl border border-border bg-white px-4 py-3 text-base font-semibold leading-relaxed text-foreground outline-none focus:border-primary"
            placeholder="写清楚时间、地点、人数和大概安排。"
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs font-black text-muted-foreground">时间</span>
            <input
              value={draft.timeLabel}
              onChange={event => updateDraft('timeLabel', event.target.value)}
              className="mt-1.5 h-11 w-full rounded-2xl border border-border bg-white px-3 text-sm font-bold outline-none focus:border-primary"
              placeholder="明天 10:00"
            />
          </label>
          <label className="block">
            <span className="text-xs font-black text-muted-foreground">人数</span>
            <input
              value={draft.peopleLabel}
              onChange={event => updateDraft('peopleLabel', event.target.value)}
              className="mt-1.5 h-11 w-full rounded-2xl border border-border bg-white px-3 text-sm font-bold outline-none focus:border-primary"
              placeholder="2"
            />
          </label>
        </div>

        <label className="block">
          <span className="text-xs font-black text-muted-foreground">地点</span>
          <input
            value={draft.locationLabel}
            onChange={event => updateDraft('locationLabel', event.target.value)}
            className="mt-1.5 h-11 w-full rounded-2xl border border-border bg-white px-3 text-sm font-bold outline-none focus:border-primary"
            placeholder="粘粘瀑布"
          />
        </label>

        <button
          type="submit"
          disabled={!isValid}
          className="flex h-12 w-full items-center justify-center rounded-full bg-primary text-base font-black text-primary-foreground shadow-[0_12px_26px_rgba(111,90,168,0.24)] transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-45"
        >
          发布
        </button>
      </form>
    </SheetShell>
  );
}

function ContactSheet({
  post,
  onClose,
}: {
  post: BlackboardPost;
  onClose: () => void;
}) {
  return (
    <SheetShell title={getActionLabel(post.category)} onClose={onClose}>
      <div className="rounded-[1.2rem] border border-primary/15 bg-primary/5 p-4">
        <p className="text-sm font-black text-primary">{post.title}</p>
        <p className="mt-1 text-sm font-semibold leading-relaxed text-foreground/75">
          {post.author} · {post.timeLabel} · {post.locationLabel}
        </p>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        {QR_ENTRIES.map(entry => (
          <CommunityQrCard key={entry.id} entry={entry} />
        ))}
      </div>
    </SheetShell>
  );
}

export function CmiBlackboard() {
  const [activeFilter, setActiveFilter] = useState<BlackboardFilter>('all');
  const [posts, setPosts] = useState(INITIAL_POSTS);
  const [draft, setDraft] = useState<BlackboardDraft>(() => createEmptyDraft());
  const [composerOpen, setComposerOpen] = useState(false);
  const [contactPost, setContactPost] = useState<BlackboardPost | null>(null);

  const visiblePosts = useMemo(() => {
    if (activeFilter === 'all') return posts;
    return posts.filter(post => post.category === activeFilter);
  }, [activeFilter, posts]);

  const handleCreatePost = () => {
    const newPost: BlackboardPost = {
      id: `local-${Date.now()}`,
      category: draft.category,
      title: draft.title.trim(),
      body: draft.body.trim(),
      author: '你',
      authorInitial: '你',
      createdLabel: '刚刚',
      timeLabel: draft.timeLabel.trim() || '时间待定',
      locationLabel: draft.locationLabel.trim() || '地点待定',
      peopleLabel: draft.peopleLabel.trim() || '0',
      interestedCount: 0,
    };

    setPosts(currentPosts => [newPost, ...currentPosts]);
    setActiveFilter('all');
    setDraft(createEmptyDraft());
    setComposerOpen(false);
  };

  const handleJoinPost = (post: BlackboardPost) => {
    setPosts(currentPosts =>
      currentPosts.map(item =>
        item.id === post.id
          ? { ...item, interestedCount: item.interestedCount + 1 }
          : item
      )
    );
    setContactPost(post);
  };

  return (
    <section className="space-y-3" aria-label="一起出发看板">
      <div className="rounded-[1.65rem] border border-primary/15 bg-[#fbfaff]/95 p-3 shadow-[0_18px_44px_rgba(65,51,112,0.12)] backdrop-blur-md">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[0.9rem] bg-primary/10 text-primary">
              <Megaphone className="h-6 w-6" strokeWidth={2.6} />
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-[1.45rem] font-black leading-tight text-foreground">
                一起出发！
              </h2>
              <p className="truncate text-xs font-black text-muted-foreground">
                约搭子、求助、拼车
              </p>
            </div>
          </div>
          <button
            type="button"
            className="flex h-11 shrink-0 items-center gap-1.5 rounded-full bg-primary px-4 text-sm font-black text-primary-foreground shadow-[0_10px_22px_rgba(111,90,168,0.24)] active:scale-[0.98]"
            onClick={() => setComposerOpen(true)}
          >
            <Plus className="h-[1.125rem] w-[1.125rem]" strokeWidth={2.8} />
            发一条
          </button>
        </div>

        <CommunityEntry />

        <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {CATEGORY_META.map(({ id, label, Icon }) => {
            const active = activeFilter === id;
            return (
              <button
                key={id}
                type="button"
                className={cn(
                  'flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-sm font-black transition-colors',
                  active
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-white/80 text-muted-foreground'
                )}
                onClick={() => setActiveFilter(id)}
              >
                <Icon className="h-4 w-4" strokeWidth={2.4} />
                {label}
                <span>{getPostCount(posts, id)}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-3 space-y-3">
          {visiblePosts.map(post => (
            <BlackboardPostCard key={post.id} post={post} onJoin={handleJoinPost} />
          ))}
        </div>
      </div>

      {composerOpen && (
        <ComposerSheet
          draft={draft}
          onDraftChange={setDraft}
          onSubmit={handleCreatePost}
          onClose={() => setComposerOpen(false)}
        />
      )}

      {contactPost && (
        <ContactSheet post={contactPost} onClose={() => setContactPost(null)} />
      )}
    </section>
  );
}

export function CmiBlackboardEntry({ onOpen }: { onOpen: () => void }) {
  return (
    <section aria-label="一起出发看板入口">
      <button
        type="button"
        className="group flex w-full items-center gap-3 rounded-[1.35rem] border border-primary/20 bg-[#fbfaff]/95 p-3 text-left shadow-[0_16px_36px_rgba(65,51,112,0.12)] transition-transform active:scale-[0.99]"
        onClick={onOpen}
      >
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-[1rem] bg-primary/10 text-primary">
          <Megaphone className="h-[1.625rem] w-[1.625rem]" strokeWidth={2.6} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <h2 className="truncate text-[1.35rem] font-black leading-tight text-foreground">
              一起出发！
            </h2>
            <span className="shrink-0 rounded-full bg-primary px-3 py-1.5 text-xs font-black text-primary-foreground">
              进入看板
            </span>
          </div>
          <p className="mt-1 line-clamp-2 text-xs font-black leading-snug text-muted-foreground">
            约搭子、求助、拼车，先放在这里。
          </p>
          <div className="mt-2 flex items-center gap-1.5 text-[11px] font-black text-primary">
            <span className="rounded-full bg-primary/10 px-2 py-1">找搭子 2</span>
            <span className="rounded-full bg-primary/10 px-2 py-1">求助 1</span>
            <span className="rounded-full bg-primary/10 px-2 py-1">拼车 1</span>
          </div>
        </div>
      </button>
    </section>
  );
}
