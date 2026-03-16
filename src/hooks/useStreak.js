import { useState, useEffect, useCallback } from 'react';

const SB_URL = 'https://hcmpjrqpjohksoznoycq.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhjbXBqcnFwam9oa3Nvem5veWNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5OTk0NjAsImV4cCI6MjA4ODU3NTQ2MH0.XRWi4ZULpICkTucXgGVQCP5wq1RmVwOFWTdMrOEMDnw';

const HEADERS = {
  apikey: SB_KEY,
  Authorization: `Bearer ${SB_KEY}`,
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
};

function today() {
  return new Date().toISOString().slice(0, 10);
}
function yesterday() {
  return new Date(Date.now() - 86400000).toISOString().slice(0, 10);
}

// ── Public helper — call from anywhere, fire-and-forget ──────────────────────
// Returns { newStreak, newBest, isNewRecord } or null on error.
export async function registerAction(actionType, leadUuid = null) {
  try {
    const todayStr = today();

    // 1. Insert action
    await fetch(`${SB_URL}/rest/v1/daily_actions`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({
        action_type: actionType,
        action_date: todayStr,
        lead_uuid: leadUuid || null,
      }),
    });

    // 2. Fetch current streak
    const r = await fetch(`${SB_URL}/rest/v1/user_streaks?select=*&limit=1`, {
      headers: HEADERS,
    });
    const rows = await r.json();
    if (!Array.isArray(rows) || rows.length === 0) return null;

    const streak = rows[0];
    const lastAction = streak.last_action_date;
    const yesterdayStr = yesterday();

    // 3. Compute new streak
    let newStreak = streak.current_streak || 0;
    let streakStart = streak.streak_start_date;

    if (lastAction === todayStr) {
      // Already acted today — just increment total, no streak change
    } else if (lastAction === yesterdayStr) {
      // Consecutive day
      newStreak += 1;
    } else {
      // Broken or first ever
      newStreak = 1;
      streakStart = todayStr;
    }

    const newBest = Math.max(newStreak, streak.best_streak || 0);
    const isNewRecord = newStreak > (streak.best_streak || 0);

    // 4. Update streak row
    await fetch(`${SB_URL}/rest/v1/user_streaks?id=eq.${streak.id}`, {
      method: 'PATCH',
      headers: HEADERS,
      body: JSON.stringify({
        current_streak: newStreak,
        best_streak: newBest,
        last_action_date: todayStr,
        streak_start_date: streakStart,
        total_actions: (streak.total_actions || 0) + 1,
        updated_at: new Date().toISOString(),
      }),
    });

    return { newStreak, newBest, isNewRecord, prevStreak: streak.current_streak || 0 };
  } catch (e) {
    console.error('registerAction error:', e);
    return null;
  }
}

// ── Hook — used by dashboard to show streak state ────────────────────────────
export function useStreak(session) {
  const [streak, setStreak] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    if (!session) return;
    try {
      const r = await fetch(`${SB_URL}/rest/v1/user_streaks?select=*&limit=1`, {
        headers: HEADERS,
      });
      const rows = await r.json();
      if (!Array.isArray(rows) || rows.length === 0) {
        setStreak(null);
        return;
      }

      let data = rows[0];
      const todayStr = today();
      const yesterdayStr = yesterday();

      // Check if streak broke (last action was before yesterday)
      if (
        data.last_action_date &&
        data.last_action_date !== todayStr &&
        data.last_action_date !== yesterdayStr
      ) {
        // Streak broke — reset
        await fetch(`${SB_URL}/rest/v1/user_streaks?id=eq.${data.id}`, {
          method: 'PATCH',
          headers: HEADERS,
          body: JSON.stringify({
            current_streak: 0,
            streak_start_date: null,
            updated_at: new Date().toISOString(),
          }),
        });
        data = { ...data, current_streak: 0, streak_start_date: null };
      }

      // Count actions this month
      const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
        .toISOString()
        .slice(0, 10);
      const countR = await fetch(
        `${SB_URL}/rest/v1/daily_actions?action_date=gte.${startOfMonth}&select=id`,
        { headers: HEADERS }
      );
      const countRows = await countR.json();
      const monthlyActions = Array.isArray(countRows) ? countRows.length : 0;

      setStreak({ ...data, monthlyActions });
    } catch (e) {
      console.error('useStreak load error:', e);
    } finally {
      setIsLoading(false);
    }
  }, [session]);

  useEffect(() => { load(); }, [load]);

  // Refresh streak after an action is registered (call this from parent)
  const refresh = useCallback(() => load(), [load]);

  return { streak, isLoading, refresh };
}
