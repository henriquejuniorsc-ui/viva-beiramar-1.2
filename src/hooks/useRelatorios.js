import { useState, useEffect, useCallback, useMemo } from 'react';

const SB_URL = 'https://hcmpjrqpjohksoznoycq.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhjbXBqcnFwam9oa3Nvem5veWNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5OTk0NjAsImV4cCI6MjA4ODU3NTQ2MH0.XRWi4ZULpICkTucXgGVQCP5wq1RmVwOFWTdMrOEMDnw';

const headers = {
  apikey: SB_KEY,
  Authorization: `Bearer ${SB_KEY}`,
  'Content-Type': 'application/json',
};

async function sbGet(path) {
  const r = await fetch(`${SB_URL}/rest/v1/${path}`, { headers });
  const d = await r.json();
  return Array.isArray(d) ? d : [];
}

const STAGES_ORDER = ['Novo Lead', 'Interessado', 'Qualificado', 'Visita Agendada', 'Em Negociação', 'Documentação', 'Contrato', 'Fechado', 'Perdido'];

export function useRelatorios(session) {
  const [raw, setRaw] = useState({ leads: [], deals: [], followups: [], appointments: [], messages: [], properties: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState('30d');
  const [customRange, setCustomRange] = useState({ from: '', to: '' });

  const load = useCallback(async () => {
    if (!session) return;
    setIsLoading(true);
    try {
      const [leads, deals, followups, appointments, messages, properties] = await Promise.all([
        sbGet('crm_leads?select=id,name,stage,source,created_at,property_id,estimated_value,phone'),
        sbGet('pipeline_deals?select=id,deal_value,commission_value,status,probability,closed_at,created_at,expected_close_date'),
        sbGet('follow_ups?select=id,status,due_date,sent_at,created_at'),
        sbGet('agenda_appointments?select=id,appointment_type,status,start_time'),
        sbGet('whatsapp_messages?select=chat_id,direction,created_at&order=created_at.asc'),
        sbGet('properties?select=id,title,neighborhood'),
      ]);
      setRaw({ leads, deals, followups, appointments, messages, properties });
    } catch (e) {
      console.error('useRelatorios error:', e);
    } finally {
      setIsLoading(false);
    }
  }, [session]);

  useEffect(() => { load(); }, [load]);

  // Date range
  const dateRange = useMemo(() => {
    const now = new Date();
    let from, to = now;
    switch (period) {
      case '7d': from = new Date(now.getTime() - 7 * 86400000); break;
      case '30d': from = new Date(now.getTime() - 30 * 86400000); break;
      case '90d': from = new Date(now.getTime() - 90 * 86400000); break;
      case 'month':
        from = new Date(now.getFullYear(), now.getMonth(), 1);
        to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        break;
      case 'custom':
        from = customRange.from ? new Date(customRange.from) : new Date(now.getTime() - 30 * 86400000);
        to = customRange.to ? new Date(customRange.to + 'T23:59:59') : now;
        break;
      default: from = new Date(now.getTime() - 30 * 86400000);
    }
    return { from, to };
  }, [period, customRange]);

  const inRange = useCallback((dateStr) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    return d >= dateRange.from && d <= dateRange.to;
  }, [dateRange]);

  // Filtered data
  const filtered = useMemo(() => {
    return {
      leads: raw.leads.filter(l => inRange(l.created_at)),
      deals: raw.deals.filter(d => inRange(d.created_at) || inRange(d.closed_at)),
      followups: raw.followups.filter(f => inRange(f.created_at) || inRange(f.due_date)),
      appointments: raw.appointments.filter(a => inRange(a.start_time)),
    };
  }, [raw, inRange]);

  // KPIs
  const kpis = useMemo(() => {
    const { leads, deals } = filtered;
    const leadsRecebidos = leads.length;
    const leadsFechados = leads.filter(l => l.stage === 'Fechado').length;
    const taxaConversao = leadsRecebidos > 0 ? ((leadsFechados / leadsRecebidos) * 100) : 0;

    // Ticket médio
    const closedDeals = deals.filter(d => d.status === 'fechado' && d.deal_value > 0);
    const ticketMedio = closedDeals.length > 0
      ? closedDeals.reduce((s, d) => s + Number(d.deal_value), 0) / closedDeals.length
      : 0;

    // Tempo médio de resposta (from messages)
    const chatGroups = {};
    raw.messages.forEach(m => {
      if (!chatGroups[m.chat_id]) chatGroups[m.chat_id] = { firstIn: null, firstOut: null };
      if (m.direction === 'incoming' && !chatGroups[m.chat_id].firstIn) {
        chatGroups[m.chat_id].firstIn = new Date(m.created_at);
      }
      if (m.direction === 'outgoing' && !chatGroups[m.chat_id].firstOut && chatGroups[m.chat_id].firstIn) {
        chatGroups[m.chat_id].firstOut = new Date(m.created_at);
      }
    });
    const responseTimes = Object.values(chatGroups)
      .filter(g => g.firstIn && g.firstOut && g.firstOut > g.firstIn)
      .map(g => (g.firstOut - g.firstIn) / 60000); // minutes
    const tempoMedioMin = responseTimes.length > 0
      ? responseTimes.reduce((s, t) => s + t, 0) / responseTimes.length
      : 0;

    return { leadsRecebidos, taxaConversao, ticketMedio, tempoMedioMin };
  }, [filtered, raw.messages]);

  // Funnel
  const funnel = useMemo(() => {
    const allLeads = raw.leads; // funnel uses all-time data
    const counts = {};
    STAGES_ORDER.forEach(s => { counts[s] = 0; });
    allLeads.forEach(l => { if (counts[l.stage] !== undefined) counts[l.stage]++; });
    const total = allLeads.length || 1;
    return STAGES_ORDER.map((stage, i) => {
      const count = counts[stage] || 0;
      const prev = i > 0 ? (counts[STAGES_ORDER[i - 1]] || 1) : total;
      const convRate = prev > 0 ? Math.round((count / prev) * 100) : 0;
      return { stage, count, pct: Math.round((count / total) * 100), convRate };
    });
  }, [raw.leads]);

  // Leads over time (line chart)
  const leadsOverTime = useMemo(() => {
    const { from, to } = dateRange;
    const diffDays = Math.ceil((to - from) / 86400000);
    const groupBy = diffDays <= 14 ? 'day' : 'week';
    const buckets = {};

    // Create buckets
    if (groupBy === 'day') {
      for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
        const key = d.toISOString().slice(0, 10);
        buckets[key] = { label: `${d.getDate()}/${d.getMonth() + 1}`, recebidos: 0, fechados: 0 };
      }
    } else {
      for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 7)) {
        const key = d.toISOString().slice(0, 10);
        const end = new Date(d.getTime() + 6 * 86400000);
        buckets[key] = { label: `${d.getDate()}/${d.getMonth() + 1}`, recebidos: 0, fechados: 0 };
      }
    }

    const bucketKeys = Object.keys(buckets).sort();
    filtered.leads.forEach(l => {
      const date = l.created_at?.slice(0, 10);
      if (!date) return;
      const key = groupBy === 'day'
        ? date
        : bucketKeys.find(k => date >= k && date < (bucketKeys[bucketKeys.indexOf(k) + 1] || '9999'));
      if (key && buckets[key]) {
        buckets[key].recebidos++;
        if (l.stage === 'Fechado') buckets[key].fechados++;
      }
    });

    return bucketKeys.map(k => buckets[k]);
  }, [filtered.leads, dateRange]);

  // Source distribution
  const sourceData = useMemo(() => {
    const counts = {};
    filtered.leads.forEach(l => {
      const src = l.source || 'Não identificado';
      counts[src] = (counts[src] || 0) + 1;
    });
    const total = filtered.leads.length || 1;
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value, pct: Math.round((value / total) * 100) }))
      .sort((a, b) => b.value - a.value);
  }, [filtered.leads]);

  // Top properties
  const topProperties = useMemo(() => {
    const propMap = {};
    raw.properties.forEach(p => { propMap[p.id] = p; });

    const counts = {};
    raw.leads.forEach(l => {
      if (!l.property_id) return;
      if (!counts[l.property_id]) counts[l.property_id] = { total: 0, visitas: 0, propostas: 0 };
      counts[l.property_id].total++;
      if (['Visita Agendada', 'Em Negociação'].includes(l.stage)) counts[l.property_id].visitas++;
      if (['Contrato', 'Fechado', 'Documentação'].includes(l.stage)) counts[l.property_id].propostas++;
    });

    return Object.entries(counts)
      .map(([propId, c]) => ({
        id: propId,
        title: propMap[propId]?.title || 'Imóvel desconhecido',
        neighborhood: propMap[propId]?.neighborhood || '',
        ...c,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [raw.leads, raw.properties]);

  // CSV export
  const exportCSV = useCallback(() => {
    const header = ['Nome', 'Telefone', 'Etapa', 'Origem', 'Valor Estimado', 'Criado em'];
    const rows = filtered.leads.map(l => [
      l.name, l.phone, l.stage, l.source || '', l.estimated_value || '', l.created_at?.slice(0, 10) || '',
    ]);
    const csv = [header, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio-leads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filtered.leads]);

  return {
    isLoading, period, setPeriod, customRange, setCustomRange,
    kpis, funnel, leadsOverTime, sourceData, topProperties,
    filteredLeads: filtered.leads, exportCSV, reload: load,
  };
}
