import { useState, useEffect } from 'react';
import { BADGE_REGISTRY, Badge, BadgeCategory } from '../types/badges';
import { Lock, X } from 'lucide-react';
import { Button } from './ui/button';

interface BadgeWallProps {
  unlockedBadgeIds: string[];
}

export default function BadgeWall({ unlockedBadgeIds }: BadgeWallProps) {
  const [focusedBadge, setFocusedBadge] = useState<Badge | null>(null);
  const [usingGyro, setUsingGyro] = useState(false);

  // Group badges by system
  const groupedBadges = BADGE_REGISTRY.reduce((acc, badge) => {
    if (!acc[badge.system]) acc[badge.system] = [];
    acc[badge.system].push(badge);
    return acc;
  }, {} as Record<string, Badge[]>);

  const unlockedBadgesGlobal = BADGE_REGISTRY.filter(b => unlockedBadgeIds.includes(b.id));

  // Focus effect handlers
  useEffect(() => {
    if (!focusedBadge) return;
    
    const handleMouseMove = (e: MouseEvent) => {
      if (usingGyro) return;
      const el = document.getElementById('focused-badge-img');
      if (!el) return;
      
      const rect = el.getBoundingClientRect();
      const xCalc = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const yCalc = ((e.clientY - rect.top) / rect.height) * 2 - 1;

      const rotateX = yCalc * -25;
      const rotateY = xCalc * 25;
      
      el.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.05, 1.05, 1.05)`;
      
      const glareX = 50 + (rotateY / 25) * 50;
      const glareY = 50 + (rotateX / 25) * 50;
      el.style.setProperty('--glare-x', `${glareX}%`);
      el.style.setProperty('--glare-y', `${glareY}%`);
    };

    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (!e.beta || !e.gamma) return;
      setUsingGyro(true);
      
      const el = document.getElementById('focused-badge-img');
      if (!el) return;
      
      const MAX_ROTATION = 25;
      let tiltX = e.beta - 45; // base angle assuming holding phone
      tiltX = Math.max(-MAX_ROTATION, Math.min(MAX_ROTATION, tiltX));
      
      let tiltY = e.gamma;
      tiltY = Math.max(-MAX_ROTATION, Math.min(MAX_ROTATION, tiltY));
      
      const rotateX = -tiltX;
      const rotateY = tiltY;
      
      el.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.05, 1.05, 1.05)`;
      
      const glareX = 50 + (rotateY / MAX_ROTATION) * 50;
      const glareY = 50 + (rotateX / MAX_ROTATION) * 50;
      el.style.setProperty('--glare-x', `${glareX}%`);
      el.style.setProperty('--glare-y', `${glareY}%`);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('deviceorientation', handleOrientation);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('deviceorientation', handleOrientation);
      // reset global styles when dismissing modal to prevent scroll lock issues if any
    };
  }, [focusedBadge, usingGyro]);

  const requestGyro = async () => {
    if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      try {
        const p = await (DeviceOrientationEvent as any).requestPermission();
        if (p === 'granted') {
          // handled by general listener
        }
      } catch (err) {
        console.warn('Gyro permission error', err);
      }
    }
  };

  return (
    <div className="pb-16 space-y-8 animate-in fade-in duration-500">
      
      {/* 隐藏 CSS 变量注入，用于控制高光位置 */}
      <style>{`
        .focused-badge-glare::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 50%;
          background: linear-gradient(135deg, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0.1) 40%, transparent 50%, rgba(0,0,0,0.2) 100%);
          pointer-events: none;
          z-index: 2;
          opacity: 0.6;
          transition: background-position 0.1s ease-out;
          background-size: 200% 200%;
          background-position: var(--glare-x, 50%) var(--glare-y, 50%);
          mix-blend-mode: overlay;
        }
      `}</style>

      <div className="flex justify-between items-end px-4 mb-2">
        <p className="text-xl font-black tracking-tight text-foreground">
          成就展柜 <span className="text-primary text-sm ml-2 font-bold">{unlockedBadgeIds.length} / {BADGE_REGISTRY.length}</span>
        </p>
      </div>

      <div className="px-4 space-y-10">
        {/* 全局已解锁区域 */}
        {unlockedBadgesGlobal.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-primary flex items-center gap-2">
              <div className="h-px bg-primary/20 flex-1" />
              已点亮成就 <span className="text-xs font-black">({unlockedBadgesGlobal.length})</span>
              <div className="h-px bg-primary/20 flex-1" />
            </h3>
            
            <div className="grid grid-cols-3 gap-x-4 gap-y-6">
              {unlockedBadgesGlobal.map(badge => (
                <div 
                  key={badge.id}
                  onClick={() => setFocusedBadge(badge)}
                  className="flex flex-col items-center gap-2 cursor-pointer transition-transform hover:scale-105 active:scale-95"
                >
                  <div className="relative w-[85px] h-[85px]">
                    <img 
                      src={badge.assetUrl} 
                      alt={badge.name} 
                      className="w-full h-full object-cover filter drop-shadow-md rounded-full"
                    />
                  </div>
                  <span className="text-xs font-bold text-center leading-tight line-clamp-1 text-foreground">
                    {badge.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 分类锁定补完区域 */}
        {Object.entries(groupedBadges).map(([groupName, badges]) => {
          const lockedBadges = badges.filter(b => !unlockedBadgeIds.includes(b.id));
          
          // 如果分类下已经没有锁定的，或者隐藏彩蛋分类下全靠探索，则不再显示占位空壳
          if (lockedBadges.length === 0) return null;
          if (groupName === '隐藏彩蛋') return null;

          return (
            <div key={groupName} className="space-y-4">
              <h3 className="text-sm font-bold text-muted-foreground flex items-center gap-2">
                <div className="h-px bg-border flex-1" />
                {groupName} <span className="text-xs">({badges.length - lockedBadges.length}/{badges.length})</span>
                <div className="h-px bg-border flex-1" />
              </h3>
              
              <div className="grid grid-cols-3 gap-x-4 gap-y-6">
                {lockedBadges.map(badge => (
                  <div 
                    key={badge.id}
                    onClick={() => setFocusedBadge(badge)}
                    className="flex flex-col items-center gap-2 cursor-pointer transition-transform opacity-60 grayscale"
                  >
                    <div className="relative w-[85px] h-[85px]">
                      <div className="w-full h-full rounded-full border-2 border-dashed border-muted-foreground/50 bg-muted flex items-center justify-center relative overflow-hidden">
                        <img 
                          src={badge.assetUrl} 
                          alt="locked" 
                          className="absolute inset-0 w-full h-full opacity-10 blur-[2px]" 
                        />
                        <Lock className="w-6 h-6 text-muted-foreground z-10" />
                      </div>
                    </div>
                    <span className="text-xs font-bold text-center leading-tight line-clamp-1 text-muted-foreground">
                      ???
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Focus Modal */}
      {focusedBadge && (
        <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-md flex flex-col items-center justify-center p-6 animate-in fade-in duration-200">
          <Button 
            variant="ghost" 
            size="icon" 
            className="absolute top-safe-8 right-4 rounded-full bg-muted/50"
            onClick={() => setFocusedBadge(null)}
          >
            <X className="w-6 h-6 text-foreground" />
          </Button>

          <Button 
            className="absolute top-safe-8 left-4 rounded-full text-xs box-shadow-none"
            variant="outline"
            size="sm"
            onClick={requestGyro}
          >
            📱 激活全息反光
          </Button>

          <div className="w-full max-w-sm flex flex-col items-center perspective-1000">
            <div 
              id="focused-badge-img"
              className={`w-[240px] h-[240px] rounded-full shadow-2xl relative transition-transform duration-100 ease-out focused-badge-glare ${!unlockedBadgeIds.includes(focusedBadge.id) ? 'grayscale opacity-30 shadow-none border-2 border-dashed border-border' : ''}`}
              style={{
                backgroundImage: `url('${focusedBadge.assetUrl}')`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                boxShadow: unlockedBadgeIds.includes(focusedBadge.id) ? '0 30px 60px rgba(0,0,0,0.15), inset 0 0 0 4px rgba(255,255,255,0.2)' : 'none',
                transformStyle: 'preserve-3d'
              }}
            />

            <div className="mt-12 text-center space-y-4 animate-in slide-in-from-bottom-8 duration-300">
              <h2 className="text-3xl font-black tracking-tight text-foreground">
                {unlockedBadgeIds.includes(focusedBadge.id) ? focusedBadge.name : '未解锁成就'}
              </h2>
              
              <div className="inline-block px-3 py-1 rounded-full bg-secondary/20 text-secondary-foreground text-xs font-bold mt-1 mb-2">
                {focusedBadge.system}
              </div>
              
              <div className="w-12 h-1 bg-primary mx-auto rounded-full" />
              
              <p className="text-lg text-muted-foreground font-medium leading-relaxed px-4">
                {unlockedBadgeIds.includes(focusedBadge.id) 
                  ? focusedBadge.description 
                  : (
                    <span className="flex flex-col gap-2">
                       <span>🔐 解锁条件：</span>
                       <span className="text-foreground">{focusedBadge.conditionDescription}</span>
                    </span>
                  )}
              </p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
