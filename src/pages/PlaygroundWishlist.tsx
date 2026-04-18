import { useState } from 'react';
import { Bookmark, Navigation, ArrowLeft, Heart, Flame } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function PlaygroundWishlist() {
  const navigate = useNavigate();
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [upvotes, setUpvotes] = useState(128);
  const [isUpvoted, setIsUpvoted] = useState(false);
  
  const handleWishlist = () => {
    setIsWishlisted(!isWishlisted);
  };
  
  const handleUpvote = () => {
    if (isUpvoted) {
      setUpvotes(prev => prev - 1);
      setIsUpvoted(false);
    } else {
      setUpvotes(prev => prev + 1);
      setIsUpvoted(true);
    }
  };

  return (
    <div className="relative min-h-screen bg-stone-100 flex items-center justify-center font-sans tracking-wide">
      
      {/* 顶部简易导航回退 */}
      <div className="absolute top-0 w-full z-50 p-6 flex justify-between items-center text-stone-600">
        <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-stone-200 transition-all">
          <ArrowLeft className="w-6 h-6" />
        </button>
      </div>

      {/* 噪点特效 */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] mix-blend-multiply" 
           style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}>
      </div>

      <div className="w-full max-w-sm p-6 relative">
        
        {/* 一个被撕下来的粗糙卡片 */}
        <div className="relative bg-[#fdfbf7] p-5 pb-8 rounded-sm shadow-[0_8px_30px_rgb(0,0,0,0.08)] transform rotate-[-1deg] border border-stone-200/50">
          
          <img 
            src="https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&q=80&w=600" 
            alt="cafe" 
            className="w-full aspect-square object-cover rounded-sm mb-4"
          />
          
          <div className="flex items-start justify-between mb-2">
            <h3 className="font-bold text-stone-800 text-xl" style={{ fontFamily: "'Varela Round', 'Nunito', sans-serif" }}>
              Ristr8to Lab
            </h3>
            
            {/* 顶部的类型标签 */}
            <span className="px-2.5 py-0.5 bg-amber-100/60 text-amber-800 text-xs font-bold rounded-sm inline-flex items-center gap-1 border border-amber-200/50 transform rotate-2">
              <span className="text-[10px]">☕️</span> 咖啡
            </span>
          </div>
          
          <p className="text-stone-600/90 text-sm leading-relaxed mb-6 font-medium">
            清迈最好的咖啡馆之一，拉花艺术世界冠军开的店，咖啡品质超高。
          </p>
          
          {/* 交互区：原有的点火 vs 新增的种草 */}
          <div className="flex items-center justify-between border-t border-stone-200/60 pt-4 mt-2">
            
            {/* 左侧：社交证明/点火 */}
            <button 
               onClick={handleUpvote}
               className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all active:scale-95 ${
                 isUpvoted 
                   ? 'bg-[#ffeedd] text-[#ff6b00]' 
                   : 'hover:bg-stone-100 text-stone-400'
               }`}
            >
              <Flame className={`w-5 h-5 ${isUpvoted ? 'fill-current animate-pulse' : ''}`} strokeWidth={isUpvoted ? 2.5 : 2} />
              <span className="font-bold text-sm tracking-wide">
                +{upvotes}
              </span>
            </button>
            
            {/* 右侧功能按钮组 */}
            <div className="flex items-center gap-2">
              <button className="w-10 h-10 rounded-full flex items-center justify-center text-stone-400 hover:bg-stone-100 hover:text-stone-600 transition-colors">
                <Navigation className="w-5 h-5" />
              </button>
              
              {/* 【核心设计：心愿系统（收藏/种草）】 */}
              <button 
                onClick={handleWishlist}
                className={`relative w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 active:scale-90 ${
                  isWishlisted 
                    ? 'bg-[#ffebee] text-[#f43f5e] shadow-[0_0_15px_rgba(244,63,94,0.2)]' 
                    : 'text-stone-400 hover:bg-stone-100 hover:text-stone-600'
                }`}
              >
                {/* 使用书签(Bookmark)还是红心(Heart)？这里为了手账感，我用稍微圆润点的书签，可以切换试试 */}
                <Bookmark className={`w-5 h-5 transition-transform ${isWishlisted ? 'fill-current scale-110' : ''}`} strokeWidth={2} />
                
                {/* 种草点按时的粒子动画 */}
                {isWishlisted && (
                  <span className="absolute inset-0 rounded-full animate-ping bg-[#ffebee] opacity-75"></span>
                )}
              </button>
            </div>
            
          </div>
          
        </div>
        
        <div className="mt-8 text-center">
          <p className="text-stone-400 text-xs tracking-wider mb-2">手账卡片交互预览</p>
          <div className="flex justify-center gap-3">
             <span className="px-3 py-1 border border-stone-200 rounded-full text-stone-500 text-xs bg-white/50">🔖 方案1: 种草书签</span>
             <span className="px-3 py-1 border border-stone-200 rounded-full text-stone-500 text-xs bg-white/50">⭐ 方案2: 想去星星</span>
          </div>
        </div>
      </div>
    </div>
  );
}
