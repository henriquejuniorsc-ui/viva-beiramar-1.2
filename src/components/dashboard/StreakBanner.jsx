import { useEffect, useState } from 'react';

/**
 * StreakBanner
 * Props:
 *   streak     – row from user_streaks (or null)
 *   isLoading  – bool
 */
export default function StreakBanner({ streak, isLoading }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  if (isLoading) {
    return (
      <div className="animate-pulse bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4 flex items-center gap-4">
        <div className="w-10 h-10 bg-gray-200 rounded-xl" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-200 rounded w-32" />
          <div className="h-3 bg-gray-200 rounded w-24" />
        </div>
      </div>
    );
  }

  if (!streak) return null;

  const todayStr = new Date().toISOString().slice(0, 10);
  const yesterdayStr = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  const currentStreak = streak.current_streak || 0;
  const bestStreak = streak.best_streak || 0;
  const lastAction = streak.last_action_date;
  const monthlyActions = streak.monthlyActions || 0;

  const actedToday = lastAction === todayStr;
  const atRisk = currentStreak > 0 && lastAction === yesterdayStr; // has streak but hasn't acted today
  const isRecord = currentStreak > 0 && currentStreak >= bestStreak && currentStreak > 1;

  if (currentStreak === 0) return <ZeroState visible={visible} />;
  if (atRisk) return <AtRiskState streak={currentStreak} best={bestStreak} monthly={monthlyActions} visible={visible} />;

  return (
    <ActiveState
      streak={currentStreak}
      best={bestStreak}
      monthly={monthlyActions}
      isRecord={isRecord}
      visible={visible}
    />
  );
}

// ── Streak = 0 ────────────────────────────────────────────────────────────────
function ZeroState({ visible }) {
  return (
    <div
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(-6px)',
        transition: 'all 350ms ease-out',
      }}
      className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4 flex items-center gap-4"
    >
      <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-100 text-xl flex-shrink-0">
        🔥
      </div>
      <div>
        <p className="text-sm font-medium text-gray-700">
          Streak: <span className="font-bold text-gray-900">0 dias</span>
        </p>
        <p className="text-xs text-gray-400 mt-0.5">
          Faça uma ação de venda pra iniciar sua sequência! 💪
        </p>
      </div>
    </div>
  );
}

// ── Streak ativo, ainda não atuou hoje (em risco) ────────────────────────────
function AtRiskState({ streak, best, monthly, visible }) {
  const [pulse, setPulse] = useState(false);
  useEffect(() => {
    const interval = setInterval(() => setPulse(v => !v), 1400);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(-6px)',
        transition: 'all 350ms ease-out',
        borderColor: pulse ? '#F59E0B' : '#FCD34D',
      }}
      className="bg-amber-50 rounded-xl border-2 shadow-sm px-5 py-4 flex items-center gap-4"
    >
      <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-amber-100 text-xl flex-shrink-0">
        🔥
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-gray-900 tabular-nums">{streak}</span>
          <span className="text-sm text-gray-500">dias consecutivos</span>
        </div>
        <p className="text-xs text-amber-700 font-medium mt-0.5">
          ⚠️ Faça uma ação hoje pra manter seu streak!
        </p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-[11px] text-gray-400">Recorde: {best} dias</p>
        {monthly > 0 && <p className="text-[10px] text-gray-400">{monthly} ações no mês</p>}
      </div>
    </div>
  );
}

// ── Streak ativo, já atuou hoje ───────────────────────────────────────────────
function ActiveState({ streak, best, monthly, isRecord, visible }) {
  return (
    <div
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(-6px)',
        transition: 'all 350ms ease-out',
      }}
      className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4 flex items-center gap-4"
    >
      {/* Fire icon */}
      <div
        className="w-10 h-10 flex items-center justify-center rounded-xl flex-shrink-0 text-xl"
        style={{ background: 'linear-gradient(135deg, #fed7aa, #fbbf24)' }}
      >
        🔥
      </div>

      {/* Main info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold tabular-nums" style={{ color: '#1B2B3A' }}>
            {streak}
          </span>
          <span className="text-sm text-gray-500">
            {streak === 1 ? 'dia consecutivo' : 'dias consecutivos'}
          </span>
          {isRecord && (
            <span
              className="text-[11px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(201,168,76,0.12)', color: '#C9A84C' }}
            >
              🏆 Recorde!
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="text-xs text-gray-400">
            Recorde: {best} dias
          </span>
          {monthly > 0 && (
            <>
              <span className="text-gray-200">·</span>
              <span className="text-xs text-gray-400">{monthly} ações este mês</span>
            </>
          )}
        </div>
      </div>

      {/* Progress bar toward next milestone */}
      <StreakMilestone streak={streak} />
    </div>
  );
}

// ── Mini milestone bar ─────────────────────────────────────────────────────────
const MILESTONES = [3, 7, 14, 21, 30, 60, 90];

function StreakMilestone({ streak }) {
  const nextMilestone = MILESTONES.find(m => m > streak) || streak + 10;
  const prevMilestone = MILESTONES.slice().reverse().find(m => m <= streak) || 0;
  const range = nextMilestone - prevMilestone;
  const progress = Math.min(100, Math.round(((streak - prevMilestone) / range) * 100));

  return (
    <div className="flex-shrink-0 w-20 text-right">
      <p className="text-[10px] text-gray-400 mb-1">
        Próximo: {nextMilestone}d
      </p>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${progress}%`,
            background: 'linear-gradient(90deg, #C9A84C, #F59E0B)',
          }}
        />
      </div>
      <p className="text-[10px] text-gray-400 mt-0.5">{progress}%</p>
    </div>
  );
}
