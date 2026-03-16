import React, { useState, useEffect } from 'react';
import { fetchBadgeProgress } from '../../hooks/useBadges';
import BadgeCelebration from '../crm/BadgeCelebration';

function ProgressBar({ current, target, isCurrency }) {
  const pct = Math.min(100, Math.round((current / target) * 100));
  const label = isCurrency
    ? `R$ ${Math.round(current / 1000)}k / R$ ${Math.round(target / 1000)}k`
    : `${current} / ${target}`;

  return (
    <div className="mt-2">
      <div className="flex justify-between text-[10px] text-[#8A8A8A] mb-1">
        <span>{label}</span>
        <span>{pct}%</span>
      </div>
      <div className="h-2 bg-[#E8E2D8] rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-[#C4A265] to-[#D4B87A] rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function BadgeCard({ badge }) {
  const unlockedDate = badge.unlocked_at
    ? new Date(badge.unlocked_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : null;

  return (
    <div className={`rounded-2xl border p-4 flex gap-4 items-start transition-all ${
      badge.unlocked
        ? 'bg-emerald-50 border-emerald-200'
        : 'bg-white border-[#E8E2D8]'
    }`}>
      {/* Icon */}
      <div className={`text-4xl flex-shrink-0 ${!badge.unlocked ? 'grayscale opacity-40' : ''}`} role="img" aria-label={badge.name}>
        {badge.icon || '🏅'}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <h3 className={`font-bold text-sm font-serif ${badge.unlocked ? 'text-[#1B2B3A]' : 'text-[#5A5A5A]'}`}>
            {badge.name}
          </h3>
          {badge.unlocked
            ? <span className="text-emerald-600 font-bold text-xs flex-shrink-0">✅ Desbloqueado</span>
            : <span className="text-[#8A8A8A] text-xs flex-shrink-0">🔒</span>
          }
        </div>

        <p className="text-xs text-[#8A8A8A] mt-0.5">{badge.description}</p>

        {badge.unlocked && unlockedDate && (
          <p className="text-[10px] text-emerald-600 mt-1 font-medium">Desbloqueado em {unlockedDate}</p>
        )}

        {!badge.unlocked && badge.progress && !badge.progress.hideProgress && (
          <ProgressBar
            current={badge.progress.current}
            target={badge.progress.target}
            isCurrency={badge.progress.isCurrency}
          />
        )}

        {!badge.unlocked && badge.progress?.hideProgress && (
          <p className="text-[10px] text-[#8A8A8A] mt-1 italic">Critério especial — continue explorando!</p>
        )}
      </div>
    </div>
  );
}

export default function BadgesPage({ session }) {
  const [badges, setBadges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [celebrating, setCelebrating] = useState(null); // badge object to celebrate

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchBadgeProgress();
        setBadges(data);
      } catch (e) {
        console.error('BadgesPage load error:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [session]);

  const unlocked = badges.filter(b => b.unlocked);
  const locked = badges.filter(b => !b.unlocked);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-[#C4A265] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-6 fade-in pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold font-serif text-[#1B2B3A]">🏆 Suas Conquistas</h2>
          <p className="text-sm text-[#8A8A8A] mt-0.5">{unlocked.length} de {badges.length} desbloqueadas</p>
        </div>
        {/* Progress ring */}
        <div className="relative w-16 h-16">
          <svg viewBox="0 0 36 36" className="w-16 h-16 rotate-[-90deg]">
            <circle cx="18" cy="18" r="15.5" fill="none" stroke="#E8E2D8" strokeWidth="3" />
            <circle
              cx="18" cy="18" r="15.5" fill="none"
              stroke="#C4A265" strokeWidth="3" strokeLinecap="round"
              strokeDasharray={`${(unlocked.length / Math.max(badges.length, 1)) * 97.4} 97.4`}
              className="transition-all duration-700"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-bold text-[#C4A265]">{unlocked.length}/{badges.length}</span>
          </div>
        </div>
      </div>

      {/* Unlocked badges */}
      {unlocked.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-[#8A8A8A] uppercase tracking-widest">Desbloqueadas</h3>
          {unlocked.map(b => <BadgeCard key={b.badge_key} badge={b} />)}
        </div>
      )}

      {/* Locked badges */}
      {locked.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-[#8A8A8A] uppercase tracking-widest">Em progresso</h3>
          {locked.map(b => <BadgeCard key={b.badge_key} badge={b} />)}
        </div>
      )}

      {badges.length === 0 && (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">🏅</div>
          <p className="text-[#5A5A5A] font-medium">Nenhum badge encontrado</p>
          <p className="text-xs text-[#8A8A8A] mt-1">Verifique se os badges seed foram inseridos no banco</p>
        </div>
      )}

      {celebrating && (
        <BadgeCelebration badge={celebrating} onClose={() => setCelebrating(null)} />
      )}
    </div>
  );
}
