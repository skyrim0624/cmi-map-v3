import { Calendar, Camera, Heart, List, Map, MapPin, Menu, MessageCircle, Navigation, Plus, Search, Share2, Users } from 'lucide-react';
import { type ReactNode, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import './cmi-map-v3-prototype.css';

type ScreenId = 'map' | 'feed' | 'publish' | 'events' | 'eventDetail';

interface FilterItem {
  id: string;
  label: string;
  iconUrl?: string;
}

interface MapPinItem {
  id: string;
  iconUrl: string;
  x: number;
  y: number;
  count?: number;
  selected?: boolean;
}

interface FeedItem {
  id: string;
  author: string;
  location: string;
  time: string;
  tag: string;
  title: string;
  body: string;
  tone?: 'paper' | 'yellow' | 'green' | 'pink';
  iconUrl?: string;
}

interface EventItem {
  id: string;
  timeLabel: string;
  title: string;
  body: string;
  imageUrl: string;
  tone?: 'paper' | 'green' | 'pink';
}

const mapFilters: FilterItem[] = [
  { id: 'all', label: '全部' },
  { id: 'food', label: '好吃', iconUrl: '/map-icons/cmi-flat-v2/direct-eat.png' },
  { id: 'play', label: '好玩', iconUrl: '/map-icons/cmi-flat-v2/direct-play.png' },
  { id: 'events', label: '活动', iconUrl: '/map-icons/cmi-flat-v2/home-events.png' },
  { id: 'easter', label: '彩蛋', iconUrl: '/map-icons/cmi-easter-v2/egg-v2-03-cat-face.png' },
];

const mapPins: MapPinItem[] = [
  { id: 'noodle', iconUrl: '/map-icons/cmi-flat-v2/direct-eat.png', x: 26, y: 24, selected: true },
  { id: 'coffee', iconUrl: '/map-icons/cmi-flat-v2/place-cafe.png', x: 63, y: 29, count: 6 },
  { id: 'cat', iconUrl: '/map-icons/cmi-easter-v2/egg-v2-03-cat-face.png', x: 80, y: 24 },
  { id: 'book', iconUrl: '/map-icons/cmi-flat-v2/place-bookstore.png', x: 18, y: 43, count: 2 },
  { id: 'event', iconUrl: '/map-icons/cmi-flat-v2/home-events.png', x: 48, y: 46, count: 11 },
  { id: 'camera', iconUrl: '/map-icons/cmi-easter-v2/egg-v2-22-camera.png', x: 74, y: 50, count: 4 },
  { id: 'flower', iconUrl: '/map-icons/cmi-easter-v2/egg-v2-07-flower.png', x: 29, y: 62, count: 9 },
  { id: 'coffee-easter', iconUrl: '/map-icons/cmi-easter-v2/egg-v2-32-coffee.png', x: 58, y: 69, count: 3 },
];

const feedItems: FeedItem[] = [
  {
    id: 'cat',
    author: '林可',
    location: '清迈客栈',
    time: '18 分钟前',
    tag: '彩蛋',
    title: '门口这只小猫今天主动过来蹭腿',
    body: '不是攻略，但如果你今天路过这里，可以蹲下来跟它打个招呼。',
    iconUrl: '/map-icons/cmi-easter-v2/egg-v2-03-cat-face.png',
  },
  {
    id: 'noodle',
    author: 'Andreas',
    location: '古城北门',
    time: '今天 16:20',
    tag: '好吃',
    title: '这碗小面适合一个人随便吃点',
    body: '不用写成长攻略，重点是便宜、快、老板不会催你。',
    tone: 'yellow',
  },
  {
    id: 'market',
    author: '清迈客栈',
    location: 'CMI 院子',
    time: '周日晚',
    tag: '活动',
    title: '周末旧物交换市场开放报名',
    body: '带一个你用不上、但别人可能刚好需要的东西来。',
    tone: 'green',
    iconUrl: '/map-icons/cmi-flat-v2/home-events.png',
  },
];

const eventItems: EventItem[] = [
  {
    id: 'codex',
    timeLabel: '周日 14:00',
    title: 'Codex 轻造物局',
    body: '在清迈客栈现场做出一个可演示的小作品。',
    imageUrl: '/cmi-home/event-card-backgrounds/cmi-waytoagi-codex-maker-lab-2026-05-31.jpg',
  },
  {
    id: 'mindfulness',
    timeLabel: '周四 19:30',
    title: '正念一小时',
    body: '围绕焦虑、变化和内在稳定感的一小时练习。',
    imageUrl: '/cmi-home/event-card-backgrounds/cmi-mindfulness-hour-2026-05-28.jpg',
    tone: 'green',
  },
  {
    id: 'swap',
    timeLabel: '已结束',
    title: '旧物交换市场',
    body: '结束后继续沉淀照片、留言和地图路线。',
    imageUrl: '/cmi-home/event-card-backgrounds/cmi-swap-market-2026-05-24.jpg',
    tone: 'pink',
  },
];

const visibilityOptions = ['CMI 社区', '公开', '活动内', '仅链接'];
const screenIds: ScreenId[] = ['map', 'feed', 'publish', 'events', 'eventDetail'];

function resolveScreenId(value: string | null): ScreenId {
  return screenIds.find(screen => screen === value) ?? 'map';
}

export default function CmiMapV3Prototype() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeScreen, setActiveScreen] = useState<ScreenId>(() => resolveScreenId(searchParams.get('screen')));
  const handleNavigate = (screen: ScreenId) => {
    setActiveScreen(screen);
    setSearchParams(screen === 'map' ? {} : { screen }, { replace: true });
  };

  return (
    <div className={`cmi-v3-screen cmi-v3-screen--${activeScreen}`}>
      {activeScreen === 'map' && <MapMode onNavigate={handleNavigate} />}
      {activeScreen === 'feed' && <FeedMode onNavigate={handleNavigate} />}
      {activeScreen === 'publish' && <PublishMode onNavigate={handleNavigate} />}
      {activeScreen === 'events' && <EventsMode onNavigate={handleNavigate} />}
      {activeScreen === 'eventDetail' && <EventDetailMode onNavigate={handleNavigate} />}
    </div>
  );
}

function MapMode({ onNavigate }: { onNavigate: (screen: ScreenId) => void }) {
  return (
    <section className="cmi-v3-map-mode" aria-label="CMI Map 3.0 地图形态页">
      <div className="cmi-v3-map-canvas">
        <div className="cmi-v3-river" />
      </div>

      <header className="cmi-v3-map-topbar">
        <button type="button" className="cmi-v3-map-brand" onClick={() => onNavigate('feed')}>
          CMI Map
        </button>
        <button type="button" className="cmi-v3-map-search" onClick={() => onNavigate('feed')}>
          <Search size={16} strokeWidth={3} />
          <span>搜动态 / 地点</span>
        </button>
        <button type="button" className="cmi-v3-round-button" onClick={() => onNavigate('feed')} aria-label="打开信息流">
          <List size={20} strokeWidth={3} />
        </button>
      </header>

      <div className="cmi-v3-map-filters" aria-label="地图筛选">
        {mapFilters.map(filter => (
          <button key={filter.id} type="button" className={`cmi-v3-map-filter ${filter.id === 'all' ? 'is-active' : ''}`}>
            {filter.iconUrl && <img src={filter.iconUrl} alt="" />}
            <span>{filter.label}</span>
          </button>
        ))}
      </div>

      <div className="cmi-v3-map-pins" aria-label="地图点位">
        {mapPins.map(pin => (
          <button
            key={pin.id}
            type="button"
            className={`cmi-v3-map-pin ${pin.selected ? 'is-selected' : ''}`}
            style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
            onClick={() => onNavigate(pin.id === 'event' ? 'eventDetail' : 'feed')}
            aria-label={`打开${pin.id}点位`}
          >
            <img src={pin.iconUrl} alt="" />
            {pin.count && <span>{`+${pin.count}`}</span>}
          </button>
        ))}
      </div>

      <article className="cmi-v3-selected-note">
        <img src="/cmi-home/checkin-yard-table.jpg" alt="清迈客栈院子桌子" />
        <div>
          <h2>下午五点，院子这张桌子刚好有风</h2>
          <p>阿祺 · 清迈客栈附近 · 12 分钟前</p>
        </div>
      </article>

      <footer className="cmi-v3-map-bottom">
        <button type="button" onClick={() => onNavigate('feed')}>
          <Navigation size={18} strokeWidth={3} />
          动态
        </button>
        <button type="button" onClick={() => onNavigate('publish')}>
          <Plus size={22} strokeWidth={3} />
          留个彩蛋
        </button>
      </footer>
    </section>
  );
}

function FeedMode({ onNavigate }: { onNavigate: (screen: ScreenId) => void }) {
  return (
    <ComicPage title="CMI Map" actionLabel="地图" onTitleClick={() => onNavigate('map')} onActionClick={() => onNavigate('map')}>
      <div className="cmi-v3-mode-switch">
        <button type="button" className="is-active">动态</button>
        <button type="button" onClick={() => onNavigate('events')}>活动</button>
      </div>

      <section className="cmi-v3-hard-card cmi-v3-feed-hero cmi-v3-dot-paper">
        <ChapterHeader left="Today in Chiang Mai" right="CMI Community Feed" />
        <img src="/cmi-home/yard-scene.jpg" alt="清迈客栈院子" />
        <h1>今天清迈发生了什么</h1>
        <p>附近的人留下了新的吃饭、散步、活动和小发现。</p>
      </section>

      {feedItems.map(item => (
        <article key={item.id} className={`cmi-v3-feed-card cmi-v3-feed-card--${item.tone ?? 'paper'}`}>
          <div className="cmi-v3-feed-head">
            <span className="cmi-v3-avatar">{item.iconUrl ? <img src={item.iconUrl} alt="" /> : item.author.slice(0, 1)}</span>
            <div>
              <strong>{item.author}</strong>
              <span>{`${item.location} · ${item.time}`}</span>
            </div>
            <em>{item.tag}</em>
          </div>
          <h2>{item.title}</h2>
          <p>{item.body}</p>
          <div className="cmi-v3-card-actions">
            <button type="button" onClick={() => onNavigate('map')}><MapPin size={14} strokeWidth={3} />在地图看</button>
            <button type="button"><Heart size={14} strokeWidth={3} />想去</button>
            <button type="button"><MessageCircle size={14} strokeWidth={3} />评论</button>
          </div>
        </article>
      ))}
      <button type="button" className="cmi-v3-floating-create" onClick={() => onNavigate('publish')}>
        <Plus size={22} strokeWidth={3} />
      </button>
    </ComicPage>
  );
}

function PublishMode({ onNavigate }: { onNavigate: (screen: ScreenId) => void }) {
  return (
    <ComicPage title="留个彩蛋" actionLabel="存草稿" onTitleClick={() => onNavigate('feed')} onActionClick={() => onNavigate('feed')} footer={
      <div className="cmi-v3-fixed-footer">
        <button type="button" onClick={() => onNavigate('feed')}>预览</button>
        <button type="button" className="is-primary" onClick={() => onNavigate('map')}>发布到地图</button>
      </div>
    }>
      <section className="cmi-v3-hard-card cmi-v3-publish-panel cmi-v3-dot-paper">
        <ChapterHeader left="New Moment" right="Place Required" />
        <h1>记录此刻</h1>
        <p>先把这件小事留下来，分类和整理可以以后再说。</p>

        <button type="button" className="cmi-v3-photo-uploader">
          <Camera size={36} strokeWidth={2.8} />
          <strong>添加照片</strong>
          <span>拍照 / 相册 / 活动返图</span>
        </button>

        <FormCard label="一句话">
          <p className="cmi-v3-field-value">这家店的 khao soi 好吃到我沉默。</p>
        </FormCard>

        <FormCard label="地点">
          <div className="cmi-v3-place-row">
            <div>
              <strong>清迈古城北门附近</strong>
              <span>自动定位 · 可改成模糊位置</span>
            </div>
            <button type="button">修改</button>
          </div>
        </FormCard>

        <FormCard label="谁能看">
          <div className="cmi-v3-visibility-grid">
            {visibilityOptions.map((option, index) => (
              <button key={option} type="button" className={index === 0 ? 'is-active' : undefined}>{option}</button>
            ))}
          </div>
        </FormCard>
      </section>
    </ComicPage>
  );
}

function EventsMode({ onNavigate }: { onNavigate: (screen: ScreenId) => void }) {
  return (
    <ComicPage title="活动" actionLabel="+ 发布" onTitleClick={() => onNavigate('feed')} onActionClick={() => onNavigate('publish')}>
      <section className="cmi-v3-hard-card cmi-v3-events-hero cmi-v3-dot-paper">
        <ChapterHeader left="CMI Events" right="what is happening" />
        <h1>最近可以去哪儿</h1>
        <p>活动不是公告板，是社区共同记忆的入口。</p>
        <div className="cmi-v3-event-tabs">
          {['正在发生', '即将开始', '刚结束', '我参加的'].map((tab, index) => (
            <button key={tab} type="button" className={index === 0 ? 'is-active' : undefined}>{tab}</button>
          ))}
        </div>
      </section>

      {eventItems.map(event => (
        <article key={event.id} className={`cmi-v3-event-card cmi-v3-feed-card--${event.tone ?? 'paper'}`}>
          <img src={event.imageUrl} alt={event.title} />
          <div>
            <span>{event.timeLabel}</span>
            <h2>{event.title}</h2>
            <p>{event.body}</p>
            <div className="cmi-v3-card-actions">
              <button type="button" onClick={() => onNavigate('eventDetail')}>报名</button>
              <button type="button" onClick={() => onNavigate('map')}>地图</button>
            </div>
          </div>
        </article>
      ))}
    </ComicPage>
  );
}

function EventDetailMode({ onNavigate }: { onNavigate: (screen: ScreenId) => void }) {
  return (
    <ComicPage title="活动详情" actionLabel="分享" onTitleClick={() => onNavigate('events')} onActionClick={() => onNavigate('feed')} footer={
      <div className="cmi-v3-fixed-footer">
        <button type="button" onClick={() => onNavigate('map')}>在地图看</button>
        <button type="button" className="is-primary" onClick={() => onNavigate('events')}>报名参加</button>
      </div>
    }>
      <section className="cmi-v3-hard-card cmi-v3-feed-hero cmi-v3-dot-paper">
        <ChapterHeader left="Chapter Event" right="CMI Inn" />
        <img className="cmi-v3-detail-poster" src="/cmi-home/event-card-backgrounds/cmi-waytoagi-codex-maker-lab-2026-05-31.jpg" alt="Codex 轻造物局" />
        <h1>Codex 轻造物局</h1>
        <p>大家在同一个空间里，把想法快速做成一个可以看的东西。</p>
      </section>

      <div className="cmi-v3-detail-meta">
        <MetaRow icon={<Calendar size={20} strokeWidth={3} />} title="周日 14:00 - 17:30" body="开始前 2 小时提醒" />
        <MetaRow icon={<MapPin size={20} strokeWidth={3} />} title="清迈客栈院子" body="点开可以直接回到地图" />
        <MetaRow icon={<Users size={20} strokeWidth={3} />} title="已报名 18 人" body="活动内动态仅参与者可见" />
      </div>

      <article className="cmi-v3-feed-card cmi-v3-feed-card--paper">
        <div className="cmi-v3-feed-head">
          <span className="cmi-v3-avatar"><Camera size={18} strokeWidth={3} /></span>
          <div>
            <strong>活动动态</strong>
            <span>返图、提问、现场记录都会进这里</span>
          </div>
          <em>12 条</em>
        </div>
        <div className="cmi-v3-photo-grid">
          <img src="/cmi-home/checkin-yard-table.jpg" alt="活动现场桌子" />
          <img src="/cmi-home/checkin-doorway.jpg" alt="活动现场门口" />
        </div>
      </article>
    </ComicPage>
  );
}

function ComicPage({
  title,
  actionLabel,
  children,
  footer,
  onTitleClick,
  onActionClick,
}: {
  title: string;
  actionLabel: string;
  children: ReactNode;
  footer?: ReactNode;
  onTitleClick: () => void;
  onActionClick: () => void;
}) {
  return (
    <section className="cmi-v3-comic-page">
      <span className="cmi-v3-bg-ring cmi-v3-bg-ring--left" />
      <span className="cmi-v3-bg-ring cmi-v3-bg-ring--right" />
      <header className="cmi-v3-comic-topbar">
        <button type="button" className="cmi-v3-comic-brand" onClick={onTitleClick}>{title}</button>
        <button type="button" className="cmi-v3-comic-action" onClick={onActionClick}>
          {actionLabel === '分享' ? <Share2 size={18} strokeWidth={3} /> : actionLabel === '地图' ? <Map size={18} strokeWidth={3} /> : <Menu size={18} strokeWidth={3} />}
          <span>{actionLabel}</span>
        </button>
      </header>
      <div className="cmi-v3-comic-scroll">
        {children}
      </div>
      {footer}
    </section>
  );
}

function ChapterHeader({ left, right }: { left: string; right: string }) {
  return (
    <div className="cmi-v3-chapter-row">
      <span>{left}</span>
      <span>{right}</span>
    </div>
  );
}

function FormCard({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="cmi-v3-form-card">
      <p>{label}</p>
      {children}
    </div>
  );
}

function MetaRow({ icon, title, body }: { icon: ReactNode; title: string; body: string }) {
  return (
    <div className="cmi-v3-meta-row">
      <span>{icon}</span>
      <div>
        <strong>{title}</strong>
        <em>{body}</em>
      </div>
    </div>
  );
}
