/**
 * T21 — useBadges
 * Fetches badge definitions + unlocks, computes live progress,
 * and exposes checkAndUnlockBadges() to verify criteria at key moments.
 */

const SB_URL = 'https://hcmpjrqpjohksoznoycq.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhjbXBqcnFwam9oa3Nvem5veWNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5OTk0NjAsImV4cCI6MjA4ODU3NTQ2MH0.XRWi4ZULpICkTucXgGVQCP5wq1RmVwOFWTdMrOEMDnw';
const H = {
  apikey: SB_KEY,
  Authorization: `Bearer ${SB_KEY}`,
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
};

async function sbGet(path) {
  const r = await fetch(`${SB_URL}/rest/v1/${path}`, { headers: H });
  return r.json();
}
async function sbPost(path, body) {
  const r = await fetch(`${SB_URL}/rest/v1/${path}`, { method: 'POST', headers: H, body: JSON.stringify(body) });
  return r.json();
}

/** Fire-and-forget unlock helper — call inside checkAndUnlockBadges */
async function unlock(badgeKey, context = {}) {
  await sbPost('user_badge_unlocks', {
    badge_key: badgeKey,
    unlocked_at: new Date().toISOString(),
    context,
  });
}

function startOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
}

/**
 * checkAndUnlockBadges — call after key moments.
 * Returns array of newly-unlocked badge_keys (so UI can celebrate).
 */
export async function checkAndUnlockBadges(hints = {}) {
  const newlyUnlocked = [];

  try {
    // 1. Which badges are already unlocked?
    const unlocked = await sbGet('user_badge_unlocks?select=badge_key');
    const already = Array.isArray(unlocked) ? unlocked.map(b => b.badge_key) : [];

    const som = startOfMonth();

    // Helpers to avoid re-unlocking
    const check = (key) => !already.includes(key);

    // ── 🥇 Primeiro Fechamento — 1+ deal fechado (all-time) ──────────────────
    if (check('primeiro_fechamento')) {
      const data = await sbGet('pipeline_deals?status=eq.fechado&select=id&limit=1');
      if (Array.isArray(data) && data.length >= 1) {
        await unlock('primeiro_fechamento');
        newlyUnlocked.push('primeiro_fechamento');
      }
    }

    // ── 🔥 Máquina — 30 dias de streak ───────────────────────────────────────
    if (check('maquina')) {
      const data = await sbGet('user_streaks?select=current_streak&limit=1');
      if (Array.isArray(data) && data[0]?.current_streak >= 30) {
        await unlock('maquina');
        newlyUnlocked.push('maquina');
      }
    }

    // ── 💎 Diamante — R$100k comissão no mês ────────────────────────────────
    if (check('diamante')) {
      const data = await sbGet(`pipeline_deals?status=eq.fechado&closed_at=gte.${som}&select=commission_value`);
      const total = Array.isArray(data) ? data.reduce((s, d) => s + Number(d.commission_value || 0), 0) : 0;
      if (total >= 100000) {
        await unlock('diamante', { month_total: total });
        newlyUnlocked.push('diamante');
      }
    }

    // ── 📞 Incansável — 50 follow-ups enviados no mês ────────────────────────
    if (check('incansavel')) {
      const data = await sbGet(`follow_ups?status=eq.enviado&sent_at=gte.${som}&select=id`);
      if (Array.isArray(data) && data.length >= 50) {
        await unlock('incansavel');
        newlyUnlocked.push('incansavel');
      }
    }

    // ── 🏠 Especialista — 10 visitas no mês ─────────────────────────────────
    if (check('especialista')) {
      const data = await sbGet(`agenda_appointments?appointment_type=eq.visita&status=eq.concluido&completed_at=gte.${som}&select=id`);
      if (Array.isArray(data) && data.length >= 10) {
        await unlock('especialista');
        newlyUnlocked.push('especialista');
      }
    }

    // ── 🎯 Sniper — 3 fechamentos no mês ────────────────────────────────────
    if (check('sniper')) {
      const data = await sbGet(`pipeline_deals?status=eq.fechado&closed_at=gte.${som}&select=id`);
      if (Array.isArray(data) && data.length >= 3) {
        await unlock('sniper');
        newlyUnlocked.push('sniper');
      }
    }

    // ── ⚡ Raio — hint: foi passado flag external (ex: resposta rápida) ────
    if (check('raio') && hints.fastReply) {
      await unlock('raio', { note: 'fast reply detected' });
      newlyUnlocked.push('raio');
    }

  } catch (e) {
    console.error('checkAndUnlockBadges error:', e);
  }

  return newlyUnlocked;
}

/**
 * fetchBadgeProgress — returns merged array of badge definitions + unlock info + live progress
 * Used by BadgesPage to render the full list.
 */
export async function fetchBadgeProgress() {
  const som = startOfMonth();

  const [defs, unlocks, streakData, dealsMonth, followupsMonth, visitsMonth, dealsTotal, commMonth] = await Promise.all([
    sbGet('user_badges?select=*&order=badge_key.asc'),
    sbGet('user_badge_unlocks?select=badge_key,unlocked_at'),
    sbGet('user_streaks?select=current_streak&limit=1'),
    sbGet(`pipeline_deals?status=eq.fechado&closed_at=gte.${som}&select=id`),
    sbGet(`follow_ups?status=eq.enviado&sent_at=gte.${som}&select=id`),
    sbGet(`agenda_appointments?appointment_type=eq.visita&status=eq.concluido&completed_at=gte.${som}&select=id`),
    sbGet('pipeline_deals?status=eq.fechado&select=id&limit=1'),
    sbGet(`pipeline_deals?status=eq.fechado&closed_at=gte.${som}&select=commission_value`),
  ]);

  const unlockedMap = {};
  if (Array.isArray(unlocks)) {
    unlocks.forEach(u => { unlockedMap[u.badge_key] = u.unlocked_at; });
  }

  const streak = Array.isArray(streakData) && streakData[0] ? streakData[0].current_streak || 0 : 0;
  const closedThisMonth = Array.isArray(dealsMonth) ? dealsMonth.length : 0;
  const fuSent = Array.isArray(followupsMonth) ? followupsMonth.length : 0;
  const visits = Array.isArray(visitsMonth) ? visitsMonth.length : 0;
  const hasAnyDeal = Array.isArray(dealsTotal) && dealsTotal.length >= 1;
  const commTotal = Array.isArray(commMonth) ? commMonth.reduce((s, d) => s + Number(d.commission_value || 0), 0) : 0;

  const progressMap = {
    primeiro_fechamento: { current: hasAnyDeal ? 1 : 0, target: 1 },
    maquina: { current: streak, target: 30 },
    diamante: { current: commTotal, target: 100000, isCurrency: true },
    incansavel: { current: fuSent, target: 50 },
    especialista: { current: visits, target: 10 },
    sniper: { current: closedThisMonth, target: 3 },
    raio: { current: unlockedMap['raio'] ? 1 : 0, target: 1, hideProgress: true },
  };

  const definitions = Array.isArray(defs) ? defs : [];
  return definitions.map(badge => ({
    ...badge,
    unlocked: !!unlockedMap[badge.badge_key],
    unlocked_at: unlockedMap[badge.badge_key] || null,
    progress: progressMap[badge.badge_key] || null,
  }));
}
