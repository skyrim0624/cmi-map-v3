import { createClient } from '@supabase/supabase-js';
import { mkdir, writeFile } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { dirname, join } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BACKUP_DIR =
  process.env.BACKUP_DIR ||
  join(process.cwd(), 'backups', `cmi-map-${new Date().toISOString().replace(/[:.]/g, '-')}`);
const SHOULD_DOWNLOAD_STORAGE = process.env.BACKUP_DOWNLOAD_STORAGE !== '0';
const PAGE_SIZE = 1000;

const TABLES = [
  'recommendations',
  'profiles',
  'upvotes',
  'wishlists',
  'stickers',
  'placed_stickers',
];

const STORAGE_BUCKETS = ['place-images', 'avatars'];
const COMMUNITY_USER_NAME = 'CMI社区';
const COMMUNITY_REASON = '来自 CMI 社区的精选收藏';

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('缺少 SUPABASE_URL/VITE_SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY。');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

const ensureDir = async (path) => mkdir(path, { recursive: true });

const writeJson = async (relativePath, value) => {
  const outputPath = join(BACKUP_DIR, relativePath);
  await ensureDir(dirname(outputPath));
  await writeFile(outputPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
};

const escapeCsvValue = (value) => {
  if (value === null || value === undefined) return '';
  const stringValue = Array.isArray(value) || typeof value === 'object'
    ? JSON.stringify(value)
    : String(value);
  return `"${stringValue.replaceAll('"', '""')}"`;
};

const writeCsv = async (relativePath, rows, columns) => {
  const lines = [
    columns.map(escapeCsvValue).join(','),
    ...rows.map((row) => columns.map((column) => escapeCsvValue(row[column])).join(',')),
  ];
  const outputPath = join(BACKUP_DIR, relativePath);
  await ensureDir(dirname(outputPath));
  await writeFile(outputPath, `${lines.join('\n')}\n`, 'utf8');
};

const sortRows = (rows) =>
  [...rows].sort((left, right) => {
    const leftTime = left.created_at || left.updated_at || '';
    const rightTime = right.created_at || right.updated_at || '';
    if (leftTime !== rightTime) return leftTime.localeCompare(rightTime);
    return String(left.id || left.recommendation_id || left.user_id || '').localeCompare(
      String(right.id || right.recommendation_id || right.user_id || ''),
    );
  });

const fetchTable = async (tableName) => {
  const rows = [];

  for (let from = 0; ; from += PAGE_SIZE) {
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await supabase.from(tableName).select('*').range(from, to);

    if (error) {
      throw new Error(`读取 ${tableName} 失败：${error.message}`);
    }

    rows.push(...(data || []));
    if (!data || data.length < PAGE_SIZE) break;
  }

  return sortRows(rows);
};

const isCommunityCurated = (recommendation) =>
  recommendation.user_name === COMMUNITY_USER_NAME && recommendation.reason === COMMUNITY_REASON;

const classifyRecommendation = (recommendation) => {
  if (isCommunityCurated(recommendation)) return 'community_curated';
  if (recommendation.user_id) return 'authenticated_manual_candidate';
  return 'legacy_or_bulk_candidate';
};

const buildManualCandidateBundle = (tables) => {
  const recommendations = tables.recommendations || [];
  const manualRecommendations = recommendations.filter(
    (recommendation) => classifyRecommendation(recommendation) === 'authenticated_manual_candidate',
  );
  const manualRecommendationIds = new Set(manualRecommendations.map((item) => item.id));
  const manualUserIds = new Set(manualRecommendations.map((item) => item.user_id).filter(Boolean));

  const isManualInteraction = (item) =>
    manualUserIds.has(item.user_id) || manualRecommendationIds.has(item.recommendation_id);

  return {
    recommendations: manualRecommendations,
    profiles: (tables.profiles || []).filter((item) => manualUserIds.has(item.id)),
    upvotes: (tables.upvotes || []).filter(isManualInteraction),
    wishlists: (tables.wishlists || []).filter(isManualInteraction),
    placed_stickers: (tables.placed_stickers || []).filter(isManualInteraction),
    stickers: tables.stickers || [],
  };
};

const buildClassificationRows = (recommendations) =>
  recommendations.map((recommendation) => ({
    id: recommendation.id,
    classification: classifyRecommendation(recommendation),
    place_name: recommendation.place_name,
    category: recommendation.category,
    user_name: recommendation.user_name,
    user_id: recommendation.user_id,
    created_at: recommendation.created_at,
    images_count: Array.isArray(recommendation.images) ? recommendation.images.length : 0,
    reason: recommendation.reason,
  }));

const listStorageFiles = async (bucketName, prefix = '') => {
  const files = [];

  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await supabase.storage.from(bucketName).list(prefix, {
      limit: PAGE_SIZE,
      offset,
      sortBy: { column: 'name', order: 'asc' },
    });

    if (error) {
      throw new Error(`读取 Storage bucket ${bucketName}/${prefix} 失败：${error.message}`);
    }

    const entries = data || [];
    for (const entry of entries) {
      const path = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.id === null) {
        files.push(...await listStorageFiles(bucketName, path));
      } else {
        files.push({ ...entry, bucket: bucketName, path });
      }
    }

    if (entries.length < PAGE_SIZE) break;
  }

  return files;
};

const downloadStorageFile = async (bucketName, path) => {
  const { data, error } = await supabase.storage.from(bucketName).download(path);
  if (error) {
    return { bucket: bucketName, path, ok: false, error: error.message };
  }

  const outputPath = join(BACKUP_DIR, 'storage', bucketName, path);
  await ensureDir(dirname(outputPath));
  await pipeline(Readable.fromWeb(data.stream()), createWriteStream(outputPath));
  return { bucket: bucketName, path, ok: true, bytes: data.size };
};

const backupStorage = async () => {
  const manifests = {};
  const downloadResults = [];

  for (const bucketName of STORAGE_BUCKETS) {
    const files = await listStorageFiles(bucketName);
    manifests[bucketName] = files;

    if (SHOULD_DOWNLOAD_STORAGE) {
      for (const file of files) {
        downloadResults.push(await downloadStorageFile(bucketName, file.path));
      }
    }
  }

  await writeJson('storage/storage-manifest.json', manifests);
  await writeJson('storage/download-results.json', downloadResults);

  return {
    buckets: Object.fromEntries(
      Object.entries(manifests).map(([bucketName, files]) => [bucketName, files.length]),
    ),
    downloaded: downloadResults.filter((item) => item.ok).length,
    failedDownloads: downloadResults.filter((item) => !item.ok),
  };
};

const buildReadme = (manifest) => `# CMI Map 用户数据备份

生成时间：${manifest.createdAt}

## 目录说明

- \`tables/\`：public schema 下关键表的全量 JSON 备份。
- \`manual-candidates/\`：按当前规则筛出的“人为录入候选”。
- \`review/\`：推荐记录分类表，后续删改前先看这里。
- \`storage/\`：Storage 文件清单；如果允许下载，也包含图片和头像文件。
- \`manifest.json\`：本次备份统计和规则。

## 当前分类规则

- \`authenticated_manual_candidate\`：\`recommendations.user_id\` 不为空，且不是 CMI 社区精选记录。
- \`community_curated\`：\`user_name = CMI社区\` 且 \`reason = 来自 CMI 社区的精选收藏\`。
- \`legacy_or_bulk_candidate\`：没有 \`user_id\`，需要人工复核后再删改。

NOTE: 当前数据库没有 source 字段，所以这是一份保护性备份和复核清单，不是最终删改判决。
`;

const run = async () => {
  await ensureDir(BACKUP_DIR);

  const tables = {};
  for (const tableName of TABLES) {
    tables[tableName] = await fetchTable(tableName);
    await writeJson(`tables/${tableName}.json`, tables[tableName]);
  }

  const classificationRows = buildClassificationRows(tables.recommendations || []);
  const manualBundle = buildManualCandidateBundle(tables);
  const communityCurated = (tables.recommendations || []).filter(
    (item) => classifyRecommendation(item) === 'community_curated',
  );
  const legacyOrBulk = (tables.recommendations || []).filter(
    (item) => classifyRecommendation(item) === 'legacy_or_bulk_candidate',
  );

  await writeJson('manual-candidates/recommendations.json', manualBundle.recommendations);
  await writeJson('manual-candidates/profiles.json', manualBundle.profiles);
  await writeJson('manual-candidates/upvotes.json', manualBundle.upvotes);
  await writeJson('manual-candidates/wishlists.json', manualBundle.wishlists);
  await writeJson('manual-candidates/placed_stickers.json', manualBundle.placed_stickers);
  await writeJson('manual-candidates/stickers.json', manualBundle.stickers);
  await writeJson('review/community-curated-recommendations.json', communityCurated);
  await writeJson('review/legacy-or-bulk-candidate-recommendations.json', legacyOrBulk);
  await writeCsv('review/recommendations-classification.csv', classificationRows, [
    'id',
    'classification',
    'place_name',
    'category',
    'user_name',
    'user_id',
    'created_at',
    'images_count',
    'reason',
  ]);

  const storageSummary = await backupStorage();
  const manifest = {
    createdAt: new Date().toISOString(),
    supabaseUrl: SUPABASE_URL,
    backupDir: BACKUP_DIR,
    tableCounts: Object.fromEntries(Object.entries(tables).map(([name, rows]) => [name, rows.length])),
    recommendationClassificationCounts: classificationRows.reduce((counts, row) => {
      counts[row.classification] = (counts[row.classification] || 0) + 1;
      return counts;
    }, {}),
    manualCandidateCounts: Object.fromEntries(
      Object.entries(manualBundle).map(([name, rows]) => [name, rows.length]),
    ),
    storageSummary,
  };

  await writeJson('manifest.json', manifest);
  await writeFile(join(BACKUP_DIR, 'README.md'), buildReadme(manifest), 'utf8');

  console.log(JSON.stringify(manifest, null, 2));
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
