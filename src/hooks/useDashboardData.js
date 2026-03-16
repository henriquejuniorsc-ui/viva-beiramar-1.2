import { useState, useEffect, useCallback } from 'react';

const supabaseUrl = 'https://hcmpjrqpjohksoznoycq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhjbXBqcnFwam9oa3Nvem5veWNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5OTk0NjAsImV4cCI6MjA4ODU3NTQ2MH0.XRWi4ZULpICkTucXgGVQCP5wq1RmVwOFWTdMrOEMDnw';

async function sb(table, params = '') {
  const res = await fetch(`${supabaseUrl}/rest/v1/${table}${params}`, {
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
      Prefer: 'count=exact',
    },
  });
  const count = res.headers.get('content-range')?.split('/')[1];
  const data = await res.json();
  return { data: Array.isArray(data) ? data : [], count: count ? Number(count) : (Array.isArray(data) ? data.length : 0) };
}

const FUNNEL_STAGES = [
  { label: 'Novos', status: 'novo', count: 0, color: '#378ADD' },
  { label: 'Contato', status: 'contato', count: 0, color: '#85B7EB' },
  { label: 'Visita Ag.', status: 'visita_agendada', count: 0, color: '#EF9F27' },
  { label: 'Visita Real.', status: 'visita_realizada', count: 0, color: '#FAC775' },
  { label: 'Proposta', status: 'proposta', count: 0, color: '#1D9E75' },
  { label: 'Contrato', status: 'contrato', count: 0, color: '#5DCAA5' },
  { label: 'Fechado', status: 'fechado', count: 0, color: '#c9a84c' },
];

const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export function useDashboardData(session) {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAll = useCallback(async () => {
    if (!session) return;
    setIsLoading(true);
    setError(null);

    try {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const ninetyDaysAgo = new Date(now.getTime() - 90 * 86400000).toISOString();
      const twoHoursAhead = new Date(now.getTime() + 2 * 3600000).toISOString();
      const weekStart = new Date(now); weekStart.setDate(now.getDate() - now.getDay()); weekStart.setHours(0,0,0,0);
      const weekEnd = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 7);

      const [activeDeals, closedMonth, funnelDeals, topDeals, followPending, followOverdue, visitsWeek, nextAppt, settings] = await Promise.all([
        sb('pipeline_deals', `?status=neq.fechado&status=neq.perdido&status=neq.cancelado&select=deal_value,commission_value,commission_rate`),
        sb('pipeline_deals', `?status=eq.fechado&closed_at=gte.${monthStart}&select=commission_value`),
        sb('pipeline_deals', `?created_at=gte.${ninetyDaysAgo}&select=status`),
        // JOIN with crm_leads and properties for top deals
        sb('pipeline_deals', `?status=in.(proposta,contrato)&order=probability.desc&limit=4&select=id,deal_value,commission_value,probability,status,notes,expected_close_date,crm_leads!lead_uuid(name,phone),properties!property_id(title,neighborhood)`),
        sb('follow_ups', `?status=eq.pendente&select=id`),
        sb('follow_ups', `?status=eq.pendente&due_date=lt.${new Date(now.getTime() - 3*86400000).toISOString()}&select=id`),
        sb('agenda_appointments', `?appointment_type=eq.visita&start_time=gte.${weekStart.toISOString()}&start_time=lt.${weekEnd.toISOString()}&select=id`).catch(() => ({ count: 0 })),
        // JOIN with crm_leads for next appointment
        sb('agenda_appointments', `?start_time=gte.${now.toISOString()}&start_time=lte.${twoHoursAhead}&status=in.(agendado,confirmado)&order=start_time.asc&limit=1&select=id,title,start_time,appointment_type,crm_leads!lead_uuid(name)`).catch(() => ({ data: [] })),
        sb('admin_settings', `?key=in.(monthly_goal,default_commission_rate)&select=key,value`),
      ]);

      // Métricas
      const pipelineTotal = activeDeals.data.reduce((s, d) => s + (d.deal_value || 0), 0);
      const commissionPotential = activeDeals.data.reduce((s, d) => s + (d.commission_value || 0), 0);
      const avgRate = activeDeals.data.length ? activeDeals.data.reduce((s, d) => s + (d.commission_rate || 0.03), 0) / activeDeals.data.length : 0.03;
      const monthlyAchieved = closedMonth.data.reduce((s, d) => s + (d.commission_value || 0), 0);

      const settingsMap = {};
      settings.data.forEach(s => { settingsMap[s.key] = s.value; });
      const monthlyGoal = Number(settingsMap['monthly_goal'] || 35000);
      const monthlyPct = monthlyGoal > 0 ? Math.round((monthlyAchieved / monthlyGoal) * 100) : 0;
      const monthlyRemaining = Math.max(0, monthlyGoal - monthlyAchieved);
      const avgCommPerDeal = activeDeals.data.length > 0 ? commissionPotential / activeDeals.data.length : 0;
      const closingsNeeded = avgCommPerDeal > 0 ? Math.ceil(monthlyRemaining / avgCommPerDeal) : 0;

      // Funil
      const funnelCounts = {};
      funnelDeals.data.forEach(d => { funnelCounts[d.status] = (funnelCounts[d.status] || 0) + 1; });
      const funnel = FUNNEL_STAGES.map(s => ({ ...s, count: funnelCounts[s.status] || 0 }));

      // Top deals — flatten joined data
      const topDealsList = topDeals.data.map(d => ({
        id: d.id,
        lead_name: d.crm_leads?.name || '—',
        lead_phone: d.crm_leads?.phone || '',
        property_title: d.properties?.title || 'Imóvel não especificado',
        property_neighborhood: d.properties?.neighborhood || '',
        deal_value: d.deal_value || 0,
        commission_value: d.commission_value || 0,
        probability: d.probability || 0,
        status: d.status,
        notes: d.notes || '',
      }));

      // Próximo agendamento — flatten joined data
      const apptRaw = nextAppt.data?.[0];
      const nextAppointment = apptRaw ? {
        id: apptRaw.id,
        title: apptRaw.title || 'Agendamento',
        lead_name: apptRaw.crm_leads?.name || '',
        start_time: apptRaw.start_time,
        minutes_until: Math.round((new Date(apptRaw.start_time) - now) / 60000),
        appointment_type: apptRaw.appointment_type || 'visita',
      } : null;

      // Projeção simples (6 meses)
      const projection = Array.from({ length: 6 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - 2 + i, 1);
        const isCurrent = d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        const isPast = d < new Date(now.getFullYear(), now.getMonth(), 1);
        const isFuture = d > new Date(now.getFullYear(), now.getMonth(), 1);
        const avgPast = monthlyAchieved || 0;
        return {
          month: MONTH_NAMES[d.getMonth()],
          confirmed: isPast ? avgPast * 0.8 : isCurrent ? monthlyAchieved : 0,
          probable: isCurrent
            ? topDealsList.filter(d2 => d2.probability > 60).reduce((s, d2) => s + d2.commission_value, 0)
            : isFuture ? avgPast * 0.5 : 0,
          optimistic: isFuture ? avgPast * 0.3 : 0,
        };
      });

      setData({
        metrics: {
          pipeline_total: pipelineTotal,
          pipeline_change_pct: 12,
          commission_potential: commissionPotential,
          commission_rate: avgRate,
          closings_predicted: funnelCounts['contrato'] || 0,
          proposals_accepted: funnelCounts['proposta'] || 0,
          visits_this_week: visitsWeek.count || 0,
          followups_pending: followPending.data.length,
          followups_overdue: followOverdue.data.length,
          avg_response_time_min: 2,
          monthly_goal: monthlyGoal,
          monthly_achieved: monthlyAchieved,
          monthly_pct: monthlyPct,
          monthly_remaining: monthlyRemaining,
          closings_needed: closingsNeeded,
        },
        funnel,
        topDeals: topDealsList,
        nextAppointment,
        projection,
      });
    } catch (err) {
      console.error(err);
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, [session]);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 60000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  return { data, isLoading, error, refetch: fetchAll };
}
