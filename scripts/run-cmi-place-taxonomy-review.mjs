import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';
import { join } from 'node:path';

const ROOT = process.cwd();
const PROJECT_REF = 'sfpcpxlxslnulzlmjcby';
const TAXONOMY_PATH = join(ROOT, 'src/data/cmi-taxonomy.ts');
const FALLBACK_SNAPSHOT_PATH = join(
  ROOT,
  'backups/cmi-map-icon-cleanup-20260519-140045/tables/recommendations.json',
);
const OUTPUT_DIR = join(ROOT, 'scratch', 'cmi-place-taxonomy-review');
const OUTPUT_BASENAME = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Bangkok',
}).format(new Date());

const REVIEW_CATEGORY_FLOOR = 2;
const HIGH_CONFIDENCE_THRESHOLD = 0.8;
const CATEGORY_ALIASES = {
  拍照: '景点',
  放松: '马杀鸡',
};

const MANUAL_CLASSIFICATIONS = {
  '50f42c5f-861a-44b9-a405-1ee7486878f9': {
    placeTypeIds: ['cafe'],
    detailTagIds: ['aircon', 'work-friendly'],
    confidence: 0.97,
    rationale: '星巴克 + 办公 + 很冷，咖啡办公语义明确。',
  },
  'f3ca96a2-9075-4c87-8b74-ae28583ba4f6': {
    placeTypeIds: ['fresh-market', 'night-market'],
    detailTagIds: ['budget', 'first-time'],
    confidence: 0.96,
    rationale: '24 小时菜市场和夜间市场语义同时成立。',
  },
  '9fd1209f-d860-4a6f-abd6-8ad58263f114': {
    placeTypeIds: ['gym', 'stadium'],
    confidence: 0.91,
    rationale: '街头健身器械位于体育场内部，双标签最准确。',
  },
  'ac19ee84-b07d-4ee7-8571-996a14fb654d': {
    placeTypeIds: ['stadium'],
    detailTagIds: ['photo-friendly'],
    confidence: 0.84,
    rationale: '文本和坐标都指向体育场。',
  },
  '42773043-f12f-4efd-b857-ea6247c0c479': {
    placeTypeIds: ['cafe', 'breakfast'],
    detailTagIds: ['photo-friendly'],
    confidence: 0.94,
    rationale: '咖啡和 Brunch 都被文本直接命中，双标签更准确。',
  },
  '4ace10c9-ca5b-488a-8948-bd0567c5185f': {
    placeTypeIds: ['daily'],
    confidence: 0.94,
    rationale: '“韩国超市”直接命中超市 / 日用品，不应继续停留在市集。',
  },
  '41bcecad-e0d3-46e6-a343-3c4c3a44fdb3': {
    placeTypeIds: ['landmark'],
    confidence: 0.69,
    rationale: '像路边地标打卡点，但缺正式 POI 名称。',
  },
  'e0ad0694-6e35-433f-8f58-0cffe8a16801': {
    placeTypeIds: ['landmark'],
    confidence: 0.64,
    rationale: '疑似与大炮/坦克坐标簇同类，仍需人工确认。',
  },
  '1a5d01ad-3c93-42ca-8edd-210594648789': {
    placeTypeIds: ['snack'],
    confidence: 0.36,
    rationale: '更像水果摊或榴莲摊，taxonomy 还不够贴切。',
  },
  '5e44ba74-f55b-4341-97a5-e2d8f6287a58': {
    placeTypeIds: ['restaurant'],
    confidence: 0.41,
    rationale: '饮食语义存在，但不是稳定店名。',
  },
};

const normalize = (value) => String(value ?? '').trim().toLocaleLowerCase();

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

    if (!id || !label) throw new Error(`解析 place type 失败: ${objectSource}`);

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

    if (!id || !label) throw new Error(`解析 detail tag 失败: ${objectSource}`);

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
const dedupe = (values) => [...new Set((values ?? []).filter(Boolean))];

const getServiceRoleFromCli = () => {
  try {
    const output = execFileSync(
      'supabase',
      ['projects', 'api-keys', '--project-ref', PROJECT_REF, '--output', 'json'],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
    );
    const keys = JSON.parse(output);
    return keys.find((item) => item.name === 'service_role' || item.id === 'service_role')?.api_key ?? null;
  } catch {
    return null;
  }
};

const getSchemaFields = (rows) => {
  const keys = new Set();
  for (const row of rows.slice(0, 20)) {
    Object.keys(row ?? {}).forEach((key) => keys.add(key));
  }
  return [...keys].sort();
};

const hasClassificationFields = (fields) =>
  ['place_type_id', 'place_type_ids', 'classification_status'].some((field) => fields.includes(field));

const getTextForMatching = (row) =>
  normalize([row.place_name, row.reason].filter(Boolean).join(' '));

const scoreKeywordMatches = (row, tag) => {
  const text = getTextForMatching(row);
  const normalizedCategory = normalizeCategory(row.category);
  const matchedKeywords = tag.recommendationKeywords.filter((keyword) => matchesKeyword(text, keyword));
  let score = matchedKeywords.length * 2;
  if (tag.categoryFallback && tag.categoryFallback === normalizedCategory) score += 4;
  return { score, matchedKeywords };
};

const buildFallbackSuggestion = (row, placeTypeTags, detailTags) => {
  const tagScores = placeTypeTags
    .map((tag) => ({ tag, ...scoreKeywordMatches(row, tag) }))
    .filter((item) => item.score >= 4)
    .sort((left, right) => right.score - left.score);

  const detailTagIds = detailTags
    .filter((tag) => tag.keywords.some((keyword) => matchesKeyword(normalize(row.reason), keyword)))
    .map((tag) => tag.id);

  if (tagScores.length === 0) return null;

  const bestScore = tagScores[0].score;
  const winners = tagScores.filter((item) => item.score === bestScore).map((item) => item.tag.id);
  const categoryOnlyFallback =
    tagScores[0].matchedKeywords.length === 0
    && tagScores[0].tag.categoryFallback === normalizeCategory(row.category);

  return {
    placeTypeIds: dedupe(winners),
    detailTagIds: dedupe(detailTagIds),
    confidence: bestScore >= 6 && !categoryOnlyFallback ? 0.8 : 0.68,
    rationale: `由 categoryFallback/关键词匹配自动推断：${tagScores[0].matchedKeywords.join('、') || 'categoryFallback'}`,
  };
};

const getReviewReason = (row) => {
  const normalizedCategory = normalizeCategory(row.category);
  if (row.category === '拍照') return '拍照类地点缺正式 POI 或稳定语义，容易把临时文案误判成地标。';
  if (row.category === '彩蛋') return '彩蛋类混合了氛围记录和地点记录，暂不适合自动细分。';
  if (normalizedCategory === '吃饭') return '文本缺少正式店名或菜系锚点，难以在餐厅/小吃/早餐之间稳定细分。';
  return '信息不足或与现有 taxonomy 冲突，需人工确认。';
};

const classifyRow = (row, placeTypeTags, detailTags) => {
  const manual = MANUAL_CLASSIFICATIONS[row.id];
  const fallback = buildFallbackSuggestion(row, placeTypeTags, detailTags);
  const candidate = manual ?? fallback;

  if (candidate && candidate.confidence >= HIGH_CONFIDENCE_THRESHOLD) {
    return {
      ...row,
      suggestedPlaceTypeIds: dedupe(candidate.placeTypeIds),
      suggestedDetailTagIds: dedupe(candidate.detailTagIds),
      classificationStatus: 'auto_high_confidence',
      classificationSource: manual ? 'codex_manual_taxonomy_review' : 'codex_keyword_taxonomy_review',
      classificationConfidence: candidate.confidence,
      rationale: candidate.rationale,
    };
  }

  return {
    ...row,
    suggestedPlaceTypeIds: dedupe(candidate?.placeTypeIds),
    suggestedDetailTagIds: dedupe(candidate?.detailTagIds),
    classificationStatus: 'manual_review',
    classificationSource: candidate ? 'codex_low_confidence_taxonomy_review' : 'codex_unclassified_taxonomy_review',
    classificationConfidence: candidate?.confidence ?? 0,
    rationale: candidate?.rationale ?? getReviewReason(row),
  };
};

const getLatestWindowRows = (rows) => {
  const sorted = rows
    .filter((row) => row.user_id && row.place_name && row.created_at)
    .slice()
    .sort((left, right) => new Date(right.created_at) - new Date(left.created_at));

  if (sorted.length === 0) return [];

  const categoryCounts = new Map();
  const selected = [];

  for (const row of sorted) {
    const count = categoryCounts.get(row.category) ?? 0;
    if (selected.length < 8 || count < REVIEW_CATEGORY_FLOOR) {
      selected.push(row);
      categoryCounts.set(row.category, count + 1);
    }
    if (selected.length >= 12) break;
  }

  return selected.sort((left, right) => new Date(left.created_at) - new Date(right.created_at));
};

const countTopCategories = (rows) => {
  const counts = rows.reduce((accumulator, row) => {
    accumulator[row.category] = (accumulator[row.category] ?? 0) + 1;
    return accumulator;
  }, {});

  return Object.entries(counts)
    .sort((left, right) => right[1] - left[1])
    .slice(0, 6);
};

const getTaxonomyGapNotes = (rows) => {
  const counts = rows.reduce((accumulator, row) => {
    accumulator[row.category] = (accumulator[row.category] ?? 0) + 1;
    return accumulator;
  }, {});

  const gaps = [];

  if ((counts.拍照 ?? 0) > 0) {
    gaps.push('`拍照` 仍缺 `photo-spot` / `viewpoint-photo` 一类 place type。');
  }
  if ((counts.吃饭 ?? 0) > 0) {
    gaps.push('`吃饭` 里缺 `fruit-stand` / `fresh-fruit` / `brunch` 这类中间层。');
  }
  if ((counts.运动 ?? 0) > 0) {
    gaps.push('`运动` 里缺 `outdoor-gym` / `street-workout`。');
  }
  if ((counts.彩蛋 ?? 0) > 0) {
    gaps.push('`彩蛋` 继续混合地点与氛围记录，后续应拆到非地点内容层。');
  }

  return gaps;
};

const getSchemaGapNotes = (fields) => {
  if (hasClassificationFields(fields)) return [];

  return [
    '当前 `recommendations` 未见可持久化细分类字段，不能直接回写本轮建议。',
    '最小建议：新增 `place_type_ids text[]`、`detail_tag_ids text[]`、`classification_status text`、`classification_source text`、`classification_confidence numeric`、`classified_at timestamptz`。',
    '若要保留多轮整理历史，建议新建 `recommendation_classifications` 审计表。',
  ];
};

const fetchRemoteRows = async () => {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  if (!supabaseUrl) {
    return { ok: false, reason: 'missing_supabase_url' };
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || getServiceRoleFromCli();
  const fallbackKey = process.env.VITE_SUPABASE_ANON_KEY;
  const apiKey = serviceRoleKey || fallbackKey;

  if (!apiKey) {
    return { ok: false, reason: 'missing_api_key' };
  }

  try {
    const supabase = createClient(supabaseUrl, apiKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await supabase
      .from('recommendations')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(80);

    if (error) return { ok: false, reason: 'query_error', detail: error.message };
    return {
      ok: true,
      source: 'remote_supabase',
      rows: data ?? [],
      writeCapable: Boolean(serviceRoleKey),
    };
  } catch (error) {
    return { ok: false, reason: 'network_error', detail: error instanceof Error ? error.message : String(error) };
  }
};

const fetchFallbackRows = async () => {
  const rows = JSON.parse(await readFile(FALLBACK_SNAPSHOT_PATH, 'utf8'));
  return {
    source: 'offline_backup',
    rows,
    writeCapable: false,
  };
};

const toMarkdown = (report) => {
  const autoLines = report.autoClassified.map((item) =>
    `| ${item.place_name} | ${item.category} | \`${item.suggestedPlaceTypeIds.join('`, `')}\` | ${item.suggestedDetailTagIds.length ? `\`${item.suggestedDetailTagIds.join('`, `')}\`` : '-'} | ${item.classificationConfidence.toFixed(2)} | ${item.rationale} |`,
  );

  const reviewLines = report.manualReview.map((item) =>
    `| ${item.place_name} | ${item.category} | ${item.suggestedPlaceTypeIds.length ? `\`${item.suggestedPlaceTypeIds.join('`, `')}\`` : '-'} | ${item.classificationConfidence.toFixed(2)} | ${item.rationale} |`,
  );

  return [
    `# CMI Map 地点细分类整理（${OUTPUT_BASENAME}）`,
    '',
    '## 数据边界',
    '',
    `- taxonomy 事实源：\`${TAXONOMY_PATH.replace(`${ROOT}/`, '')}\``,
    `- 数据来源：\`${report.meta.dataSource}\``,
    `- 远程状态：${report.meta.remoteStatus}`,
    `- 可写回数据库：${report.meta.dbWritable ? '是' : '否'}`,
    '',
    '## 整理摘要',
    '',
    `- 检查记录：${report.summary.checkedCount}`,
    `- 高置信度自动归类：${report.summary.autoClassifiedCount}`,
    `- 需要人工复核：${report.summary.manualReviewCount}`,
    `- 高频粗分类缺口：${report.summary.taxonomyGapNotes.length > 0 ? report.summary.taxonomyGapNotes.join('；') : '未发现新的高频缺口'}`,
    `- 数据库字段缺口：${report.summary.schemaGapNotes.length > 0 ? '有' : '无'}`,
    '',
    '## 高置信度可落库候选',
    '',
    '| place_name | 原始 category | 建议细分类 | 建议 detail tags | 置信度 | 说明 |',
    '| --- | --- | --- | --- | --- | --- |',
    ...(autoLines.length > 0 ? autoLines : ['| - | - | - | - | - | - |']),
    '',
    '## 人工复核',
    '',
    '| place_name | 原始 category | 候选细分类 | 置信度 | 复核原因 |',
    '| --- | --- | --- | --- | --- |',
    ...(reviewLines.length > 0 ? reviewLines : ['| - | - | - | - | - |']),
    '',
    '## 字段现状',
    '',
    ...report.meta.schemaFields.map((field) => `- \`${field}\``),
    '',
    '## 字段缺口建议',
    '',
    ...(report.summary.schemaGapNotes.length > 0 ? report.summary.schemaGapNotes.map((note) => `- ${note}`) : ['- 当前已具备细分类字段，可按高置信度记录回写。']),
  ].join('\n');
};

const main = async () => {
  const taxonomySource = await readFile(TAXONOMY_PATH, 'utf8');
  const placeTypeTags = parsePlaceTypeTags(taxonomySource);
  const detailTags = parseDetailTags(taxonomySource);

  const remote = await fetchRemoteRows();
  const fallback = remote.ok ? null : await fetchFallbackRows();
  const rows = remote.ok ? remote.rows : fallback.rows;
  const schemaFields = getSchemaFields(rows);
  const reviewRows = getLatestWindowRows(rows);
  const classifiedRows = reviewRows.map((row) => classifyRow(row, placeTypeTags, detailTags));
  const autoClassified = classifiedRows.filter((row) => row.classificationStatus === 'auto_high_confidence');
  const manualReview = classifiedRows.filter((row) => row.classificationStatus === 'manual_review');

  const report = {
    meta: {
      generatedAt: new Date().toISOString(),
      dataSource: remote.ok ? 'remote_supabase' : fallback.source,
      remoteStatus: remote.ok
        ? '已核验远程 Supabase'
        : `未核验远程 Supabase（${remote.reason}${remote.detail ? `: ${remote.detail}` : ''}）`,
      dbWritable: remote.ok && hasClassificationFields(schemaFields) && remote.writeCapable,
      schemaFields,
    },
    summary: {
      checkedCount: reviewRows.length,
      autoClassifiedCount: autoClassified.length,
      manualReviewCount: manualReview.length,
      topRawCategories: countTopCategories(rows),
      taxonomyGapNotes: getTaxonomyGapNotes(reviewRows),
      schemaGapNotes: getSchemaGapNotes(schemaFields),
    },
    autoClassified,
    manualReview,
  };

  await mkdir(OUTPUT_DIR, { recursive: true });
  await Promise.all([
    writeFile(join(OUTPUT_DIR, `${OUTPUT_BASENAME}.json`), `${JSON.stringify(report, null, 2)}\n`, 'utf8'),
    writeFile(join(OUTPUT_DIR, `${OUTPUT_BASENAME}.md`), `${toMarkdown(report)}\n`, 'utf8'),
  ]);

  console.log(JSON.stringify(report.summary, null, 2));
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
