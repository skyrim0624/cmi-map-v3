import { useState, useRef, useEffect, useMemo } from 'react';
import { MapPin, Mic, MicOff, Check, ArrowLeft, Loader2, PencilLine, Shuffle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { LeafletMap } from '@/components/map/LeafletMap';
import { createRecommendation, uploadImages } from '@/db/api';
import { useAuth } from '@/contexts/AuthContext';
import { getCategoryIconUrl } from '@/types/types';
import type { Category } from '@/types/types';
import { getCmiInputCategoryOptions } from '@/data/cmi-taxonomy';
import {
  CMI_EASTER_ICON_OPTIONS,
  DEFAULT_CMI_EASTER_ICON_ID,
  getCmiEasterIconById,
} from '@/lib/easter-icons';
import { getPlacePath } from '@/lib/paths';
import { toast } from 'sonner';

type Stage = 'camera' | 'analyzing' | 'voice' | 'category' | 'done' | 'map_fallback';
type SpeechRecognitionConstructor = new () => {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onstart: (() => void) | null;
  onresult: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

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

export default function MarkPlace() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  
  const [stage, setStage] = useState<Stage>('camera');
  const [photoURL, setPhotoURL] = useState<string | null>(null);
  const [images, setImages] = useState<File[]>([]);
  const [locationName, setLocationName] = useState<string>('');
  const [center, setCenter] = useState({ lat: 18.7883, lng: 98.9853 });
  const [description, setDescription] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  
  const [flash, setFlash] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [voiceHint, setVoiceHint] = useState('也可以直接打字，不用语音。');
  const [scanned, setScanned] = useState(false);

  const [sourceType, setSourceType] = useState<'live' | 'exif' | null>(null);

  const [selectedCat, setSelectedCat] = useState<Category | ''>('');
  const [selectedInputCategoryId, setSelectedInputCategoryId] = useState<string>('');
  const [selectedEasterIconId, setSelectedEasterIconId] = useState(DEFAULT_CMI_EASTER_ICON_ID);
  const [easterIconQuery, setEasterIconQuery] = useState('');
  const inputCategoryOptions = getCmiInputCategoryOptions();
  const selectedEasterIcon = getCmiEasterIconById(selectedEasterIconId);
  const filteredEasterIcons = useMemo(() => {
    const query = easterIconQuery.trim().toLocaleLowerCase();
    if (!query) return CMI_EASTER_ICON_OPTIONS;

    return CMI_EASTER_ICON_OPTIONS.filter(icon =>
      icon.id.includes(query) ||
      icon.slug.includes(query) ||
      icon.label.toLocaleLowerCase().includes(query)
    );
  }, [easterIconQuery]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // 初始化 Web Speech API
  useEffect(() => {
    const speechWindow = window as typeof window & {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };
    const SpeechRecognition = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.lang = 'zh-CN';
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.onstart = () => {
        setIsListening(true);
        setVoiceHint('正在听，讲完后会自动写到下面。');
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results?.[0]?.[0]?.transcript?.trim();
        if (!transcript) {
          setVoiceHint('没有听清，可以直接打字。');
          return;
        }
        setDescription(prev => prev ? `${prev} ${transcript}` : transcript);
        setVoiceHint('已写入，可以继续补充或直接下一步。');
      };

      recognition.onerror = (event: any) => {
        console.error('语音识别错误:', event.error);
        const nextHint =
          event.error === 'not-allowed'
            ? '麦克风权限没开，直接打字也可以。'
            : event.error === 'no-speech'
              ? '刚才没听到声音，可以再点一次或直接打字。'
              : '这个浏览器的语音识别不稳定，直接打字更稳。';
        setVoiceHint(nextHint);
        toast(nextHint);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
        setVoiceHint(prev => prev === '正在听，讲完后会自动写到下面。' ? '可以继续说，也可以直接打字。' : prev);
      };

      setSpeechSupported(true);
      recognitionRef.current = recognition;
    } else {
      setSpeechSupported(false);
      setVoiceHint('当前浏览器不支持语音识别，直接打字就行。');
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // NOTE: 部分浏览器在未开始识别时调用 stop 会抛错，卸载时忽略即可。
        }
      }
    };
  }, []);

  // 初始化 WebRTC 相机
  useEffect(() => {
    if (stage === 'camera') {
      const startCamera = async () => {
        try {
          const mediaStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment' }
          });
          streamRef.current = mediaStream;
          if (videoRef.current) {
            videoRef.current.srcObject = mediaStream;
          }
        } catch (err) {
          console.error("相机权限获取失败:", err);
          toast('相机打不开，可以从相册选择照片');
        }
      };
      startCamera();
    } else {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    }
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, [stage]);

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current && streamRef.current && videoRef.current.readyState === 4) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], "capture.jpg", { type: "image/jpeg" });
            const url = URL.createObjectURL(file);
            setImages([file]);
            setFlash(true);
            fetchCurrentLocation();
            setTimeout(() => {
              setSourceType('live');
              setPhotoURL(url);
              setStage('analyzing');
              setFlash(false);
            }, 300);
          }
        }, 'image/jpeg', 0.8);
      }
    } else {
      // Fallback
      fileInputRef.current?.click();
    }
  };

  // 未登录保护
  useEffect(() => {
    if (!user) {
      toast.error('只有社区成员可以留下痕迹，请先登录');
      navigate('/login');
    }
  }, [user, navigate]);

  // 获取地理位置
  const fetchCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCenter({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          setLocationName('实时坐标 (GPS)');
        },
        (error) => {
          console.error("GPS 获取失败", error);
          setLocationName('未知坐标 (定位失败)');
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    } else {
      setLocationName('浏览器不支持定位');
    }
  };

  // 1. 照片拦截
  const handleCapture = (e: React.ChangeEvent<HTMLInputElement>, source: 'live' | 'exif') => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setImages([file]);
      setFlash(true);
      
      if (source === 'live') {
        fetchCurrentLocation();
      } else {
        setLocationName('相册照片 (默认坐标)');
      }

      setTimeout(() => {
        setSourceType(source);
        setPhotoURL(url);
        setStage('analyzing');
        setFlash(false);
      }, 300);
    }
  };

  const startQuickTextFlow = () => {
    setImages([]);
    setPhotoURL(null);
    setSourceType(null);
    setDescription('');
    setLocationName('手动选点');
    setStage('map_fallback');
  };

  // 2. 定位分析动画
  useEffect(() => {
    if (stage === 'analyzing') {
      const timer1 = setTimeout(() => setScanned(true), 1500);
      const timer2 = setTimeout(() => {
        setStage(sourceType === 'exif' ? 'map_fallback' : 'voice');
      }, 3000);
      return () => { clearTimeout(timer1); clearTimeout(timer2); };
    }
  }, [stage, sourceType]);

  // 3. 语音对话控制
  const handleVoiceInput = () => {
    if (!speechSupported || !recognitionRef.current) {
      toast('当前浏览器不支持语音识别，直接打字就行');
      return;
    }

    try {
      if (isListening) {
        recognitionRef.current.stop();
        setIsListening(false);
        setVoiceHint('已停止收音，可以直接编辑文字。');
      } else {
        recognitionRef.current.start();
      }
    } catch (error) {
      console.error('语音识别启动失败:', error);
      setIsListening(false);
      setVoiceHint('语音启动失败，直接打字更稳。');
      toast('语音启动失败，直接打字更稳');
    }
  };

  // 4. 用户提交逻辑
  const handleSubmitFinal = async (selectedCategory: Category) => {
    if (!description.trim()) {
      toast.error('还是随意写/说一点具体体验吧！');
      return;
    }
    setStage('done');
    setUploading(true);

    try {
      let imageUrls: string[] = [];
      if (images.length > 0) {
        imageUrls = await uploadImages(images);
        if (imageUrls.length === 0) {
          toast.error('相片冲洗失败，请重写！');
          setUploading(false);
          setStage('category');
          return;
        }
      }

      // 提取标题
      const text = description.trim();
      let placeName = '';
      let reason = '';
      const punctuationIndex = text.search(/[，。！？、,\.!?\n]/);
      
      if (punctuationIndex > 0 && punctuationIndex < 30) {
        placeName = text.substring(0, punctuationIndex);
        reason = text.substring(punctuationIndex + 1).trim() || text;
      } else {
        placeName = text.substring(0, Math.min(30, text.length));
        reason = text;
      }

      const userName = profile?.user_name || user?.email?.split('@')[0] || '匿名用户';

      const recommendation = await createRecommendation({
        place_name: placeName,
        category: selectedCategory,
        reason: reason,
        user_name: userName,
        user_id: user!.id,
        latitude: center.lat,
        longitude: center.lng,
        images: imageUrls,
        easter_icon_id: selectedCategory === '彩蛋' ? selectedEasterIconId : null,
      });

      if (recommendation) {
        setTimeout(() => {
          toast.success('你的这一笔清迈痕迹已经留下了 🎉');
          navigate(getPlacePath(recommendation.place_name), {
            replace: true,
            state: { newTraceId: recommendation.id },
          });
        }, 1200); // 让印章飞一下再走
      } else {
        throw new Error('提交失败');
      }
    } catch (error) {
      console.error(error);
      toast.error('这条痕迹没有留下来，请再试一次');
      setStage('category');
    } finally {
      setUploading(false);
    }
  };

  const handleMapConfirm = () => {
    setStage('voice');
  };

  if (!user) return null; // Wait for redirect to happen

  return (
    <div className="relative min-h-screen bg-stone-100 flex flex-col items-center justify-start overflow-hidden font-sans">
      
      {/* 顶部简易导航回退 */}
      <div className="w-full absolute top-0 z-50 p-6 flex justify-between items-center mix-blend-difference text-white">
        <button onClick={() => navigate(-1)} className="p-2 rounded-full backdrop-blur-md bg-white/10 hover:bg-white/20 transition-all">
          <ArrowLeft className="w-6 h-6" />
        </button>
      </div>

      {/* 噪点特效 */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.04] z-[90] mix-blend-multiply" 
           style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}>
      </div>

      <div className={`absolute inset-0 bg-white z-[100] transition-opacity duration-400 pointer-events-none ${flash ? 'opacity-100' : 'opacity-0'}`} />

      {/* STAGE 1: 取景框 */}
      {stage === 'camera' && (
        <div className="w-full h-screen flex flex-col relative text-stone-700 bg-stone-900">
          <div className="flex-1 relative overflow-hidden bg-black/10 border-[16px] sm:border-[24px] border-stone-100 rounded-[2.5rem] m-2 shadow-[inset_0_4px_12px_rgba(0,0,0,0.1)] backdrop-blur-[1px]">
            <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover -z-10" />
            <canvas ref={canvasRef} className="hidden" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-56 h-56 pointer-events-none">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 border-[3px] border-primary/40 rounded-full border-dashed" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-primary/60 rounded-full" />
              <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white/80 rounded-tl-xl" />
              <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white/80 rounded-tr-xl" />
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white/80 rounded-bl-xl" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white/80 rounded-br-xl" />
            </div>
            <div className="absolute top-6 left-6 right-6 flex justify-between pointer-events-none">
              <span className="text-white/90 text-3xl drop-shadow-md" style={{ fontFamily: "'Nanum Pen Script', 'Caveat', cursive" }}>Smile! :)</span>
              <span className="text-white/90 text-3xl drop-shadow-md" style={{ fontFamily: "'Nanum Pen Script', 'Caveat', cursive" }}>12 / 24</span>
            </div>
            <div className="absolute top-1/3 left-0 right-0 h-[1px] border-t-2 border-dashed border-white/30 pointer-events-none" />
            <div className="absolute top-2/3 left-0 right-0 h-[1px] border-t-2 border-dashed border-white/30 pointer-events-none" />
            <div className="absolute left-1/3 top-0 bottom-0 w-[1px] border-l-2 border-dashed border-white/30 pointer-events-none" />
            <div className="absolute left-2/3 top-0 bottom-0 w-[1px] border-l-2 border-dashed border-white/30 pointer-events-none" />
          </div>

          <div className="h-48 sm:h-56 bg-white relative flex flex-col items-center justify-center shadow-[0_-10px_30px_-10px_rgba(0,0,0,0.08)] pb-safe rounded-t-[40px] z-10">
            <div className="absolute top-5 w-32 h-1.5 bg-stone-200 rounded-full shadow-inner opacity-80" />
            <div className="flex items-center gap-6 mt-4 z-10 w-full justify-center px-8">
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handleCapture(e, 'live')} ref={fileInputRef} />
              <input type="file" accept="image/*" className="hidden" onChange={(e) => handleCapture(e, 'exif')} ref={uploadInputRef} />
              <button
                onClick={startQuickTextFlow}
                className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center text-stone-500 shadow-inner hover:bg-stone-200 transition-colors active:scale-95"
                aria-label="快速文字推荐"
              >
                <PencilLine className="w-5 h-5" />
              </button>
              <button 
                onClick={capturePhoto}
                className="relative w-[88px] h-[88px] sm:w-[96px] sm:h-[96px] rounded-full flex flex-col items-center justify-center group active:scale-[0.92] transition-transform duration-200 outline-none shrink-0"
              >
                <div className="absolute inset-0 rounded-full border-4 border-stone-100 shadow-[0_8px_20px_rgba(0,0,0,0.06),inset_0_4px_8px_rgba(0,0,0,0.02)] transition-shadow bg-[#fdfdfc]"></div>
                <div className="w-[76%] h-[76%] rounded-full bg-gradient-to-br from-[#ff8c42] to-[#e64a00] shadow-[inset_0_-4px_10px_rgba(0,0,0,0.1),0_4px_12px_rgba(255,94,0,0.4)] group-active:shadow-[inset_0_4px_10px_rgba(0,0,0,0.2),0_2px_4px_rgba(255,94,0,0.2)] transition-all flex items-center justify-center">
                  <div className="absolute top-4 left-6 w-5 h-5 bg-white/40 rounded-full blur-[2px]"></div>
                </div>
              </button>
              <button 
                onClick={() => uploadInputRef.current?.click()}
                className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center text-stone-500 shadow-inner hover:bg-stone-200 transition-colors active:scale-95"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
              </button>
            </div>
            <span className="mt-5 text-stone-400 font-bold tracking-[0.2em] text-xs uppercase opacity-80" style={{ fontFamily: "'Inter', sans-serif" }}>
              Push to capture
            </span>
            <button
              onClick={startQuickTextFlow}
              className="mt-2 text-xs font-bold text-stone-500 underline underline-offset-4 active:scale-95"
            >
              不拍照，直接文字推荐
            </button>
          </div>
        </div>
      )}

      {/* STAGE 2 - 5: Content Flow */}
      {stage !== 'camera' && (
        <div className="w-full h-[100dvh] flex flex-col relative">
          
          {/* 上半部分：照片区域 - 约 55% 屏高 */}
          {photoURL && <div className="relative flex-shrink-0 transition-all duration-500" style={{ height: '55dvh' }}>
            <div className={`w-full h-full relative overflow-hidden transition-all duration-1000 ease-soft-out ${stage === 'analyzing' ? 'scale-[0.97]' : 'scale-100'}`}>
              <img src={photoURL} className="w-full h-full object-cover" alt="Captured" />
              
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

              {/* 定位条 — 照片底部暗色玻璃条 */}
              <div className={`absolute bottom-0 left-0 right-0 flex items-center justify-between transition-all duration-700 delay-300 bg-black/50 backdrop-blur-md px-4 py-2.5 ${locationName && stage !== 'map_fallback' ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'}`}>
                <div className="flex items-center gap-2 overflow-hidden">
                  <div className="p-1 bg-white/20 rounded-full text-white shrink-0">
                    <MapPin className="w-3.5 h-3.5" />
                  </div>
                  <span className="font-medium text-sm leading-tight truncate text-white/90">
                    {locationName || '...'}
                  </span>
                </div>
                <button onClick={() => setStage('map_fallback')} className="shrink-0 p-1.5 rounded-full text-white/60 hover:text-white hover:bg-white/20 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/></svg>
                </button>
              </div>

              {/* 印章动画 */}
              {stage === 'done' && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-[-8deg] pointer-events-none z-50 animate-[stamp_0.6s_cubic-bezier(0.175,0.885,0.32,1.275)_forwards]">
                  <div className="relative flex items-center justify-center w-40 h-40 border-[3px] border-[#da2222] border-dashed rounded-full mix-blend-multiply opacity-[0.85] shadow-sm bg-[#da2222]/[0.02]">
                    <div className="absolute inset-1.5 border-2 border-[#da2222] rounded-full opacity-70" />
                    <div className="flex flex-col items-center justify-center transform -translate-y-0.5">
                      <span className="text-[11px] font-bold tracking-[0.2em] text-[#da2222] opacity-90 mb-1" style={{ fontFamily: "'Inter', sans-serif" }}>CMI MAP</span>
                      <div className="border-y-[3px] border-[#da2222] py-2 px-1 bg-white/60 backdrop-blur-[1px] w-36 text-center transform rotate-[-4deg]">
                        <span className="text-[1.65rem] leading-none font-black tracking-widest text-[#da2222] opacity-90" style={{ fontFamily: "'Times New Roman', serif" }}>RECORDED</span>
                      </div>
                      <span className="text-[10px] font-bold tracking-[0.15em] text-[#da2222] mt-1.5 opacity-80" style={{ fontFamily: "'Inter', sans-serif" }}>
                        {new Date().toLocaleDateString('en-GB').replace(/\//g, '.')}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>}

          {/* 下半部分：控件区域 - 占据剩余空间 */}
          <div className="flex-1 flex flex-col items-center justify-center px-6 pb-safe bg-stone-50 relative overflow-y-auto">
            {!photoURL && stage === 'done' && (
              <div className="flex flex-col items-center justify-center gap-4 text-center">
                <div className="relative flex items-center justify-center w-36 h-36 border-[3px] border-[#da2222] border-dashed rounded-full mix-blend-multiply opacity-[0.85] bg-[#da2222]/[0.02] rotate-[-8deg]">
                  <div className="absolute inset-1.5 border-2 border-[#da2222] rounded-full opacity-70" />
                  <div className="flex flex-col items-center">
                    <span className="text-[11px] font-bold tracking-[0.2em] text-[#da2222] opacity-90 mb-1">CMI MAP</span>
                    <span className="text-2xl font-black tracking-widest text-[#da2222] opacity-90">RECORDED</span>
                  </div>
                </div>
                <p className="text-sm font-semibold text-stone-500">正在把你的清迈痕迹收进手账...</p>
              </div>
            )}
            
            {/* 描述文字便签 */}
            {stage !== 'map_fallback' && (description || isListening) && (
              <div className="w-full max-w-sm mt-4 mb-2">
                <div className="bg-[#fff9e6] p-3 text-stone-800 text-[15px] leading-relaxed shadow-sm border border-[#f0e6d2] rounded-lg"
                     style={{ fontFamily: "'Varela Round', 'Nunito', 'PingFang SC', 'Microsoft YaHei', ui-rounded, sans-serif", fontWeight: 500, letterSpacing: "0.02em" }}>
                  {description}
                  {isListening && <span className="inline-block w-2.5 h-5 bg-stone-400 animate-pulse ml-1 align-middle" />}
                </div>
              </div>
            )}

            {stage === 'map_fallback' && (
               <div className="w-full flex flex-col gap-3 py-4 animate-in slide-in-from-bottom-10 fade-in">
                 <div className="text-center mb-2">
                   <p className="text-stone-700 font-bold mb-1">手动选择地标</p>
                   <p className="text-stone-500 text-xs">拖动地图以微调这条痕迹的位置</p>
                 </div>
                 <div className="w-full h-64 bg-stone-300 rounded-2xl relative overflow-hidden flex items-center justify-center mb-2 shadow-inner pointer-events-auto">
                   <LeafletMap mode="mark" onCenterChange={(lat, lng) => setCenter({lat, lng})} className="w-full h-full border-none outline-none" />
                 </div>
                 <button onClick={handleMapConfirm} className="w-full h-12 bg-foreground text-background font-bold rounded-2xl flex items-center justify-center shadow-lg hover:scale-[1.02] transition-transform">
                   确认位置，去写体验
                 </button>
               </div>
            )}

            {stage === 'voice' && (
              <div className="w-full flex flex-col items-center gap-5 py-4 animate-in slide-in-from-bottom-10 fade-in duration-500">
                <p className="text-stone-500 font-bold text-sm">
                  {description ? '还想补充什么？' : '写一句你对这里的真实感觉'}
                </p>
                <div className="flex gap-5 items-center">
                  <button
                    onClick={handleVoiceInput}
                    disabled={!speechSupported}
                    className={`relative w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 ${
                      isListening
                        ? 'bg-primary text-white scale-110 shadow-xl shadow-primary/30'
                        : speechSupported
                          ? 'bg-white text-stone-800 shadow-lg hover:scale-105 active:scale-95'
                          : 'bg-stone-100 text-stone-300 cursor-not-allowed'
                    }`}
                    aria-label={speechSupported ? '语音输入' : '当前浏览器不支持语音输入'}
                  >
                    <ScribbleSparks active={isListening} />
                    {isListening ? <MicOff className="w-7 h-7 animate-pulse" /> : <Mic className="w-7 h-7" />}
                  </button>
                  
                  {description && !isListening && (
                    <button onClick={() => setStage('category')} className="w-12 h-12 rounded-full bg-white text-primary flex items-center justify-center shadow-md animate-in slide-in-from-right-4 hover:scale-105 active:scale-95 transition-all">
                      <Check className="w-6 h-6" strokeWidth={3} />
                    </button>
                  )}
                </div>
                <p className="max-w-sm text-center text-xs font-medium leading-relaxed text-stone-400">
                  {voiceHint}
                </p>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="写下地点名和具体体验，比如：Fern Forest，树很多很安静，适合上午写东西"
                  className="w-full max-w-sm min-h-24 resize-none rounded-2xl border border-stone-200 bg-white/90 px-4 py-3 text-[15px] leading-relaxed text-stone-800 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                  maxLength={240}
                />
              </div>
            )}

            {stage === 'category' && (
              <div className="w-full flex flex-col items-center gap-3 py-4 animate-in slide-in-from-bottom-10 fade-in">
                <div className="mb-1 text-center">
                  <p className="text-stone-600 font-bold">最后一步，粗略分一下就行</p>
                  <p className="mt-1 text-xs font-medium text-stone-400">选不准也没关系，CMI 后面可以再整理。</p>
                </div>
                <div className="flex flex-wrap justify-center gap-2.5 w-full max-w-sm">
                  {inputCategoryOptions.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => {
                        setSelectedInputCategoryId(option.id);
                        setSelectedCat(option.storedCategory);
                      }}
                      disabled={uploading}
                      title={option.description}
                      className={`flex items-center gap-2 px-3.5 py-2 rounded-full border shadow-sm transition-all text-stone-600 font-medium text-sm ${selectedInputCategoryId === option.id ? 'bg-primary/10 border-primary text-primary scale-105 ring-2 ring-primary/20' : 'bg-white border-stone-200 hover:scale-105 active:scale-95'}`}
                    >
                      {option.storedCategory === '彩蛋' ? (
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#ffe06f] p-0.5 shadow-[inset_0_0_0_2px_rgba(255,255,255,0.7),0_3px_8px_rgba(136,101,17,0.14)]">
                          <img src={selectedEasterIcon.url} alt="" className="h-6 w-6 object-contain" />
                        </span>
                      ) : (
                        <img src={getCategoryIconUrl(option.storedCategory)} alt="" className="w-5 h-5 object-contain" />
                      )}
                      <span>{option.label}</span>
                    </button>
                  ))}
                </div>
                {selectedCat === '彩蛋' && (
                  <div className="mt-2 w-full max-w-sm rounded-3xl border border-primary/25 bg-primary/5 p-3 shadow-inner animate-in slide-in-from-top-2 fade-in">
                    <div className="mb-2 flex items-start justify-between gap-3 text-left">
                      <div>
                        <p className="text-sm font-black text-foreground">选择一个彩蛋图标</p>
                        <p className="mt-0.5 text-xs font-semibold text-muted-foreground">50 个都可以用，选一个最像这条记忆的。</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const nextIcon = CMI_EASTER_ICON_OPTIONS[Math.floor(Math.random() * CMI_EASTER_ICON_OPTIONS.length)];
                          setSelectedEasterIconId(nextIcon.id);
                        }}
                        disabled={uploading}
                        className="flex h-9 shrink-0 items-center gap-1 rounded-2xl border border-border bg-background px-3 text-xs font-black text-primary shadow-sm active:scale-95 disabled:opacity-50"
                      >
                        <Shuffle className="h-3.5 w-3.5" strokeWidth={2.8} />
                        随机
                      </button>
                    </div>
                    <input
                      value={easterIconQuery}
                      onChange={(event) => setEasterIconQuery(event.target.value)}
                      disabled={uploading}
                      placeholder="搜猫、花、雨伞、纸飞机"
                      className="mb-2 h-10 w-full rounded-2xl border border-border bg-background px-3 text-sm font-semibold outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:opacity-50"
                    />
                    <div className="max-h-52 overflow-y-auto pr-1">
                      <div className="grid grid-cols-5 gap-2">
                        {filteredEasterIcons.map((icon) => (
                          <button
                            key={icon.id}
                            type="button"
                            onClick={() => setSelectedEasterIconId(icon.id)}
                            disabled={uploading}
                            title={icon.label}
                            aria-label={`选择彩蛋图标：${icon.label}`}
                            className={`relative flex h-12 items-center justify-center rounded-2xl border transition-all active:scale-95 disabled:opacity-50 ${
                              selectedEasterIconId === icon.id
                                ? 'border-primary bg-primary/10 ring-2 ring-primary/20'
                                : 'border-transparent bg-background hover:border-border'
                            }`}
                          >
                            <img src={icon.url} alt="" className="h-8 w-8 object-contain drop-shadow-sm" />
                            {selectedEasterIconId === icon.id && (
                              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary" />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-2 rounded-2xl bg-background px-3 py-2 text-xs font-bold text-muted-foreground">
                      <img src={selectedEasterIcon.url} alt="" className="h-7 w-7 object-contain" />
                      <span>已选：{selectedEasterIcon.label}。地图上会显示这个小图标。</span>
                    </div>
                  </div>
                )}
                {selectedCat && !uploading && (
                  <button 
                    onClick={() => handleSubmitFinal(selectedCat)}
                    className="mt-4 w-full max-w-[200px] h-12 bg-primary text-white font-bold rounded-full shadow-lg hover:scale-105 active:scale-95 transition-all animate-in zoom-in-95 flex items-center justify-center gap-2"
                  >
                    <span>{selectedCat === '彩蛋' ? '发布彩蛋' : '发布印戳'}</span>
                  </button>
                )}
                {uploading && (
                  <div className="mt-4 flex flex-col items-center gap-2 text-stone-500">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    <span className="text-sm font-medium">打包回忆中，请稍候...</span>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}
