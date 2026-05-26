import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const ROOT = process.cwd();
const TAXONOMY_PATH = join(ROOT, 'src/data/cmi-taxonomy.ts');
const SNAPSHOT_PATH = join(
  ROOT,
  'backups/cmi-map-icon-cleanup-20260519-140045/manual-candidates/recommendations.json',
);
const OUTPUT_DIR = join(ROOT, 'scratch', 'cmi-place-type-triage');

const CATEGORY_ALIASES = {
  拍照: '景点',
  放松: '马杀鸡',
};

const MANUAL_CLASSIFICATIONS = {
  '4e45184b-434c-466c-8c07-e11c549def68': {
    placeTypeIds: ['market'],
    confidence: 0.95,
    rationale: '“步行街市集”与开放时间都明确指向市集。',
  },
  'f7b58f9f-bb63-4390-9386-3d105c68e1cb': {
    placeTypeIds: ['temple'],
    confidence: 0.93,
    rationale: '地点主体是寺庙，猫只是彩蛋内容。',
  },
  '144f143a-dee5-440e-a044-909302f97ef1': {
    placeTypeIds: ['temple'],
    confidence: 0.93,
    rationale: '地点主体是寺庙，猫只是彩蛋内容。',
  },
  '6e08cb6c-e62e-4fa2-aa94-577599745006': {
    placeTypeIds: ['market'],
    confidence: 0.92,
    rationale: '数字游民月市，属于市集而非固定商业点。',
  },
  '6a57f650-3e21-41ab-9187-c519066976ae': {
    placeTypeIds: ['market'],
    confidence: 0.86,
    rationale: '“云南市集”可稳定落到市集。',
  },
  '4cf79565-00df-42d7-a095-ef3e0eec66e0': {
    placeTypeIds: ['nature'],
    detailTagIds: ['photo-friendly'],
    confidence: 0.95,
    rationale: '最高峰 / 山顶语义明确是自然短途目的地。',
  },
  '8f54ed09-a28c-4912-814f-c2e03821f023': {
    placeTypeIds: ['landmark'],
    detailTagIds: ['photo-friendly'],
    confidence: 0.82,
    rationale: '天文台属于明确打卡地标，但 taxonomy 暂无观测站细类。',
  },
  'ed72d086-7bc2-47f5-a4b4-b2035b38352f': {
    placeTypeIds: ['nature'],
    detailTagIds: ['photo-friendly'],
    confidence: 0.95,
    rationale: '最高峰 / 山顶语义明确是自然短途目的地。',
  },
  '51c87022-abf6-464a-a623-aa71f1557dbb': {
    placeTypeIds: ['park'],
    detailTagIds: ['photo-friendly'],
    confidence: 0.88,
    rationale: '名称里直接出现皇家公园，且是可到达景观场所。',
  },
  '0ebef14e-f4a1-4d58-af67-41c4976127f9': {
    placeTypeIds: ['landmark'],
    detailTagIds: ['photo-friendly'],
    confidence: 0.82,
    rationale: '山顶打卡语义更像地标，而非纯彩蛋。',
  },
  'daaa2dd8-e3ff-46a7-a5c1-a103eb81c24a': {
    placeTypeIds: ['park'],
    detailTagIds: ['photo-friendly'],
    confidence: 0.9,
    rationale: '国家公园入口牌与地点语义一致。',
  },
  '7d761b3b-db47-4de3-9179-4d6836b47e5b': {
    placeTypeIds: ['nature'],
    detailTagIds: ['photo-friendly'],
    confidence: 0.88,
    rationale: '山顶栈道属于自然短途体验点。',
  },
  'ae51a198-8bc5-4d21-ae88-05cf2ab58b76': {
    placeTypeIds: ['nature'],
    detailTagIds: ['photo-friendly'],
    confidence: 0.95,
    rationale: '最高峰 / 山顶语义明确是自然短途目的地。',
  },
  'fad67ae5-b76b-4cf5-8e86-bbaa6fdbcdd4': {
    placeTypeIds: ['landmark'],
    detailTagIds: ['photo-friendly'],
    confidence: 0.82,
    rationale: '观测站 / 监测站属于可识别地标，但 taxonomy 暂无更细类型。',
  },
  'db241825-2400-4857-87ed-11805cc902cd': {
    placeTypeIds: ['landmark'],
    detailTagIds: ['photo-friendly'],
    confidence: 0.82,
    rationale: '监测站地标语义清晰，但仍缺 observatory 细类。',
  },
  'de4acfba-59c1-40f3-8cbf-e803831e3dcf': {
    placeTypeIds: ['landmark'],
    detailTagIds: ['photo-friendly'],
    confidence: 0.9,
    rationale: '国家观测站可稳定落入地标打卡。',
  },
  '1248fa00-7cdc-4a0e-9854-a747420a267b': {
    placeTypeIds: ['nature'],
    detailTagIds: ['photo-friendly'],
    confidence: 0.95,
    rationale: '瀑布明确命中自然短途。',
  },
  '40d647be-40ee-48cd-9058-918431a62034': {
    placeTypeIds: ['nature'],
    detailTagIds: ['photo-friendly'],
    confidence: 0.95,
    rationale: '瀑布明确命中自然短途。',
  },
  '25410d07-62a8-49c0-8373-aa2d9fa43db6': {
    placeTypeIds: ['nature'],
    detailTagIds: ['photo-friendly'],
    confidence: 0.95,
    rationale: '瀑布明确命中自然短途。',
  },
  '148bad84-17d0-4739-9d48-3ac4b0dcf03f': {
    placeTypeIds: ['nature'],
    detailTagIds: ['photo-friendly'],
    confidence: 0.93,
    rationale: '瀑布明确命中自然短途。',
  },
  '4ace10c9-ca5b-488a-8948-bd0567c5185f': {
    placeTypeIds: ['daily'],
    confidence: 0.94,
    rationale: '韩国超市直接落入“超市 / 日用品”。',
  },
  '9adcc321-4818-47b6-b9e1-fc885d0e5c24': {
    placeTypeIds: ['stadium', 'running'],
    confidence: 0.94,
    rationale: '体育场 + 跑步场景都很明确。',
  },
  '70396622-8f68-4f3f-8e6b-31dff1e2a30e': {
    placeTypeIds: ['cafe', 'breakfast'],
    confidence: 0.91,
    rationale: 'Cafe 名称与 brunch 理由共同指向咖啡馆 / 早餐。',
  },
  '7692c40f-ca78-4d65-be6b-8fb6760d2b22': {
    placeTypeIds: ['cafe'],
    detailTagIds: ['parents', 'parking'],
    confidence: 0.93,
    rationale: '主语义仍是咖啡店，附带家庭友好和停车便利。',
  },
  '041c2815-19a0-4bf7-b64c-355a3d805d21': {
    placeTypeIds: ['restaurant'],
    confidence: 0.86,
    rationale: '“厨房”与炒粉描述更接近餐厅而非泛彩蛋。',
  },
  '50f42c5f-861a-44b9-a405-1ee7486878f9': {
    placeTypeIds: ['cafe'],
    detailTagIds: ['aircon', 'work-friendly'],
    confidence: 0.97,
    rationale: '星巴克 + 办公 + 很冷，典型咖啡办公点。',
  },
  '41bcecad-e0d3-46e6-a343-3c4c3a44fdb3': {
    placeTypeIds: ['landmark'],
    detailTagIds: ['photo-friendly'],
    confidence: 0.81,
    rationale: '大炮 / 坦克展示更像路边地标打卡点。',
  },
  'f3ca96a2-9075-4c87-8b74-ae28583ba4f6': {
    placeTypeIds: ['fresh-market', 'night-market'],
    detailTagIds: ['budget', 'first-time'],
    confidence: 0.96,
    rationale: '24 小时菜市场 + 夜间市场语义同时成立。',
  },
  '9fd1209f-d860-4a6f-abd6-8ad58263f114': {
    placeTypeIds: ['gym', 'stadium'],
    confidence: 0.92,
    rationale: '街头健身器械在体育场内，双标签最准确。',
  },
  'ac19ee84-b07d-4ee7-8571-996a14fb654d': {
    placeTypeIds: ['stadium'],
    confidence: 0.9,
    rationale: '与“清迈多功能体育场”同一地点簇，描述也一致。',
  },
  '42773043-f12f-4efd-b857-ea6247c0c479': {
    placeTypeIds: ['cafe', 'breakfast'],
    detailTagIds: ['photo-friendly'],
    confidence: 0.96,
    rationale: 'Toast n cup + coffee + brunch，类型非常明确。',
  },
};

const TAXONOMY_GAP_NOTES = [
  '高频粗分类“拍照”里混合了地标、自然景观、街头艺术和纯拍照点，现有 taxonomy 缺少 `photo-spot` / `observatory` / `street-art` 这类细分。',
  '“彩蛋”里混合了寺庙彩蛋、社区空间、开放麦现场等，不全是 place type；需要单独的非地点内容层或 event / community-space 语义。',
  '“身心”当前只有 1 条且是活动现场，现有 taxonomy 偏静态地点，缺少 workshop / meditation event 一类临时活动落点。',
  '“生存指南”中出现了规则提示牌（禁飞无人机），它不是服务场所，说明还需要 `non-place note` 或内容过滤规则。',
];

const SCHEMA_GAPS = [
  '当前 `recommendations` 快照仅看到 `id/place_name/category/reason/user_name/latitude/longitude/images/user_id/created_at`，没有细分类落库字段。',
  '若要持久化，最小可行方案是在 `recommendations` 增加 `place_type_ids text[]`、`detail_tag_ids text[]`、`classification_status text`、`classification_confidence numeric`、`classification_source text`、`classified_at timestamptz`。',
  '若希望保留审计轨迹，建议新建 `recommendation_classifications` 表，避免覆盖多轮整理历史。',
];

const normalize = (value) => value.trim().toLocaleLowerCase();

const parseStringList = (source) => {
  if (!source) return [];
  return [...source.matchAll(/'([^']+)'/g)].map((match) => match[1]);
};

const extractArrayBlock = (source, marker) => {
  const start = source.indexOf(marker);
  if (start === -1) throw new Error(`未找到 ${marker}`);
  const equalsIndex = source.indexOf('=', start);
  const bracketStart = source.indexOf('[', equalsIndex);
  let depth = 0;
  for (let index = bracketStart; index < source.length; index += 1) {
    const char = source[index];
    if (char === '[') depth += 1;
    if (char === ']') depth -= 1;
    if (depth === 0) return source.slice(bracketStart, index + 1);
  }
  throw new Error(`无法解析 ${marker} 数组块`);
};

const splitTopLevelObjects = (arrayBlock) => {
  const objects = [];
  let depth = 0;
  let current = '';
  let inside = false;

  for (const char of arrayBlock) {
    if (char === '{') {
      depth += 1;
      inside = true;
    }
    if (inside) current += char;
    if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        objects.push(current);
        current = '';
        inside = false;
      }
    }
  }

  return objects;
};

const parsePlaceTypeTags = (source) => {
  const block = extractArrayBlock(source, 'export const CMI_PLACE_TYPE_TAGS');
  return splitTopLevelObjects(block).map((objectSource) => {
    const id = objectSource.match(/id:\s*'([^']+)'/)?.[1];
    const label = objectSource.match(/label:\s*'([^']+)'/)?.[1];
    const categoryFallback = objectSource.match(/categoryFallback:\s*'([^']+)'/)?.[1] ?? null;
    const keywords = parseStringList(objectSource.match(/keywords:\s*\[([\s\S]*?)\]/)?.[1] ?? '');
    const recommendationKeywords = parseStringList(
      objectSource.match(/recommendationKeywords:\s*\[([\s\S]*?)\]/)?.[1] ?? '',
    );

    if (!id || !label) {
      throw new Error(`解析 place type 失败: ${objectSource}`);
    }

    return {
      id,
      label,
      categoryFallback,
      keywords,
      recommendationKeywords: recommendationKeywords.length > 0 ? recommendationKeywords : keywords,
    };
  });
};

const parseDetailTags = (source) => {
  const block = extractArrayBlock(source, 'export const CMI_DETAIL_TAGS');
  return splitTopLevelObjects(block).map((objectSource) => {
    const id = objectSource.match(/id:\s*'([^']+)'/)?.[1];
    const label = objectSource.match(/label:\s*'([^']+)'/)?.[1];
    const keywords = parseStringList(objectSource.match(/keywords:\s*\[([\s\S]*?)\]/)?.[1] ?? '');

    if (!id || !label) {
      throw new Error(`解析 detail tag 失败: ${objectSource}`);
    }

    return { id, label, keywords };
  });
};

const containsLatinToken = (text, keyword) => {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
  const pattern = new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, 'i');
  return pattern.test(text);
};

const matchesKeyword = (text, keyword) => {
  const normalizedKeyword = normalize(keyword);
  if (!normalizedKeyword) return false;
  if (/[a-z0-9]/i.test(normalizedKeyword)) return containsLatinToken(text, normalizedKeyword);
  return text.includes(normalizedKeyword);
};

const normalizeCategory = (category) => CATEGORY_ALIASES[category] ?? category;

const getReviewReason = (recommendation) => {
  const normalizedCategory = normalizeCategory(recommendation.category);
  if (recommendation.category === '拍照') {
    return '“拍照”是高频粗分类，但当前信息更像照片内容，不足以稳定落到现有 place type。';
  }
  if (recommendation.category === '彩蛋') {
    return '“彩蛋”里混有地点、事件和社区语义，需人工判断是否是可落库地点。';
  }
  if (normalizedCategory === '马杀鸡' || recommendation.category === '身心') {
    return '当前内容更像体验/人物/活动描述，不像稳定地点类型。';
  }
  if (normalizedCategory === '吃饭') {
    return '缺少可识别店名或菜系信息，无法在餐厅 / 小吃 / 早餐 / 甜品之间高置信度细分。';
  }
  if (normalizedCategory === '生存指南') {
    return '内容像规则提示而非服务地点，需先判断是否应该进入地点库。';
  }
  return '现有 taxonomy 可以覆盖大类，但文本信息不足以高置信度细分。';
};

const scoreKeywordMatches = (recommendation, tag) => {
  const text = normalize([recommendation.place_name, recommendation.reason].join(' '));
  const normalizedCategory = normalizeCategory(recommendation.category);
  const matchedKeywords = tag.recommendationKeywords.filter((keyword) => matchesKeyword(text, keyword));
  let score = matchedKeywords.length * 2;
  if (tag.categoryFallback && tag.categoryFallback === normalizedCategory) score += 4;
  return {
    score,
    matchedKeywords,
  };
};

const dedupe = (values) => [...new Set((values ?? []).filter(Boolean))];

const buildFallbackSuggestion = (recommendation, placeTypeTags, detailTags) => {
  const tagScores = placeTypeTags
    .map((tag) => ({ tag, ...scoreKeywordMatches(recommendation, tag) }))
    .filter((item) => item.score >= 4)
    .sort((left, right) => right.score - left.score);

  const detailTagIds = detailTags
    .filter((tag) => tag.keywords.some((keyword) => matchesKeyword(normalize(recommendation.reason), keyword)))
    .map((tag) => tag.id);

  if (tagScores.length === 0) return null;
  const bestScore = tagScores[0].score;
  const winners = tagScores.filter((item) => item.score === bestScore).map((item) => item.tag.id);
  const hasKeywordEvidence = tagScores[0].matchedKeywords.length > 0;
  const normalizedCategory = normalizeCategory(recommendation.category);
  const categoryOnlyFallback =
    hasKeywordEvidence === false
    && tagScores[0].tag.categoryFallback === normalizedCategory;

  return {
    placeTypeIds: dedupe(winners),
    detailTagIds: dedupe(detailTagIds),
    confidence: bestScore >= 6 && !categoryOnlyFallback ? 0.8 : 0.68,
    rationale: `由 categoryFallback/关键词匹配自动推断：${tagScores[0].matchedKeywords.join('、') || 'categoryFallback'}`,
  };
};

const main = async () => {
  const [taxonomySource, recommendationsSource] = await Promise.all([
    readFile(TAXONOMY_PATH, 'utf8'),
    readFile(SNAPSHOT_PATH, 'utf8'),
  ]);

  const placeTypeTags = parsePlaceTypeTags(taxonomySource);
  const detailTags = parseDetailTags(taxonomySource);
  const placeTypeIds = new Set(placeTypeTags.map((tag) => tag.id));
  const detailTagIds = new Set(detailTags.map((tag) => tag.id));
  const recommendations = JSON.parse(recommendationsSource);

  const autoClassified = [];
  const manualReview = [];

  for (const recommendation of recommendations) {
    const manual = MANUAL_CLASSIFICATIONS[recommendation.id];
    const fallback = buildFallbackSuggestion(recommendation, placeTypeTags, detailTags);
    const candidate = manual ?? fallback;

    if (candidate && candidate.confidence >= 0.8) {
      const normalizedPlaceTypeIds = dedupe(candidate.placeTypeIds);
      const normalizedDetailTagIds = dedupe(candidate.detailTagIds);

      for (const placeTypeId of normalizedPlaceTypeIds) {
        if (!placeTypeIds.has(placeTypeId)) {
          throw new Error(`未知 place type id: ${placeTypeId}`);
        }
      }
      for (const detailTagId of normalizedDetailTagIds) {
        if (!detailTagIds.has(detailTagId)) {
          throw new Error(`未知 detail tag id: ${detailTagId}`);
        }
      }

      autoClassified.push({
        id: recommendation.id,
        placeName: recommendation.place_name,
        rawCategory: recommendation.category,
        normalizedCategory: normalizeCategory(recommendation.category),
        reason: recommendation.reason,
        latitude: recommendation.latitude,
        longitude: recommendation.longitude,
        suggestedPlaceTypeIds: normalizedPlaceTypeIds,
        suggestedDetailTagIds: normalizedDetailTagIds,
        classificationStatus: 'auto_high_confidence',
        classificationSource: manual ? 'codex_snapshot_manual_triage' : 'codex_snapshot_keyword_triage',
        classificationConfidence: candidate.confidence,
        classifiedAt: new Date().toISOString(),
        rationale: candidate.rationale,
      });
      continue;
    }

    manualReview.push({
      id: recommendation.id,
      placeName: recommendation.place_name,
      rawCategory: recommendation.category,
      normalizedCategory: normalizeCategory(recommendation.category),
      reason: recommendation.reason,
      latitude: recommendation.latitude,
      longitude: recommendation.longitude,
      fallbackSuggestion: fallback
        ? {
          suggestedPlaceTypeIds: dedupe(fallback.placeTypeIds),
          suggestedDetailTagIds: dedupe(fallback.detailTagIds),
          classificationConfidence: fallback.confidence,
          rationale: fallback.rationale,
        }
        : null,
      reviewReason: getReviewReason(recommendation),
    });
  }

  const reviewCategoryCounts = manualReview.reduce((accumulator, item) => {
    accumulator[item.rawCategory] = (accumulator[item.rawCategory] ?? 0) + 1;
    return accumulator;
  }, {});

  const summary = {
    snapshotPath: SNAPSHOT_PATH,
    taxonomyPath: TAXONOMY_PATH,
    checkedCount: recommendations.length,
    autoClassifiedCount: autoClassified.length,
    manualReviewCount: manualReview.length,
    reviewCategoryCounts,
    taxonomyGapNotes: TAXONOMY_GAP_NOTES,
    schemaGaps: SCHEMA_GAPS,
  };

  const report = {
    summary,
    autoClassified,
    manualReview,
  };

  const markdown = [
    '# CMI Map 地点细分类整理',
    '',
    `- 检查快照：\`${SNAPSHOT_PATH}\``,
    `- taxonomy 事实源：\`${TAXONOMY_PATH}\``,
    `- 检查条数：${summary.checkedCount}`,
    `- 自动归入：${summary.autoClassifiedCount}`,
    `- 人工复核：${summary.manualReviewCount}`,
    '',
    '## 自动归入',
    ...autoClassified.map((item) =>
      `- ${item.placeName} | ${item.rawCategory} -> ${item.suggestedPlaceTypeIds.join(', ')}`
      + (item.suggestedDetailTagIds.length > 0 ? ` | detail: ${item.suggestedDetailTagIds.join(', ')}` : '')
      + ` | conf=${item.classificationConfidence}`,
    ),
    '',
    '## 人工复核',
    ...manualReview.map((item) =>
      `- ${item.placeName} | ${item.rawCategory} | ${item.reviewReason}`
      + (item.fallbackSuggestion
        ? ` | fallback: ${item.fallbackSuggestion.suggestedPlaceTypeIds.join(', ') || 'none'} (${item.fallbackSuggestion.classificationConfidence})`
        : ''),
    ),
    '',
    '## taxonomy 缺口',
    ...TAXONOMY_GAP_NOTES.map((note) => `- ${note}`),
    '',
    '## 数据库字段缺口',
    ...SCHEMA_GAPS.map((note) => `- ${note}`),
  ].join('\n');

  await mkdir(OUTPUT_DIR, { recursive: true });
  await Promise.all([
    writeFile(join(OUTPUT_DIR, 'report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8'),
    writeFile(join(OUTPUT_DIR, 'report.md'), `${markdown}\n`, 'utf8'),
  ]);

  console.log(JSON.stringify(summary, null, 2));
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
