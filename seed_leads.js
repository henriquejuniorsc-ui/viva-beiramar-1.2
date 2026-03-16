
const SB_URL = 'https://hcmpjrqpjohksoznoycq.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhjbXBqcnFwam9oa3Nvem5veWNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5OTk0NjAsImV4cCI6MjA4ODU3NTQ2MH0.XRWi4ZULpICkTucXgGVQCP5wq1RmVwOFWTdMrOEMDnw';

const leads = [
  { name: 'Ricardo Almeida', phone: '12997441020', email: 'ricardo@email.com', source: 'ZAP Imóveis', stage: 'Novo Lead', temperatura: 'QUENTE' },
  { name: 'Patrícia Rocha', phone: '11988223344', email: 'patricia@email.com', source: 'VivaReal', stage: 'Agendamento', temperatura: 'MORNO' },
  { name: 'Felipe Mendes', phone: '12991112233', email: 'felipe@email.com', source: 'Instagram', stage: 'Visita', temperatura: 'QUENTE' },
  { name: 'Juliana Costa', phone: '11977665544', email: 'juliana@email.com', source: 'Site Próprio', stage: 'Proposta', temperatura: 'QUENTE' },
  { name: 'Marcos Oliveira', phone: '13996655443', email: 'marcos@email.com', source: 'OLX', stage: 'Fechado', temperatura: 'QUENTE' },
  { name: 'Letícia Souza', phone: '11955443322', email: 'leticia@email.com', source: 'Facebook', stage: 'Novo Lead', temperatura: 'FRIO' },
  { name: 'Bruno Santos', phone: '12988776655', email: 'bruno@email.com', source: 'Indicação', stage: 'Agendamento', temperatura: 'MORNO' },
  { name: 'Camila Ferreira', phone: '11944332211', email: 'camila@email.com', source: 'ZAP Imóveis', stage: 'Visita', temperatura: 'QUENTE' },
  { name: 'Rodrigo Lima', phone: '13988990011', email: 'rodrigo@email.com', source: 'Google Ads', stage: 'Proposta', temperatura: 'MORNO' },
  { name: 'Beatriz Gomes', phone: '11911223344', email: 'beatriz@email.com', source: 'VivaReal', stage: 'Novo Lead', temperatura: 'QUENTE' },
  { name: 'Thiago Martins', phone: '12977445566', email: 'thiago@email.com', source: 'Instagram', stage: 'Agendamento', temperatura: 'MORNO' },
  { name: 'Amanda Rocha', phone: '11988997766', email: 'amanda@email.com', source: 'Site Próprio', stage: 'Visita', temperatura: 'QUENTE' },
  { name: 'Gustavo Lima', phone: '13999887766', email: 'gustavo@email.com', source: 'OLX', stage: 'Documentação', temperatura: 'MORNO' },
  { name: 'Heloísa Silva', phone: '11944556677', email: 'heloisa@email.com', source: 'Facebook', stage: 'Novo Lead', temperatura: 'FRIO' },
  { name: 'Daniel Alves', phone: '12911224455', email: 'daniel@email.com', source: 'Indicação', stage: 'Fechado', temperatura: 'QUENTE' },
  { name: 'Isabela Castro', phone: '11922334455', email: 'isabela@email.com', source: 'ZAP Imóveis', stage: 'Agendamento', temperatura: 'MORNO' },
  { name: 'Gabriel Machado', phone: '13977889900', email: 'gabriel@email.com', source: 'Google Ads', stage: 'Novo Lead', temperatura: 'QUENTE' },
  { name: 'Larissa Nunes', phone: '11933445566', email: 'larissa@email.com', source: 'VivaReal', stage: 'Visita', temperatura: 'QUENTE' },
  { name: 'Vinícius Rocha', phone: '12999001122', email: 'vinicius@email.com', source: 'Instagram', stage: 'Proposta', temperatura: 'MORNO' },
  { name: 'Fernanda Lima', phone: '11955667788', email: 'fernanda@email.com', source: 'Site Próprio', stage: 'Novo Lead', temperatura: 'FRIO' }
];

async function seedLeads() {
  console.log('Iniciando cadastro de 20 leads (corrigindo coluna temperatura)...');
  
  for (const lead of leads) {
    const res = await fetch(`${SB_URL}/rest/v1/crm_leads`, {
      method: 'POST',
      headers: {
        'apikey': SB_KEY,
        'Authorization': `Bearer ${SB_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(lead)
    });
    
    if (res.ok) {
      console.log(`✅ Lead ${lead.name} criado com sucesso.`);
    } else {
      console.error(`❌ Erro ao criar lead ${lead.name}:`, await res.text());
    }
  }
}

seedLeads();
