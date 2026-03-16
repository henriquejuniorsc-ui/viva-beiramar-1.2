
const SB_URL = 'https://hcmpjrqpjohksoznoycq.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhjbXBqcnFwam9oa3Nvem5veWNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5OTk0NjAsImV4cCI6MjA4ODU3NTQ2MH0.XRWi4ZULpICkTucXgGVQCP5wq1RmVwOFWTdMrOEMDnw';

async function checkLeads() {
  console.log('Verificando conteúdo da tabela crm_leads...');
  const res = await fetch(`${SB_URL}/rest/v1/crm_leads?select=*`, {
    headers: {
      'apikey': SB_KEY,
      'Authorization': `Bearer ${SB_KEY}`
    }
  });
  
  if (res.ok) {
    const data = await res.json();
    console.log(`Encontrados ${data.length} leads.`);
    if (data.length > 0) {
      console.log('Exemplo do primeiro lead:', JSON.stringify(data[0], null, 2));
    }
  } else {
    console.error('Erro ao buscar leads:', await res.text());
  }
}

checkLeads();
