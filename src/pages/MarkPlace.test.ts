import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('./MarkPlace.tsx', import.meta.url), 'utf8');
const indexCssSource = readFileSync(new URL('../index.css', import.meta.url), 'utf8');
const cmiMapPrototypeCssSource = readFileSync(new URL('./cmi-map-v3-prototype.css', import.meta.url), 'utf8');
const leafletMapSource = readFileSync(new URL('../components/map/LeafletMap.tsx', import.meta.url), 'utf8');
const playgroundMarkPlaceSource = readFileSync(new URL('./PlaygroundMarkPlace.tsx', import.meta.url), 'utf8');

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
  assert.match(source, /prioritizeCheckinActivityEvent\(sortedEvents\)\.slice\(0, 8\)/);
  assert.match(source, /return leftIsCheckinActivity \? -1 : 1/);
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

test('神奇动物打卡会调用动物识别并预选彩蛋', () => {
  assert.match(source, /CMI_MAP_WILD_CHIANG_MAI_EVENT_ID/);
  assert.match(source, /const enableWildAnimalIdentification = \(\) => \{/);
  assert.match(source, /setSelectedEventId\(CMI_MAP_WILD_CHIANG_MAI_EVENT_ID\)/);
  assert.match(source, /aria-pressed=\{isWildAnimalCheckin\}/);
  assert.match(source, /identifyAnimalPhoto\(images\[0\]\)/);
  assert.match(source, /setSelectedInputCategoryId\(easterOption\.id\)/);
  assert.match(source, /setSelectedEasterIconId\(candidate\.iconId\)/);
  assert.match(source, /assignCmiEventCaptureNumber\(recommendation\.id\)/);
  assert.match(source, /createCmiWildAnimalShareCard/);
  assert.match(source, /setWildAnimalShareCard\(shareCard\)/);
  assert.match(source, /分享图鉴卡/);
  assert.match(source, /保存到相册/);
  assert.match(source, /小红书/);
  assert.match(source, /shareWildAnimalCardWithSystem/);
  assert.match(source, /new File\(\[card\.blob\], card\.fileName/);
  assert.match(source, /navigatorWithFileShare\.share/);
  assert.match(source, /navigatorWithFileShare\.canShare/);
  assert.match(source, /wild-magnifier-checkin\.png/);
  assert.doesNotMatch(source, /downloadCmiWildAnimalShareCard\(wildAnimalShareCard\)/);
  assert.match(source, /识别动物/);
  assert.match(source, /动物识别/);
  assert.match(source, /正在识别动物主体。/);
  assert.match(source, /这张没识别清楚，换张近一点的照片或直接写名称。/);
  assert.doesNotMatch(source, /拍照后会先给出可能候选。/);
  assert.doesNotMatch(source, /BioCLIP/);
});

test('发布完成反馈使用鼓励徽章而不是红色罚单感大章', () => {
  assert.match(source, /ThumbsUp/);
  assert.match(source, /功德 \+1/);
  assert.match(source, /大拇哥收到了/);
  assert.match(source, /checkin-badge-pop/);
  assert.doesNotMatch(source, /RECORDED/);
  assert.doesNotMatch(source, /#da2222/);
});

test('发布不再强制进入标签选择页', () => {
  assert.match(source, /const DEFAULT_MARK_PLACE_CATEGORY: Category = '景点'/);
  assert.match(source, /const handleVoiceConfirm = \(\) => \{/);
  assert.match(source, /void handleSubmitFinal\(selectedCat \|\| DEFAULT_MARK_PLACE_CATEGORY\)/);
  assert.doesNotMatch(source, /type Stage = 'camera' \| 'analyzing' \| 'voice' \| 'category'/);
  assert.doesNotMatch(source, /stage === 'category'/);
  assert.doesNotMatch(source, /选择发布标签/);
  assert.doesNotMatch(source, /清迈客栈、彩蛋和普通地点动态都在这里选。/);
  assert.doesNotMatch(source, /先选标签/);
});

test('拍照定位成功后直接用坐标发布，手动选点只作为修改入口', () => {
  assert.match(source, /type LocationCaptureStatus = 'pending' \| 'ready' \| 'failed'/);
  assert.match(source, /setLocationCaptureStatus\('ready'\)/);
  assert.match(source, /setLocationCaptureStatus\('failed'\)/);
  assert.match(source, /if \(locationCaptureStatus === 'failed'\) \{/);
  assert.match(source, /setStage\('map_fallback'\)/);
  assert.match(source, /void handleSubmitFinal\(selectedCat \|\| DEFAULT_MARK_PLACE_CATEGORY\)/);
  assert.match(source, /aria-label="修改位置"/);
  assert.match(source, /位置不对？修改/);
  assert.doesNotMatch(source, /aria-label=\{selectedPlaceLabel \? '进入分类发布' : '先关联地点'\}/);
  assert.doesNotMatch(source, /setStage\(selectedPlaceLabel \? 'category' : 'map_fallback'\)/);
});

test('上传相关页面主题色统一为绿色', () => {
  assert.match(indexCssSource, /--primary: 145 68% 31%/);
  assert.match(indexCssSource, /--accent: 145 45% 92%/);
  assert.match(indexCssSource, /--ring: 145 68% 31%/);
  assert.match(cmiMapPrototypeCssSource, /--cmi-v3-purple: #0b8d45/);

  assert.match(source, /bg-\[#063d27\]/);
  assert.match(source, /bg-\[#0b3d24\]/);
  assert.match(source, /bg-\[#28c76f\]/);
  assert.match(source, /from-\[#41d97b\] via-\[#0f8f4d\] to-\[#075f36\]/);
  assert.match(source, /bg-\[#0b3d24\] text-base font-black text-\[#fff7dc\]/);
  assert.match(source, /bg-\[#dff5e7\]/);
  assert.match(source, /bg-\[#2ea85f\]/);
  assert.match(leafletMapSource, /text-\[#0b8d45\]/);
  assert.match(leafletMapSource, /bg-\[#0b8d45\]/);
  assert.match(playgroundMarkPlaceSource, /bg-\[#0b3d24\] text-\[#fff7dc\]/);

  assert.doesNotMatch(indexCssSource, /--primary: 260/);
  assert.doesNotMatch(indexCssSource, /薰衣草紫/);
  assert.doesNotMatch(source, /bg-\[#191714\]/);
  assert.doesNotMatch(source, /bg-\[#f97316\]/);
  assert.doesNotMatch(source, /bg-\[#f780b6\]/);
  assert.doesNotMatch(source, /bg-foreground text-base font-black text-background/);
  assert.doesNotMatch(leafletMapSource, /text-\[#f97316\]/);
  assert.doesNotMatch(leafletMapSource, /bg-\[#f97316\]/);
});
