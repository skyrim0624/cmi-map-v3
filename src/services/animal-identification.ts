import { compressImage } from '@/utils/imageCompression';

export interface AnimalIdentificationCandidate {
  id: string;
  nameZh: string;
  nameEn: string;
  scientificName?: string;
  score: number;
  rawLabel: string;
  source?: 'detection' | 'classification' | 'vision';
  taxonRank?: string;
  iconId?: string;
}

export interface AnimalIdentificationResult {
  status: 'ready' | 'no-match' | 'unavailable' | 'error';
  provider?: string;
  elapsedMs?: number;
  candidates: AnimalIdentificationCandidate[];
  message?: string;
}

const ANIMAL_IDENTIFICATION_ENDPOINT = '/api/animal-identify';

const fallbackScientificNames: Record<string, string> = {
  dog: 'Canis lupus familiaris',
  cat: 'Felis catus',
  'tokay-gecko': 'Gekko gecko',
  bird: 'Aves',
  butterfly: 'Lepidoptera',
  fish: 'Actinopterygii',
  snake: 'Serpentes',
  frog: 'Anura',
  insect: 'Insecta',
  squirrel: 'Sciuridae',
};

const fallbackChineseNames: Record<string, string> = {
  dog: '家犬',
  cat: '家猫',
  'tokay-gecko': '大壁虎',
  bird: '鸟类',
  butterfly: '蝴蝶',
  fish: '鱼类',
  snake: '蛇类',
  frog: '蛙类',
  insect: '昆虫',
  squirrel: '松鼠',
};

export const getAnimalScientificName = (candidate: AnimalIdentificationCandidate) =>
  candidate.scientificName?.trim() || fallbackScientificNames[candidate.id] || candidate.nameEn || candidate.rawLabel;

export const getAnimalChineseName = (candidate: AnimalIdentificationCandidate) =>
  candidate.nameZh?.trim() || fallbackChineseNames[candidate.id] || getAnimalScientificName(candidate);

export const formatAnimalCandidateLabel = (candidate: AnimalIdentificationCandidate) =>
  getAnimalChineseName(candidate);

const isSpeciesLevelRank = (rank: string | undefined) => rank === 'SPECIES' || rank === 'SUBSPECIES';

export const buildAnimalCandidateDescription = (candidate: AnimalIdentificationCandidate) => {
  const chineseName = getAnimalChineseName(candidate);
  if (isSpeciesLevelRank(candidate.taxonRank) || candidate.source === 'vision') {
    return `这是${chineseName}。`;
  }

  return `识别到${chineseName}，需要更近照片才能定到具体物种。`;
};

export const identifyAnimalPhoto = async (file: File): Promise<AnimalIdentificationResult> => {
  const uploadFile = await compressImage(file, {
    maxSizeMB: 0.9,
    maxWidthOrHeight: 768,
    quality: 0.72,
    force: true,
    outputType: 'image/jpeg',
  });

  const formData = new FormData();
  formData.append('image', uploadFile, 'animal-checkin.jpg');

  const response = await fetch(ANIMAL_IDENTIFICATION_ENDPOINT, {
    method: 'POST',
    body: formData,
  });

  const data = await response.json().catch(() => null) as AnimalIdentificationResult | null;

  if (!response.ok || !data) {
    return {
      status: 'error',
      candidates: [],
      message: data?.message ?? '识别失败',
    };
  }

  return data;
};
