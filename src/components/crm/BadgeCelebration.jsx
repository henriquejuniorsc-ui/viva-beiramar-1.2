import React, { useEffect } from 'react';

/**
 * T21 — BadgeCelebration modal
 * Shown when a badge is newly unlocked. Similar aesthetic to CelebrationScreen.
 * Props: badge{ badge_key, name, description, icon }, onClose
 */
export default function BadgeCelebration({ badge, onClose }) {
  // Haptic vibration on mobile
  useEffect(() => {
    if (navigator.vibrate) {
      navigator.vibrate([100, 50, 200, 50, 100]);
    }
  }, []);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(196,162,101,0.25) 0%, rgba(0,0,0,0.7) 60%)' }}>
      {/* Confetti-like particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="confetti-particle"
            style={{
              left: `${Math.random() * 100}%`,
              top: `-${Math.random() * 20}%`,
              animationDelay: `${Math.random() * 1.5}s`,
              width: `${6 + Math.random() * 8}px`,
              height: `${6 + Math.random() * 8}px`,
              borderRadius: Math.random() > 0.5 ? '50%' : '2px',
              background: ['#C4A265','#F59E0B','#10B981','#3B82F6','#EF4444','#8B5CF6'][Math.floor(Math.random() * 6)],
            }}
          />
        ))}
      </div>

      <div className="relative bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center animate-scale-in">
        {/* Glow ring */}
        <div className="absolute inset-0 rounded-3xl pointer-events-none" style={{
          background: 'radial-gradient(ellipse at 50% -10%, rgba(196,162,101,0.15) 0%, transparent 70%)',
        }} />

        <p className="text-xs font-bold tracking-widest text-[#C4A265] uppercase mb-4">🏆 Conquista Desbloqueada!</p>

        {/* Badge icon — big */}
        <div className="text-7xl mb-4 animate-bounce-once" role="img" aria-label={badge.name}>
          {badge.icon || '🏅'}
        </div>

        <h2 className="text-2xl font-bold font-serif text-[#1B2B3A] mb-2">{badge.name}</h2>
        <p className="text-sm text-[#5A5A5A] mb-6">{badge.description}</p>

        <button
          onClick={onClose}
          className="bg-[#C4A265] hover:bg-[#b89355] text-white font-bold px-8 py-3 rounded-2xl w-full transition-all active:scale-95 text-base"
        >
          Show! Continuar 🚀
        </button>
      </div>
    </div>
  );
}
