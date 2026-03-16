import { useState, useEffect, useCallback } from 'react';

const SB_URL = 'https://hcmpjrqpjohksoznoycq.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhjbXBqcnFwam9oa3Nvem5veWNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5OTk0NjAsImV4cCI6MjA4ODU3NTQ2MH0.XRWi4ZULpICkTucXgGVQCP5wq1RmVwOFWTdMrOEMDnw';

const headers = {
  apikey: SB_KEY,
  Authorization: `Bearer ${SB_KEY}`,
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
};

async function sbGet(path) {
  const r = await fetch(`${SB_URL}/rest/v1/${path}`, { headers });
  const data = await r.json();
  return Array.isArray(data) ? data : [];
}

async function sbPatch(id, body) {
  const r = await fetch(`${SB_URL}/rest/v1/pipeline_deals?id=eq.${id}`, {
    method: 'PATCH', headers, body: JSON.stringify(body),
  });
  return r.json();
}

const MONTH_NAMES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

// Flatten joined data
function flattenDeal(d) {
  return {
    ...d,
    lead_name: d.crm_leads?.name || '',
    lead_phone: d.crm_leads?.phone || '',
    property_title: d.properties?.title || '',
    property_neighborhood: d.properties?.neighborhood || '',
    crm_leads: undefined,
    properties: undefined,
  };
}

export function useComissoes(session) {
  const now = new Date();
  const [currentMonth, setCurrentMonth] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const [deals, setDeals] = useState([]);
  const [settings, setSettings] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [histChart, setHistChart] = useState([]);

  const load = useCallback(async () => {
    if (!session) return;
    setIsLoading(true);
    try {
      const { year, month } = currentMonth;
      const sixMonthsAgo = new Date(year, month - 5, 1).toISOString();

      const [allDealsRaw, settingsRaw, historyRaw] = await Promise.all([
        // JOIN with crm_leads and properties
        sbGet(`pipeline_deals?select=id,deal_value,commission_value,commission_rate,status,payment_status,payment_received_at,closed_at,expected_close_date,probability,notes,crm_leads!lead_uuid(name,phone),properties!property_id(title,neighborhood)`),
        sbGet('admin_settings?select=key,value'),
        sbGet(`pipeline_deals?status=eq.fechado&closed_at=gte.${sixMonthsAgo}&select=commission_value,payment_status,closed_at`),
      ]);

      setDeals(Array.isArray(allDealsRaw) ? allDealsRaw.map(flattenDeal) : []);

      const map = {};
      settingsRaw.forEach(s => { map[s.key] = s.value; });
      setSettings(map);

      // Histórico mensal (6 meses)
      const hist = {};
      historyRaw.forEach(d => {
        if (!d.closed_at) return;
        const k = d.closed_at.slice(0, 7);
        if (!hist[k]) hist[k] = { recebido: 0, pendente: 0 };
        if (d.payment_status === 'recebido') hist[k].recebido += d.commission_value || 0;
        else hist[k].pendente += d.commission_value || 0;
      });

      const hc = Array.from({ length: 6 }, (_, i) => {
        const d = new Date(year, month - 5 + i, 1);
        const k = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
        return { month: MONTH_NAMES[d.getMonth()].slice(0,3), recebido: hist[k]?.recebido || 0, pendente: hist[k]?.pendente || 0 };
      });
      setHistChart(hc);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [session, currentMonth]);

  useEffect(() => { load(); }, [load]);

  const markRecebido = useCallback(async (id) => {
    await sbPatch(id, { payment_status: 'recebido', payment_received_at: new Date().toISOString() });
    setDeals(prev => prev.map(d => d.id === id ? { ...d, payment_status: 'recebido', payment_received_at: new Date().toISOString() } : d));
  }, []);

  const prevMonth = () => setCurrentMonth(({ year, month }) => month === 0 ? { year: year-1, month: 11 } : { year, month: month-1 });
  const nextMonth = () => setCurrentMonth(({ year, month }) => month === 11 ? { year: year+1, month: 0 } : { year, month: month+1 });

  const { year, month } = currentMonth;
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0, 23, 59, 59);

  const dealsDoMes = deals.filter(d => {
    const refDate = d.closed_at || d.expected_close_date;
    if (!refDate) return false;
    const dt = new Date(refDate);
    return dt >= monthStart && dt <= monthEnd;
  });

  const recebidoTotal = dealsDoMes.filter(d => d.payment_status === 'recebido').reduce((s, d) => s + (d.commission_value || 0), 0);
  const aReceberTotal = deals.filter(d => d.status === 'fechado' && d.payment_status !== 'recebido').reduce((s, d) => s + (d.commission_value || 0), 0);
  const previstoTotal = deals.filter(d => ['proposta','contrato'].includes(d.status)).reduce((s, d) => s + ((d.commission_value || 0) * ((d.probability || 0) / 100)), 0);
  const monthlyGoal = Number(settings['monthly_goal'] || 35000);
  const metaPct = monthlyGoal > 0 ? Math.round(((recebidoTotal + aReceberTotal) / monthlyGoal) * 100) : 0;

  const yearDeals = deals.filter(d => d.status === 'fechado' && d.closed_at && new Date(d.closed_at).getFullYear() === year);
  const yearTotal = yearDeals.filter(d => d.payment_status === 'recebido').reduce((s, d) => s + (d.commission_value || 0), 0);
  const avgTicket = yearDeals.length > 0 ? yearDeals.reduce((s, d) => s + (d.deal_value || 0), 0) / yearDeals.length : 0;
  const avgComm = yearDeals.length > 0 ? yearDeals.reduce((s, d) => s + (d.commission_value || 0), 0) / yearDeals.length : 0;

  return {
    currentMonth, deals, dealsDoMes, histChart, settings, isLoading,
    metrics: { recebidoTotal, aReceberTotal, previstoTotal, metaPct, monthlyGoal },
    annual: { yearTotal, dealsCount: yearDeals.length, avgTicket, avgComm, year },
    prevMonth, nextMonth, markRecebido, reload: load,
    monthLabel: `${MONTH_NAMES[month]} ${year}`,
  };
}
