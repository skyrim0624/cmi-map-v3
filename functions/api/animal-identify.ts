const MODEL_ID = '@cf/microsoft/resnet-50';
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

type AiBinding = {
  run: (
    model: string,
    input: { image: number[] }
  ) => Promise<Array<{ label?: string; score?: number }>>;
};

type PagesContext = {
  request: Request;
  env: {
    AI?: AiBinding;
  };
};

interface AnimalCandidate {
  id: string;
  nameZh: string;
  nameEn: string;
  scientificName?: string;
  score: number;
  rawLabel: string;
  iconId?: string;
}

const animalMatchers: Array<{
  id: string;
  nameZh: string;
  nameEn: string;
  scientificName?: string;
  iconId?: string;
  keywords: string[];
}> = [
  {
    id: 'tokay-gecko',
    nameZh: '大壁虎',
    nameEn: 'Tokay gecko',
    scientificName: 'Gekko gecko',
    iconId: 'egg-v2-37-gecko',
    keywords: ['gecko', 'lizard', 'agama', 'iguana', 'chameleon'],
  },
  {
    id: 'cat',
    nameZh: '猫',
    nameEn: 'Cat',
    iconId: 'egg-v2-03-cat-face',
    keywords: ['cat', 'tabby', 'tiger cat', 'egyptian cat', 'persian cat', 'siamese'],
  },
  {
    id: 'dog',
    nameZh: '狗',
    nameEn: 'Dog',
    iconId: 'egg-v2-05-dog-face',
    keywords: ['dog', 'hound', 'terrier', 'retriever', 'poodle', 'chihuahua', 'spaniel', 'shepherd'],
  },
  {
    id: 'bird',
    nameZh: '鸟',
    nameEn: 'Bird',
    iconId: 'egg-v2-38-bird',
    keywords: ['bird', 'bulbul', 'sparrow', 'parrot', 'kingfisher', 'hornbill', 'drongo', 'myna', 'jay'],
  },
  {
    id: 'butterfly',
    nameZh: '蝴蝶',
    nameEn: 'Butterfly',
    iconId: 'egg-v2-36-butterfly',
    keywords: ['butterfly', 'monarch', 'sulphur butterfly', 'ringlet'],
  },
  {
    id: 'fish',
    nameZh: '鱼',
    nameEn: 'Fish',
    iconId: 'egg-v2-39-fish',
    keywords: ['fish', 'goldfish', 'tench', 'eel', 'ray'],
  },
  {
    id: 'snake',
    nameZh: '蛇',
    nameEn: 'Snake',
    keywords: ['snake', 'cobra', 'viper', 'python', 'boa'],
  },
  {
    id: 'frog',
    nameZh: '蛙',
    nameEn: 'Frog',
    keywords: ['frog', 'toad', 'tree frog', 'bullfrog'],
  },
  {
    id: 'insect',
    nameZh: '昆虫',
    nameEn: 'Insect',
    keywords: ['bee', 'ant', 'beetle', 'grasshopper', 'cricket', 'mantis', 'dragonfly', 'damselfly', 'fly'],
  },
  {
    id: 'squirrel',
    nameZh: '松鼠',
    nameEn: 'Squirrel',
    keywords: ['squirrel'],
  },
];

const jsonResponse = (body: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(body), {
    ...init,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      ...init.headers,
    },
  });

const normalizeLabel = (label: string) => label.toLocaleLowerCase();

const findAnimalMatch = (label: string) => {
  const normalizedLabel = normalizeLabel(label);
  return animalMatchers.find(item => item.keywords.some(keyword => normalizedLabel.includes(keyword)));
};

const toCandidate = (prediction: { label?: string; score?: number }): AnimalCandidate | null => {
  const label = prediction.label?.trim();
  const score = typeof prediction.score === 'number' ? prediction.score : 0;
  if (!label || score <= 0) return null;

  const match = findAnimalMatch(label);
  if (!match) return null;

  return {
    id: match.id,
    nameZh: match.nameZh,
    nameEn: match.nameEn,
    scientificName: match.scientificName,
    score,
    rawLabel: label,
    iconId: match.iconId,
  };
};

const uniqueCandidates = (candidates: AnimalCandidate[]) => {
  const bestById = new Map<string, AnimalCandidate>();

  for (const candidate of candidates) {
    const current = bestById.get(candidate.id);
    if (!current || candidate.score > current.score) {
      bestById.set(candidate.id, candidate);
    }
  }

  return [...bestById.values()].sort((left, right) => right.score - left.score).slice(0, 3);
};

export const onRequestPost = async ({ request, env }: PagesContext) => {
  const startedAt = Date.now();

  if (!env.AI) {
    return jsonResponse({
      status: 'unavailable',
      provider: 'cloudflare-workers-ai',
      candidates: [],
      message: '识别服务暂时不可用',
    }, { status: 503 });
  }

  const formData = await request.formData();
  const image = formData.get('image');

  if (!(image instanceof File) || !image.type.startsWith('image/')) {
    return jsonResponse({ status: 'error', candidates: [], message: '需要上传图片' }, { status: 400 });
  }

  if (image.size > MAX_IMAGE_BYTES) {
    return jsonResponse({ status: 'error', candidates: [], message: '图片太大，请重新拍一张' }, { status: 413 });
  }

  const bytes = new Uint8Array(await image.arrayBuffer());
  const predictions = await env.AI.run(MODEL_ID, { image: [...bytes] });
  const candidates = uniqueCandidates(predictions.map(toCandidate).filter((item): item is AnimalCandidate => Boolean(item)));

  return jsonResponse({
    status: candidates.length > 0 ? 'ready' : 'no-match',
    provider: MODEL_ID,
    elapsedMs: Date.now() - startedAt,
    candidates,
    rawLabels: predictions.slice(0, 5),
  });
};
