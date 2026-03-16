const SB_URL = 'https://hcmpjrqpjohksoznoycq.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhjbXBqcnFwam9oa3Nvem5veWNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5OTk0NjAsImV4cCI6MjA4ODU3NTQ2MH0.XRWi4ZULpICkTucXgGVQCP5wq1RmVwOFWTdMrOEMDnw';

const headers = {
  apikey: SB_KEY,
  Authorization: `Bearer ${SB_KEY}`,
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
};

// CRM stage → pipeline_deals status
const STAGE_TO_DEAL_STATUS = {
  'Novo Lead': 'novo',
  'Interessado': 'contato',
  'Qualificado': 'contato',
  'Visita Agendada': 'visita_agendada',
  'Em Negociação': 'visita_realizada',
  'Documentação': 'proposta',
  'Contrato': 'contrato',
  'Fechado': 'fechado',
  'Perdido': 'perdido',
};

// Follow-up cadence rules: stage → { delayDays, message }
const FOLLOWUP_RULES = {
  'Interessado': { delayDays: 3, type: 'followup', message: 'Olá! Como está o interesse no imóvel? Posso ajudar com mais informações?' },
  'Visita Agendada': { delayDays: -1, type: 'confirmacao', message: 'Olá! Só confirmando nossa visita marcada para amanhã. Tudo certo?' },
  'Em Negociação': { delayDays: 2, type: 'pos_visita', message: 'Olá! Gostaria de saber o que achou do imóvel. Posso esclarecer alguma dúvida?' },
};

// Sync deal status when lead stage changes
export async function syncDealStatus(leadId, newStage) {
  const dealStatus = STAGE_TO_DEAL_STATUS[newStage];
  if (!dealStatus) return;

  try {
    // Find deal for this lead
    const r = await fetch(
      `${SB_URL}/rest/v1/pipeline_deals?lead_uuid=eq.${leadId}&select=id,status`,
      { headers }
    );
    const deals = await r.json();
    if (!Array.isArray(deals) || deals.length === 0) return;

    const deal = deals[0];
    if (deal.status === dealStatus) return; // already in sync

    const update = { status: dealStatus, updated_at: new Date().toISOString() };
    if (dealStatus === 'fechado') update.closed_at = new Date().toISOString();
    if (dealStatus === 'perdido') update.lost_at = new Date().toISOString();

    await fetch(`${SB_URL}/rest/v1/pipeline_deals?id=eq.${deal.id}`, {
      method: 'PATCH', headers, body: JSON.stringify(update),
    });
  } catch (e) {
    console.error('syncDealStatus error:', e);
  }
}

// Create auto follow-up when lead changes stage
export async function createAutoFollowUp(leadId, leadName, leadPhone, newStage) {
  const rule = FOLLOWUP_RULES[newStage];
  if (!rule) return;

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + rule.delayDays);
  // If delay is negative (e.g., -1 for confirmation), set to at least tomorrow
  if (rule.delayDays < 0) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    dueDate.setTime(Math.max(dueDate.getTime(), tomorrow.getTime()));
  }
  dueDate.setHours(10, 0, 0, 0);

  try {
    await fetch(`${SB_URL}/rest/v1/follow_ups`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        lead_uuid: leadId,
        type: rule.type,
        status: 'pendente',
        due_date: dueDate.toISOString(),
        message_text: rule.message,
      }),
    });
  } catch (e) {
    console.error('createAutoFollowUp error:', e);
  }
}

// Update CRM lead stage (in Supabase)
export async function updateLeadStage(leadId, newStage) {
  try {
    const r = await fetch(`${SB_URL}/rest/v1/crm_leads?id=eq.${leadId}`, {
      method: 'PATCH', headers,
      body: JSON.stringify({ stage: newStage, updated_at: new Date().toISOString() }),
    });
    const data = await r.json();
    return Array.isArray(data) && data[0] ? data[0] : null;
  } catch (e) {
    console.error('updateLeadStage error:', e);
    return null;
  }
}

// Full sync when stage changes: update DB, sync deal, create follow-up
export async function onLeadStageChange(lead, newStage, oldStage) {
  // 1. Update lead in DB
  const updated = await updateLeadStage(lead.id, newStage);

  // 2. Sync deal status
  await syncDealStatus(lead.id, newStage);

  // 3. Create auto follow-up
  await createAutoFollowUp(lead.id, lead.name, lead.phone, newStage);

  return {
    updatedLead: updated || { ...lead, stage: newStage },
    shouldSuggestAgenda: newStage === 'Visita Agendada' && oldStage !== 'Visita Agendada',
  };
}

// When an appointment is completed → advance lead stage
export async function onAppointmentCompleted(appointment) {
  const leadUuid = appointment.lead_uuid || null;
  if (!leadUuid) return null;

  try {
    const r = await fetch(`${SB_URL}/rest/v1/crm_leads?id=eq.${leadUuid}&select=*`, { headers });
    const leads = await r.json();
    if (!Array.isArray(leads) || leads.length === 0) return null;

    const lead = leads[0];

    if (appointment.appointment_type === 'visita' && lead.stage === 'Visita Agendada') {
      await updateLeadStage(leadUuid, 'Em Negociação');
      await syncDealStatus(leadUuid, 'Em Negociação');
      await createAutoFollowUp(leadUuid, lead.name, lead.phone, 'Em Negociação');
      return { ...lead, stage: 'Em Negociação' };
    }
  } catch (e) {
    console.error('onAppointmentCompleted error:', e);
  }
  return null;
}

// Auto follow-ups when a NEW lead is created, based on temperatura
// QUENTE: day 1 + day 3 | MORNO: day 3 + day 7 + day 15 | FRIO: day 15 + day 30
export async function createNewLeadFollowUps(leadId, temperatura) {
  const schedules = {
    QUENTE: [1, 3],
    MORNO: [3, 7, 15],
    FRIO: [15, 30],
  };
  const days = schedules[temperatura] || schedules.MORNO;

  // Fetch templates by cadence_day
  let templates = [];
  try {
    const r = await fetch(`${SB_URL}/rest/v1/follow_up_templates?is_active=eq.true&select=*`, { headers });
    templates = await r.json();
    if (!Array.isArray(templates)) templates = [];
  } catch (e) { /* continue without templates */ }

  for (const day of days) {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + day);
    dueDate.setHours(10, 0, 0, 0);

    const tpl = templates.find(t => t.cadence_day === day);

    try {
      await fetch(`${SB_URL}/rest/v1/follow_ups`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          lead_uuid: leadId,
          type: tpl?.type || 'followup',
          template_key: tpl?.key || null,
          status: 'pendente',
          due_date: dueDate.toISOString(),
          message_text: tpl?.message_text || `Olá! Tudo bem? Gostaria de saber se posso ajudar com alguma informação sobre imóveis.`,
        }),
      });
    } catch (e) {
      console.error('createNewLeadFollowUps error:', e);
    }
  }
}
