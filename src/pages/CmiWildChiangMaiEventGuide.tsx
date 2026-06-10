import { ArrowLeft } from 'lucide-react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { CMI_MAP_WILD_CHIANG_MAI_EVENT_ID } from '@/data/cmi-events';
import { getCmiEventPath } from '@/lib/paths';

const decodeRouteParam = (value: string | undefined) => {
  if (!value) return '';

  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

const playSteps = [
  ['1', '发现一只动物', '猫、鸟、壁虎、蝴蝶、昆虫都可以。'],
  ['2', '拍下它', '不用专业，真实遇见就好。'],
  ['3', '在 CMI MAP 打卡', '选择地点，上传照片，带上活动主题。'],
  ['4', '写一句发现记录', '说说你在哪里遇见了它。'],
];

const examples = ['街边的猫', '树上的鸟', '墙上的壁虎', '花里的蝴蝶', '雨后的昆虫'];

export default function CmiWildChiangMaiEventGuide() {
  const navigate = useNavigate();
  const { eventId: eventIdParam } = useParams();
  const eventId = decodeRouteParam(eventIdParam);
  const eventPath = getCmiEventPath(CMI_MAP_WILD_CHIANG_MAI_EVENT_ID);

  if (eventId !== CMI_MAP_WILD_CHIANG_MAI_EVENT_ID) {
    return <Navigate to={eventPath} replace />;
  }

  return (
    <div className="min-h-[100dvh] bg-white text-[#111827]">
      <main className="mx-auto min-h-[100dvh] max-w-[520px] overflow-hidden bg-[#07934d]">
        <section className="relative px-6 pb-10 pt-6">
          <div className="pointer-events-none absolute left-4 top-12 h-12 w-12 rotate-[-18deg] bg-[#ff8bb9] [clip-path:polygon(50%_0,61%_34%,98%_35%,68%_57%,79%_91%,50%_70%,21%_91%,32%_57%,2%_35%,39%_34%)]" />
          <div className="pointer-events-none absolute right-5 top-20 h-5 w-16 rotate-[12deg] rounded-full bg-[#ffe733]" />

          <Button
            className="relative z-10 h-10 rounded-none border-[3px] border-[#111827] bg-[#ffe733] px-3 text-xs font-black text-[#111827] shadow-[3px_4px_0_rgba(17,24,39,0.2)]"
            onClick={() => navigate(eventPath)}
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            返回活动
          </Button>

          <div className="relative mt-6 bg-[#fff7dc] px-5 py-7 shadow-[9px_10px_0_rgba(4,62,34,0.32)] [clip-path:polygon(0_2%,21%_0,45%_2%,66%_0,100%_3%,98%_96%,74%_99%,49%_97%,25%_100%,2%_97%)]">
            <div className="absolute -right-3 top-7 h-12 w-20 rotate-[10deg] bg-[#ff8bb9]/80" />
            <p className="relative inline-block -rotate-2 border-[2px] border-[#111827] bg-[#ffe733] px-4 py-2 text-sm font-black text-[#111827] shadow-[4px_5px_0_rgba(17,24,39,0.16)]">
              活动说明
            </p>
            <h1 className="relative mt-5 text-[2.7rem] font-black leading-[0.98] tracking-normal text-[#111827]">
              神奇动物
              <br />
              在哪里
            </h1>
            <p className="relative mt-5 border-l-[6px] border-[#0b8d45] pl-3 text-base font-black leading-relaxed text-[#243447]">
              清迈不只有人、咖啡和寺庙。还有很多小小的生命，藏在街角、树上、墙边、草丛里。
            </p>
          </div>

          <section className="relative mt-9 bg-[#fff7dc] px-4 pb-6 pt-6 shadow-[8px_9px_0_rgba(4,62,34,0.28)] [clip-path:polygon(0_0,28%_2%,52%_0,76%_3%,100%_1%,98%_97%,78%_95%,55%_100%,31%_96%,0_99%)]">
            <h2 className="inline-block -rotate-2 border-[2px] border-[#111827] bg-[#ff8bb9] px-3 py-2 text-[1.7rem] font-black leading-tight text-[#111827] shadow-[4px_5px_0_rgba(17,24,39,0.14)]">
              怎么玩
            </h2>
            <div className="mt-5 space-y-3">
              {playSteps.map(([number, title, text], index) => (
                <article
                  key={number}
                  className={[
                    'grid grid-cols-[2.25rem_minmax(0,1fr)] gap-3 border-[2px] border-[#111827] bg-white p-3 shadow-[4px_5px_0_rgba(17,24,39,0.14)]',
                    index % 2 === 0 ? 'rotate-[0.7deg]' : 'rotate-[-0.7deg]',
                  ].join(' ')}
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0b8d45] text-base font-black text-white shadow-[2px_3px_0_rgba(17,24,39,0.2)]">
                    {number}
                  </span>
                  <span>
                    <strong className="block text-base font-black text-[#111827]">{title}</strong>
                    <span className="mt-1 block text-sm font-semibold leading-snug text-[#384252]">{text}</span>
                  </span>
                </article>
              ))}
            </div>
          </section>

          <section className="relative mt-9 bg-[#fff7dc] px-4 py-6 shadow-[8px_9px_0_rgba(4,62,34,0.28)] [clip-path:polygon(0_3%,24%_0,52%_3%,78%_1%,100%_4%,98%_96%,70%_98%,47%_96%,24%_100%,1%_97%)]">
            <h2 className="inline-block rotate-1 border-[2px] border-[#111827] bg-[#ffe733] px-3 py-2 text-[1.55rem] font-black leading-tight text-[#111827] shadow-[4px_5px_0_rgba(17,24,39,0.14)]">
              什么算神奇动物
            </h2>
            <p className="mt-5 text-base font-black leading-relaxed text-[#243447]">
              不一定稀有。只要它让你停下来多看了一眼，就算。
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {examples.map(example => (
                <span key={example} className="border-[2px] border-[#111827] bg-white px-3 py-1 text-sm font-black text-[#111827] shadow-[2px_3px_0_rgba(17,24,39,0.12)]">
                  {example}
                </span>
              ))}
            </div>
          </section>

          <section className="relative mt-9 grid gap-4">
            <article className="border-[2px] border-[#111827] bg-white p-4 shadow-[5px_6px_0_rgba(4,62,34,0.3)]">
              <h2 className="text-xl font-black text-[#111827]">排行榜怎么算？</h2>
              <p className="mt-2 text-sm font-semibold leading-relaxed text-[#384252]">
                发布活动打卡越多，捕获次数越多。排行榜会自动更新。
              </p>
            </article>
            <article className="border-[2px] border-[#111827] bg-white p-4 shadow-[5px_6px_0_rgba(4,62,34,0.3)]">
              <h2 className="text-xl font-black text-[#111827]">怎么分享？</h2>
              <p className="mt-2 text-sm font-semibold leading-relaxed text-[#384252]">
                打卡后，可以生成分享卡片。告诉朋友：我在清迈发现了一只神奇动物。
              </p>
            </article>
          </section>

          <section className="relative mt-9 border-[2px] border-[#111827] bg-[#ffe733] px-5 py-5 text-[#111827] shadow-[6px_7px_0_rgba(4,62,34,0.28)] [clip-path:polygon(0_10%,100%_0,98%_88%,72%_94%,50%_90%,28%_100%,2%_90%)]">
            <h2 className="text-xl font-black">小提醒</h2>
            <p className="mt-2 text-sm font-black leading-relaxed">
              不惊吓、不追赶、不触碰、不投喂。我们只记录相遇，不打扰它们。
            </p>
          </section>
        </section>
      </main>
    </div>
  );
}
