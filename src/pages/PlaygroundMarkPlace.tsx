import { useState, useRef, useEffect } from 'react';
import { Camera, MapPin, Mic, Check, ArrowLeft, Loader2, Navigation } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { LeafletMap } from '@/components/map/LeafletMap';

type Stage = 'camera' | 'analyzing' | 'voice' | 'done' | 'map_fallback';

// 前期我们复用那个火花小组件，增强点阵风格
const ScribbleSparks = ({ active }: { active: boolean }) => {
  if (!active) return null;
  const sparks = Array.from({ length: 12 }).map((_, i) => {
    const angle = (i / 12) * Math.PI * 2;
    const distance = 40 + Math.random() * 20; 
    const tx = Math.cos(angle) * distance;
    const ty = Math.sin(angle) * distance;
    const delay = Math.random() * 0.2;
    return (
      <svg key={i} width="16" height="16" viewBox="0 0 24 24" fill="currentColor"
        className="absolute top-1/2 left-1/2 -mt-2 -ml-2 text-primary pointer-events-none drop-shadow-md"
        style={{
          '--tx': `${tx}px`, '--ty': `${ty}px`,
          animation: `star-burst 0.6s ease-out ${delay}s infinite`
        } as any}
      >
        <path d="M12 2c0 4 3 7 7 8-4 .7-7 4-7 8-1-4-4-7-8-8 4-1 6-4 8-8z" />
      </svg>
    );
  });
  return <div className="absolute inset-0 pointer-events-none z-10">{sparks}</div>;
};

export default function PlaygroundMarkPlace() {
  const navigate = useNavigate();
  const [stage, setStage] = useState<Stage>('camera');
  const [photoURL, setPhotoURL] = useState<string | null>(null);
  const [locationName, setLocationName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [flash, setFlash] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [scanned, setScanned] = useState(false);

  const [sourceType, setSourceType] = useState<'live' | 'exif' | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);

  // 1. 照片拦截
  const handleCapture = (e: React.ChangeEvent<HTMLInputElement>, source: 'live' | 'exif') => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      // 触发闪光灯特效
      setFlash(true);
      setTimeout(() => {
        setSourceType(source);
        setPhotoURL(url);
        setStage('analyzing');
        setFlash(false);
      }, 300);
    }
  };

  // 2. 定位分析模拟
  useEffect(() => {
    if (stage === 'analyzing') {
      const timer1 = setTimeout(() => setScanned(true), 1500); // 波浪扫过的时间
      const timer2 = setTimeout(() => {
        setLocationName(sourceType === 'live' ? 'Current Street, Chiang Mai (GPS)' : 'Nimman Road Soi 3 (EXIF)');
        setStage('voice');
      }, 3000); // 彻底定位成功的时间
      return () => { clearTimeout(timer1); clearTimeout(timer2); };
    }
  }, [stage]);

  // 3. 语音对话模拟 (打字机效果)
  const handleMockVoice = () => {
    setIsListening(true);
    setTimeout(() => {
      setIsListening(false);
      mockTypewriter("这里的拿铁有着清迈最好闻的香气。");
    }, 2000);
  };

  const mockTypewriter = (text: string) => {
    setDescription('');
    let i = 0;
    const interval = setInterval(() => {
      setDescription(prev => prev + text.charAt(i));
      i++;
      if (i >= text.length) clearInterval(interval);
    }, 100);
  };

  const resetProcess = () => {
    setStage('camera');
    setPhotoURL(null);
    setLocationName('');
    setDescription('');
    setSourceType(null);
    setScanned(false);
  };

  const handleMapConfirm = () => {
    setLocationName('手动修改后的新位置');
    setStage('voice');
  };

  return (
    <div className="relative min-h-screen bg-stone-100 flex flex-col items-center justify-start overflow-hidden font-sans">
      
      {/* 顶部简易导航回退 */}
      <div className="w-full absolute top-0 z-50 p-6 flex justify-between items-center mix-blend-difference text-white">
        <button onClick={() => navigate(-1)} className="p-2 rounded-full backdrop-blur-md bg-white/10 hover:bg-white/20 transition-all">
          <ArrowLeft className="w-6 h-6" />
        </button>
        {stage !== 'camera' && (
          <button onClick={resetProcess} className="text-sm font-bold tracking-wider uppercase opacity-70 hover:opacity-100">
            重置测试
          </button>
        )}
      </div>

      {/* 噪点特效叠加 (轻量级纸张质感) */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.04] z-[90] mix-blend-multiply" 
           style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}>
      </div>

      {/* 白屏闪光 */}
      <div className={`absolute inset-0 bg-white z-[100] transition-opacity duration-[400ms] pointer-events-none ${flash ? 'opacity-100' : 'opacity-0'}`} />

      {/* STAGE 1: 取景框 */}
      {stage === 'camera' && (
        <div className="w-full h-screen bg-stone-100 flex flex-col relative text-stone-700">
          
          {/* 取景框区域 (拍立得视窗，四周有一点点留白) */}
          <div className="flex-1 relative overflow-hidden bg-black/10 border-[16px] sm:border-[24px] border-stone-100 rounded-[2.5rem] m-2 shadow-[inset_0_4px_12px_rgba(0,0,0,0.1)] backdrop-blur-[1px]">
            
            {/* 取景器手绘框线 (Sketchy Crosshairs) */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-56 h-56 pointer-events-none">
              {/* 中心涂鸦元素替代严肃的焦点 */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 border-[3px] border-primary/40 rounded-full border-dashed" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-primary/60 rounded-full" />
              
              {/* 四周的拍立得取景辅助线，采用更圆润的设计 */}
              <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white/80 rounded-tl-xl" />
              <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white/80 rounded-tr-xl" />
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white/80 rounded-bl-xl" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white/80 rounded-br-xl" />
            </div>

            {/* 手绘感文字 (俏皮取代严肃的仪表盘) */}
            <div className="absolute top-6 left-6 right-6 flex justify-between pointer-events-none">
              <span className="text-white/90 text-3xl drop-shadow-md" style={{ fontFamily: "'Nanum Pen Script', 'Caveat', cursive" }}>
                Smile! :)
              </span>
              <span className="text-white/90 text-3xl drop-shadow-md" style={{ fontFamily: "'Nanum Pen Script', 'Caveat', cursive" }}>
                12 / 24
              </span>
            </div>
            
            {/* 网格线 (隐约的白色虚线) */}
            <div className="absolute top-1/3 left-0 right-0 h-[1px] border-t-2 border-dashed border-white/30 pointer-events-none" />
            <div className="absolute top-2/3 left-0 right-0 h-[1px] border-t-2 border-dashed border-white/30 pointer-events-none" />
            <div className="absolute left-1/3 top-0 bottom-0 w-[1px] border-l-2 border-dashed border-white/30 pointer-events-none" />
            <div className="absolute left-2/3 top-0 bottom-0 w-[1px] border-l-2 border-dashed border-white/30 pointer-events-none" />
          </div>

          {/* 底部小清新机身 (奶油色拍立得质感) */}
          <div className="h-48 sm:h-56 bg-white relative flex flex-col items-center justify-center shadow-[0_-10px_30px_-10px_rgba(0,0,0,0.08)] pb-safe rounded-t-[40px] z-10">
            {/* 顶部的相纸出口槽 (拍立得标志性特征) */}
            <div className="absolute top-5 w-32 h-1.5 bg-stone-200 rounded-full shadow-inner opacity-80" />
            
            <div className="flex items-center gap-6 mt-4 z-10 w-full justify-center px-8">
              
              {/* 隐藏的文件上传 */}
              <input 
                type="file" 
                accept="image/*" 
                capture="environment" 
                className="hidden"
                onChange={(e) => handleCapture(e, 'live')}
                ref={fileInputRef}
              />
              <input 
                type="file" 
                accept="image/*" 
                className="hidden"
                onChange={(e) => handleCapture(e, 'exif')}
                ref={uploadInputRef}
              />

              {/* 伪装的空位，用于平衡两边布局 */}
              <div className="w-12 h-12" />

              {/* 果冻感巨大快门按钮 (现拍 / Live GPS) */}
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="relative w-[88px] h-[88px] sm:w-[96px] sm:h-[96px] rounded-full flex flex-col items-center justify-center group active:scale-[0.92] transition-transform duration-200 outline-none shrink-0"
              >
                <div className="absolute inset-0 rounded-full border-4 border-stone-100 shadow-[0_8px_20px_rgba(0,0,0,0.06),inset_0_4px_8px_rgba(0,0,0,0.02)] transition-shadow bg-[#fdfdfc]"></div>
                <div className="w-[76%] h-[76%] rounded-full bg-gradient-to-br from-[#ff8c42] to-[#e64a00] shadow-[inset_0_-4px_10px_rgba(0,0,0,0.1),0_4px_12px_rgba(255,94,0,0.4)] group-active:shadow-[inset_0_4px_10px_rgba(0,0,0,0.2),0_2px_4px_rgba(255,94,0,0.2)] transition-all flex items-center justify-center">
                  <div className="absolute top-4 left-6 w-5 h-5 bg-white/40 rounded-full blur-[2px]"></div>
                </div>
              </button>

              {/* 右侧相册上传按钮 (旧图 / EXIF GPS) */}
              <button 
                onClick={() => uploadInputRef.current?.click()}
                className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center text-stone-500 shadow-inner hover:bg-stone-200 transition-colors active:scale-95"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
              </button>

            </div>
            
            {/* 活泼的引导字 */}
            <span className="mt-5 text-stone-400 font-bold tracking-[0.2em] text-xs uppercase opacity-80" style={{ fontFamily: "'Inter', sans-serif" }}>
              Push to capture
            </span>
          </div>
        </div>
      )}

      {/* STAGE 2 & 3 & 4: 照片定格与后续流转 */}
      {stage !== 'camera' && photoURL && (
        <div className="w-full max-w-lg min-h-screen relative p-6 pt-24 pb-32 flex flex-col items-center">
          
          {/* 拍立得照片本体 */}
          <div className={`
            relative w-full aspect-[4/5] bg-white p-3 pb-16 rounded-sm shadow-[0_20px_40px_-15px_rgba(0,0,0,0.15)] 
            transition-all duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)]
            ${stage === 'analyzing' ? 'scale-95 rotate-1' : 'scale-100 rotate-[-1deg]'}
          `}>
            {/* 相片遮罩区 */}
            <div className="w-full h-full relative overflow-hidden bg-stone-200 rounded-sm">
              <img src={photoURL} className="w-full h-full object-cover" alt="Captured" />
              
              {/* 定位扫描波浪动画 */}
              {stage === 'analyzing' && !scanned && (
                <div className="absolute inset-0 pointer-events-none">
                  <div className="w-[150%] h-4 bg-primary/40 blur-md rotate-12 absolute top-0 -left-1/4 animate-[scan_1.5s_ease-in-out_infinite]" />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[2px]">
                    <div className="flex flex-col items-center text-white/90 drop-shadow-md">
                      <Loader2 className="w-8 h-8 animate-spin mb-2" />
                      <span className="font-medium tracking-wide">
                        {sourceType === 'live' ? '获取当前实时坐标...' : '解析旧照空间记忆...'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 图钉与定位信息 (Stage 2 完成后掉落) */}
            <div className={`
              absolute bottom-4 left-4 right-4 flex items-center justify-between
              transition-all duration-700 delay-300 bg-white/60 backdrop-blur-md px-2 py-1.5 rounded-2xl
              ${locationName && stage !== 'map_fallback' ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0 pointer-events-none'}
            `}>
              <div className="flex items-center gap-2 overflow-hidden">
                <div className="p-1.5 bg-primary/10 rounded-full text-primary shrink-0 animate-bounce">
                  <MapPin className="w-4 h-4 fill-primary/20" />
                </div>
                <span className="font-medium text-sm leading-tight truncate px-1 text-stone-700" 
                      style={{ fontFamily: "'Nanum Pen Script', 'Caveat', cursive" }}>
                  {locationName || '...'}
                </span>
              </div>
              
              {/* 手动兜底编辑按钮 */}
              <button 
                onClick={() => setStage('map_fallback')}
                className="shrink-0 p-1.5 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-200 transition-colors"
                title="手动微调位置"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/></svg>
              </button>
            </div>

            {/* 描述文字生成区 (打字机效果) */}
            {stage !== 'map_fallback' && (description || isListening) && (
              <div className="absolute -bottom-8 -right-6 w-4/5 transform rotate-3 z-20">
                <div className="bg-[#fff9e6] p-4 text-stone-800 text-[17px] leading-relaxed shadow-sm border border-[#f0e6d2]"
                     style={{ 
                       fontFamily: "'Varela Round', 'Nunito', 'PingFang SC', 'Microsoft YaHei', ui-rounded, sans-serif",
                       fontWeight: 500,
                       letterSpacing: "0.02em",
                       borderRadius: '255px 15px 225px 15px/15px 225px 15px 255px' 
                     }}>
                  {description}
                  {isListening && <span className="inline-block w-2.5 h-5 bg-stone-400 animate-pulse ml-1 align-middle" />}
                </div>
                {/* 胶带 */}
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-16 h-6 bg-white/40 backdrop-blur-sm -rotate-2 border border-white/20 shadow-sm" />
              </div>
            )}
            
            {/* Stage 4 完成印章飞入 (高定邮戳/入国章风格) */}
            {stage === 'done' && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-[-8deg] pointer-events-none z-50 animate-[stamp_0.6s_cubic-bezier(0.175,0.885,0.32,1.275)_forwards]">
                <div className="relative flex items-center justify-center w-40 h-40 border-[3px] border-[#da2222] border-dashed rounded-full mix-blend-multiply opacity-[0.85] shadow-sm bg-[#da2222]/[0.02]">
                  
                  {/* 内圈与复古边框 */}
                  <div className="absolute inset-1.5 border-2 border-[#da2222] rounded-full opacity-70" />
                  
                  {/* 印记文案编排 */}
                  <div className="flex flex-col items-center justify-center transform -translate-y-0.5">
                    <span className="text-[11px] font-bold tracking-[0.2em] text-[#da2222] opacity-90 mb-1" style={{ fontFamily: "'Inter', sans-serif" }}>
                      CMI MAP
                    </span>
                    <div className="border-y-[3px] border-[#da2222] py-2 px-1 bg-white/60 backdrop-blur-[1px] w-36 text-center transform rotate-[-4deg]">
                      <span className="text-[1.65rem] leading-none font-black tracking-widest text-[#da2222] opacity-90" style={{ fontFamily: "'Times New Roman', serif" }}>
                        RECORDED
                      </span>
                    </div>
                    <span className="text-[10px] font-bold tracking-[0.15em] text-[#da2222] mt-1.5 opacity-80" style={{ fontFamily: "'Inter', sans-serif" }}>
                      {new Date().toLocaleDateString('en-GB').replace(/\//g, '.')}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 底部操作区 */}
          <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-stone-100 via-stone-100 to-transparent flex flex-col items-center pb-safe">
            
            {stage === 'map_fallback' && (
               <div className="w-full flex flex-col gap-3 pb-6 animate-in slide-in-from-bottom-10 fade-in">
                 <div className="text-center mb-4">
                   <p className="text-stone-700 font-bold mb-1">手动选择地标</p>
                   <p className="text-stone-500 text-xs">拖动地图以微调推荐点</p>
                 </div>
                 
                 {/* 真实的地图选点界面 */}
                 <div className="w-full h-80 bg-stone-300 rounded-2xl relative overflow-hidden flex items-center justify-center mb-2 shadow-inner pointer-events-auto">
                   <LeafletMap mode="mark" onCenterChange={() => {}} className="w-full h-full border-none outline-none" />
                 </div>

                 <button 
                   onClick={handleMapConfirm}
                   className="w-full h-14 bg-foreground text-background font-bold rounded-2xl flex items-center justify-center shadow-lg hover:scale-[1.02] transition-transform"
                 >
                   确认位置，去说故事
                 </button>
                 <button 
                   onClick={() => setStage('voice')}
                   className="w-full text-stone-500 font-medium text-sm mt-2 hover:text-stone-800"
                 >
                   取消修改
                 </button>
               </div>
            )}

            {stage === 'voice' && (
              <div className="w-full flex flex-col items-center gap-6 pb-6 animate-in slide-in-from-bottom-10 fade-in duration-500">
                <p className="text-stone-500 font-medium tracking-widest uppercase text-xs">Tap to whisper a memory</p>
                <button 
                  onClick={handleMockVoice}
                  disabled={isListening}
                  className={`
                    relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300
                    ${isListening ? 'bg-primary text-white scale-110 shadow-xl shadow-primary/30' : 'bg-white text-stone-800 shadow-lg hover:scale-105 active:scale-95'}
                  `}
                >
                  <ScribbleSparks active={isListening} />
                  <Mic className={`w-8 h-8 ${isListening ? 'animate-pulse' : ''}`} />
                </button>
                
                {description.length > 0 && !isListening && (
                  <button 
                    onClick={() => setStage('done')}
                    className="mt-2 text-primary font-bold text-lg flex items-center gap-2 bg-primary/10 px-6 py-3 rounded-full hover:bg-primary/20 transition-colors animate-in zoom-in-50"
                  >
                    完成标记 <Check className="w-5 h-5" />
                  </button>
                )}
              </div>
            )}

            {stage === 'done' && (
               <div className="w-full flex gap-3 pb-6 animate-in slide-in-from-bottom-10 fade-in">
                 <button 
                   onClick={() => navigate('/')}
                   className="flex-1 h-14 bg-foreground text-background font-bold rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-foreground/20 hover:scale-[1.02] transition-transform"
                 >
                   <Navigation className="w-5 h-5" /> 返回地图
                 </button>
                 <button 
                   onClick={resetProcess}
                   className="flex-1 h-14 bg-white border-2 border-stone-200 text-stone-800 font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-stone-50 transition-colors"
                 >
                   再传一张
                 </button>
               </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
