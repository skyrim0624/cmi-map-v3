import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('./MarkPlace.tsx', import.meta.url), 'utf8');

test('相册旧照先写体验，不直接跳到手动拖地图', () => {
  assert.match(source, /相册旧照不再先逼用户拖地图/);
  assert.match(source, /const timer2 = setTimeout\(\(\) => \{\s+setStage\('voice'\);/);
  assert.doesNotMatch(source, /sourceType === 'exif' \? 'map_fallback' : 'voice'/);
});

test('手动选点页提供地点搜索和候选绑定', () => {
  assert.match(source, /buildEventPlaceCandidates/);
  assert.match(source, /searchEventPlaceCandidates/);
  assert.match(source, /searchExternalPlaceCandidates/);
  assert.match(source, /placeholder="搜清迈客栈 \/ 店名 \/ 区域"/);
  assert.match(source, /onClick=\{\(\) => applyPlaceCandidate\(candidate\)\}/);
});

test('手动选点地图不会把拖动后的中心继续作为 Leaflet 默认中心', () => {
  assert.match(source, /const \[mapDefaultCenter, setMapDefaultCenter\] = useState\(initialCenter\)/);
  assert.match(source, /defaultCenter=\{mapDefaultCenter\}/);
  assert.match(source, /onCenterChange=\{\(lat, lng\) => setCenter\(\{lat, lng\}\)\}/);
});

test('网页相机拍照输出正方形并使用取景框双指缩放', () => {
  assert.match(source, /getSquareCaptureRect/);
  assert.match(source, /canvas\.width = crop\.outputSize/);
  assert.match(source, /canvas\.height = crop\.outputSize/);
  assert.match(source, /DEFAULT_CAMERA_CAPTURE_QUALITY/);
  assert.match(source, /getTouchDistance/);
  assert.match(source, /onTouchStart=\{handleCameraTouchStart\}/);
  assert.match(source, /onTouchMove=\{handleCameraTouchMove\}/);
  assert.match(source, /style=\{\{ touchAction: 'none' \}\}/);
  assert.match(source, /setCameraZoomValue/);
  assert.doesNotMatch(source, /type="range"/);
  assert.doesNotMatch(source, /handleCameraZoomChange/);
  assert.doesNotMatch(source, /aria-label="调整焦距"/);
});

test('打卡文字输入不再重复生成预览且操作按钮在输入框下方', () => {
  assert.doesNotMatch(source, /描述文字便签/);
  assert.doesNotMatch(source, /stage === 'voice' && \(description \|\| interimTranscript \|\| isListening\)/);
  assert.doesNotMatch(source, /bg-\[#fff9e6\]/);

  const voiceStageSource = source.slice(source.indexOf("{stage === 'voice' && ("));
  assert.doesNotMatch(voiceStageSource, /写一句你对这里的真实感觉/);
  assert.doesNotMatch(voiceStageSource, /还想补充什么/);
  assert.doesNotMatch(voiceStageSource, /还没有关联地点/);
  assert.doesNotMatch(voiceStageSource, /可以先写，下一步再搜地点/);
  assert.doesNotMatch(voiceStageSource, /selectedPlaceLabel \? '更换' : '关联'/);
  assert.doesNotMatch(voiceStageSource, /\{voiceHint\}/);
  assert.doesNotMatch(source, /voiceHint/);

  const textareaIndex = voiceStageSource.indexOf('<textarea');
  const voiceButtonIndex = voiceStageSource.indexOf('onClick={handleVoiceInput}');
  const confirmButtonIndex = voiceStageSource.indexOf('disabled={!description.trim() || isListening}');

  assert.ok(textareaIndex > -1);
  assert.ok(voiceButtonIndex > textareaIndex);
  assert.ok(confirmButtonIndex > textareaIndex);
});

test('清迈客栈标签打卡后进入动态页而不是旧客栈页', () => {
  assert.match(source, /import \{ getCmiFeedPath, getPlacePath \} from '@\/lib\/paths'/);
  assert.match(source, /这张客栈现场已经放到动态里了/);
  assert.match(source, /const defaultDestinationPath = isCmiInnCheckIn \? getCmiFeedPath\(\) : getPlacePath\(recommendation\.place_name\)/);
  assert.doesNotMatch(source, /getCmiHomePath/);
  assert.doesNotMatch(source, /留言墙/);
});

test('打卡只保留活动关联，不再写主题投稿关系', () => {
  assert.match(source, /const initialEventId = searchParams\.get\('event'\)/);
  assert.match(source, /isCmiMapCheckinActivityEvent\(event\)/);
  assert.match(source, /linked_event_id: linkedEvent\.id/);
  assert.match(source, /linked_event_title: linkedEvent\.title/);
  assert.match(source, /navigate\(defaultDestinationPath, \{/);
  assert.doesNotMatch(source, /searchParams\.get\('theme'\)/);
  assert.doesNotMatch(source, /searchParams\.get\('task'\)/);
  assert.doesNotMatch(source, /getCmiMapThemeBySlug/);
  assert.doesNotMatch(source, /createCmiThemeSubmission/);
  assert.doesNotMatch(source, /getThemePath/);
  assert.doesNotMatch(source, /奖励/);
  assert.doesNotMatch(source, /成就/);
  assert.doesNotMatch(source, /排行榜/);
});

test('发布完成反馈使用鼓励徽章而不是红色罚单感大章', () => {
  assert.match(source, /ThumbsUp/);
  assert.match(source, /功德 \+1/);
  assert.match(source, /大拇哥收到了/);
  assert.match(source, /checkin-badge-pop/);
  assert.doesNotMatch(source, /RECORDED/);
  assert.doesNotMatch(source, /#da2222/);
});

test('发布前分类页独立滚动并保留特殊标签和发布按钮', () => {
  assert.match(source, /const priorityCategoryIds = new Set\(\['cmi-inn', 'easter'\]\)/);
  assert.match(source, /const isPublishPreparationStage = stage === 'category' && Boolean\(photoURL\)/);
  assert.match(source, /clamp\(10\.5rem, 28dvh, 13rem\)/);
  assert.match(source, /清迈客栈、彩蛋和普通地点动态都在这里选。/);
  assert.match(source, /routeRootRef\.current\?\.closest\('main'\)/);
  assert.match(source, /scrollContainer\.style\.overflowY = 'hidden'/);
  assert.match(source, /overflow-y-auto overscroll-contain pb-4 pt-4 \[-webkit-overflow-scrolling:touch\]/);
  assert.match(source, /shrink-0 bg-gradient-to-t from-stone-50/);
  assert.match(source, /mx-auto flex h-14 w-full max-w-sm/);
  assert.match(source, /uploading \? '正在发布\.\.\.' : selectedCat \? '发布' : '先选标签'/);
  assert.doesNotMatch(source, /publishSummaryLabel/);
  assert.doesNotMatch(source, /publishSummaryDetail/);
  assert.doesNotMatch(source, /publishButtonLabel/);
});
