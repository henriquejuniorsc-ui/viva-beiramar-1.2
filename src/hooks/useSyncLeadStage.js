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
export async function syncDealStatus(supabase, leadId, newStage) {
  const dealStatus = STAGE_TO_DEAL_STATUS[newStage];
  if (!dealStatus) return;

  try {
    const { data: deals } = await supabase
      .from('pipeline_deals')
      .select('id,status')
      .eq('lead_uuid', leadId);

    if (!Array.isArray(deals) || deals.length === 0) return;

    const deal = deals[0];
    if (deal.status === dealStatus) return; // already in sync

    const update = { status: dealStatus, updated_at: new Date().toISOString() };
    if (dealStatus === 'fechado') update.closed_at = new Date().toISOString();
    if (dealStatus === 'perdido') update.lost_at = new Date().toISOString();

    await supabase.from('pipeline_deals').update(update).eq('id', deal.id);
  } catch (e) {
    console.error('syncDealStatus error:', e);
  }
}

// Create auto follow-up when lead changes stage
export async function createAutoFollowUp(supabase, leadId, leadName, leadPhone, newStage) {
  const rule = FOLLOWUP_RULES[newStage];
  if (!rule) return;

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + rule.delayDays);
  if (rule.delayDays < 0) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    dueDate.setTime(Math.max(dueDate.getTime(), tomorrow.getTime()));
  }
  dueDate.setHours(10, 0, 0, 0);

  try {
    await supabase.from('follow_ups').insert({
      lead_uuid: leadId,
      type: rule.type,
      status: 'pendente',
      due_date: dueDate.toISOString(),
      message_text: rule.message,
    });
  } catch (e) {
    console.error('createAutoFollowUp error:', e);
  }
}

// Update CRM lead stage (in Supabase)
export async function updateLeadStage(supabase, leadId, newStage) {
  try {
    const { data, error } = await supabase
      .from('crm_leads')
      .update({ stage: newStage, updated_at: new Date().toISOString() })
      .eq('id', leadId)
      .select();
    
    if (error) throw error;
    return Array.isArray(data) && data[0] ? data[0] : null;
  } catch (e) {
    console.error('updateLeadStage error:', e);
    return null;
  }
}

// Full sync when stage changes: update DB, sync deal, create follow-up
export async function onLeadStageChange(supabase, lead, newStage, oldStage) {
  // 1. Update lead in DB
  const updated = await updateLeadStage(supabase, lead.id, newStage);

  // 2. Sync deal status
  await syncDealStatus(supabase, lead.id, newStage);

  // 3. Create auto follow-up
  await createAutoFollowUp(supabase, lead.id, lead.name, lead.phone, newStage);

  return {
    updatedLead: updated || { ...lead, stage: newStage },
    shouldSuggestAgenda: newStage === 'Visita Agendada' && oldStage !== 'Visita Agendada',
  };
}

// When an appointment is completed → advance lead stage
export async function onAppointmentCompleted(supabase, appointment) {
  const leadUuid = appointment.lead_uuid || null;
  if (!leadUuid) return null;

  try {
    const { data: leads } = await supabase
      .from('crm_leads')
      .select('*')
      .eq('id', leadUuid);

    if (!Array.isArray(leads) || leads.length === 0) return null;

    const lead = leads[0];

    if (appointment.appointment_type === 'visita' && lead.stage === 'Visita Agendada') {
      const updated = await updateLeadStage(supabase, leadUuid, 'Em Negociação');
      await syncDealStatus(supabase, leadUuid, 'Em Negociação');
      await createAutoFollowUp(supabase, leadUuid, lead.name, lead.phone, 'Em Negociação');
      return updated || { ...lead, stage: 'Em Negociação' };
    }
  } catch (e) {
    console.error('onAppointmentCompleted error:', e);
  }
  return null;
}

// Auto follow-ups when a NEW lead is created, based on temperatura
export async function createNewLeadFollowUps(supabase, leadId, temperatura) {
  const schedules = {
    QUENTE: [1, 3],
    MORNO: [3, 7, 15],
    FRIO: [15, 30],
  };
  const days = schedules[temperatura] || schedules.MORNO;

  try {
    const { data: templates } = await supabase
      .from('follow_up_templates')
      .select('*')
      .eq('is_active', true);

    const activeTemplates = Array.isArray(templates) ? templates : [];

    for (const day of days) {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + day);
      dueDate.setHours(10, 0, 0, 0);

      const tpl = activeTemplates.find(t => t.cadence_day === day);

      await supabase.from('follow_ups').insert({
        lead_uuid: leadId,
        type: tpl?.type || 'followup',
        template_key: tpl?.key || null,
        status: 'pendente',
        due_date: dueDate.toISOString(),
        message_text: tpl?.message_text || `Olá! Tudo bem? Gostaria de saber se posso ajudar com alguma informação sobre imóveis.`,
      });
    }
  } catch (e) {
    console.error('createNewLeadFollowUps error:', e);
  }
}
