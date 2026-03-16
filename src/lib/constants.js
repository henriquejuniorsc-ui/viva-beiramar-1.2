// --- CONSTANTES ---
export const KANBAN_STAGES = ['Novo Lead', 'Interessado', 'Qualificado', 'Visita Agendada', 'Em Negociação', 'Documentação', 'Contrato', 'Fechado', 'Perdido'];
export const LEAD_SOURCES = ['Site', 'WhatsApp', 'Indicação', 'Portais', 'Instagram'];
export const TEMP_COLORS = {
  'QUENTE': 'bg-red-500 text-white',
  'MORNO': 'bg-amber-500 text-white',
  'FRIO': 'bg-blue-500 text-white',
  'FRIO_RECUPERAVEL': 'bg-blue-500 text-white',
  'DESCARTE': 'bg-gray-400 text-white'
};
export const STATUS_COLORS = {
  'Disponível': 'bg-emerald-100 text-emerald-800 border-emerald-200',
  'Reservado': 'bg-amber-100 text-amber-800 border-amber-200',
  'Vendido': 'bg-red-100 text-red-800 border-red-200'
};

export const APPOINTMENT_TYPES = {
  visita: { label: 'Visita', color: 'bg-blue-100 text-blue-700 border-blue-500', hex: '#3b82f6' },
  reuniao: { label: 'Reunião', color: 'bg-amber-100 text-amber-700 border-amber-500', hex: '#f59e0b' },
  assinatura: { label: 'Assinatura', color: 'bg-green-100 text-green-700 border-green-500', hex: '#22c55e' },
  vistoria: { label: 'Vistoria', color: 'bg-red-100 text-red-700 border-red-500', hex: '#ef4444' },
  ligacao: { label: 'Ligação', color: 'bg-purple-100 text-purple-700 border-purple-500', hex: '#a855f7' },
  outro: { label: 'Outro', color: 'bg-gray-100 text-gray-700 border-gray-400', hex: '#6b7280' }
};
