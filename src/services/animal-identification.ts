import { compressImage } from '@/utils/imageCompression';

export interface AnimalIdentificationCandidate {
  id: string;
  nameZh: string;
  nameEn: string;
  scientificName?: string;
  kingdom?: string;
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
  plant: 'Plantae',
  flower: 'Angiosperms',
  orchid: 'Orchidaceae',
  palm: 'Arecaceae',
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
  plant: '植物',
  flower: '花卉植物',
  orchid: '兰科植物',
  palm: '棕榈类植物',
};

const animalIntroById: Record<string, string> = {
  dog: '家犬长期和人共同生活，常在院子、店门口和街区活动，体型、毛色和耳朵形态差异很大。',
  cat: '家猫适应城市和社区环境，常在寺庙、街边店铺和院落附近活动，行动安静，夜间也很活跃。',
  'tokay-gecko': '大壁虎是东南亚常见夜行壁虎，常伏在墙面、屋檐和灯光附近捕食昆虫。',
  bird: '鸟类的体型、喙形、羽色和鸣叫都能提供识别线索，清迈城市绿地和寺庙周边都很容易观察到。',
  butterfly: '蝴蝶常出现在花丛、湿地和阳光充足的绿地，翅膀花纹、飞行方式和停栖姿态都能帮助识别。',
  fish: '鱼类需要结合水体环境、体色、体型和游动方式识别，远距离照片通常只能判断到大类。',
  snake: '蛇类识别要看头型、体色、斑纹和栖息环境；遇到时保持距离观察，不要徒手接近。',
  frog: '蛙类和潮湿环境关系密切，雨后或夜晚更常见，体型、背纹、趾端和叫声都有识别价值。',
  insect: '昆虫种类非常多，触角、翅膀、足和身体分节是关键特征；清晰近照会显著提高识别准确度。',
  squirrel: '松鼠常在树冠、电线和屋檐间移动，尾巴形态、体色和活动地点能帮助进一步区分物种。',
  plant: '植物识别要看花、叶、果实、树皮和生长环境；清迈街边、寺庙和庭院里的常见种很多，近照会更准。',
  flower: '花卉植物通常可以通过花型、花色、叶序和植株姿态进一步确认，最好拍到花和叶两部分。',
  orchid: '兰科植物种类很多，花瓣形态、唇瓣、花序和附生环境是关键识别线索。',
  palm: '棕榈类植物常见于庭院、街边和水边，叶片形态、树干纹理和果序可以帮助确认种类。',
};

const animalIntroByScientificName: Record<string, string> = {
  'Canis lupus familiaris': animalIntroById.dog,
  'Felis catus': animalIntroById.cat,
  'Gekko gecko': animalIntroById['tokay-gecko'],
  'Hemidactylus frenatus': '疣尾蜥虎是城市里很常见的小型壁虎，常在夜间出现在墙面、窗边和灯光附近，主要捕食小昆虫。',
  'Hemidactylus platyurus': '扁尾蜥虎常见于建筑墙面和室内外交界处，身体扁平，夜间活动明显，会捕食靠近灯光的小昆虫。',
  'Calotes versicolor': '变色树蜥常在灌木、树干和围墙附近晒太阳，雄性繁殖期头颈部颜色会更鲜艳。',
  'Varanus salvator': '水巨蜥体型较大，常靠近河道、池塘和湿地活动，行动有力，观察时需要保持距离。',
  'Halcyon pileata': '蓝翡翠常见于水边、湿地和开阔林缘，黑色头部、蓝色翅背和红色嘴脚是醒目的识别特征。',
  'Alcedo atthis': '普通翠鸟体型小，常沿水边停栖和俯冲捕鱼，蓝色背部、橙色腹部和细长嘴很有辨识度。',
  'Acridotheres tristis': '家八哥适应城市环境，常成群在草地、街边和屋顶活动，黄色眼周裸皮很醒目。',
  'Passer montanus': '树麻雀常在街区、市场和建筑附近活动，体型小，脸颊黑斑和褐色头顶是常见识别点。',
  'Pycnonotus jocosus': '红耳鹎常在树冠和灌木间活动，黑色羽冠、红色耳斑和白色脸颊很容易辨认。',
  'Pycnonotus goiavier': '黄臀鹎常见于城市绿地和花园，叫声活跃，黄绿色尾下覆羽和浅色头脸是重要特征。',
  'Spilopelia chinensis': '珠颈斑鸠常在地面觅食或停在电线、屋檐上，颈侧黑底白点斑块很有辨识度。',
  'Duttaphrynus melanostictus': '黑眶蟾蜍常在雨后、庭院和墙边出现，皮肤粗糙，眼后腺体明显，夜间更容易遇见。',
  'Kaloula pulchra': '花狭口蛙身体圆胖，雨后常从土里或缝隙中出来活动，背部宽条纹和短吻很有特点。',
  'Naja kaouthia': '单眼镜蛇具有危险性，颈背眼镜状斑纹是重要特征；若遇到应立即保持距离并绕行。',
  'Ptyas korros': '灰鼠蛇行动快速，常在草地、田边和建筑周围觅食，通常以小动物为食。',
  'Boiga cyanea': '绿瘦蛇体形细长，常在灌木和树枝间活动，通体绿色，夜间也会活动。',
  'Papilio polytes': '玉带凤蝶常在花丛附近访花，雌雄外观差异明显，后翅斑纹是识别重点。',
  'Papilio demoleus': '达摩凤蝶常见于柑橘类植物附近，黄黑斑纹清楚，飞行活跃。',
  'Junonia almana': '眼蛱蝶常在草地和低矮植物附近停栖，翅面眼状斑明显，适合用近距离照片确认。',
  'Bougainvillea spectabilis': '叶子花在清迈街边和院墙上很常见，显眼的紫红色或橙色部分多是苞片，真正的花很小。',
  'Plumeria rubra': '红鸡蛋花常见于寺庙、庭院和街边，花瓣厚实有香气，枝条肉质，落叶后枝形也很醒目。',
  'Cassia fistula': '腊肠树开花时会垂下成串黄色花序，是泰国热季很醒目的行道树和庭院树。',
  'Delonix regia': '凤凰木树冠宽大，盛花期有大片红橙色花，常见于校园、道路和开阔庭院。',
  'Hibiscus rosa-sinensis': '朱槿常作庭院和绿篱植物，花朵大，花柱突出，红色、粉色和橙色都很常见。',
  'Ixora coccinea': '龙船花常成簇开放，花序密集，叶片对生，常见于花坛、绿篱和寺庙庭院。',
  'Nymphaea nouchali': '蓝睡莲常见于池塘和水景，叶片漂浮在水面，蓝紫色花从水面伸出。',
  'Nelumbo nucifera': '莲常生长在池塘和湿地，叶片挺出水面，花托和莲蓬是很明确的识别线索。',
  'Dendrobium anosmum': '石斛兰常附生或悬挂栽培，花序从节间开放，花色和唇瓣形态有助于确认。',
  'Dendrobium crumenatum': '鸽子兰常见白色小花，雨后或气压变化后集中开放，附生在树干或庭院栽培中。',
  'Rhynchostylis gigantea': '狐尾兰花序密集下垂，常作庭院兰花栽培，花色和斑点变化明显。',
  'Etlingera elatior': '火炬姜花序像火炬一样从地面抽出，粉红或红色苞片很醒目，常见于热带庭院。',
  'Strelitzia reginae': '鹤望兰花形像鸟头，橙色花被和蓝色花瓣非常醒目，常见于庭院和景观绿化。',
  'Jasminum sambac': '茉莉花花朵洁白且香味明显，常作盆栽或庭院灌木，叶片和花型可帮助确认。',
  'Heliconia psittacorum': '鹦鹉蕉有鲜艳橙红苞片，常见于热带庭院和酒店绿化，叶片像小型香蕉叶。',
  'Canna indica': '美人蕉叶片宽大，花色鲜艳，常种在道路、庭院和水边景观带。',
  'Musa acuminata': '尖蕉是常见香蕉类植物，巨大叶片和下垂花序很有辨识度，果实形态也能辅助确认。',
  'Cocos nucifera': '椰子是典型棕榈类植物，羽状叶巨大，树干高直，果实成串长在树冠下方。',
  'Mangifera indica': '杧果树冠浓密，革质叶片狭长，新叶常带红褐色，果实季节更容易确认。',
  'Tamarindus indica': '酸豆树有细小复叶和长荚果，树冠宽大，常作为遮荫树出现在庭院和路边。',
  'Samanea saman': '雨树树冠极宽，像伞一样展开，常作为大遮荫树，叶片会随光线变化开合。',
  'Ficus religiosa': '菩提树叶片心形且叶尖细长，常见于寺庙和院落，气生根和树形也很有辨识度。',
};

export const getAnimalScientificName = (candidate: AnimalIdentificationCandidate) =>
  candidate.scientificName?.trim() || fallbackScientificNames[candidate.id] || candidate.nameEn || candidate.rawLabel;

export const getAnimalChineseName = (candidate: AnimalIdentificationCandidate) =>
  candidate.nameZh?.trim() || fallbackChineseNames[candidate.id] || getAnimalScientificName(candidate);

export const getAnimalIntro = (candidate: AnimalIdentificationCandidate) =>
  animalIntroByScientificName[getAnimalScientificName(candidate)] ||
  animalIntroById[candidate.id] ||
  '这次识别可以先作为观察线索，后续结合更近的照片、地点、花叶果实或行为描述继续确认。';

export const formatAnimalCandidateLabel = (candidate: AnimalIdentificationCandidate) =>
  getAnimalChineseName(candidate);

const isSpeciesLevelRank = (rank: string | undefined) => rank === 'SPECIES' || rank === 'SUBSPECIES';

export const buildAnimalCandidateDescription = (candidate: AnimalIdentificationCandidate) => {
  const chineseName = getAnimalChineseName(candidate);
  const intro = getAnimalIntro(candidate);
  if (isSpeciesLevelRank(candidate.taxonRank) || candidate.source === 'vision') {
    return `这是${chineseName}。${intro}`;
  }

  return `识别到${chineseName}。${intro}需要更近照片才能定到具体物种。`;
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
