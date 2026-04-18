import { useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { Badge } from '../types/badges';
import { Button } from './ui/button';

interface BadgeUnlockOverlayProps {
  badge: Badge;
  onClose: () => void;
}

export default function BadgeUnlockOverlay({ badge, onClose }: BadgeUnlockOverlayProps) {
  const isFired = useRef(false);

  useEffect(() => {
    if (isFired.current) return;
    
    // Play sound and fire confetti at the peak of the animation
    const timer = setTimeout(() => {
      isFired.current = true;
      
      // Fire confetti from bottom left and bottom right
      const duration = 2 * 1000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 200, colors: ['#9B8EC6', '#F43F5E', '#10B981', '#FBBF24'] };

      function randomInRange(min: number, max: number) {
        return Math.random() * (max - min) + min;
      }

      const interval = setInterval(function() {
        const timeLeft = animationEnd - Date.now();
        if (timeLeft <= 0) {
          return clearInterval(interval);
        }
        const particleCount = 20 * (timeLeft / duration);
        confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } }));
        confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } }));
      }, 250);

      // Play sound
      try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContext) {
          const ctx = new AudioContext();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          
          osc.type = 'sine';
          osc.connect(gain);
          gain.connect(ctx.destination);
          
          osc.frequency.setValueAtTime(523.25, ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(783.99, ctx.currentTime + 0.1);
          
          gain.gain.setValueAtTime(0, ctx.currentTime);
          gain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.05);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
          
          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + 0.5);
        }
      } catch (e) {
        console.warn("AudioContext failed", e);
      }
      
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="fixed inset-0 z-[200] bg-black/85 backdrop-blur flex flex-col items-center justify-center animate-in fade-in duration-300">
      <style>{`
        .badge-drop-spin {
          transform-style: preserve-3d;
          animation: coinDropSpin 1.2s cubic-bezier(0.175, 0.885, 0.32, 1.1) forwards;
        }
        @keyframes coinDropSpin {
          0% { transform: scale(0.1) translateZ(-500px) rotateY(0deg) rotateX(45deg); opacity: 0; }
          50% { transform: scale(1.3) translateZ(100px) rotateY(720deg) rotateX(10deg); opacity: 1; filter: drop-shadow(0 20px 30px rgba(0,0,0,0.5)); }
          100% { transform: scale(1) translateZ(0) rotateY(1080deg) rotateX(0deg); opacity: 1; filter: drop-shadow(0 10px 15px rgba(0,0,0,0.3)); }
        }
      `}</style>
      
      <div className="flex-1 flex flex-col items-center justify-center -mt-10">
        <div className="text-center mb-8 animate-in slide-in-from-bottom-4 fade-in duration-500 delay-500 fill-mode-both">
          <p className="text-primary-foreground/70 font-bold uppercase tracking-widest text-sm mb-2">Achievement Unlocked</p>
          <h2 className="text-3xl font-black text-white">{badge.name}</h2>
        </div>

        <div className="perspective-1000 relative">
          <img 
            src={badge.assetUrl} 
            className="w-56 h-56 rounded-full object-cover badge-drop-spin" 
            alt={badge.name}
          />
        </div>
        
        <p className="mt-8 text-lg font-medium text-white/90 px-8 text-center max-w-sm animate-in zoom-in-95 fade-in duration-500 delay-700 fill-mode-both">
          "{badge.description}"
        </p>
      </div>

      <div className="pb-safe-12 animate-in fade-in duration-700 delay-1000 fill-mode-both">
        <Button 
          variant="outline" 
          className="rounded-full bg-white/10 text-white border-white/20 hover:bg-white/20 px-8 h-12 app-fab"
          onClick={onClose}
        >
          收起徽章
        </Button>
      </div>
    </div>
  );
}
