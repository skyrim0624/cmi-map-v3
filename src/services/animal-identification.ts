import { compressImage } from '@/utils/imageCompression';

export interface AnimalIdentificationCandidate {
  id: string;
  nameZh: string;
  nameEn: string;
  scientificName?: string;
  score: number;
  rawLabel: string;
  source?: 'detection' | 'classification';
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

export const formatAnimalCandidateLabel = (candidate: AnimalIdentificationCandidate) => (
  candidate.scientificName
    ? `${candidate.nameZh} / ${candidate.nameEn}`
    : candidate.nameZh
);

export const buildAnimalCandidateDescription = (candidate: AnimalIdentificationCandidate) => (
  candidate.scientificName
    ? `这是${candidate.nameZh}（${candidate.scientificName}）。`
    : `这是${candidate.nameZh}。`
);

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
