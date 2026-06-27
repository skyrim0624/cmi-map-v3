import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('./CmiMapV3Prototype.tsx', import.meta.url), 'utf8');
const styles = readFileSync(new URL('./cmi-map-v3-prototype.css', import.meta.url), 'utf8');

test('V3 原型不再保留内部活动详情屏', () => {
  assert.doesNotMatch(source, /eventDetail/);
  assert.doesNotMatch(source, /EventDetailMode/);
});

test('地图活动底栏主体链接到正式活动详情页', () => {
  assert.match(source, /detailHref=\{getCmiEventPath\(selectedEvent\.id\)\}/);
  assert.match(source, /onDetailOpen=\{\(\) => onOpenPath\(getCmiEventPath\(selectedEvent\.id\)\)\}/);
  assert.match(source, /onClick: \(\) => onOpenPath\(getCmiEventPath\(selectedEvent\.id\)\)/);
  assert.match(
    source,
    /className="cmi-v3-selected-note-summary cmi-v3-selected-note-summary--link"[\s\S]*href=\{detailHref\}/,
  );
  assert.match(source, /onClick=\{handleDetailLinkClick\}/);
});

test('地图打卡 marker 直接打开地点详情页', () => {
  assert.match(
    source,
    /const handleMapRecommendationSelect = useCallback\(\(recommendation: Recommendation\) => \{[\s\S]*navigate\(getPlacePath\(recommendation\.place_name\)\);[\s\S]*\}, \[navigate\]\);/
  );
  assert.match(
    source,
    /const recommendation = marker\.recommendations\[0\];[\s\S]*if \(recommendation\) \{[\s\S]*navigate\(getPlacePath\(recommendation\.place_name\)\);[\s\S]*return;[\s\S]*\}[\s\S]*setSelectedMarker\(marker\);/
  );
});

test('主地图固定活动入口打开活动说明页而不是相机', () => {
  assert.match(source, /CMI_MAP_WILD_CHIANG_MAI_EVENT_ID/);
  assert.match(source, /const primaryActivityEvent = useMemo/);
  assert.match(source, /className="cmi-v3-map-activity-entry"/);
  assert.match(source, /onClick=\{\(\) => onOpenPath\(getCmiEventPath\(primaryActivityEvent\.id\)\)\}/);
  assert.match(source, /aria-label=\{`打开\$\{primaryActivityEvent\.title\}活动说明`\}/);
  assert.doesNotMatch(source, /getMarkPlacePath\(\{ eventId: primaryActivityEvent\.id \}\)/);
});

test('底部拍照入口使用神奇动物主题放大镜而不是加号', () => {
  assert.match(source, /src="\/map-icons\/cmi-flat-v2\/wild-magnifier-checkin\.png"/);
  assert.match(source, /navigate\(getMarkPlacePath\(\{ eventId: CMI_MAP_WILD_CHIANG_MAI_EVENT_ID \}\)\)/);
  assert.doesNotMatch(source, /function WildMagnifierIcon\(\)/);
  assert.doesNotMatch(source, /<Plus size=\{36\}/);
});

test('动态页底色使用神奇动物活动主页绿色且帖子保持白底', () => {
  assert.match(
    styles,
    /\.cmi-v3-screen--feed \.cmi-v3-comic-page,\n\.cmi-v3-screen--feed \.cmi-v3-comic-scroll \{\n  background: #07934d;\n\}/,
  );
  assert.match(
    styles,
    /\.cmi-v3-feed-center \{[\s\S]*?background: #07934d;[\s\S]*?padding: 18px 14px 0;[\s\S]*?\}/,
  );
  assert.match(
    styles,
    /\.cmi-v3-feed-stream \{[\s\S]*?background: #07934d;[\s\S]*?\}/,
  );
  assert.match(
    styles,
    /\.cmi-v3-feed-featured \{[\s\S]*?grid-template-columns: 96px minmax\(0, 1fr\);[\s\S]*?margin-right: -14px;[\s\S]*?margin-left: -14px;[\s\S]*?border-radius: 0;[\s\S]*?background: #fff;[\s\S]*?\}/,
  );
  assert.match(
    styles,
    /\.cmi-v3-feed-stream \.cmi-v3-feed-card,[\s\S]*?background: #fff;[\s\S]*?box-shadow: none;/,
  );
});

test('动态流帖子使用正文优先排版并显示右上角关联标签', () => {
  const feedModeSource = source.slice(source.indexOf('function FeedMode'), source.indexOf('function FeedCenterPanel'));
  const featuredCardSource = source.slice(
    source.indexOf('function FeedCenterPanel'),
    source.indexOf('function BlackboardFeedCard'),
  );
  const forumCardSource = source.slice(
    source.indexOf('function BlackboardFeedCard'),
    source.indexOf('function RecommendationFeedCard'),
  );
  const recommendationCardSource = source.slice(
    source.indexOf('function RecommendationFeedCard'),
    source.indexOf('function RecommendationActionButtons'),
  );

  assert.doesNotMatch(feedModeSource, /linkedEventBadge=\{getRecommendationEventBadge\(feedItem\.recommendation, events\)\}/);
  assert.match(feedModeSource, /associationTag=\{getRecommendationAssociationTag\(feedItem\.recommendation, events\)\}/);
  assert.match(source, /function getRecommendationAssociationTag/);
  assert.match(source, /function getBlackboardAssociationTag/);
  assert.doesNotMatch(featuredCardSource, /normalizeCategory\(recommendation\.category\)/);
  assert.doesNotMatch(featuredCardSource, /<h2>\{content\.title\}<\/h2>/);
  assert.doesNotMatch(featuredCardSource, /cmi-v3-feed-featured-reference/);
  assert.match(featuredCardSource, /<FeedAssociationTag tag=\{content\.associationTag\} \/>/);
  assert.doesNotMatch(forumCardSource, /<h2>\{post\.title\}<\/h2>/);
  assert.doesNotMatch(forumCardSource, /引用活动：/);
  assert.doesNotMatch(forumCardSource, /className="cmi-v3-feed-meta-line"/);
  assert.match(forumCardSource, /<FeedAssociationTag tag=\{getBlackboardAssociationTag\(post, events\)\} \/>/);
  assert.doesNotMatch(recommendationCardSource, /<EventPosterWatermark badge=\{linkedEventBadge\} variant="feed" \/>/);
  assert.doesNotMatch(recommendationCardSource, /const categoryLabel = normalizeCategory\(recommendation\.category\)/);
  assert.doesNotMatch(recommendationCardSource, /\{`\$\{categoryLabel\} · \$\{formatTraceTime\(recommendation\.created_at\)\}`\}/);
  assert.doesNotMatch(recommendationCardSource, /<h2>\{recommendation\.place_name\}<\/h2>/);
  assert.match(recommendationCardSource, /<span>\{formatTraceTime\(recommendation\.created_at\)\}<\/span>/);
  assert.match(recommendationCardSource, /<FeedAssociationTag tag=\{associationTag\} \/>/);
  assert.match(recommendationCardSource, /<p>\{getRecommendationSummary\(recommendation\)\}<\/p>\s*<\/div>\s*<RecommendationActionButtons/);
  assert.match(
    styles,
    /\.cmi-v3-feed-stream \.cmi-v3-feed-card p,[\s\S]*?\.cmi-v3-forum-post-card p \{[\s\S]*?-webkit-line-clamp: 4;[\s\S]*?font-size: 15px;/,
  );
  assert.match(
    styles,
    /\.cmi-v3-feed-association-tag \{[\s\S]*?position: absolute;[\s\S]*?top: 13px;[\s\S]*?right: 14px;/,
  );
  assert.match(
    styles,
    /\.cmi-v3-feed-stream \.cmi-v3-recommendation-actions \{[\s\S]*?position: absolute;[\s\S]*?right: 14px;[\s\S]*?bottom: 12px;/,
  );
});

test('动态流和底部动态列表不展示纯经纬度地点名', () => {
  assert.match(source, /getDisplayPlaceName/);
  assert.match(source, /getRecommendationMetaParts/);
  assert.match(source, /const placeName = getDisplayPlaceName\(recommendation\.place_name\)/);
  assert.doesNotMatch(source, /return placeName \? \{ kind: 'place', label: placeName \} : null;/);
  assert.doesNotMatch(source, /\$\{formatTraceTime\(recommendation\.created_at\)\} · \$\{recommendation\.place_name\}/);
});

test('动态页保留完整历史动态，不做固定条数截断', () => {
  const feedModeSource = source.slice(source.indexOf('function FeedMode'), source.indexOf('function PublishMode'));

  assert.match(feedModeSource, /sortCmiV3FeedItems\(/);
  assert.doesNotMatch(feedModeSource, /sortCmiV3FeedItems\([\s\S]*?\)\.slice\(0,\s*60\)/);
});
