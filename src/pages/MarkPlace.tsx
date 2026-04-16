import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { LeafletMap } from '@/components/map/LeafletMap';
import { createRecommendation, uploadImages } from '@/db/api';
import { useAuth } from '@/contexts/AuthContext';
import type { Category } from '@/types/types';
import { CATEGORIES } from '@/types/types';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, Camera, ArrowLeft, LogIn, Mic, MicOff } from 'lucide-react';
import { toast } from 'sonner';

import { isImageFile, formatFileSize } from '@/utils/imageCompression';

const ScribbleSparks = ({ isListening }: { isListening: boolean }) => {
  if (!isListening) return null;
  
  const sparks = Array.from({ length: 16 }).map((_, i) => {
    const angle = (i / 16) * Math.PI * 2;
    const distance = 35 + Math.random() * 55; 
    const tx = Math.cos(angle) * distance;
    const ty = Math.sin(angle) * distance;
    const delay = Math.random() * 0.5;
    const duration = 0.4 + Math.random() * 0.3;
    // Hand-painted pigment colors
    const colors = ['#FF2A2A', '#FFE600', '#00E84F', '#00B3FF', '#8700FF', '#FF00A2'];
    const color = colors[i % colors.length];
    
    const shapeType = i % 3;
    let path;
    if (shapeType === 0) {
      path = <path d="M12 2c0 4 3 7 7 8-4 .7-7 4-7 8-1-4-4-7-8-8 4-1 6-4 8-8z" />; // spark
    } else if (shapeType === 1) {
      path = <path d="M12 22C6.48 22 2 17.52 2 12S6.48 2 12 2s10 4.48 10 10-4.48 10-10 10zm-1-16c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6z" />; // blob
    } else {
      path = <path strokeWidth="4" strokeLinecap="round" d="M12 4v16M4 12h16" />; // scribble cross
    }
    
    return (
      <svg 
        key={i}
        width="20" 
        height="20" 
        viewBox="0 0 24 24" 
        fill={shapeType === 2 ? 'none' : color}
        stroke={shapeType === 2 ? color : 'none'}
        className="absolute top-1/2 left-1/2 -mt-[10px] -ml-[10px] pointer-events-none drop-shadow-[2px_2px_0px_rgba(0,0,0,1)]"
        style={{
          '--tx': `${tx}px`,
          '--ty': `${ty}px`,
          '--rot': `${Math.random() * 360}deg`,
          animation: `star-burst ${duration}s ease-out ${delay}s infinite`
        } as React.CSSProperties}
      >
        {path}
      </svg>
    );
  });

  return (
    <div className="absolute top-1/2 left-1/2 w-0 h-0 pointer-events-none z-0">
      {sparks}
    </div>
  );
};

export default function MarkPlace() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [center, setCenter] = useState({ lat: 18.7883, lng: 98.9853 });
  const [description, setDescription] = useState(''); // 合并后的描述字段
  const [category, setCategory] = useState<Category | ''>('');
  const [images, setImages] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  // 初始化语音识别
  useEffect(() => {
    // 检查浏览器是否支持语音识别
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.lang = 'zh-CN'; // 设置为中文
      recognition.continuous = false; // 单次识别
      recognition.interimResults = false; // 不返回中间结果

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setDescription(prev => prev ? `${prev} ${transcript}` : transcript);
        setIsListening(false);
      };

      recognition.onerror = (event: any) => {
        console.error('语音识别错误:', event.error);
        toast.error('语音识别失败，请重试');
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  // 处理语音输入
  const handleVoiceInput = () => {
    if (!recognitionRef.current) {
      toast.error('您的浏览器不支持语音识别');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
      toast.info('请开始说话...');
    }
  };

  // 处理地图中心变化 - 使用 useCallback 避免重复创建
  const handleCenterChange = useCallback((lat: number, lng: number) => {
    setCenter({ lat, lng });
  }, []);

  // 处理图片选择
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    // 验证文件类型
    const validFiles = files.filter(file => {
      if (!isImageFile(file)) {
        toast.error(`${file.name} 不是有效的图片文件`);
        return false;
      }
      return true;
    });

    // 限制最多 3 张
    const remainingSlots = 3 - images.length;
    if (validFiles.length > remainingSlots) {
      toast.error(`最多只能上传 3 张照片，当前还可以添加 ${remainingSlots} 张`);
      setImages([...images, ...validFiles.slice(0, remainingSlots)]);
    } else {
      setImages([...images, ...validFiles]);
    }
  };

  // 移除图片
  const handleRemoveImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  // 提交表单
  const handleSubmit = async () => {
    // 表单验证
    if (!description.trim()) {
      toast.error('请描述一下这个地方');
      return;
    }
    if (!category) {
      toast.error('请选择分类');
      return;
    }
    if (!user) {
      toast.error('请先登录');
      navigate('/login');
      return;
    }

    setUploading(true);

    try {
      // 上传图片
      let imageUrls: string[] = [];
      if (images.length > 0) {
        toast.info('正在上传图片...');
        imageUrls = await uploadImages(images);
        if (imageUrls.length === 0) {
          toast.error('图片上传失败，请重试');
          setUploading(false);
          return;
        }
      }

      // 解析描述：第一行或前30个字符作为地点名称，其余作为推荐理由
      const lines = description.trim().split('\n');
      let placeName = '';
      let reason = '';
      
      if (lines.length > 1) {
        // 多行：第一行是地点名称，其余是推荐理由
        placeName = lines[0].trim();
        reason = lines.slice(1).join('\n').trim();
      } else {
        // 单行：前30个字符作为地点名称，其余作为推荐理由
        const text = description.trim();
        if (text.length <= 30) {
          placeName = text;
          reason = text;
        } else {
          // 尝试在标点符号处分割
          const punctuationIndex = text.substring(0, 30).search(/[，。！？、,\.!?]/);
          if (punctuationIndex > 0) {
            placeName = text.substring(0, punctuationIndex);
            reason = text.substring(punctuationIndex + 1).trim() || text;
          } else {
            placeName = text.substring(0, 30);
            reason = text;
          }
        }
      }

      // 获取用户名
      const userName = profile?.user_name || user.email?.split('@')[0] || '匿名用户';

      // 创建推荐
      const recommendation = await createRecommendation({
        place_name: placeName,
        category: category as Category,
        reason: reason,
        user_name: userName,
        user_id: user.id,
        latitude: center.lat,
        longitude: center.lng,
        images: imageUrls
      });

      if (recommendation) {
        // 显示成功提示
        toast.success('你的这一笔已经画上去了 🎉');
        
        // 延迟跳转，让用户看到提示
        setTimeout(() => {
          navigate('/');
        }, 1500);
      } else {
        toast.error('提交失败，请重试');
      }
    } catch (error) {
      console.error('提交失败:', error);
      toast.error('提交失败，请重试');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="relative w-full h-screen overflow-hidden">
      {/* 地图 - 全屏显示，z-index 最低 */}
      <div className="absolute inset-0 z-0">
        <LeafletMap
          mode="mark"
          onCenterChange={handleCenterChange}
          className="w-full h-full"
        />
      </div>

      {/* 左上角返回按钮 */}
      <div className="absolute top-6 left-6 z-20">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/')}
          className="press-feedback bg-background/80 backdrop-blur-sm shadow-lg hover:bg-background"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
      </div>

      {/* 左下角切换按钮 */}
      <div className="absolute top-[54%] left-6 z-20">
        <Button
          size="icon"
          className="w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg press-feedback"
          onClick={() => navigate('/')}
        >
          <Search className="w-6 h-6" />
        </Button>
      </div>

      {/* 左下角用户头像 - 在切换按钮下方 */}
      <div className="absolute top-[54%] left-6 mt-20 z-20">
        {user ? (
          <Button
            variant="ghost"
            size="icon"
            className="w-12 h-12 rounded-full p-0 press-feedback bg-background/80 backdrop-blur-sm shadow-lg hover:bg-background"
            onClick={() => navigate('/profile')}
          >
            <Avatar className="w-12 h-12">
              {profile?.avatar_url && (
                <AvatarImage src={profile.avatar_url} alt={profile.user_name || '用户'} />
              )}
              <AvatarFallback className="bg-primary text-primary-foreground">
                {(profile?.user_name || user.email?.split('@')[0] || '用户').charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </Button>
        ) : (
          <Button
            variant="default"
            size="sm"
            className="rounded-full press-feedback shadow-lg"
            onClick={() => navigate('/login')}
          >
            <LogIn className="w-4 h-4 mr-2" />
            登录
          </Button>
        )}
      </div>

      {/* 底部录入面板 - 黄金分割点位置 */}
      <div className="absolute top-[62%] left-0 right-0 bottom-0 z-50 bg-card rounded-t-3xl p-6 card-shadow slide-up overflow-y-auto">
        <div className="space-y-4">
          {/* 描述（合并地点名称和推荐理由） */}
          <div className="space-y-2">
            <div className="flex items-center justify-between pb-2">
              <Label htmlFor="description" className="text-base font-bold text-foreground">描述一下这里吧</Label>
              <button
                type="button"
                onClick={handleVoiceInput}
                className={`relative overflow-visible z-10 press-feedback flex items-center gap-1.5 px-4 py-2 rounded-2xl font-bold transition-all border-[3px] border-foreground ${
                  isListening 
                    ? 'bg-[#FF2A2A] text-white shadow-[6px_6px_0_hsl(var(--foreground))] animate-sketch-wobble' 
                    : 'bg-[#FFE600] text-foreground shadow-[3px_3px_0_hsl(var(--foreground))] hover:shadow-[5px_5px_0_hsl(var(--foreground))] hover:-translate-y-0.5'
                }`}
              >
                <ScribbleSparks isListening={isListening} />
                <div className="relative z-10 flex items-center gap-1.5">
                  {isListening ? (
                    <>
                      <MicOff className="w-5 h-5 drop-shadow-sm" />
                      <span className="text-sm tracking-wide">录音中!!</span>
                    </>
                  ) : (
                    <>
                      <Mic className="w-5 h-5 drop-shadow-sm" />
                      <span className="text-sm tracking-wide">语音输入</span>
                    </>
                  )}
                </div>
              </button>
            </div>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="例如：宁曼路的咖啡店&#10;这里的咖啡很好喝，环境也很舒适"
              rows={4}
              className="text-base app-input"
            />
            <p className="text-xs text-muted-foreground/80 mt-1 flex items-start gap-1">
              <span className="text-base leading-none relative top-[-1px]">💡</span> 
              <span>第一行会作为地点名称，其余作为推荐理由</span>
            </p>
          </div>

          {/* 分类选择 */}
          <div className="space-y-3 pt-2">
            <Label className="text-base font-bold text-foreground">分类</Label>
            <div className="flex flex-wrap gap-2.5 pb-1">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.name}
                  type="button"
                  onClick={() => setCategory(cat.name)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-full border-2 transition-all press-feedback ${
                    category === cat.name
                      ? 'border-primary bg-primary/10 text-primary font-bold scale-95'
                      : 'border-transparent bg-neutral-100 text-muted-foreground hover:bg-neutral-200 hover:text-foreground'
                  }`}
                >
                  <img src={cat.iconUrl} alt={cat.name} className={`w-5 h-5 object-contain transition-opacity ${category !== cat.name && category !== '' ? 'opacity-50' : 'opacity-100'}`} />
                  <span className="text-sm">{cat.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 照片上传 */}
          <div className="space-y-3 pt-2">
            <Label className="text-base font-bold text-foreground">照片 <span className="text-sm font-normal text-muted-foreground">（可选，最多 3 张）</span></Label>
            <div className="flex gap-3 flex-wrap">
              {images.map((img, idx) => (
                <div key={idx} className="relative">
                  <img
                    src={URL.createObjectURL(img)}
                    alt=""
                    className="w-20 h-20 rounded-lg object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(idx)}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center text-xs"
                  >
                    ×
                  </button>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatFileSize(img.size)}
                  </p>
                </div>
              ))}
              
              {images.length < 3 && (
                <label className="w-20 h-20 border-2 border-dashed border-border rounded-lg flex items-center justify-center cursor-pointer hover:border-primary transition-colors">
                  <Camera className="w-6 h-6 text-muted-foreground" />
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>

          {/* 提交按钮 */}
          <Button
            onClick={handleSubmit}
            disabled={uploading}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {uploading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground mr-2" />
                上传中...
              </>
            ) : (
              <>
                <Camera className="w-4 h-4 mr-2" />
                ✅ 画上去
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
