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

export const getAnimalScientificName = (candidate: AnimalIdentificationCandidate) =>
  candidate.scientificName?.trim() || fallbackScientificNames[candidate.id] || candidate.nameEn || candidate.rawLabel;

export const formatAnimalCandidateLabel = (candidate: AnimalIdentificationCandidate) =>
  getAnimalScientificName(candidate);

const isSpeciesLevelRank = (rank: string | undefined) => rank === 'SPECIES' || rank === 'SUBSPECIES';

export const buildAnimalCandidateDescription = (candidate: AnimalIdentificationCandidate) => {
  const scientificName = getAnimalScientificName(candidate);
  if (isSpeciesLevelRank(candidate.taxonRank) || candidate.source === 'vision') {
    return `这是 ${scientificName}。`;
  }

  return `识别到 ${scientificName}，需要更近照片才能定到具体物种。`;
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
