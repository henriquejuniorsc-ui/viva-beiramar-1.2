import { useState, useEffect, useCallback } from 'react';

const SB_URL = 'https://hcmpjrqpjohksoznoycq.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhjbXBqcnFwam9oa3Nvem5veWNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5OTk0NjAsImV4cCI6MjA4ODU3NTQ2MH0.XRWi4ZULpICkTucXgGVQCP5wq1RmVwOFWTdMrOEMDnw';
const UAZAPI_URL = 'https://euhenrique.uazapi.com';

const headers = {
  apikey: SB_KEY,
  Authorization: `Bearer ${SB_KEY}`,
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
};

async function sbGet(path) {
  const r = await fetch(`${SB_URL}/rest/v1/${path}`, { headers });
  return r.json();
}

async function sbPatch(table, id, body) {
  const r = await fetch(`${SB_URL}/rest/v1/${table}?id=eq.${id}`, {
    method: 'PATCH', headers, body: JSON.stringify(body),
  });
  return r.json();
}

async function sbPost(table, body) {
  const r = await fetch(`${SB_URL}/rest/v1/${table}`, {
    method: 'POST', headers: { ...headers, Prefer: 'return=representation' },
    body: JSON.stringify(body),
  });
  return r.json();
}

// Flatten the joined crm_leads + properties data onto the follow_up object
function flattenFollowUp(f) {
  const lead = f.crm_leads || {};
  const prop = lead.properties || {};
  const deals = lead.pipeline_deals || [];
  const activeDeal = deals[0] || {};
  const dealValue = Number(activeDeal.deal_value || 0);
  const commRate = Number(activeDeal.commission_rate || 0.03);
  const prob = Number(activeDeal.probability || 0);
  return {
    ...f,
    lead_name: lead.name || '',
    lead_phone: lead.phone || '',
    temperatura: lead.temperatura || '',
    lead_stage: lead.stage || '',
    property_title: prop.title || '',
    property_neighborhood: prop.neighborhood || '',
    deal_value: dealValue,
    commission_rate: commRate,
    commission_value: dealValue * commRate,
    deal_probability: prob,
    crm_leads: undefined,
  };
}

export function useFollowUps(session) {
  const [followUps, setFollowUps] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [leads, setLeads] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [uazToken, setUazToken] = useState('');
  const [todayActionsCount, setTodayActionsCount] = useState(0);

  const load = useCallback(async () => {
    if (!session) return;
    setIsLoading(true);
    try {
      const todayStr = new Date().toISOString().slice(0, 10);
      const [fusRaw, tpls, settings, leadsRaw, todayActions] = await Promise.all([
        // JOIN with crm_leads + nested properties + pipeline_deals (with commission_rate + probability)
        sbGet('follow_ups?order=due_date.asc&select=*,crm_leads!lead_uuid(name,phone,temperatura,stage,properties!property_id(title,neighborhood),pipeline_deals!pipeline_deals_lead_uuid_fkey(deal_value,commission_rate,probability))'),
        sbGet('follow_up_templates?is_active=eq.true&order=cadence_day.asc&select=*'),
        sbGet('admin_settings?key=eq.uazapi_token&select=value'),
        sbGet('crm_leads?select=id,name,phone,temperatura,stage&order=name.asc&limit=200'),
        sbGet(`daily_actions?action_date=eq.${todayStr}&select=id`).catch(() => []),
      ]);
      const fus = Array.isArray(fusRaw) ? fusRaw.map(flattenFollowUp) : [];
      setFollowUps(fus);
      setTemplates(Array.isArray(tpls) ? tpls : []);
      setUazToken(settings?.[0]?.value || '');
      setLeads(Array.isArray(leadsRaw) ? leadsRaw : []);
      setTodayActionsCount(Array.isArray(todayActions) ? todayActions.length : 0);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [session]);

  useEffect(() => { load(); }, [load]);

  const markSent = useCallback(async (id) => {
    await sbPatch('follow_ups', id, { status: 'enviado', sent_at: new Date().toISOString() });
    setFollowUps(prev => prev.map(f => f.id === id ? { ...f, status: 'enviado', sent_at: new Date().toISOString() } : f));
  }, []);

  const markResponded = useCallback(async (id) => {
    await sbPatch('follow_ups', id, { status: 'respondido', response_at: new Date().toISOString() });
    setFollowUps(prev => prev.map(f => f.id === id ? { ...f, status: 'respondido' } : f));
  }, []);

  const reschedule = useCallback(async (id, newDate) => {
    await sbPatch('follow_ups', id, { due_date: newDate });
    setFollowUps(prev => prev.map(f => f.id === id ? { ...f, due_date: newDate } : f));
  }, []);

  const delay1Day = useCallback(async (id, currentDue) => {
    const newDate = new Date(new Date(currentDue).getTime() + 86400000).toISOString();
    await sbPatch('follow_ups', id, { due_date: newDate });
    setFollowUps(prev => prev.map(f => f.id === id ? { ...f, due_date: newDate } : f));
  }, []);

  const sendWhatsApp = useCallback(async (followUp) => {
    if (!uazToken) { alert('Token UAZAPI não configurado em Configurações.'); return false; }
    const phone = followUp.lead_phone?.replace(/\D/g, '');
    if (!phone) { alert('Número de telefone não encontrado.'); return false; }
    try {
      const r = await fetch(`${UAZAPI_URL}/send/text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', token: uazToken },
        body: JSON.stringify({ number: phone, text: followUp.message_text }),
      });
      if (r.ok) { await markSent(followUp.id); return true; }
      return false;
    } catch (e) { console.error(e); return false; }
  }, [uazToken, markSent]);

  const createFollowUp = useCallback(async (data) => {
    const result = await sbPost('follow_ups', { ...data, status: 'pendente' });
    if (Array.isArray(result) && result[0]) {
      // Refetch to get the joined lead data
      const refreshed = await sbGet(`follow_ups?id=eq.${result[0].id}&select=*,crm_leads!lead_uuid(name,phone,temperatura,stage)`);
      if (Array.isArray(refreshed) && refreshed[0]) {
        setFollowUps(prev => [...prev, flattenFollowUp(refreshed[0])]);
      } else {
        setFollowUps(prev => [...prev, result[0]]);
      }
    }
    return result;
  }, []);

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const tomorrowStr = new Date(now.getTime() + 86400000).toISOString().slice(0, 10);
  const pendentes = followUps.filter(f => f.status === 'pendente');
  const atrasados = pendentes.filter(f => f.due_date?.slice(0, 10) < todayStr);
  const enviados = followUps.filter(f => f.status === 'enviado');
  const respondidos = followUps.filter(f => f.status === 'respondido');
  const taxaResposta = enviados.length + respondidos.length > 0
    ? Math.round((respondidos.length / (enviados.length + respondidos.length)) * 100) : 0;

  // T13: "Dinheiro esfriando" -- valor pipeline dos atrasados (unique by lead)
  const leadsUnicosAtrasados = new Map();
  atrasados.forEach(f => {
    if (f.deal_value > 0 && !leadsUnicosAtrasados.has(f.lead_uuid)) {
      leadsUnicosAtrasados.set(f.lead_uuid, {
        deal_value: f.deal_value,
        commission_value: f.commission_value || 0,
        deal_probability: f.deal_probability || 0,
      });
    }
  });
  const valorEsfriando = Array.from(leadsUnicosAtrasados.values()).reduce((s, d) => s + d.deal_value, 0);
  // Previsao atual = soma ponderada das comissoes (prob * commission)
  const previsaoSemAcao = Array.from(leadsUnicosAtrasados.values()).reduce((s, d) => {
    return s + d.commission_value * (d.deal_probability / 100);
  }, 0);
  // Se agir: boost de +15% de probabilidade em media
  const previsaoComAcao = Array.from(leadsUnicosAtrasados.values()).reduce((s, d) => {
    return s + d.commission_value * Math.min((d.deal_probability + 15) / 100, 1);
  }, 0);

  return {
    followUps, templates, leads, isLoading,
    metrics: { pendentes: pendentes.length, atrasados: atrasados.length, enviados: enviados.length, taxaResposta },
    valorEsfriando,
    previsaoSemAcao,
    previsaoComAcao,
    todayActionsCount,
    markSent, markResponded, reschedule, delay1Day, sendWhatsApp, createFollowUp, reload: load,
    todayStr, tomorrowStr,
  };
}
