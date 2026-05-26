import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { execFileSync } from 'node:child_process';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const PROJECT_REF = 'sfpcpxlxslnulzlmjcby';
const LOOKBACK_HOURS = Number(process.env.CMI_AUDIT_LOOKBACK_HOURS || '24');
const OUTPUT_DIR = join(process.cwd(), 'scratch', 'recent-recommendation-audit');
const SHOULD_APPLY = process.argv.includes('--apply');

if (!SUPABASE_URL) {
  console.error('缺少 Supabase URL 环境变量。请先 source .env。');
  process.exit(1);
}

const getServiceRoleFromCli = () => {
  try {
    const output = execFileSync(
      'supabase',
      ['projects', 'api-keys', '--project-ref', PROJECT_REF, '--output', 'json'],
      { encoding: 'utf8' },
    );
    const keys = JSON.parse(output);
    return keys.find((item) => item.name === 'service_role' || item.id === 'service_role')?.api_key ?? null;
  } catch {
    return null;
  }
};

const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || getServiceRoleFromCli();
const fallbackKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, serviceRoleKey || fallbackKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

const normalize = (value) => value.trim().toLocaleLowerCase();

const contains = (text, keywords) => keywords.some((keyword) => normalize(text).includes(normalize(keyword)));

const inferPlaceTypes = (row) => {
  const text = `${row.place_name} ${row.reason}`;
  const placeTypes = [];
  const isFreshMarket = contains(text, ['菜市场', '生鲜', '水果', '榴莲', '榴莲摊', 'fresh market']);
  const isGenericMarket = contains(text, ['市集', '集市', 'market', 'bazaar', 'walking street']);

  if (contains(text, ['看书', '书店', '买书', '文具', 'book', 'library'])) {
    placeTypes.push('reading', 'stationery');
  }
  if (contains(text, ['寺庙', 'temple', 'wat'])) {
    placeTypes.push('temple');
  }
  if (contains(text, ['瀑布', 'waterfall', '山顶', '最高峰'])) {
    placeTypes.push('nature');
  }
  if (contains(text, ['体育场', '跑步', '健身'])) {
    placeTypes.push('stadium');
  }
  if (contains(text, ['咖啡', 'cafe', 'coffee', 'brunch'])) {
    placeTypes.push('cafe');
  }
  if (isFreshMarket) {
    placeTypes.push('fresh-market');
  }
  if (isGenericMarket && !isFreshMarket) {
    placeTypes.push('market');
  }
  if (contains(text, ['餐厅', '好吃', '泰国菜'])) {
    placeTypes.push('restaurant');
  }

  return [...new Set(placeTypes)];
};

const auditRow = (row) => {
  const text = `${row.place_name} ${row.reason}`;
  const suggestedPlaceTypes = inferPlaceTypes(row);

  if (row.category !== '购物' && contains(text, ['看书', '书店', '买书', '文具', 'book', 'library'])) {
    return {
      id: row.id,
      placeName: row.place_name,
      createdAt: row.created_at,
      rawCategory: row.category,
      suggestedCategory: '购物',
      suggestedPlaceTypes,
      confidence: 0.98,
      status: 'needs_source_fix',
      reason: '原始 category 与书店/买书语义冲突，应该归入购物并用看书/书店细分类展示。',
    };
  }

  if (row.category === '市集' && contains(text, ['榴莲', '水果', '榴莲摊'])) {
    return {
      id: row.id,
      placeName: row.place_name,
      createdAt: row.created_at,
      rawCategory: row.category,
      suggestedCategory: row.category,
      suggestedPlaceTypes: ['fresh-market'],
      confidence: 0.91,
      status: 'detail_only',
      reason: '粗分类可保留为市集，但细分类应直接落到 fresh-market，不应混成泛 market。',
    };
  }

  if (row.category === '吃饭' && contains(text, ['泰国菜', '好吃'])) {
    return {
      id: row.id,
      placeName: row.place_name,
      createdAt: row.created_at,
      rawCategory: row.category,
      suggestedCategory: row.category,
      suggestedPlaceTypes,
      confidence: 0.8,
      status: 'detail_only',
      reason: '粗分类正确，可补 restaurant 细分类。',
    };
  }

  return {
    id: row.id,
    placeName: row.place_name,
    createdAt: row.created_at,
    rawCategory: row.category,
    suggestedCategory: row.category,
    suggestedPlaceTypes,
    confidence: suggestedPlaceTypes.length > 0 ? 0.7 : 0.5,
    status: 'reviewed_ok',
    reason: suggestedPlaceTypes.length > 0 ? '未发现明显大类错误。' : '信息不足，暂不自动改动。',
  };
};

const main = async () => {
  const since = new Date(Date.now() - LOOKBACK_HOURS * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('recommendations')
    .select('id, place_name, category, reason, user_name, latitude, longitude, created_at, place_type_ids, detail_tag_ids, classification_status, classification_source, classification_confidence, classified_at')
    .gte('created_at', since)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('拉取最近推荐失败：', error);
    process.exit(1);
  }

  const audited = data.map(auditRow);

  const appliedFixes = [];
  if (SHOULD_APPLY) {
    if (!serviceRoleKey) {
      console.error('未拿到 service_role，无法回写 Supabase。');
      process.exit(1);
    }

    for (const item of audited.filter((entry) => entry.status === 'detail_only' && entry.confidence >= 0.8)) {
      const { data: updatedRows, error: updateError } = await supabase
        .from('recommendations')
        .update({
          place_type_ids: item.suggestedPlaceTypes,
          detail_tag_ids: [],
          classification_status: 'auto_high_confidence',
          classification_source: 'codex_recent_recommendation_audit',
          classification_confidence: item.confidence,
          classified_at: new Date().toISOString(),
        })
        .eq('id', item.id)
        .select('id, place_name, place_type_ids, classification_status, classification_confidence');

      if (updateError) {
        throw updateError;
      }

      appliedFixes.push({
        id: item.id,
        placeName: item.placeName,
        kind: 'place_type',
        updatedRows,
      });
    }
  }

  const summary = {
    since,
    checkedCount: audited.length,
    sourceFixCount: audited.filter((item) => item.status === 'needs_source_fix').length,
    detailOnlyCount: audited.filter((item) => item.status === 'detail_only').length,
    reviewedOkCount: audited.filter((item) => item.status === 'reviewed_ok').length,
    serviceRoleAvailable: Boolean(serviceRoleKey),
    appliedFixCount: appliedFixes.length,
  };

  await mkdir(OUTPUT_DIR, { recursive: true });
  await writeFile(
    join(OUTPUT_DIR, 'latest.json'),
    `${JSON.stringify({ summary, audited, appliedFixes }, null, 2)}\n`,
    'utf8',
  );

  const markdown = [
    '# 最近推荐审计',
    '',
    `- 回看窗口：最近 ${LOOKBACK_HOURS} 小时`,
    `- 检查条数：${summary.checkedCount}`,
    `- 需修正原始 category：${summary.sourceFixCount}`,
    `- 仅需补细分类：${summary.detailOnlyCount}`,
    `- 其余暂时通过：${summary.reviewedOkCount}`,
    `- 已回写：${summary.appliedFixCount}`,
    '',
    '## 明显错误',
    ...audited
      .filter((item) => item.status === 'needs_source_fix')
      .map((item) => `- ${item.placeName} | ${item.rawCategory} -> ${item.suggestedCategory} | ${item.reason}`),
    '',
    '## 可补细分类',
    ...audited
      .filter((item) => item.status === 'detail_only')
      .map((item) => `- ${item.placeName} | ${item.rawCategory} | ${item.suggestedPlaceTypes.join(', ') || '无'} | ${item.reason}`),
  ].join('\n');

  await writeFile(join(OUTPUT_DIR, 'latest.md'), `${markdown}\n`, 'utf8');
  console.log(JSON.stringify(summary, null, 2));
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
