/**
 * T17: Webhook de portais → lead automático
 *
 * POST /api/webhook/lead?token=SEU_TOKEN
 * Header: x-webhook-token: SEU_TOKEN  (alternativa ao query param)
 *
 * Variáveis de ambiente necessárias na Vercel:
 *   SUPABASE_URL              = https://hcmpjrqpjohksoznoycq.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY = (Supabase → Settings → API → service_role)
 *   WEBHOOK_SECRET            = (token aleatório, ex: imobipro_wh_2026_xyz)
 *   UAZAPI_BASE_URL           = https://euhenrique.uazapi.com  (opcional)
 */

// --- Configuração ---
const SB_URL = process.env.SUPABASE_URL || 'https://hcmpjrqpjohksoznoycq.supabase.co';

// Service role key bypassa RLS — NUNCA exponha no frontend
const SB_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Anon key usada apenas para leitura de settings (fallback quando service key não foi configurada)
const SB_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhjbXBqcnFwam9oa3Nvem5veWNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5OTk0NjAsImV4cCI6MjA4ODU3NTQ2MH0.XRWi4ZULpICkTucXgGVQCP5wq1RmVwOFWTdMrOEMDnw';

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || '';
const UAZAPI_BASE = process.env.UAZAPI_BASE_URL || 'https://euhenrique.uazapi.com';

// --- Helpers ---

function serviceHeaders() {
  const key = SB_SERVICE_KEY || SB_ANON_KEY;
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  };
}

function anonHeaders() {
  return {
    apikey: SB_ANON_KEY,
    Authorization: `Bearer ${SB_ANON_KEY}`,
    'Content-Type': 'application/json',
  };
}

/**
 * Normaliza telefone para apenas dígitos, removendo leading zeros e
 * adicionando código do país se necessário.
 * Ex: "(12) 9 9999-8888" → "5512999998888"
 */
function normalizePhone(phone) {
  if (!phone) return '';
  let digits = String(phone).replace(/\D/g, '').replace(/^0+/, '');

  // Se já vem com +55 (13 dígitos) ou 55 no início mantém
  if (digits.length === 13 && digits.startsWith('55')) return digits;

  // Número nacional com DDD (11 dígitos: DDD + 9 dígitos) → adiciona 55
  if (digits.length === 11) return `55${digits}`;

  // Número sem o 9 na frente (10 dígitos: DDD + 8 dígitos) → adiciona 55
  if (digits.length === 10) return `55${digits}`;

  return digits;
}

/**
 * Busca configurações na tabela admin_settings.
 * Retorna um objeto { chave: valor }.
 */
async function getSettings() {
  try {
    const r = await fetch(
      `${SB_URL}/rest/v1/admin_settings?select=key,value`,
      { headers: anonHeaders() }
    );
    if (!r.ok) return {};
    const data = await r.json();
    if (!Array.isArray(data)) return {};
    return Object.fromEntries(data.map(row => [row.key, row.value]));
  } catch (_) {
    return {};
  }
}

/**
 * Envia notificação WhatsApp ao corretor via UAZAPI.
 * Fire-and-forget — falha silenciosa para não bloquear a resposta.
 */
async function notifyCorretor(settings, lead) {
  const token = settings.uazapi_token;
  const phone = settings.corretor_telefone;
  if (!token || !phone) return;

  const phoneClean = normalizePhone(phone);
  const source = lead.source || 'Portal';
  const message =
    `🔔 *Novo lead do ${source}!*\n\n` +
    `👤 ${lead.name}\n` +
    `📱 ${lead.phone || '—'}\n` +
    `📧 ${lead.email || '—'}\n` +
    `💬 ${lead.interest || '—'}\n\n` +
    `_Acesse o painel pra responder em até 5 min e aumente suas chances de fechamento._`;

  try {
    await fetch(`${UAZAPI_BASE}/send/text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', token },
      body: JSON.stringify({ number: phoneClean, text: message }),
    });
  } catch (_) { /* fire-and-forget */ }
}

/**
 * Mapeia os campos do body (cada portal usa nomes diferentes)
 * para o schema do crm_leads.
 */
function mapLeadFields(body) {
  const source = body.source || body.portal || body.origem || 'Portal';
  const now = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

  // Coleta interest / mensagem de múltiplos campos possíveis
  const interest =
    body.message      ||
    body.mensagem      ||
    body.interest      ||
    body.obs           ||
    body.observacao    ||
    body.lead_message  ||
    null;

  // Temperatura baseada na fonte
  const sourceLower = source.toLowerCase();
  const temperatura =
    sourceLower.includes('zap') || sourceLower.includes('vivareal')
      ? 'QUENTE'
      : 'MORNO';

  return {
    name:
      body.name          ||
      body.lead_name      ||
      body.cliente_nome   ||
      body.Nome           ||
      'Lead Portal',

    phone: normalizePhone(
      body.phone          ||
      body.lead_phone     ||
      body.cliente_telefone ||
      body.telefone       ||
      body.Telefone       ||
      ''
    ),

    email:
      body.email          ||
      body.lead_email     ||
      body.cliente_email  ||
      body.Email          ||
      null,

    source,
    stage: 'Novo Lead',
    temperatura,
    score: 40,

    interest,

    // property_id pode vir de vários portais
    property_id:
      body.property_id    ||
      body.listing_id     ||
      body.imovel_id      ||
      body.propertyId     ||
      null,

    notes: [
      `Lead recebido via webhook do portal ${source} em ${now}.`,
      interest ? `Mensagem: ${interest}` : null,
    ].filter(Boolean).join('\n'),
  };
}

// --- Handler principal ---
export default async function handler(req, res) {
  // Só aceita POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed', allowed: 'POST' });
  }

  // --- Autenticação por token ---
  const token =
    req.headers['x-webhook-token'] ||
    req.query?.token;

  if (WEBHOOK_SECRET && token !== WEBHOOK_SECRET) {
    console.warn('[webhook/lead] Unauthorized attempt. Token header:', token ? '(present but wrong)' : '(missing)');
    return res.status(401).json({ error: 'Unauthorized. Pass token via x-webhook-token header or ?token= query param.' });
  }

  // Avisa se WEBHOOK_SECRET não foi configurado (modo dev)
  if (!WEBHOOK_SECRET) {
    console.warn('[webhook/lead] WEBHOOK_SECRET não configurado. Endpoint aberto! Configure na Vercel.');
  }

  // --- Parse body ---
  const body = req.body || {};
  if (Object.keys(body).length === 0) {
    return res.status(400).json({ error: 'Body vazio. Envie JSON com os dados do lead.' });
  }

  // --- Mapear campos do portal para o schema do crm_leads ---
  const lead = mapLeadFields(body);

  // --- Deduplicação por telefone ---
  if (lead.phone) {
    try {
      const dupRes = await fetch(
        `${SB_URL}/rest/v1/crm_leads?phone=eq.${encodeURIComponent(lead.phone)}&select=id,name,stage&limit=1`,
        { headers: serviceHeaders() }
      );
      if (dupRes.ok) {
        const existing = await dupRes.json();
        if (Array.isArray(existing) && existing.length > 0) {
          console.log(`[webhook/lead] Duplicate lead detected: phone=${lead.phone}, existing_id=${existing[0].id}`);
          return res.status(200).json({
            status: 'duplicate',
            lead_id: existing[0].id,
            message: `Lead já existe no CRM (${existing[0].name}, etapa: ${existing[0].stage})`,
          });
        }
      }
    } catch (e) {
      console.error('[webhook/lead] Error checking duplicate:', e);
    }
  }

  // --- Inserir lead no Supabase ---
  let createdLead;
  try {
    const insertRes = await fetch(`${SB_URL}/rest/v1/crm_leads`, {
      method: 'POST',
      headers: serviceHeaders(),
      body: JSON.stringify(lead),
    });

    const insertData = await insertRes.json();

    if (!insertRes.ok) {
      console.error('[webhook/lead] Supabase insert error:', insertData);

      // Se não tem service role key configurada, dá mensagem clara
      if (insertRes.status === 401 || insertRes.status === 403) {
        return res.status(500).json({
          error: 'Permissão negada ao inserir lead. Configure SUPABASE_SERVICE_ROLE_KEY nas variáveis de ambiente da Vercel.',
          details: insertData,
        });
      }

      return res.status(500).json({ error: 'Falha ao criar lead', details: insertData });
    }

    createdLead = Array.isArray(insertData) ? insertData[0] : insertData;
  } catch (e) {
    console.error('[webhook/lead] Fetch error:', e);
    return res.status(500).json({ error: 'Erro interno ao conectar com o banco.' });
  }

  // --- Notificar corretor via WhatsApp (fire-and-forget) ---
  getSettings().then(settings => notifyCorretor(settings, lead)).catch(() => {});

  // --- Resposta de sucesso ---
  console.log(`[webhook/lead] Lead criado: id=${createdLead?.id}, source=${lead.source}, phone=${lead.phone}`);

  return res.status(201).json({
    status: 'created',
    lead_id: createdLead?.id,
    lead_name: lead.name,
    lead_phone: lead.phone,
    source: lead.source,
  });
}
