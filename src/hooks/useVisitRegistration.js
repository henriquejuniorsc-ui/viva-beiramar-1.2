/**
 * T18 — Registro pós-visita
 * Handles all DB updates after a visit appointment is completed:
 * 1. Update agenda_appointments (fields + status)
 * 2. Advance lead stage in crm_leads
 * 3. Create auto follow-up
 * 4. Sync pipeline_deals if exists
 */

const SB_URL = 'https://hcmpjrqpjohksoznoycq.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhjbXBqcnFwam9oa3Nvem5veWNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5OTk0NjAsImV4cCI6MjA4ODU3NTQ2MH0.XRWi4ZULpICkTucXgGVQCP5wq1RmVwOFWTdMrOEMDnw';

const headers = {
  apikey: SB_KEY,
  Authorization: `Bearer ${SB_KEY}`,
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
};

// Stage mapping based on next step
const NEXT_STEP_TO_STAGE = {
  proposta: 'Em Negociação',
  outra_visita: 'Visita Agendada',
  pensar: 'Em Negociação',
  desistiu: 'Perdido',
};

// Pipeline deal status mapping based on next step
const NEXT_STEP_TO_DEAL_STATUS = {
  proposta: 'proposta',
  outra_visita: 'visita_realizada',
  pensar: 'visita_realizada',
  desistiu: 'perdido',
};

// Follow-up delay in days per next step
const FOLLOWUP_DELAYS = {
  proposta: 1,
  outra_visita: 2,
  pensar: 3,
  desistiu: 30,
};

// Follow-up message templates per next step
function getFollowUpMessage(nextStep, leadName, objection) {
  switch (nextStep) {
    case 'proposta':
      return `Enviar proposta para ${leadName}`;
    case 'outra_visita':
      return `Agendar nova visita com ${leadName}`;
    case 'pensar':
      return `Retomar contato com ${leadName}`;
    case 'desistiu':
      return `Reengajar ${leadName} — motivo: ${objection || 'não informado'}`;
    default:
      return `Follow-up com ${leadName}`;
  }
}

async function sbPatch(table, matchParam, body) {
  const r = await fetch(`${SB_URL}/rest/v1/${table}?${matchParam}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(body),
  });
  const text = await r.text();
  try { return JSON.parse(text); } catch { return null; }
}

async function sbPost(table, body) {
  const r = await fetch(`${SB_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  const text = await r.text();
  try { return JSON.parse(text); } catch { return null; }
}

async function sbGet(path) {
  const r = await fetch(`${SB_URL}/rest/v1/${path}`, { headers });
  const text = await r.text();
  try { return JSON.parse(text); } catch { return []; }
}

/**
 * saveVisitRegistration — main function called after modal submit
 * @param {object} appointment - the appointment object (must have id, lead_uuid, lead_name)
 * @param {object} feedback - { feedback, objection, nextStep, notes }
 * @returns {{ updatedLead: object|null }}
 */
export async function saveVisitRegistration(appointment, feedback) {
  const { feedback: visitFeedback, objection, nextStep, notes } = feedback;
  const leadUuid = appointment.lead_uuid || appointment.lead_id || null;

  // 1. Update agenda_appointments
  const feedbackMap = { Sim: 'positivo', Parcial: 'parcial', Não: 'negativo' };
  await sbPatch('agenda_appointments', `id=eq.${appointment.id}`, {
    status: 'concluido',
    completed_at: new Date().toISOString(),
    visit_feedback: feedbackMap[visitFeedback] || 'positivo',
    visit_objection: objection,
    visit_next_step: nextStep,
    visit_notes: notes || null,
  });

  let updatedLead = null;

  if (leadUuid) {
    const newStage = NEXT_STEP_TO_STAGE[nextStep];
    const lostReason = nextStep === 'desistiu' ? objection : null;

    // 2. Advance lead stage in crm_leads
    if (newStage) {
      const leadUpdate = {
        stage: newStage,
        updated_at: new Date().toISOString(),
      };
      if (lostReason) {
        leadUpdate.lost_reason = lostReason;
      }
      const result = await sbPatch('crm_leads', `id=eq.${leadUuid}`, leadUpdate);
      if (Array.isArray(result) && result[0]) {
        updatedLead = result[0];
      }
    }

    // 3. Create auto follow-up
    const delayDays = FOLLOWUP_DELAYS[nextStep] ?? 3;
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + delayDays);
    dueDate.setHours(10, 0, 0, 0);

    const messageText = getFollowUpMessage(
      nextStep,
      appointment.lead_name || updatedLead?.name || 'Lead',
      objection
    );

    await sbPost('follow_ups', {
      lead_uuid: leadUuid,
      type: nextStep === 'desistiu' ? 'reengajamento' : 'pos_visita',
      status: 'pendente',
      due_date: dueDate.toISOString(),
      message_text: messageText,
    }).catch(e => console.warn('follow_up create error:', e));

    // 4. Sync pipeline_deals if exists
    const dealStatus = NEXT_STEP_TO_DEAL_STATUS[nextStep];
    if (dealStatus) {
      try {
        const deals = await sbGet(`pipeline_deals?lead_uuid=eq.${leadUuid}&select=id,status`);
        if (Array.isArray(deals) && deals.length > 0) {
          const deal = deals[0];
          const dealUpdate = {
            status: dealStatus,
            updated_at: new Date().toISOString(),
          };
          if (dealStatus === 'perdido') {
            dealUpdate.lost_at = new Date().toISOString();
            if (lostReason) dealUpdate.lost_reason = lostReason;
          }
          await sbPatch('pipeline_deals', `id=eq.${deal.id}`, dealUpdate);
        }
      } catch (e) {
        console.warn('pipeline_deals sync error:', e);
      }
    }
  }

  return { updatedLead };
}
