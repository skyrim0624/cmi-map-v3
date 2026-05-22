import type { LucideIcon } from 'lucide-react';
import {
  CarFront,
  Check,
  Clock3,
  HelpCircle,
  MapPin,
  Plus,
  Sparkles,
  Sun,
  Users,
  X,
} from 'lucide-react';
import type { FormEvent, ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import {
  createBlackboardPost,
  getBlackboardPosts,
  type BlackboardPostCategory,
  type BlackboardPostRecord,
} from '@/db/blackboard-posts';
import { getCmiEventPath, getPlacePath, getProfilePath } from '@/lib/paths';
import { cn } from '@/lib/utils';

type BlackboardCategory = BlackboardPostCategory;
type BlackboardFilter = 'all' | BlackboardCategory;

interface BlackboardPost {
  id: string;
  category: BlackboardCategory;
  title: string;
  body: string;
  linkedEventId?: string;
  linkedEventTitle?: string;
  linkedPlaceName?: string;
  author: string;
  authorInitial: string;
  createdLabel: string;
  timeLabel: string;
  locationLabel: string;
  peopleLabel: string;
  confirmedCount?: number;
  interestedCount: number;
}

export interface BlackboardDraft {
  category: BlackboardCategory;
  title: string;
  body: string;
  timeLabel: string;
  locationLabel: string;
  peopleLabel: string;
  linkedEventId?: string;
  linkedEventTitle?: string;
  linkedPlaceName?: string;
}

interface CategoryMeta {
  id: BlackboardFilter;
  label: string;
  Icon: LucideIcon;
}

const POST_TITLE_LIMIT = 24;
const POST_BODY_LIMIT = 120;
const BLACKBOARD_ICON_URL = '/cmi-home/blackboard-together.svg';

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

function formatCreatedLabel(value: string) {
  const createdAt = new Date(value);
  if (Number.isNaN(createdAt.getTime())) return '刚刚';

  const diffMs = Date.now() - createdAt.getTime();
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60000));
  if (diffMinutes < 1) return '刚刚';
  if (diffMinutes < 60) return `${diffMinutes} 分钟前`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} 小时前`;

  return new Intl.DateTimeFormat('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    timeZone: 'Asia/Bangkok',
  }).format(createdAt);
}

function getAuthorInitial(author: string) {
  return author.trim().charAt(0).toUpperCase() || '?';
}

function mapBlackboardPost(record: BlackboardPostRecord): BlackboardPost {
  return {
    id: record.id,
    category: record.category,
    title: record.title,
    body: record.body,
    linkedEventId: record.linked_event_id ?? undefined,
    linkedEventTitle: record.linked_event_title ?? undefined,
    linkedPlaceName: record.linked_place_name ?? undefined,
    author: record.author_name,
    authorInitial: getAuthorInitial(record.author_name),
    createdLabel: formatCreatedLabel(record.created_at),
    timeLabel: record.time_label || '时间待定',
    locationLabel: record.location_label || '地点待定',
    peopleLabel: record.people_label || '0',
    interestedCount: 0,
  };
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
    <section className="rounded-[1.35rem] border border-primary/15 bg-white/90 p-3 shadow-[0_16px_38px_rgba(65,51,112,0.10)]">
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

function PostMeta({
  icon: Icon,
  children,
  to,
}: {
  icon: LucideIcon;
  children: ReactNode;
  to?: string;
}) {
  const className =
    'inline-flex min-h-7 items-center gap-1 rounded-full border border-border bg-background/80 px-2.5 text-xs font-black text-muted-foreground';
  const content = (
    <>
      <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={2.4} />
      {children}
    </>
  );

  if (to) {
    return (
      <Link
        to={to}
        className={cn(className, 'transition active:scale-[0.98] active:bg-primary/10')}
      >
        {content}
      </Link>
    );
  }

  return (
    <span className={className}>
      {content}
    </span>
  );
}

function renderPostBody(post: BlackboardPost) {
  if (!post.linkedEventId || !post.linkedEventTitle) return post.body;

  const mention = `@${post.linkedEventTitle}`;
  const mentionIndex = post.body.indexOf(mention);
  if (mentionIndex < 0) return post.body;

  const beforeMention = post.body.slice(0, mentionIndex);
  const afterMention = post.body.slice(mentionIndex + mention.length);

  return (
    <>
      {beforeMention}
      <Link
        to={getCmiEventPath(post.linkedEventId)}
        className="font-black text-primary underline decoration-primary/35 underline-offset-4 active:opacity-70"
      >
        {mention}
      </Link>
      {afterMention}
    </>
  );
}

function BlackboardPostCard({
  post,
  onJoin,
}: {
  post: BlackboardPost;
  onJoin: (post: BlackboardPost) => void;
}) {
  const placePath = post.linkedPlaceName ? getPlacePath(post.linkedPlaceName) : undefined;
  const authorPath = getProfilePath();

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
        {renderPostBody(post)}
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <PostMeta icon={Clock3}>{post.timeLabel}</PostMeta>
        <PostMeta icon={MapPin} to={placePath}>{post.locationLabel}</PostMeta>
        <PostMeta icon={Users}>人 {post.peopleLabel}</PostMeta>
        {typeof post.confirmedCount === 'number' && (
          <PostMeta icon={Check}>已确认 {post.confirmedCount}</PostMeta>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Link
            to={authorPath}
            className="flex min-w-0 items-center gap-2 rounded-full pr-1 transition active:scale-[0.98] active:bg-primary/5"
            aria-label={`查看${post.author}的个人主页`}
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-black text-primary">
              {post.authorInitial}
            </span>
            <span className="min-w-0 truncate text-sm font-black text-muted-foreground">
              {post.author}
            </span>
          </Link>
          <span className="shrink-0 text-sm font-black text-muted-foreground">
            · {post.createdLabel}
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
        className="relative flex max-h-[calc(100dvh-env(safe-area-inset-top)-0.75rem)] w-full max-w-[480px] flex-col overflow-hidden rounded-t-[1.6rem] border border-border bg-background shadow-[0_-18px_48px_rgba(32,25,54,0.22)]"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 px-4 pb-3 pt-4">
          <h3 className="text-[1.7rem] font-black leading-tight text-foreground">{title}</h3>
          <button
            type="button"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-border bg-white text-foreground"
            onClick={onClose}
            aria-label="关闭"
          >
            <X className="h-5 w-5" strokeWidth={2.4} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-[calc(env(safe-area-inset-bottom)+1.25rem)]">
          {children}
        </div>
      </section>
    </div>
  );
}

function ComposerSheet({
  draft,
  submitting,
  onDraftChange,
  onSubmit,
  onClose,
}: {
  draft: BlackboardDraft;
  submitting: boolean;
  onDraftChange: (draft: BlackboardDraft) => void;
  onSubmit: () => Promise<void>;
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
    if (!isValid || submitting) return;
    void onSubmit();
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
            placeholder="比如：周末一起逛市集"
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
            placeholder="地点 / 区域"
          />
        </label>

        <button
          type="submit"
          disabled={!isValid || submitting}
          className="flex h-12 w-full items-center justify-center rounded-full bg-primary text-base font-black text-primary-foreground shadow-[0_12px_26px_rgba(111,90,168,0.24)] transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-45"
        >
          {submitting ? '发布中…' : '发布'}
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

export function CmiBlackboard({
  autoOpenComposer = false,
  initialDraft,
}: {
  autoOpenComposer?: boolean;
  initialDraft?: Partial<BlackboardDraft>;
} = {}) {
  const { user, profile, loading: authLoading } = useAuth();
  const [activeFilter, setActiveFilter] = useState<BlackboardFilter>('all');
  const [posts, setPosts] = useState<BlackboardPost[]>([]);
  const [draft, setDraft] = useState<BlackboardDraft>(() => createEmptyDraft());
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [postsError, setPostsError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [contactPost, setContactPost] = useState<BlackboardPost | null>(null);

  useEffect(() => {
    let isMounted = true;

    setLoadingPosts(true);
    setPostsError(null);

    getBlackboardPosts()
      .then(records => {
        if (!isMounted) return;
        setPosts(records.map(mapBlackboardPost));
      })
      .catch(() => {
        if (!isMounted) return;
        setPostsError('一起出发加载失败，稍后再试。');
      })
      .finally(() => {
        if (!isMounted) return;
        setLoadingPosts(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!autoOpenComposer || !initialDraft) return;

    const nextDraft = {
      ...createEmptyDraft(),
      ...initialDraft,
    };

    setDraft(nextDraft);
    setActiveFilter(nextDraft.category);
    setComposerOpen(true);
  }, [
    autoOpenComposer,
    initialDraft?.category,
    initialDraft?.title,
    initialDraft?.body,
    initialDraft?.timeLabel,
    initialDraft?.locationLabel,
    initialDraft?.peopleLabel,
    initialDraft?.linkedEventId,
    initialDraft?.linkedEventTitle,
    initialDraft?.linkedPlaceName,
  ]);

  const visiblePosts = useMemo(() => {
    if (activeFilter === 'all') return posts;
    return posts.filter(post => post.category === activeFilter);
  }, [activeFilter, posts]);

  const handleCreatePost = async () => {
    if (authLoading || !user) {
      toast('登录后才能发布一起出发');
      return;
    }

    const title = draft.title.trim();
    const body = draft.body.trim();
    if (!title || !body) return;

    const authorName = profile?.user_name?.trim() || user.email?.split('@')[0] || 'CMI 朋友';

    setSubmitting(true);

    try {
      const record = await createBlackboardPost({
        category: draft.category,
        title,
        body,
        timeLabel: draft.timeLabel.trim() || '时间待定',
        locationLabel: draft.locationLabel.trim() || '地点待定',
        peopleLabel: draft.peopleLabel.trim() || '0',
        linkedEventId: draft.linkedEventId,
        linkedEventTitle: draft.linkedEventTitle,
        linkedPlaceName: draft.linkedPlaceName,
        authorId: user.id,
        authorName,
      });

      setPosts(currentPosts => [mapBlackboardPost(record), ...currentPosts]);
      setActiveFilter('all');
      setDraft(createEmptyDraft());
      setComposerOpen(false);
      toast.success('已发布到一起出发');
    } catch {
      toast.error('发布失败：没有写入数据库，请稍后再试');
    } finally {
      setSubmitting(false);
    }
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
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[0.9rem] bg-primary/10">
              <img src={BLACKBOARD_ICON_URL} alt="" className="h-9 w-9 object-contain" />
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
          {loadingPosts ? (
            <div className="rounded-[1.2rem] border border-dashed border-primary/20 bg-white/70 p-5 text-center">
              <p className="text-base font-black text-foreground">正在加载真实发布</p>
              <p className="mt-1 text-sm font-bold leading-relaxed text-muted-foreground">
                这里现在会读取 Supabase，不再只看本地缓存。
              </p>
            </div>
          ) : postsError ? (
            <div className="rounded-[1.2rem] border border-dashed border-destructive/30 bg-white/70 p-5 text-center">
              <p className="text-base font-black text-foreground">{postsError}</p>
            </div>
          ) : visiblePosts.length > 0 ? (
            visiblePosts.map(post => (
              <BlackboardPostCard key={post.id} post={post} onJoin={handleJoinPost} />
            ))
          ) : (
            <div className="rounded-[1.2rem] border border-dashed border-primary/20 bg-white/70 p-5 text-center">
              <p className="text-base font-black text-foreground">
                还没有真实发布
              </p>
              <p className="mt-1 text-sm font-bold leading-relaxed text-muted-foreground">
                有人发出发、求助或拼车后，会显示在这里。
              </p>
            </div>
          )}
        </div>
      </div>

      {composerOpen && (
        <ComposerSheet
          draft={draft}
          submitting={submitting}
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
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-[1rem] bg-primary/10">
          <img src={BLACKBOARD_ICON_URL} alt="" className="h-10 w-10 object-contain" />
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
          <p className="mt-2 text-[11px] font-black text-primary">
            只显示真实发布内容
          </p>
        </div>
      </button>
    </section>
  );
}

export function CmiBlackboardHomeCard({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      type="button"
      className="min-h-[124px] rounded-lg border-2 border-primary bg-[#fbfaff]/95 p-3 text-left text-foreground shadow-[3px_4px_0_rgba(0,0,0,0.16)] transition-transform active:translate-y-0.5 active:shadow-[2px_3px_0_rgba(0,0,0,0.14)]"
      onClick={onOpen}
      aria-label="打开一起出发看板"
    >
      <div className="mb-3 flex items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <img src={BLACKBOARD_ICON_URL} alt="" className="h-10 w-10 object-contain" />
        </div>
      </div>
      <p className="text-base font-black leading-tight">一起出发！</p>
      <p className="mt-1 line-clamp-2 text-xs font-semibold leading-snug text-muted-foreground">
        约搭子、求助、拼车。
      </p>
    </button>
  );
}
