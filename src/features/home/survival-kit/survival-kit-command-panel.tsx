import { ArrowRight, Search } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import {
  CMI_SURVIVAL_KIT_ITEMS,
  type CmiSurvivalKitItemId,
} from '@/data/cmi-survival-kit';
import { SurvivalGuideEntryCard } from '@/features/home/survival-kit/survival-guide-library';
import { getSceneListPath } from '@/lib/paths';

interface HomeSurvivalKitCommandPanelProps {
  onFeatureSelect: (path: string) => void;
}

const HOME_SURVIVAL_LABELS: Record<CmiSurvivalKitItemId, string> = {
  'sim-internet': '电话卡',
  'cash-exchange': '换钱',
  'motorbike-transport': '租摩托',
  pharmacy: '买药',
  'clinic-hospital': '看医生',
  'visa-documents': '签证',
  'print-copy': '打印',
  'laundry-supplies': '洗衣',
  'daily-restock': '日用品',
  'haircut-care': '理发',
};

const HOME_SURVIVAL_QUERY_KEYWORDS: Record<CmiSurvivalKitItemId, string[]> = {
  'sim-internet': ['电话卡', '手机卡', '上网', '网络', '流量', 'sim', 'esim', 'ais', 'true'],
  'cash-exchange': ['换钱', '换汇', '取钱', '取现', '现金', '泰铢', 'atm', 'exchange'],
  'motorbike-transport': ['租摩托', '摩托', '租车', '交通', '出行', 'grab', '双条车'],
  pharmacy: ['买药', '药店', '药', '感冒', '肠胃', '过敏', 'pharmacy'],
  'clinic-hospital': ['看医生', '医生', '诊所', '医院', '看病', '牙科', '发烧', 'clinic', 'hospital'],
  'visa-documents': ['签证', '文件', '证件照', 'tm30', '移民局'],
  'print-copy': ['打印', '复印', '扫描', '证件照', '文件', 'print', 'copy', 'scan'],
  'laundry-supplies': ['洗衣', '干洗', '洗衣店', 'laundry', 'laundromat'],
  'daily-restock': ['日用品', '超市', '饮用水', '补货', '便利店', '转换插头', 'water', 'supermarket'],
  'haircut-care': ['理发', '剪头发', '剪头', '头发', 'barber', 'haircut'],
};

const resolveSurvivalQuery = (query: string) => {
  const normalizedQuery = query.trim().toLocaleLowerCase();

  return CMI_SURVIVAL_KIT_ITEMS.find(item =>
    HOME_SURVIVAL_QUERY_KEYWORDS[item.id].some(keyword =>
      normalizedQuery.includes(keyword.toLocaleLowerCase())
    )
  );
};

export function HomeSurvivalKitCommandPanel({
  onFeatureSelect,
}: HomeSurvivalKitCommandPanelProps) {
  const [query, setQuery] = useState('');
  const [searchStateLabel, setSearchStateLabel] = useState('直接说一句');

  const openSurvivalItem = (itemId: CmiSurvivalKitItemId) => {
    onFeatureSelect(getSceneListPath('life-rescue', { filterId: itemId }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const match = resolveSurvivalQuery(query);
    if (!match) {
      setSearchStateLabel('先打开生存地图');
      onFeatureSelect(getSceneListPath('life-rescue'));
      return;
    }

    setSearchStateLabel(`已匹配：${HOME_SURVIVAL_LABELS[match.id]}`);
    openSurvivalItem(match.id);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-2" aria-label="清迈生存包常用问题">
        {CMI_SURVIVAL_KIT_ITEMS.map(item => (
          <button
            key={item.id}
            type="button"
            title={item.title}
            className="flex min-h-[108px] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-foreground bg-[#fbfbf8] px-1.5 text-center shadow-[2px_2px_0_#000] hover:translate-y-[-1px] hover:shadow-[3px_3px_0_#000] active:translate-y-[1px] active:shadow-[1px_1px_0_#000] transition-all touch-manipulation"
            onClick={() => openSurvivalItem(item.id)}
          >
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-background p-1 border border-foreground/10">
              <img
                src={item.iconUrl}
                alt=""
                className="h-full w-full object-contain drop-shadow-sm"
              />
            </span>
            <span className="w-full truncate text-[12px] font-black leading-tight text-foreground">
              {HOME_SURVIVAL_LABELS[item.id]}
            </span>
          </button>
        ))}
      </div>

      <form
        className="rounded-2xl border-2 border-foreground bg-[#fdfdfb] p-2 shadow-[3px_3px_0_rgba(0,0,0,0.15)]"
        onSubmit={handleSubmit}
      >
        <p className="mb-1 px-1 text-[11px] font-black text-[#5a5a54]">
          {searchStateLabel}
        </p>
        <label className="flex min-h-12 items-center gap-2 rounded-xl border border-foreground/35 bg-background px-3 focus-within:border-foreground transition-colors">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={2.4} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
            className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-foreground outline-none placeholder:text-muted-foreground"
            placeholder="我要买药 / 要换钱 / 想租摩托"
            aria-label="输入你现在要解决什么生活问题"
          />
          <button
            type="submit"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border-2 border-foreground bg-primary text-primary-foreground transition-transform active:scale-[0.94] shadow-[1px_1.5px_0_#000]"
            aria-label="匹配生存包分类"
          >
            <ArrowRight className="h-4 w-4" strokeWidth={3} />
          </button>
        </label>
      </form>

      <SurvivalGuideEntryCard onOpen={() => onFeatureSelect('/survival-guides')} />
    </div>
  );
}
