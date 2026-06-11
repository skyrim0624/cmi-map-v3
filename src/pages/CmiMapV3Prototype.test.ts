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

test('动态流帖子使用正文优先排版且不显示活动或分类标签', () => {
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
  assert.doesNotMatch(featuredCardSource, /normalizeCategory\(recommendation\.category\)/);
  assert.doesNotMatch(featuredCardSource, /<h2>\{content\.title\}<\/h2>/);
  assert.doesNotMatch(featuredCardSource, /cmi-v3-feed-featured-reference/);
  assert.doesNotMatch(forumCardSource, /<h2>\{post\.title\}<\/h2>/);
  assert.doesNotMatch(forumCardSource, /引用活动：/);
  assert.doesNotMatch(forumCardSource, /className="cmi-v3-feed-meta-line"/);
  assert.doesNotMatch(recommendationCardSource, /<EventPosterWatermark badge=\{linkedEventBadge\} variant="feed" \/>/);
  assert.doesNotMatch(recommendationCardSource, /const categoryLabel = normalizeCategory\(recommendation\.category\)/);
  assert.doesNotMatch(recommendationCardSource, /\{`\$\{categoryLabel\} · \$\{formatTraceTime\(recommendation\.created_at\)\}`\}/);
  assert.doesNotMatch(recommendationCardSource, /<h2>\{recommendation\.place_name\}<\/h2>/);
  assert.match(recommendationCardSource, /<span>\{formatTraceTime\(recommendation\.created_at\)\}<\/span>/);
  assert.match(
    styles,
    /\.cmi-v3-feed-stream \.cmi-v3-feed-card p,[\s\S]*?\.cmi-v3-forum-post-card p \{[\s\S]*?-webkit-line-clamp: 4;[\s\S]*?font-size: 15px;/,
  );
});
