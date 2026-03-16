import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import CockpitDashboard from './components/dashboard/CockpitDashboard';
import FollowUpsPage from './components/followups/FollowUps';
import ComissoesPage from './components/comissoes/Comissoes';
import AdminImoveis from './components/imoveis/AdminImoveis';
import ConversasPage from './components/conversas/ConversasPage';
import RelatoriosPage from './components/relatorios/RelatoriosPage';
import CelebrationScreen from './components/crm/CelebrationScreen';
import VisitRegistrationModal from './components/agenda/VisitRegistrationModal';
import { saveVisitRegistration } from './hooks/useVisitRegistration';
import { registerAction } from './hooks/useStreak';
import { RequestReferralModal, RegisterReferralModal } from './components/crm/ReferralModals';
import BadgesPage from './components/crm/BadgesPage';
import BadgeCelebration from './components/crm/BadgeCelebration';
import { checkAndUnlockBadges } from './hooks/useBadges';
import { useGoogleCalendar } from './hooks/useGoogleCalendar';
import {
  LayoutDashboard, Home, Users, Settings, LogOut, Search, Plus,
  X, Check, AlertCircle, MapPin, BedDouble, Bath, Car, Maximize,
  ChevronRight, Edit2, Trash2, Image as ImageIcon, Phone, Mail,
  User, Calendar, DollarSign, ArrowRight, Menu, Loader2, UploadCloud,
  MessageSquare, Send, Paperclip, Smile, MoreVertical, CheckCheck, Clock, RefreshCw, Info, PhoneForwarded,
  CalendarDays, ChevronLeft, Calendar as CalendarIcon, MapIcon, AlignLeft, Bell, BarChart3, CheckCircle2, HeartHandshake, UserPlus, Trophy
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip,
  PieChart, Pie, Cell, ResponsiveContainer
} from 'recharts';

// --- CONFIGURAÇÃO SUPABASE ---
const supabaseUrl = 'https://hcmpjrqpjohksoznoycq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhjbXBqcnFwam9oa3Nvem5veWNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5OTk0NjAsImV4cCI6MjA4ODU3NTQ2MH0.XRWi4ZULpICkTucXgGVQCP5wq1RmVwOFWTdMrOEMDnw';
let supabase = null;

// --- DESIGN SYSTEM & FONTS ---
const addGoogleFonts = () => {
  const link = document.createElement('link');
  link.href = 'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Playfair+Display:wght@600;700&family=JetBrains+Mono&display=swap';
  link.rel = 'stylesheet';
  document.head.appendChild(link);
};

// --- CONSTANTES ---
const KANBAN_STAGES = ['Novo Lead', 'Interessado', 'Qualificado', 'Visita Agendada', 'Em Negociação', 'Documentação', 'Contrato', 'Fechado', 'Perdido'];
const LEAD_SOURCES = ['Site', 'WhatsApp', 'Indicação', 'Portais', 'Instagram'];
const TEMP_COLORS = {
  'QUENTE': 'bg-red-500 text-white',
  'MORNO': 'bg-amber-500 text-white',
  'FRIO': 'bg-blue-500 text-white',
  'FRIO_RECUPERAVEL': 'bg-blue-500 text-white',
  'DESCARTE': 'bg-gray-400 text-white'
};
const STATUS_COLORS = {
  'Disponível': 'bg-emerald-100 text-emerald-800 border-emerald-200',
  'Reservado': 'bg-amber-100 text-amber-800 border-amber-200',
  'Vendido': 'bg-red-100 text-red-800 border-red-200'
};

const APPOINTMENT_TYPES = {
  visita: { label: 'Visita', color: 'bg-blue-100 text-blue-700 border-blue-500', hex: '#3b82f6' },
  reuniao: { label: 'Reunião', color: 'bg-amber-100 text-amber-700 border-amber-500', hex: '#f59e0b' },
  assinatura: { label: 'Assinatura', color: 'bg-green-100 text-green-700 border-green-500', hex: '#22c55e' },
  vistoria: { label: 'Vistoria', color: 'bg-red-100 text-red-700 border-red-500', hex: '#ef4444' },
  ligacao: { label: 'Ligação', color: 'bg-purple-100 text-purple-700 border-purple-500', hex: '#a855f7' },
  outro: { label: 'Outro', color: 'bg-gray-100 text-gray-700 border-gray-400', hex: '#6b7280' }
};

// --- HELPERS ---
const formatCurrency = (value) => {
  if (!value) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

const formatPhone = (phone) => {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 13 && cleaned.startsWith('55')) {
    const ddd = cleaned.substring(2, 4);
    const firstPart = cleaned.substring(4, 9);
    const secondPart = cleaned.substring(9, 13);
    return `+55 (${ddd}) ${firstPart}-${secondPart}`;
  }
  return phone;
};

const timeAgo = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now - date;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Agora';
  if (minutes < 60) return `${minutes} min`;
  const isToday = date.getDate() === now.getDate() && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  if (isToday) return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = date.getDate() === yesterday.getDate() && date.getMonth() === yesterday.getMonth() && date.getFullYear() === yesterday.getFullYear();
  if (isYesterday) return 'Ontem';
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
};

const isSameDay = (d1, d2) => d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

// --- COMPONENTES UI BASE ---
const Button = ({ children, variant = 'primary', className = '', isLoading, ...props }) => {
  const base = "inline-flex items-center justify-center transition-all duration-200 ease-in-out font-medium rounded-lg px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-[#C4A265] hover:bg-[#D4B87A] text-white shadow-sm",
    secondary: "bg-[#1B2B3A] hover:bg-[#2A4054] text-white shadow-sm",
    outline: "border border-[#C4A265] text-[#C4A265] hover:bg-[#C4A265] hover:text-white",
    outlineGray: "border border-[#E8E2D8] text-[#1B2B3A] hover:bg-[#F5F0E8]",
    danger: "bg-red-50 hover:bg-red-100 text-red-600",
    ghost: "hover:bg-[#F5F0E8] text-[#5A5A5A] hover:text-[#1B2B3A]"
  };
  return (
    <button type="button" className={`${base} ${variants[variant]} ${className}`} disabled={isLoading || props.disabled} {...props}>
      {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : children}
    </button>
  );
};

let toastTimeout;
const Toast = ({ message, type, subtitle, onClose, action, actionLabel }) => {
  if (!message) return null;
  const types = {
    success: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    error: 'bg-red-50 text-red-800 border-red-200',
    info: 'bg-blue-50 text-blue-800 border-blue-200',
    warning: 'bg-amber-50 text-amber-800 border-amber-200',
    pipeline: 'bg-white text-gray-900 border-gray-200 shadow-xl',
    lost: 'bg-gray-50 text-gray-700 border-gray-200',
  };
  return (
    <div className={`fixed bottom-4 right-4 z-[9999] flex items-start p-4 rounded-xl border shadow-lg toast-slide-in ${types[type] || types.info}`}>
      <div className="flex-1 mr-3">
        <span className="font-medium block">{message}</span>
        {subtitle && <span className="text-xs opacity-70 mt-0.5 block">{subtitle}</span>}
      </div>
      {action && (
        <button onClick={() => { action(); onClose(); }}
          className="px-3 py-1 bg-[#C4A265] text-white text-xs rounded-lg font-medium mr-2 hover:bg-[#b89355] flex-shrink-0">
          {actionLabel || 'Ação'}
        </button>
      )}
      <button onClick={onClose} className="p-1 hover:bg-black/5 rounded-full flex-shrink-0"><X className="w-4 h-4" /></button>
    </div>
  );
};

// --- PÁGINAS ---

// 1. DASHBOARD
const Dashboard = ({ leads, properties, appointments }) => {
  const activeLeads = leads.filter(l => l.stage !== 'Perdido' && l.stage !== 'Fechado');
  const hotLeads = leads.filter(l => l.temperatura === 'QUENTE').length;
  const activeProperties = properties.filter(p => p.status === 'Disponível').length;
  const pipelineValue = activeLeads.reduce((acc, lead) => acc + (Number(lead.estimated_value) || 0), 0);

  const stageData = KANBAN_STAGES.map(stage => ({
    name: stage,
    total: leads.filter(l => l.stage === stage).length
  }));

  const sourceData = LEAD_SOURCES.map(source => ({
    name: source,
    value: leads.filter(l => l.source === source).length
  })).filter(d => d.value > 0);
  const COLORS = ['#C4A265', '#1B2B3A', '#8A8A8A', '#10B981', '#F59E0B'];

  return (
    <div className="space-y-6 fade-in">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total de Leads', value: leads.length, icon: Users, color: 'text-blue-600' },
          { label: 'Leads Quentes', value: hotLeads, icon: AlertCircle, color: 'text-red-500' },
          { label: 'Imóveis Ativos', value: activeProperties, icon: Home, color: 'text-emerald-500' },
          { label: 'Valor no Pipeline', value: formatCurrency(pipelineValue), icon: DollarSign, color: 'text-[#C4A265]' }
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-[#E8E2D8] flex items-center space-x-4 hover:shadow-md transition-shadow">
            <div className={`p-3 rounded-xl bg-slate-50 ${stat.color}`}>
              <stat.icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-[#8A8A8A] font-medium">{stat.label}</p>
              <h3 className="text-2xl font-bold text-[#1B2B3A] font-serif">{stat.value}</h3>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#E8E2D8] lg:col-span-2">
          <h3 className="text-lg font-bold text-[#1B2B3A] font-serif mb-6">Leads por Etapa</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stageData} layout="vertical" margin={{ left: 40 }}>
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} fontSize={12} fill="#5A5A5A" />
                <RechartsTooltip cursor={{fill: '#F5F0E8'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                <Bar dataKey="total" fill="#1B2B3A" radius={[0, 4, 4, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#E8E2D8]">
          <h3 className="text-lg font-bold text-[#1B2B3A] font-serif mb-6">Origem dos Leads</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={sourceData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {sourceData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <RechartsTooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

// Urgency helper for kanban cards — T12
function getUrgencyStyle(updatedAt) {
  if (!updatedAt) return { borderLeft: '', label: null, color: '', pulse: false, level: 'unknown', pulseCls: '' };
  const days = Math.floor((Date.now() - new Date(updatedAt).getTime()) / 86400000);
  if (days >= 7) return {
    borderLeft: '4px solid #EF4444',
    label: `${days}d sem contato`,
    color: '#EF4444',
    pulse: true,
    level: 'critico',
    pulseCls: 'animate-pulse-border',
  };
  if (days >= 3) return {
    borderLeft: '4px solid #F59E0B',
    label: `${days}d sem contato`,
    color: '#F59E0B',
    pulse: false,
    level: 'risco',
    pulseCls: '',
  };
  if (days >= 1) return {
    borderLeft: '4px solid #D1D5DB',
    label: `${days}d atrás`,
    color: '#9CA3AF',
    pulse: false,
    level: 'ok',
    pulseCls: '',
  };
  return {
    borderLeft: '',
    label: 'Hoje',
    color: '#10B981',
    pulse: false,
    level: 'recente',
    pulseCls: '',
  };
}

// 2. CRM / LEADS (enriched with pipeline_deals + drag-and-drop + sync)
const CRM = ({ leads, properties, updateLead, setToast, reloadData, openAgendaModal }) => {
  const [view, setView] = useState('kanban');
  const [searchTerm, setSearchTerm] = useState('');
  const [deals, setDeals] = useState([]);
  const [mobileStageIdx, setMobileStageIdx] = useState(0);
  const [dealModal, setDealModal] = useState(null);
  const [draggedLead, setDraggedLead] = useState(null);
  const [dragOverStage, setDragOverStage] = useState(null);
  const [celebrationData, setCelebrationData] = useState(null); // { deal, lead }

  // Fetch deals
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${supabaseUrl}/rest/v1/pipeline_deals?select=*,properties!property_id(title,neighborhood)`, {
          headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}`, 'Content-Type': 'application/json' },
        });
        const data = await r.json();
        if (Array.isArray(data)) {
          // Flatten joined properties data
          setDeals(data.map(d => ({
            ...d,
            property_title: d.properties?.title || '',
            property_neighborhood: d.properties?.neighborhood || '',
            properties: undefined,
          })));
        }
      } catch (e) { console.error('CRM deals fetch:', e); }
    })();
  }, []);

  // T12: Update lead updated_at to reset the "days without contact" counter
  const updateLeadTimestamp = useCallback(async (leadId) => {
    try {
      await fetch(`${supabaseUrl}/rest/v1/crm_leads?id=eq.${leadId}`, {
        method: 'PATCH',
        headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify({ updated_at: new Date().toISOString() }),
      });
      updateLead({ id: leadId, updated_at: new Date().toISOString() }); // optimistic
    } catch (e) { console.warn('updateLeadTimestamp failed', e); }
  }, [updateLead]);

  const getDealForLead = useCallback((lead) => {
    return deals.find(d => d.lead_uuid && d.lead_uuid === lead.id) || null;
  }, [deals]);

  const filteredLeads = leads.filter(l =>
    l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (l.phone && l.phone.includes(searchTerm))
  );

  // --- Drag and drop ---
  const handleDragStart = (e, lead) => {
    setDraggedLead(lead);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', lead.id);
    e.currentTarget.style.opacity = '0.5';
  };

  const handleDragEnd = (e) => {
    e.currentTarget.style.opacity = '1';
    setDraggedLead(null);
    setDragOverStage(null);
  };

  const handleDragOver = (e, stage) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverStage(stage);
  };

  const handleDragLeave = () => {
    setDragOverStage(null);
  };

  const handleDrop = async (e, newStage) => {
    e.preventDefault();
    setDragOverStage(null);
    if (!draggedLead || draggedLead.stage === newStage) return;

    const oldStage = draggedLead.stage;
    const lead = draggedLead;

    // Optimistic update
    updateLead({ ...lead, stage: newStage });

    // Sync: update DB + deal + auto follow-up
    const { onLeadStageChange } = await import('./hooks/useSyncLeadStage.js');
    const result = await onLeadStageChange(lead, newStage, oldStage);

    if (result.updatedLead) {
      updateLead(result.updatedLead);
    }

    // 🎉 Celebration when moved to "Fechado" and lead has a deal
    if (newStage === 'Fechado') {
      const existingDeal = getDealForLead(lead);
      if (existingDeal) {
        registerAction('deal_closed', lead.id).catch(() => {});
        // T21: check badges async (fire-and-forget, show celebrations)
        checkAndUnlockBadges().then(newly => {
          if (newly.length > 0) setNewBadgeQueue(q => [...q, ...newly]);
        }).catch(() => {});
        setCelebrationData({ deal: existingDeal, lead });
        return; // skip other toasts
      }
    }

    // Register action for proposal (Documentação) + streak toast
    if (newStage === 'Documentação') {
      registerAction('proposal_sent', lead.id).then(res => {
        if (res && res.newStreak > res.prevStreak) {
          const msg = res.isNewRecord
            ? `🏆 Novo recorde! ${res.newStreak} dias consecutivos!`
            : `🔥 ${res.newStreak} dias! Streak mantido!`;
          setToast({ message: msg, type: 'success' });
        }
      }).catch(() => {});
    }

    // T14: Toast rico ao mover lead
    const deal = getDealForLead(lead);
    if (newStage === 'Perdido') {
      // Motivational toast — not sad
      setToast({
        message: '😤 Perdeu essa. Próximo!',
        subtitle: 'Bora pra próxima oportunidade 💪',
        type: 'lost',
      });
    } else if (result.shouldSuggestAgenda) {
      setToast({
        message: `📅 Deseja agendar uma visita com ${lead.name}?`,
        type: 'info',
        action: () => openAgendaModal({
          lead_id: lead.id, lead_uuid: lead.id, lead_name: lead.name,
          lead_phone: lead.phone, appointment_type: 'visita',
        }),
        actionLabel: 'Agendar',
      });
    } else if (deal && deal.deal_value > 0) {
      // Pipeline value toast
      const fmtVal = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(deal.deal_value);
      setToast({
        message: `📈 +${fmtVal} no pipeline!`,
        subtitle: `${lead.name} → ${newStage === 'Novo Lead' ? 'Novo Contato' : newStage}`,
        type: 'pipeline',
      });
    } else {
      setToast({
        message: `${lead.name} movido para ${newStage === 'Novo Lead' ? 'Novo Contato' : newStage}`,
        type: 'success',
      });
    }
  };

  // Save deal
  const saveDeal = async (leadId, dealData, existingDealId) => {
    try {
      const hdrs = { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}`, 'Content-Type': 'application/json', Prefer: 'return=representation' };
      const leadObj = leads.find(l => l.id === leadId);
      // Only send columns that exist in pipeline_deals
      const { property_title, property_neighborhood, property_price, ...cleanData } = dealData;
      const body = {
        ...cleanData,
        lead_uuid: leadId,
        commission_value: (Number(dealData.deal_value) || 0) * (Number(dealData.commission_rate) || 0) / 100,
        ...(dealData.status === 'fechado' ? { closed_at: new Date().toISOString() } : {}),
      };
      let result;
      if (existingDealId) {
        const r = await fetch(`${supabaseUrl}/rest/v1/pipeline_deals?id=eq.${existingDealId}`, {
          method: 'PATCH', headers: hdrs, body: JSON.stringify(body),
        });
        result = await r.json();
      } else {
        const r = await fetch(`${supabaseUrl}/rest/v1/pipeline_deals`, {
          method: 'POST', headers: hdrs, body: JSON.stringify(body),
        });
        result = await r.json();
      }
      if (Array.isArray(result) && result[0]) {
        const savedDeal = {
          ...result[0],
          property_title: dealData.property_title || '',
          property_neighborhood: dealData.property_neighborhood || '',
        };
        setDeals(prev => {
          const f = prev.filter(d => d.id !== savedDeal.id);
          return [...f, savedDeal];
        });

        // 🎉 Celebration when deal status set to fechado
        if (dealData.status === 'fechado' && savedDeal.deal_value) {
          setDealModal(null);
          setCelebrationData({ deal: savedDeal, lead: leadObj });
          // T21: check badges async
          checkAndUnlockBadges().then(newly => {
            if (newly.length > 0) setNewBadgeQueue(q => [...q, ...newly]);
          }).catch(() => {});
          return; // skip regular toast
        }
      }
      setToast({ message: 'Negócio salvo!', type: 'success' });
      setDealModal(null);
    } catch (e) {
      setToast({ message: 'Erro ao salvar negócio.', type: 'error' });
    }
  };

  const ProbBadge = ({ prob }) => {
    if (!prob && prob !== 0) return null;
    const cls = prob >= 70 ? 'bg-green-50 text-green-700' : prob >= 40 ? 'bg-amber-50 text-amber-700' : 'bg-gray-100 text-gray-500';
    return <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${cls}`}>{prob}%</span>;
  };

  return (
    <div className="h-full flex flex-col fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center space-x-4 bg-white p-1 rounded-lg border border-[#E8E2D8] w-fit">
          <button onClick={() => setView('kanban')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${view === 'kanban' ? 'bg-[#1B2B3A] text-white' : 'text-[#5A5A5A] hover:bg-[#F5F0E8]'}`}>Kanban</button>
          <button onClick={() => setView('list')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${view === 'list' ? 'bg-[#1B2B3A] text-white' : 'text-[#5A5A5A] hover:bg-[#F5F0E8]'}`}>Lista</button>
        </div>
        <div className="flex items-center space-x-3 w-full md:w-auto">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8A8A8A]" />
            <input type="text" placeholder="Buscar oportunidade..." value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-[#E8E2D8] bg-white text-sm focus:ring-2 focus:ring-[#C4A265] outline-none" />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden relative">
        {view === 'kanban' ? (
          <div key="kanban-view" className="h-full flex flex-col">
          {/* Mobile kanban — one column at a time */}
          <div className="md:hidden flex-1 flex flex-col">
            <div className="flex items-center justify-between px-2 py-2 bg-white border-b border-[#E8E2D8]">
              <button onClick={() => setMobileStageIdx(i => Math.max(0, i - 1))}
                disabled={mobileStageIdx === 0}
                className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30">
                <ChevronLeft className="w-5 h-5 text-[#1B2B3A]" />
              </button>
              <div className="text-center">
                <span className="font-semibold text-[#1B2B3A] text-sm">{KANBAN_STAGES[mobileStageIdx] === 'Novo Lead' ? 'Novo Contato' : KANBAN_STAGES[mobileStageIdx]}</span>
                <span className="ml-2 text-xs text-[#8A8A8A]">({filteredLeads.filter(l => l.stage === KANBAN_STAGES[mobileStageIdx]).length})</span>
                {(() => {
                  const sum = filteredLeads.filter(l => l.stage === KANBAN_STAGES[mobileStageIdx]).reduce((s, l) => {
                    const d = getDealForLead(l); return s + (d ? Number(d.deal_value) || 0 : 0);
                  }, 0);
                  return sum > 0 ? <p className="text-[10px] text-[#C4A265]">{formatCurrency(sum)}</p> : null;
                })()}
              </div>
              <button onClick={() => setMobileStageIdx(i => Math.min(KANBAN_STAGES.length - 1, i + 1))}
                disabled={mobileStageIdx === KANBAN_STAGES.length - 1}
                className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30">
                <ChevronRight className="w-5 h-5 text-[#1B2B3A]" />
              </button>
            </div>
            <div className="flex gap-1 justify-center py-1.5 bg-white border-b border-[#E8E2D8]">
              {KANBAN_STAGES.map((_, i) => (
                <button key={i} onClick={() => setMobileStageIdx(i)}
                  className={`w-2 h-2 rounded-full transition-colors ${i === mobileStageIdx ? 'bg-[#C4A265]' : 'bg-gray-200'}`} />
              ))}
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {filteredLeads.filter(l => l.stage === KANBAN_STAGES[mobileStageIdx]).map(lead => {
                const deal = getDealForLead(lead);
                const urgency = getUrgencyStyle(lead.updated_at);
                return (
                  <div key={lead.id}
                    className="bg-white p-4 rounded-xl shadow-sm border border-[#E8E2D8]"
                    style={{ borderLeft: urgency.borderLeft }}
                    onClick={() => setDealModal({ lead, deal })}>
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-bold text-[#1B2B3A] text-sm">{lead.name}</h4>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${TEMP_COLORS[lead.temperatura] || 'bg-slate-200 text-slate-800'}`}>{lead.temperatura}</span>
                    </div>
                    {deal ? (
                      <div className="mb-2 space-y-1">
                        {deal.property_title && <p className="text-[11px] text-[#5A5A5A] truncate">{deal.property_title}</p>}
                        {/* T12: show COMMISSION as primary value */}
                        <div className="flex items-center gap-2 flex-wrap">
                          {deal.commission_value > 0 ? (
                            <span className="text-xs font-bold text-[#1D9E75]">R$ {Math.round(deal.commission_value).toLocaleString('pt-BR')} com.</span>
                          ) : (
                            <span className="text-xs font-bold text-[#C4A265]">{formatCurrency(deal.deal_value)}</span>
                          )}
                          {deal.probability != null && <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${deal.probability >= 70 ? 'bg-green-50 text-green-700' : deal.probability >= 40 ? 'bg-amber-50 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>{deal.probability}%</span>}
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-[#5A5A5A] mb-2"><Phone className="w-3 h-3 inline mr-1" />{formatPhone(lead.phone)}</p>
                    )}
                    {/* T12: urgency row */}
                    {urgency.label && (
                      <div className="flex items-center gap-1.5 mt-1.5">
                        {urgency.pulse && <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse flex-shrink-0" />}
                        <span className="text-[10px] font-medium" style={{ color: urgency.color }}>⏰ {urgency.label}</span>
                      </div>
                    )}
                    {/* T12: Agir agora button for urgent / at-risk */}
                    {(urgency.level === 'critico' || urgency.level === 'risco') && lead.phone && (
                      <a
                        href={`https://wa.me/${lead.phone.replace(/\D/g, '')}`}
                        target="_blank" rel="noopener noreferrer"
                        onClick={e => { e.stopPropagation(); updateLeadTimestamp(lead.id); }}
                        className={`mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-colors ${
                          urgency.level === 'critico' ? 'bg-red-500 hover:bg-red-600' : 'bg-amber-500 hover:bg-amber-600'
                        }`}>
                        <MessageSquare className="w-3 h-3" /> Agir agora
                      </a>
                    )}
                    <div className="flex gap-2 pt-2 mt-1 border-t border-[#E8E2D8]">
                      <Button variant="outlineGray" className="flex-1 py-2 text-xs" onClick={(e) => { e.stopPropagation(); openAgendaModal({ lead_id: lead.id, lead_uuid: lead.id, lead_name: lead.name, lead_phone: lead.phone }); }}>
                        <CalendarDays className="w-3 h-3 mr-1" /> Agendar
                      </Button>
                      {lead.phone && (
                        <a href={`https://wa.me/${lead.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
                          onClick={e => { e.stopPropagation(); updateLeadTimestamp(lead.id); }}
                          className="flex-1 py-2 text-xs font-medium inline-flex items-center justify-center rounded-lg border border-[#25D366] text-[#25D366] hover:bg-[#25D366] hover:text-white transition-colors">
                          <MessageSquare className="w-3 h-3 mr-1" /> WhatsApp
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
              {filteredLeads.filter(l => l.stage === KANBAN_STAGES[mobileStageIdx]).length === 0 && (
                <p className="text-center text-sm text-[#8A8A8A] py-8">Nenhuma oportunidade aqui</p>
              )}
            </div>
          </div>
          {/* Desktop kanban — horizontal scroll */}
          <div className="hidden md:flex h-full overflow-x-auto pb-4 gap-4 hide-scrollbar items-start">
            {KANBAN_STAGES.map(stage => {
              const stageLeads = filteredLeads.filter(l => l.stage === stage);
              const stageDealsSum = stageLeads.reduce((sum, l) => {
                const deal = getDealForLead(l);
                return sum + (deal ? Number(deal.deal_value) || 0 : 0);
              }, 0);
              const isDragOver = dragOverStage === stage;
              return (
                <div key={stage}
                  className={`flex-shrink-0 w-80 bg-[#F5F0E8] rounded-xl flex flex-col max-h-full transition-all ${stage === 'Perdido' ? 'opacity-70' : ''} ${isDragOver ? 'ring-2 ring-[#C4A265] bg-[#C4A265]/5' : ''}`}
                  onDragOver={(e) => handleDragOver(e, stage)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, stage)}>
                  <div className="p-3 border-b border-[#E8E2D8]/50">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-[#1B2B3A] text-sm">{stage === 'Novo Lead' ? 'Novo Contato' : stage}</span>
                      <span className="bg-white text-xs px-2 py-0.5 rounded-full text-[#8A8A8A]">{stageLeads.length}</span>
                    </div>
                    {stageDealsSum > 0 && (
                      <p className="text-[10px] text-[#C4A265] font-medium mt-1">{formatCurrency(stageDealsSum)}</p>
                    )}
                  </div>
                  <div className="p-3 overflow-y-auto flex-1 space-y-3 custom-scrollbar">
                    {stageLeads.map(lead => {
                      const deal = getDealForLead(lead);
                      const urgency = getUrgencyStyle(lead.updated_at);
                      return (
                        <div key={lead.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, lead)}
                          onDragEnd={handleDragEnd}
                          className="bg-white p-4 rounded-xl shadow-sm border border-[#E8E2D8] hover:border-[#C4A265] transition-colors group cursor-grab active:cursor-grabbing"
                          style={{ borderLeft: urgency.borderLeft }}
                          onClick={() => setDealModal({ lead, deal })}>
                          <div className="flex justify-between items-start mb-1">
                            <h4 className="font-bold text-[#1B2B3A] text-sm">{lead.name}</h4>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${TEMP_COLORS[lead.temperatura] || 'bg-slate-200 text-slate-800'}`}>{lead.temperatura}</span>
                          </div>
                        {deal && (
                          <div className="mb-2 space-y-1">
                            {deal.property_title && (
                              <p className="text-[11px] text-[#5A5A5A] truncate">
                                {deal.property_title}{deal.property_neighborhood ? ` — ${deal.property_neighborhood}` : ''}
                              </p>
                            )}
                            {/* T12: commission first */}
                            <div className="flex items-center gap-2 flex-wrap">
                              {deal.commission_value > 0 ? (
                                <span className="text-xs font-bold text-[#1D9E75]">R$ {Math.round(deal.commission_value).toLocaleString('pt-BR')} com.</span>
                              ) : (
                                <span className="text-xs font-bold text-[#C4A265]">{formatCurrency(deal.deal_value)}</span>
                              )}
                              {deal.commission_value > 0 && (
                                <span className="text-[10px] text-gray-400">{formatCurrency(deal.deal_value)}</span>
                              )}
                            </div>
                            {deal.probability != null && (
                              <div className="flex items-center gap-1.5">
                                <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                  <div className={`h-full rounded-full ${deal.probability >= 70 ? 'bg-green-500' : deal.probability >= 40 ? 'bg-amber-400' : 'bg-gray-300'}`}
                                    style={{ width: `${deal.probability}%` }} />
                                </div>
                                <ProbBadge prob={deal.probability} />
                              </div>
                            )}
                          </div>
                        )}
                        {!deal && (
                          <p className="text-xs text-[#5A5A5A] mb-2 flex items-center">
                            <Phone className="w-3 h-3 mr-1" /> {formatPhone(lead.phone)}
                          </p>
                        )}
                        {/* T12: urgency row */}
                        {urgency.label && (
                          <div className="flex items-center gap-1.5 mt-1.5">
                            {urgency.pulse && <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse flex-shrink-0" />}
                            <span className="text-[10px] font-medium" style={{ color: urgency.color }}>⏰ {urgency.label}</span>
                          </div>
                        )}
                        {/* T12: Agir agora for urgent leads */}
                        {(urgency.level === 'critico' || urgency.level === 'risco') && lead.phone && (
                          <a
                            href={`https://wa.me/${lead.phone.replace(/\D/g, '')}`}
                            target="_blank" rel="noopener noreferrer"
                            onClick={e => { e.stopPropagation(); updateLeadTimestamp(lead.id); }}
                            className={`mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold text-white transition-colors ${
                              urgency.level === 'critico' ? 'bg-red-500 hover:bg-red-600' : 'bg-amber-500 hover:bg-amber-600'
                            }`}>
                            <MessageSquare className="w-3 h-3" /> Agir agora
                          </a>
                        )}
                        <div className="flex items-center space-x-2 pt-2 mt-1 border-t border-[#E8E2D8]">
                          <Button variant="outlineGray" className="flex-1 py-1 text-xs" onClick={(e) => { e.stopPropagation(); openAgendaModal({ lead_id: lead.id, lead_uuid: lead.id, lead_name: lead.name, lead_phone: lead.phone }); }}>
                            <CalendarDays className="w-3 h-3 mr-1" /> Agendar
                          </Button>
                          {!deal && (
                            <Button variant="outlineGray" className="flex-1 py-1 text-xs" onClick={(e) => { e.stopPropagation(); setDealModal({ lead, deal: null }); }}>
                              <DollarSign className="w-3 h-3 mr-1" /> Negócio
                            </Button>
                          )}
                        </div>
                        </div>
                      );
                    })}
                    {isDragOver && stageLeads.length === 0 && (
                      <div className="border-2 border-dashed border-[#C4A265] rounded-xl p-4 text-center text-xs text-[#C4A265]">
                        Solte aqui
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          </div>
        ) : (
          <div key="list-view" className="bg-white rounded-xl border border-[#E8E2D8] overflow-hidden overflow-x-auto">
            {/* Desktop table — hidden on mobile, cards shown instead */}
            <table className="w-full text-sm hidden md:table">
              <thead>
                <tr className="border-b border-[#E8E2D8] bg-[#FAF8F5]">
                  <th className="text-left px-4 py-3 text-xs font-medium text-[#8A8A8A]">Lead</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-[#8A8A8A]">Telefone</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-[#8A8A8A]">Etapa</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-[#8A8A8A]">Temp.</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-[#8A8A8A]">Com.</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-[#8A8A8A]">Imóvel</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-[#8A8A8A]">Prob.</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-[#8A8A8A]">Último contato</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeads.map(lead => {
                  const deal = getDealForLead(lead);
                  const urgency = getUrgencyStyle(lead.updated_at);
                  return (
                    <tr key={lead.id}
                      className={`border-b border-[#E8E2D8] last:border-0 hover:bg-gray-50 cursor-pointer ${
                        urgency.level === 'critico' ? 'bg-red-50/40' : urgency.level === 'risco' ? 'bg-amber-50/30' : ''
                      } ${urgency.pulseCls}`}
                      style={urgency.borderLeft ? { borderLeft: urgency.borderLeft } : {}}
                      onClick={() => setDealModal({ lead, deal })}>
                      <td className="px-4 py-3 font-medium text-[#1B2B3A]">{lead.name}</td>
                      <td className="px-4 py-3 text-[#5A5A5A]">{formatPhone(lead.phone)}</td>
                      <td className="px-4 py-3"><span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{lead.stage === 'Novo Lead' ? 'Novo Contato' : lead.stage}</span></td>
                      <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-[10px] font-bold ${TEMP_COLORS[lead.temperatura] || 'bg-slate-200 text-slate-800'}`}>{lead.temperatura}</span></td>
                      <td className="px-4 py-3 text-right font-medium">
                        {deal ? (
                          deal.commission_value > 0
                            ? <span className="text-[#1D9E75]">R$ {Math.round(deal.commission_value).toLocaleString('pt-BR')}</span>
                            : <span className="text-[#C4A265]">{formatCurrency(deal.deal_value)}</span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3 text-[#5A5A5A] truncate max-w-[200px]">{deal?.property_title || '—'}</td>
                      <td className="px-4 py-3 text-center">{deal?.probability != null ? <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${deal.probability >= 70 ? 'bg-green-50 text-green-700' : deal.probability >= 40 ? 'bg-amber-50 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>{deal.probability}%</span> : '—'}</td>
                      <td className="px-4 py-3 text-center">
                        {urgency.label && (
                          <span className="text-xs font-medium" style={{ color: urgency.color }}>
                            {urgency.pulse && <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse mr-1" />}
                            {urgency.label}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filteredLeads.length === 0 && <p className="p-6 text-center text-[#8A8A8A] hidden md:block">Nenhum lead encontrado.</p>}
            {/* Mobile list — cards */}
            <div className="md:hidden divide-y divide-[#E8E2D8]">
              {filteredLeads.map(lead => {
                const deal = getDealForLead(lead);
                const urgency = getUrgencyStyle(lead.updated_at);
                return (
                  <div key={lead.id}
                    className="p-4 hover:bg-gray-50"
                    style={urgency.borderLeft ? { borderLeft: urgency.borderLeft } : {}}
                    onClick={() => setDealModal({ lead, deal })}>
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-medium text-[#1B2B3A] text-sm">{lead.name}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${TEMP_COLORS[lead.temperatura] || 'bg-slate-200 text-slate-800'}`}>{lead.temperatura}</span>
                    </div>
                    <p className="text-xs text-[#8A8A8A]">{formatPhone(lead.phone)} · {lead.stage === 'Novo Lead' ? 'Novo Contato' : lead.stage}</p>
                    {deal && (
                      <p className="text-xs font-medium mt-1">
                        {deal.commission_value > 0
                          ? <span className="text-[#1D9E75]">R$ {Math.round(deal.commission_value).toLocaleString('pt-BR')} com.</span>
                          : <span className="text-[#C4A265]">{formatCurrency(deal.deal_value)}</span>}
                        {deal.property_title && <span className="text-[#8A8A8A]"> · {deal.property_title}</span>}
                      </p>
                    )}
                    {urgency.label && (
                      <p className="text-[10px] mt-1 font-medium" style={{ color: urgency.color }}>
                        {urgency.pulse && <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse mr-1" />}
                        ⏰ {urgency.label}
                      </p>
                    )}
                  </div>
                );
              })}
              {filteredLeads.length === 0 && <p className="p-6 text-center text-[#8A8A8A]">Nenhum lead encontrado.</p>}
            </div>
          </div>
        )}
      </div>

      {dealModal && (
        <DealModal lead={dealModal.lead} deal={dealModal.deal} properties={properties}
          onClose={() => setDealModal(null)} onSave={saveDeal}
          setToast={setToast} onReferralSaved={() => reloadData && reloadData()} />
      )}

      {celebrationData && (
        <CelebrationScreen
          deal={celebrationData.deal}
          lead={celebrationData.lead}
          onClose={() => setCelebrationData(null)}
        />
      )}
    </div>
  );
};

// Deal Modal — create/edit deal for a lead
const DealModal = ({ lead, deal, properties, onClose, onSave, setToast, onReferralSaved }) => {
  const [form, setForm] = useState({
    property_id: deal?.property_id || '',
    property_title: deal?.property_title || '',
    property_neighborhood: deal?.property_neighborhood || '',
    property_price: deal?.property_price || '',
    deal_value: deal?.deal_value || '',
    commission_rate: deal?.commission_rate || 3,
    probability: deal?.probability || 50,
    expected_close_date: deal?.expected_close_date || '',
    status: deal?.status || 'novo',
    notes: deal?.notes || '',
  });
  const [saving, setSaving] = useState(false);
  const [showReqReferral, setShowReqReferral] = useState(false);
  const [showRegReferral, setShowRegReferral] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handlePropertyChange = (propId) => {
    const prop = properties.find(p => p.id === propId);
    if (prop) {
      set('property_id', prop.id);
      setForm(f => ({
        ...f,
        property_id: prop.id,
        property_title: prop.title,
        property_neighborhood: prop.neighborhood || '',
        property_price: prop.price || '',
        deal_value: f.deal_value || prop.price || '',
      }));
    }
  };

  const commissionValue = ((Number(form.deal_value) || 0) * (Number(form.commission_rate) || 0)) / 100;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    await onSave(lead.id, form, deal?.id);
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/50 md:backdrop-blur-sm flex items-end md:items-center justify-center md:p-4" onClick={onClose}>
      <div className="bg-white w-full md:max-w-lg md:rounded-2xl rounded-t-2xl shadow-xl max-h-[95vh] md:max-h-[90vh] overflow-y-auto custom-scrollbar animate-scale-in" onClick={e => e.stopPropagation()}>
        <div className="p-4 md:p-5 border-b border-[#E8E2D8] bg-[#FAF8F5] flex justify-between items-center sticky top-0 z-10 md:rounded-t-2xl">
          <div>
            <h2 className="text-base md:text-lg font-bold font-serif text-[#1B2B3A]">{deal ? 'Editar Negócio' : 'Novo Negócio'}</h2>
            <p className="text-xs text-[#8A8A8A]">{lead.name} — {formatPhone(lead.phone)}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[#E8E2D8] rounded-full"><X className="w-5 h-5" /></button>
        </div>

        {/* --- T20: Área Pós-venda para leads Fechados --- */}
        {lead.stage === 'Fechado' && !showReqReferral && !showRegReferral && (
          <div className="p-4 bg-gradient-to-r from-[#FAF8F5] to-white border-b border-[#E8E2D8] flex gap-2">
            <button type="button" onClick={() => setShowReqReferral(true)} className="flex-1 flex flex-col items-center justify-center gap-1.5 border-2 border-[#C4A265] text-[#C4A265] hover:bg-[#FAF8F5] rounded-xl text-[11px] font-bold min-h-[56px] px-2 transition-colors">
              <HeartHandshake className="w-5 h-5" />
              Pedir indicação
            </button>
            <button type="button" onClick={() => setShowRegReferral(true)} className="flex-1 flex flex-col items-center justify-center gap-1.5 border-2 border-emerald-600 text-emerald-700 hover:bg-emerald-50 rounded-xl text-[11px] font-bold min-h-[56px] px-2 transition-colors">
              <UserPlus className="w-5 h-5" />
              Registrar indicação
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Imóvel */}
          <div>
            <label className="block text-sm font-medium text-[#1B2B3A] mb-1">Imóvel</label>
            <select value={form.property_id} onChange={e => handlePropertyChange(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-[#E8E2D8] focus:border-[#C4A265] outline-none bg-white text-sm">
              <option value="">Selecione um imóvel...</option>
              {properties.map(p => <option key={p.id} value={p.id}>{p.title} — {p.neighborhood || 'N/A'}</option>)}
            </select>
            {form.property_title && !form.property_id && (
              <p className="text-xs text-[#8A8A8A] mt-1">Imóvel atual: {form.property_title}</p>
            )}
          </div>

          {/* Valor + Comissão */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-[#1B2B3A] mb-1">Valor do negócio (R$)</label>
              <input type="number" value={form.deal_value} onChange={e => set('deal_value', e.target.value)}
                className="w-full p-2.5 rounded-xl border border-[#E8E2D8] focus:border-[#C4A265] outline-none text-sm" placeholder="0" />
              {form.deal_value > 0 && <p className="text-xs text-[#C4A265] mt-1">{formatCurrency(form.deal_value)}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1B2B3A] mb-1">Comissão (%)</label>
              <input type="number" step="0.5" value={form.commission_rate} onChange={e => set('commission_rate', e.target.value)}
                className="w-full p-2.5 rounded-xl border border-[#E8E2D8] focus:border-[#C4A265] outline-none text-sm" placeholder="3" />
              {commissionValue > 0 && <p className="text-xs text-green-600 mt-1">{formatCurrency(commissionValue)}</p>}
            </div>
          </div>

          {/* Probabilidade */}
          <div>
            <label className="block text-sm font-medium text-[#1B2B3A] mb-1">Probabilidade de fechamento: {form.probability}%</label>
            <input type="range" min="0" max="100" step="5" value={form.probability}
              onChange={e => set('probability', Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#C4A265]" />
            <div className="flex justify-between text-[10px] text-[#8A8A8A] mt-1">
              <span>0%</span><span>50%</span><span>100%</span>
            </div>
          </div>

          {/* Previsão + Status */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-[#1B2B3A] mb-1">Previsão de fechamento</label>
              <input type="date" value={form.expected_close_date} onChange={e => set('expected_close_date', e.target.value)}
                className="w-full p-2.5 rounded-xl border border-[#E8E2D8] focus:border-[#C4A265] outline-none text-sm bg-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1B2B3A] mb-1">Status do deal</label>
              <select value={form.status} onChange={e => set('status', e.target.value)}
                className="w-full p-2.5 rounded-xl border border-[#E8E2D8] focus:border-[#C4A265] outline-none bg-white text-sm">
                <option value="novo">Novo</option>
                <option value="contato">Contato</option>
                <option value="visita_agendada">Visita Agendada</option>
                <option value="visita_realizada">Visita Realizada</option>
                <option value="proposta">Proposta</option>
                <option value="contrato">Contrato</option>
                <option value="fechado">Fechado</option>
                <option value="perdido">Perdido</option>
              </select>
            </div>
          </div>

          {/* Notas */}
          <div>
            <label className="block text-sm font-medium text-[#1B2B3A] mb-1">Observações</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2}
              className="w-full p-2.5 rounded-xl border border-[#E8E2D8] focus:border-[#C4A265] outline-none resize-none text-sm" placeholder="Notas sobre o negócio..." />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-[#E8E2D8]">
            <Button variant="outlineGray" type="button" onClick={onClose}>Cancelar</Button>
            <Button type="submit" isLoading={saving}>{deal ? 'Salvar Alterações' : 'Criar Negócio'}</Button>
          </div>
        </form>
      </div>

      {showReqReferral && <RequestReferralModal lead={lead} onClose={() => setShowReqReferral(false)} onSent={() => { setShowReqReferral(false); if (setToast) setToast({ message: 'Mensagem enviada com sucesso!', type: 'success' }); }} />}
      {showRegReferral && <RegisterReferralModal lead={lead} properties={properties} onClose={() => setShowRegReferral(false)} onSaved={(newLead) => { setShowRegReferral(false); if (setToast) setToast({ message: 'Lead criado! Indicação de ' + lead.name, type: 'success' }); if (onReferralSaved) onReferralSaved(); }} />}
    </div>
  );
};

// 3. IMÓVEIS — Movido para src/components/imoveis/AdminImoveis.jsx

// 4. CONFIGURAÇÕES
const SettingsPage = ({ uazConfig, setUazConfig, googleCal, setToast }) => {
  const handleSaveUaz = (e) => {
    e.preventDefault();
    localStorage.setItem('uazapiUrl', uazConfig.url);
    localStorage.setItem('uazapiToken', uazConfig.token);
    setToast({ message: 'Configurações de WhatsApp salvas!', type: 'success' });
  };
  const [gcClientId, setGcClientId] = useState(googleCal.clientId || '');

  return (
    <div className="max-w-3xl mx-auto space-y-6 fade-in pb-12">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-[#E8E2D8]">
        <div className="flex items-center space-x-4 mb-8">
          <img src="/logo-viva-beiramar.png" alt="Viva Beiramar" className="w-16 h-16 rounded-full shadow-md" />
          <div>
            <h2 className="text-xl font-bold font-serif text-[#1B2B3A]">Viva Beiramar</h2>
            <p className="text-[#8A8A8A]">contato@vivabeiramar.com.br</p>
          </div>
        </div>
      </div>

      <div className="bg-white p-8 rounded-2xl shadow-sm border border-[#E8E2D8]">
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-2 bg-[#F5F0E8] rounded-lg"><MessageSquare className="w-6 h-6 text-[#C4A265]" /></div>
          <h3 className="text-lg font-bold text-[#1B2B3A] font-serif">Integração WhatsApp (UAZAPI)</h3>
        </div>
        <form onSubmit={handleSaveUaz} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#1B2B3A] mb-1">Base URL da API</label>
            <input type="url" placeholder="Ex: https://api.uazapi.com" value={uazConfig.url} onChange={e => setUazConfig({...uazConfig, url: e.target.value})} className="w-full p-2.5 rounded-xl border border-[#E8E2D8] bg-[#FAF8F5] focus:bg-white outline-none focus:border-[#C4A265]" />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#1B2B3A] mb-1">Token de Acesso</label>
            <input type="password" placeholder="Seu token JWT ou Bearer" value={uazConfig.token} onChange={e => setUazConfig({...uazConfig, token: e.target.value})} className="w-full p-2.5 rounded-xl border border-[#E8E2D8] bg-[#FAF8F5] focus:bg-white outline-none focus:border-[#C4A265]" />
          </div>
          <div className="pt-2 flex justify-end">
            <Button type="submit">Salvar Configurações</Button>
          </div>
        </form>
      </div>

      <div className="bg-white p-8 rounded-2xl shadow-sm border border-[#E8E2D8]">
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-2 bg-[#F5F0E8] rounded-lg"><CalendarDays className="w-6 h-6 text-[#C4A265]" /></div>
          <h3 className="text-lg font-bold text-[#1B2B3A] font-serif">Google Calendar</h3>
        </div>

        {googleCal.isConnected ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-green-50 rounded-xl border border-green-200">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <Check className="w-5 h-5 text-green-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-green-800">Conectado ao Google Calendar</p>
                {googleCal.userEmail && <p className="text-xs text-green-600">{googleCal.userEmail}</p>}
              </div>
              <Button variant="danger" className="text-xs px-3 py-1.5" onClick={() => { googleCal.disconnect(); setToast({ message: 'Google Calendar desconectado.', type: 'info' }); }}>
                Desconectar
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-[#8A8A8A]">Conecte sua conta Google para sincronizar agendamentos automaticamente.</p>

            <div>
              <label className="block text-sm font-medium text-[#1B2B3A] mb-1">Client ID do Google</label>
              <input type="text" placeholder="xxxx.apps.googleusercontent.com" value={gcClientId}
                onChange={e => setGcClientId(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-[#E8E2D8] bg-[#FAF8F5] focus:bg-white outline-none focus:border-[#C4A265] text-sm" />
              <p className="text-[10px] text-[#8A8A8A] mt-1">
                Crie em <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="text-[#C4A265] underline">Google Cloud Console</a> → Credenciais → ID do cliente OAuth 2.0 (tipo: Aplicativo da Web)
              </p>
            </div>

            <div className="flex gap-3">
              <Button variant="outlineGray" onClick={() => {
                googleCal.saveClientId(gcClientId);
                setToast({ message: 'Client ID salvo!', type: 'success' });
              }}>Salvar Client ID</Button>

              <Button onClick={async () => {
                if (gcClientId) googleCal.saveClientId(gcClientId);
                try {
                  await googleCal.connect();
                  setToast({ message: 'Google Calendar conectado com sucesso!', type: 'success' });
                } catch (e) {
                  setToast({ message: e.message || 'Erro ao conectar.', type: 'error' });
                }
              }} isLoading={googleCal.isLoading}>
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="currentColor" d="M21.35,11.1H12.18V13.83H18.69C18.36,17.64 15.19,19.27 12.19,19.27C8.36,19.27 5,16.25 5,12C5,7.9 8.2,4.73 12.2,4.73C15.29,4.73 17.1,6.7 17.1,6.7L19,4.72C19,4.72 16.56,2 12.1,2C6.42,2 2.03,6.8 2.03,12C2.03,17.05 6.16,22 12.25,22C17.6,22 21.5,18.33 21.5,12.91C21.5,11.76 21.35,11.1 21.35,11.1V11.1Z" /></svg>
                  Conectar com Google
                </div>
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// 5. CONVERSAS — Movido para src/components/conversas/ConversasPage.jsx

// 6. AGENDA
const Agenda = ({ appointments, setAppointments, leads, properties, googleCal, openAgendaModal, setToast, onCompleteVisit }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState(typeof window !== 'undefined' && window.innerWidth < 768 ? 'day' : 'month');
  const [filterType, setFilterType] = useState('Todos');
  const isConnected = googleCal.isConnected;

  const today = new Date();
  const todayAppointments = appointments.filter(a => isSameDay(new Date(a.start_time), today));
  const weekStart = new Date(today); weekStart.setDate(today.getDate() - today.getDay());
  const weekEnd = new Date(today); weekEnd.setDate(today.getDate() + (6 - today.getDay()));
  const weekVisits = appointments.filter(a => {
    const d = new Date(a.start_time);
    return a.appointment_type === 'visita' && d >= weekStart && d <= weekEnd;
  }).length;
  const uniqueLeads = new Set(appointments.filter(a => new Date(a.start_time) >= today && a.lead_id).map(a => a.lead_id)).size;

  const filteredAppointments = appointments.filter(a => filterType === 'Todos' || a.appointment_type === filterType);

  const prevPeriod = () => {
    const newDate = new Date(currentDate);
    if (view === 'month') newDate.setMonth(newDate.getMonth() - 1);
    else newDate.setDate(newDate.getDate() - 1);
    setCurrentDate(newDate);
  };
  const nextPeriod = () => {
    const newDate = new Date(currentDate);
    if (view === 'month') newDate.setMonth(newDate.getMonth() + 1);
    else newDate.setDate(newDate.getDate() + 1);
    setCurrentDate(newDate);
  };

  const renderMonthView = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const daysArray = [];

    const prevMonthDays = getDaysInMonth(year, month - 1);
    for (let i = firstDay - 1; i >= 0; i--) {
      daysArray.push({ day: prevMonthDays - i, isCurrentMonth: false, date: new Date(year, month - 1, prevMonthDays - i) });
    }
    for (let i = 1; i <= daysInMonth; i++) {
      daysArray.push({ day: i, isCurrentMonth: true, date: new Date(year, month, i) });
    }
    const totalCells = daysArray.length > 35 ? 42 : 35;
    for (let i = 1; daysArray.length < totalCells; i++) {
      daysArray.push({ day: i, isCurrentMonth: false, date: new Date(year, month + 1, i) });
    }

    return (
      <div className="flex-1 flex flex-col bg-white rounded-2xl shadow-sm border border-[#E8E2D8] overflow-hidden mt-6">
        <div className="grid grid-cols-7 border-b border-[#E8E2D8] bg-[#FAF8F5]">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
            <div key={d} className="py-3 text-center text-xs font-bold text-[#8A8A8A] uppercase tracking-wider">{d}</div>
          ))}
        </div>
        <div className="flex-1 grid grid-cols-7 bg-[#E8E2D8] gap-[1px]">
          {daysArray.map((cell, idx) => {
            const isTodayDate = isSameDay(cell.date, new Date());
            const dayAppts = filteredAppointments.filter(a => isSameDay(new Date(a.start_time), cell.date));
            return (
              <div
                key={idx}
                onClick={() => openAgendaModal({ start_time: cell.date.toISOString() })}
                className={`min-h-[100px] p-2 bg-white flex flex-col cursor-pointer transition-colors hover:bg-slate-50 ${!cell.isCurrentMonth ? 'opacity-50' : ''}`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className={`w-7 h-7 flex items-center justify-center rounded-full text-sm font-medium ${isTodayDate ? 'bg-[#C4A265] text-white shadow-sm' : 'text-[#1B2B3A]'}`}>
                    {cell.day}
                  </span>
                </div>
                <div className="flex-1 flex flex-col gap-1 overflow-hidden">
                  {dayAppts.slice(0, 3).map(a => {
                    const typeConfig = APPOINTMENT_TYPES[a.appointment_type] || APPOINTMENT_TYPES.outro;
                    const dateObj = new Date(a.start_time);
                    return (
                      <div key={a.id} onClick={(e) => { e.stopPropagation(); openAgendaModal(a); }} className={`px-2 py-1 text-[11px] rounded truncate font-medium shadow-sm border-l-2 cursor-pointer ${typeConfig.color} hover:opacity-80`}>
                        {dateObj.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})} - {a.title || a.lead_name}
                      </div>
                    );
                  })}
                  {dayAppts.length > 3 && (
                    <div className="text-[10px] text-[#8A8A8A] font-medium pl-1 mt-1">+ {dayAppts.length - 3} mais</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderDayView = () => {
    const dayAppts = filteredAppointments.filter(a => isSameDay(new Date(a.start_time), currentDate)).sort((a,b) => new Date(a.start_time) - new Date(b.start_time));
    return (
      <div className="flex-1 flex flex-col md:flex-row gap-6 mt-6">
        <div className="flex-1 bg-white rounded-2xl shadow-sm border border-[#E8E2D8] p-6 overflow-y-auto custom-scrollbar">
          <h3 className="font-serif text-xl font-bold text-[#1B2B3A] mb-6 capitalize">{currentDate.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long'})}</h3>
          {dayAppts.length === 0 ? (
            <div className="text-center py-12 text-[#8A8A8A]">
              <CalendarIcon className="w-12 h-12 mx-auto text-[#E8E2D8] mb-3" />
              <p>Nenhum compromisso para este dia.</p>
              <Button variant="outlineGray" className="mt-4" onClick={() => openAgendaModal({ start_time: currentDate.toISOString() })}>Agendar compromisso</Button>
            </div>
          ) : (
            <div className="relative border-l-2 border-[#E8E2D8] pl-6 ml-4 space-y-8">
              {dayAppts.map(a => {
                const typeConfig = APPOINTMENT_TYPES[a.appointment_type] || APPOINTMENT_TYPES.outro;
                const startDate = new Date(a.start_time);
                const endDate = new Date(a.end_time);
                return (
                  <div key={a.id} className="relative bg-white border border-[#E8E2D8] rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow group">
                    <div className="absolute -left-[35px] top-5 w-4 h-4 rounded-full border-4 border-white shadow-sm" style={{ backgroundColor: typeConfig.hex }}></div>
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-3">
                        <span className={`px-2.5 py-1 rounded text-xs font-bold uppercase ${typeConfig.color}`}>{typeConfig.label}</span>
                        <span className="text-[#5A5A5A] font-mono text-sm font-medium">
                          {startDate.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})} - {endDate.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        {/* Concluir — only for visitas not yet completed */}
                        {a.appointment_type === 'visita' && a.status !== 'concluido' && onCompleteVisit && (
                          <button
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors min-h-[36px]"
                            onClick={() => onCompleteVisit(a)}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Concluir
                          </button>
                        )}
                        <button className="p-1.5 text-[#8A8A8A] hover:text-[#C4A265]" onClick={() => openAgendaModal(a)}><Edit2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                    <h4 className="font-bold text-lg text-[#1B2B3A] mb-2">{a.title}</h4>
                    <div className="space-y-2 mt-4">
                      {a.lead_name && <div className="flex items-center text-sm text-[#5A5A5A]"><User className="w-4 h-4 mr-2 text-[#C4A265]" /> {a.lead_name} {a.lead_phone && `• ${formatPhone(a.lead_phone)}`}</div>}
                      {a.property_title && <div className="flex items-center text-sm text-[#5A5A5A]"><Home className="w-4 h-4 mr-2 text-[#C4A265]" /> {a.property_title}</div>}
                      {a.address && <div className="flex items-center text-sm text-[#5A5A5A]"><MapPin className="w-4 h-4 mr-2 text-[#C4A265]" /> {a.address}</div>}
                      {a.notes && <div className="flex items-start text-sm text-[#5A5A5A] mt-2 pt-2 border-t border-[#E8E2D8]"><AlignLeft className="w-4 h-4 mr-2 text-[#8A8A8A] mt-0.5" /> <span className="flex-1">{a.notes}</span></div>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  if (!isConnected) {
    return (
      <div className="h-full flex items-center justify-center p-4 fade-in">
        <div className="bg-white p-10 rounded-[20px] shadow-xl border border-[#E8E2D8] max-w-md w-full text-center relative overflow-hidden">
          <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <CalendarDays className="w-10 h-10 text-blue-500" />
          </div>
          <h2 className="text-2xl font-bold font-serif text-[#1B2B3A] mb-3">Conecte sua Agenda Google</h2>
          <p className="text-[#8A8A8A] text-sm mb-8 leading-relaxed">
            Sincronize seus agendamentos com o Google Calendar para gerenciar visitas, reuniões e compromissos em um só lugar.
          </p>
          <Button className="w-full mb-6" isLoading={googleCal.isLoading} onClick={async () => {
            try {
              await googleCal.connect();
              setToast({ message: 'Google Calendar conectado!', type: 'success' });
            } catch (e) {
              setToast({ message: e.message || 'Erro ao conectar. Configure o Client ID nas Configurações.', type: 'error' });
            }
          }}>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="currentColor" d="M21.35,11.1H12.18V13.83H18.69C18.36,17.64 15.19,19.27 12.19,19.27C8.36,19.27 5,16.25 5,12C5,7.9 8.2,4.73 12.2,4.73C15.29,4.73 17.1,6.7 17.1,6.7L19,4.72C19,4.72 16.56,2 12.1,2C6.42,2 2.03,6.8 2.03,12C2.03,17.05 6.16,22 12.25,22C17.6,22 21.5,18.33 21.5,12.91C21.5,11.76 21.35,11.1 21.35,11.1V11.1Z" /></svg>
              Conectar com Google
            </div>
          </Button>
          {!googleCal.clientId && (
            <p className="text-xs text-amber-600 bg-amber-50 p-3 rounded-lg mb-4">
              Primeiro configure o Client ID do Google nas <strong>Configurações</strong>.
            </p>
          )}
          <div className="text-left space-y-3 border-t border-[#E8E2D8] pt-6 mt-2">
            <div className="flex items-center text-sm text-[#5A5A5A]"><Check className="w-4 h-4 text-emerald-500 mr-2" /> Sincronize visitas automaticamente</div>
            <div className="flex items-center text-sm text-[#5A5A5A]"><Check className="w-4 h-4 text-emerald-500 mr-2" /> Veja todos os compromissos do dia</div>
            <div className="flex items-center text-sm text-[#5A5A5A]"><Check className="w-4 h-4 text-emerald-500 mr-2" /> Associe leads e imóveis</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col fade-in">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Compromissos Hoje', value: todayAppointments.length, icon: CalendarDays, color: 'text-blue-500', bg: 'bg-blue-50' },
          { label: 'Visitas da Semana', value: weekVisits, icon: Home, color: 'text-[#C4A265]', bg: 'bg-[#F5F0E8]' },
          { label: 'Leads Agendados', value: uniqueLeads, icon: User, color: 'text-emerald-500', bg: 'bg-emerald-50' },
          { label: 'Google Calendar', value: googleCal.userEmail ? googleCal.userEmail.split('@')[0] : 'Conectado', icon: CheckCheck, color: 'text-green-500', bg: 'bg-green-50' }
        ].map((stat, i) => (
          <div key={i} className="bg-white p-4 rounded-xl shadow-sm border border-[#E8E2D8] flex items-center space-x-3">
            <div className={`p-2.5 rounded-lg ${stat.bg} ${stat.color}`}><stat.icon className="w-5 h-5" /></div>
            <div>
              <p className="text-xs text-[#8A8A8A] font-medium uppercase tracking-wider">{stat.label}</p>
              <h3 className="text-lg font-bold text-[#1B2B3A] font-serif">{stat.value}</h3>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-3 px-4 rounded-xl shadow-sm border border-[#E8E2D8]">
        <div className="flex items-center gap-3">
          <Button variant="outlineGray" className="px-2" onClick={prevPeriod}><ChevronLeft className="w-5 h-5" /></Button>
          <span className="font-serif font-bold text-[#1B2B3A] min-w-[140px] text-center capitalize text-lg">
            {view === 'month' ? currentDate.toLocaleDateString('pt-BR', {month: 'long', year: 'numeric'}) : currentDate.toLocaleDateString('pt-BR', {month: 'long', day: 'numeric'})}
          </span>
          <Button variant="outlineGray" className="px-2" onClick={nextPeriod}><ChevronRight className="w-5 h-5" /></Button>
          <Button variant="outlineGray" className="text-xs ml-2" onClick={() => setCurrentDate(new Date())}>Hoje</Button>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-[#FAF8F5] p-1 rounded-lg border border-[#E8E2D8]">
            {['month', 'day'].map(v => (
              <button key={v} onClick={() => setView(v)} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${view === v ? 'bg-[#1B2B3A] text-white shadow-sm' : 'text-[#8A8A8A] hover:text-[#1B2B3A]'}`}>
                {v === 'month' ? 'Mês' : 'Dia'}
              </button>
            ))}
          </div>
          <select value={filterType} onChange={e => setFilterType(e.target.value)} className="bg-[#FAF8F5] border border-[#E8E2D8] text-sm rounded-lg px-3 py-2 outline-none focus:border-[#C4A265]">
            <option value="Todos">Todos os Tipos</option>
            {Object.entries(APPOINTMENT_TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <Button onClick={() => openAgendaModal({})}><Plus className="w-4 h-4 mr-2" /> Novo Agendamento</Button>
        </div>
      </div>

      {view === 'month' ? renderMonthView() : renderDayView()}

      {/* FAB — new appointment (mobile only) */}
      <button onClick={() => openAgendaModal({})}
        className="md:hidden fixed bottom-20 right-4 w-14 h-14 bg-[#C4A265] text-white rounded-full shadow-lg flex items-center justify-center z-30 hover:bg-[#b89355] active:scale-95 transition-transform">
        <Plus className="w-6 h-6" />
      </button>
    </div>
  );
};

// MODAL DE AGENDAMENTO
const AppointmentModal = ({ initialData, onClose, onSave, leads, properties }) => {
  const isEdit = !!initialData.id;
  const now = new Date();

  let defaultStartStr = new Date().toISOString().slice(0, 16);
  let defaultEndStr = new Date(now.getTime() + 60*60000).toISOString().slice(0, 16);

  if (initialData.start_time) {
    const sDate = new Date(initialData.start_time);
    sDate.setMinutes(sDate.getMinutes() - sDate.getTimezoneOffset());
    defaultStartStr = sDate.toISOString().slice(0, 16);
    const eDate = initialData.end_time ? new Date(initialData.end_time) : new Date(sDate.getTime() + 60*60000);
    eDate.setMinutes(eDate.getMinutes() - eDate.getTimezoneOffset());
    defaultEndStr = eDate.toISOString().slice(0, 16);
  }

  const [formData, setFormData] = useState({
    title: '', appointment_type: 'visita', status: 'agendado', reminder: '30min',
    start_time: defaultStartStr, end_time: defaultEndStr,
    lead_id: '', property_id: '', address: '', notes: '', ...initialData
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const start = new Date(formData.start_time);
    const end = new Date(formData.end_time);
    const lead = leads.find(l => String(l.id) === String(formData.lead_id));
    const prop = properties.find(p => String(p.id) === String(formData.property_id));
    const payload = {
      ...formData,
      id: formData.id || `ag-${Date.now()}`,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      lead_name: lead?.name || formData.lead_name || '',
      lead_phone: lead?.phone || formData.lead_phone || '',
      property_title: prop?.title || formData.property_title || ''
    };
    if (!payload.title) {
      payload.title = `${APPOINTMENT_TYPES[payload.appointment_type]?.label} - ${payload.lead_name || 'Novo Lead'}`;
    }
    onSave(payload);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/50 md:backdrop-blur-sm flex items-end md:items-center justify-center md:p-4">
      <div className="bg-white w-full md:max-w-2xl md:rounded-2xl rounded-t-2xl shadow-xl max-h-[95vh] overflow-y-auto custom-scrollbar animate-scale-in">
        <div className="p-4 md:p-6 border-b border-[#E8E2D8] bg-[#FAF8F5] flex justify-between items-center sticky top-0 z-10 md:rounded-t-2xl">
          <h2 className="text-lg md:text-xl font-bold font-serif text-[#1B2B3A]">{isEdit ? 'Editar Compromisso' : 'Novo Agendamento'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-[#E8E2D8] rounded-full transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#1B2B3A] mb-1">Tipo de Agendamento *</label>
              <select required value={formData.appointment_type} onChange={e => setFormData({...formData, appointment_type: e.target.value})} className="w-full p-2.5 rounded-xl border border-[#E8E2D8] focus:border-[#C4A265] outline-none bg-white">
                {Object.entries(APPOINTMENT_TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1B2B3A] mb-1">Título (Opcional)</label>
              <input type="text" placeholder="Gerado automaticamente se vazio" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full p-2.5 rounded-xl border border-[#E8E2D8] focus:border-[#C4A265] outline-none" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#1B2B3A] mb-1">Início *</label>
              <input required type="datetime-local" value={formData.start_time} onChange={e => setFormData({...formData, start_time: e.target.value})} className="w-full p-2.5 rounded-xl border border-[#E8E2D8] focus:border-[#C4A265] outline-none bg-[#FAF8F5]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1B2B3A] mb-1">Término *</label>
              <input required type="datetime-local" value={formData.end_time} onChange={e => setFormData({...formData, end_time: e.target.value})} className="w-full p-2.5 rounded-xl border border-[#E8E2D8] focus:border-[#C4A265] outline-none bg-[#FAF8F5]" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#1B2B3A] mb-1">Lead / Cliente</label>
              <select value={formData.lead_id} onChange={e => setFormData({...formData, lead_id: e.target.value})} className="w-full p-2.5 rounded-xl border border-[#E8E2D8] focus:border-[#C4A265] outline-none bg-white">
                <option value="">Selecione um lead...</option>
                {leads.map(l => <option key={l.id} value={l.id}>{l.name} {l.phone ? `(${l.phone})` : ''}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1B2B3A] mb-1">Imóvel</label>
              <select value={formData.property_id} onChange={e => {
                const prop = properties.find(p => String(p.id) === e.target.value);
                setFormData({...formData, property_id: e.target.value, address: prop?.address || ''});
              }} className="w-full p-2.5 rounded-xl border border-[#E8E2D8] focus:border-[#C4A265] outline-none bg-white">
                <option value="">Nenhum específico...</option>
                {properties.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#1B2B3A] mb-1">Endereço</label>
            <div className="relative">
              <MapIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8A8A8A]" />
              <input type="text" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full pl-9 pr-3 p-2.5 rounded-xl border border-[#E8E2D8] focus:border-[#C4A265] outline-none" placeholder="Endereço da visita ou reunião..." />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#1B2B3A] mb-1">Observações</label>
            <textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="w-full p-2.5 rounded-xl border border-[#E8E2D8] focus:border-[#C4A265] outline-none resize-none bg-[#FAF8F5]" rows={3} placeholder="Notas adicionais..."></textarea>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#1B2B3A] mb-1">Status</label>
              <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full p-2.5 rounded-xl border border-[#E8E2D8] focus:border-[#C4A265] outline-none bg-white">
                <option value="agendado">Agendado</option>
                <option value="confirmado">Confirmado</option>
                <option value="concluido">Concluído</option>
                <option value="cancelado">Cancelado</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1B2B3A] mb-1">Lembrete Google</label>
              <select value={formData.reminder} onChange={e => setFormData({...formData, reminder: e.target.value})} className="w-full p-2.5 rounded-xl border border-[#E8E2D8] focus:border-[#C4A265] outline-none bg-white">
                <option value="none">Sem lembrete</option>
                <option value="15min">15 minutos antes</option>
                <option value="30min">30 minutos antes</option>
                <option value="1hour">1 hora antes</option>
                <option value="1day">1 dia antes</option>
              </select>
            </div>
          </div>
          <div className="flex justify-between items-center pt-6 border-t border-[#E8E2D8] mt-4">
            {isEdit ? <Button variant="ghost" className="text-red-500 hover:text-red-600 hover:bg-red-50" type="button" onClick={() => onSave({...formData, _delete: true})}>Excluir Evento</Button> : <div></div>}
            <div className="flex gap-3">
              <Button variant="outlineGray" type="button" onClick={onClose}>Cancelar</Button>
              <Button type="submit">Salvar Agendamento</Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

// --- APP PRINCIPAL ---
export default function App() {
  const [isReady, setIsReady] = useState(false);
  const [session, setSession] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [currentRoute, setCurrentRoute] = useState('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [leads, setLeads] = useState([]);
  const [properties, setProperties] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [isLoadingData, setIsLoadingData] = useState(false);

  const [uazConfig, setUazConfig] = useState({ url: '', token: '' });
  // useGoogleCalendar stub to avoid re-render loop
  const googleCal = useMemo(() => ({
    clientId: localStorage.getItem('googleCalendarClientId') || '',
    saveClientId: (id) => localStorage.setItem('googleCalendarClientId', id),
    isConnected: false, isLoading: false, accessToken: '',
    userName: '', userEmail: '',
    connect: async () => { throw new Error('Configure o Client ID primeiro'); },
    disconnect: () => {},
    ensureToken: async () => '',
    listEvents: async () => [],
    createEvent: async () => '',
    deleteEvent: async () => {},
  }), []);
  const [agendaModalData, setAgendaModalData] = useState(null);
  // T18: pós-visita — payload do agendamento aguardando registro
  const [visitRegModalData, setVisitRegModalData] = useState(null);
  // T21: fila de badges recém-desbloqueados para celebrar
  const [newBadgeQueue, setNewBadgeQueue] = useState([]); // array of badge_keys
  const [badgeDefs, setBadgeDefs] = useState({}); // badge_key -> badge object

  const [toast, setToastState] = useState(null);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const setToast = (data) => {
    setToastState(data);
    clearTimeout(toastTimeout);
    if(data) toastTimeout = setTimeout(() => setToastState(null), 4000);
  };

  // 🔥 Streak wrapper — call this instead of bare registerAction to get toast feedback
  const registerStreakAction = useCallback(async (actionType, leadId = null) => {
    const result = await registerAction(actionType, leadId).catch(() => null);
    if (!result) return;
    const { newStreak, prevStreak, isNewRecord } = result;
    // Only toast if streak actually incremented (not just total_actions)
    if (newStreak > prevStreak) {
      if (isNewRecord) {
        setToast({ message: `🏆 Novo recorde! ${newStreak} dias consecutivos!`, type: 'success' });
      } else {
        setToast({ message: `🔥 ${newStreak} dias! Streak mantido!`, type: 'success' });
      }
    }
  }, []);

  useEffect(() => {
    addGoogleFonts();
    const style = document.createElement('style');
    style.innerHTML = `
      body { font-family: 'DM Sans', sans-serif; background-color: #FAF8F5; color: #1B2B3A; margin: 0; }
      h1, h2, h3, .font-serif { font-family: 'Playfair Display', serif; }
      .font-mono { font-family: 'JetBrains Mono', monospace; }
      .hide-scrollbar::-webkit-scrollbar { display: none; }
      .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      .custom-scrollbar::-webkit-scrollbar { width: 6px; }
      .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
      .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #E8E2D8; border-radius: 20px; }
      .fade-in { animation: fadeIn 0.3s ease-in-out; }
      .animate-slide-in { animation: slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
      .animate-scale-in { animation: scaleIn 0.2s ease-out; }
      @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      @keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }
      @keyframes scaleIn { from { opacity: 0.95; transform: scale(0.98); } to { opacity: 1; transform: scale(1); } }
      @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
      .animate-slide-up { animation: slideUp 0.25s ease-out; }
      .safe-bottom { padding-bottom: env(safe-area-inset-bottom, 0); }
      @media (max-width: 767px) {
        input, textarea, select { font-size: 16px !important; min-height: 44px; }
        .modal-mobile { position: fixed !important; inset: 0 !important; border-radius: 0 !important; max-width: 100% !important; max-height: 100% !important; width: 100% !important; }
      }
    `;
    document.head.appendChild(style);

    setUazConfig({
      url: localStorage.getItem('uazapiUrl') || '',
      token: localStorage.getItem('uazapiToken') || ''
    });

    const loadSupabase = async () => {
      console.log('Iniciando carregamento do Supabase...');
      try {
        if (!window.supabase) {
          console.log('Script do Supabase não encontrado, carregando via CDN...');
          await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
            script.onload = () => {
              console.log('Script do Supabase carregado com sucesso.');
              resolve();
            };
            script.onerror = () => {
              console.error('Falha ao carregar o script do Supabase via CDN.');
              reject(new Error('Falha ao carregar Supabase'));
            };
            document.head.appendChild(script);
            // Timeout para não ficar preso se o CDN demorar demais
            setTimeout(() => reject(new Error('Timeout ao carregar Supabase')), 10000);
          });
        }
        
        if (window.supabase && !supabase) {
          console.log('Criando cliente Supabase...');
          supabase = window.supabase.createClient(supabaseUrl, supabaseKey);
          console.log('Cliente Supabase criado com sucesso.');
        } else if (!window.supabase) {
          throw new Error('Objeto window.supabase não disponível após carregamento do script.');
        }
        
        setIsReady(true);
      } catch (error) {
        console.error('Erro na inicialização do Supabase:', error);
        setToast({ message: 'Erro ao conectar com o banco de dados. Verifique sua conexão.', type: 'error' });
        // Forçar isReady para true após erro para permitir que o app renderize (com limitações) em vez de tela branca
        setIsReady(true); 
      }
    };

    loadSupabase();
  }, []);

  useEffect(() => {
    if (!isReady) return;
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoadingAuth(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, [isReady]);

  const loadData = useCallback(async () => {
    if (!session || !supabase) return;
    setIsLoadingData(true);
    try {
      const [leadsRes, propsRes, agendaRes] = await Promise.all([
        supabase.from('crm_leads').select('*').order('created_at', { ascending: false }),
        supabase.from('properties').select('*').order('created_at', { ascending: false }),
        supabase.from('agenda_appointments').select('*').order('start_time', { ascending: true })
      ]);
      setLeads(leadsRes.data || []);
      setProperties(propsRes.data || []);
      if (!agendaRes.data || agendaRes.error) {
        setAppointments([
          { id: '1', title: 'Visita - Praia Grande', appointment_type: 'visita', start_time: new Date(Date.now() + 3600000).toISOString(), end_time: new Date(Date.now() + 7200000).toISOString(), lead_name: 'João Silva', address: 'Rua das Palmeiras, 123', status: 'confirmado' }
        ]);
      } else {
        setAppointments(agendaRes.data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoadingData(false);
    }
  }, [session]);

  useEffect(() => { loadData(); }, [loadData]);

  // T21: On session load, check streak badges (máquina) and pre-load badge defs for celebrations
  useEffect(() => {
    if (!session) return;
    // Pre-load badge defs so celebration modal has icon/name
    import('./hooks/useBadges.js').then(({ fetchBadgeProgress }) => {
      fetchBadgeProgress().then(badges => {
        const map = {};
        badges.forEach(b => { map[b.badge_key] = b; });
        setBadgeDefs(map);
      }).catch(() => {});
    }).catch(() => {});
    // Check streak-based badges on load
    checkAndUnlockBadges().then(newly => {
      if (newly.length > 0) setNewBadgeQueue(q => [...q, ...newly]);
    }).catch(() => {});
  }, [session]);

  const saveAppointment = async (payload) => {
    // Carry lead_uuid from lead_id if available
    if (payload.lead_id && !payload.lead_uuid) {
      payload.lead_uuid = payload.lead_id;
    }

    if (payload._delete) {
      setAppointments(prev => prev.filter(a => a.id !== payload.id));
      setToast({ message: 'Compromisso removido.', type: 'info' });
      setAgendaModalData(null);
      return;
    }

    const isNew = !appointments.find(a => a.id === payload.id);
    const wasNotCompleted = appointments.find(a => a.id === payload.id)?.status !== 'concluido';

    // T18: se é uma VISITA sendo marcada como concluída → abrir modal de registro pós-visita
    if (
      payload.appointment_type === 'visita' &&
      payload.status === 'concluido' &&
      wasNotCompleted &&
      !isNew
    ) {
      setAgendaModalData(null);
      setVisitRegModalData(payload); // store payload; handle completion inside handleVisitSave
      return;
    }

    // --- Fluxo normal (outros tipos ou novo agendamento) ---
    if (isNew) {
      setAppointments(prev => [...prev, payload]);
    } else {
      setAppointments(prev => prev.map(a => a.id === payload.id ? payload : a));
    }

    // T14: toast rico ao criar agendamento
    if (isNew) {
      const apptDate = new Date(payload.start_time);
      const dayLabel = apptDate.toLocaleDateString('pt-BR', { weekday: 'long', timeZone: 'America/Sao_Paulo' });
      const timeLabel = apptDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
      const nameLabel = payload.lead_name || payload.title || 'Agendamento';
      setToast({
        message: `📅 Visita agendada!`,
        subtitle: `${nameLabel} · ${dayLabel} ${timeLabel}`,
        type: 'success',
      });
    } else {
      setToast({ message: 'Agendamento atualizado!', type: 'success' });
    }

    // 🔥 Streak: register action (with toast feedback)
    if (isNew) {
      registerStreakAction('appointment_created', payload.lead_uuid || null);
    } else if (payload.status === 'concluido' && wasNotCompleted && payload.appointment_type !== 'visita') {
      // non-visit completions still advance stage via old logic
      if (payload.lead_uuid) {
        import('./hooks/useSyncLeadStage.js').then(async ({ onAppointmentCompleted }) => {
          const updatedLead = await onAppointmentCompleted(payload);
          if (updatedLead) {
            setLeads(prev => prev.map(l => l.id === updatedLead.id ? updatedLead : l));
            setToast({ message: `${updatedLead.name} avançou para "${updatedLead.stage}"`, type: 'success' });
          }
        });
      }
    }

    // Sync to Google Calendar if connected
    if (googleCal.isConnected && isNew) {
      googleCal.createEvent(payload).catch(e => {
        console.error('Google Calendar sync error:', e);
      });
    }

    setAgendaModalData(null);
  };

  // T18: chamado quando usuário salva o registro pós-visita
  const handleVisitSave = async (regData) => {
    const appointment = visitRegModalData;
    try {
      const { updatedLead } = await saveVisitRegistration(appointment, regData);

      // Update local appointments state
      setAppointments(prev => prev.map(a =>
        a.id === appointment.id
          ? { ...a, status: 'concluido', completed_at: new Date().toISOString(),
              visit_feedback: regData.feedback, visit_objection: regData.objection,
              visit_next_step: regData.nextStep, visit_notes: regData.notes }
          : a
      ));

      // Update local lead state
      if (updatedLead) {
        setLeads(prev => prev.map(l => l.id === updatedLead.id ? updatedLead : l));
      }

      // 🔥 Streak
      registerStreakAction('visit_registered', appointment.lead_uuid || null);

      const leadName = appointment.lead_name || updatedLead?.name || 'Lead';
      const stageLabel = updatedLead?.stage || '';
      setToast({
        message: `✅ Visita registrada!`,
        subtitle: stageLabel ? `${leadName} → ${stageLabel}` : leadName,
        type: 'success',
      });

      setVisitRegModalData(null);

      // T21: check badges after visit (especialista)
      checkAndUnlockBadges().then(newly => {
        if (newly.length > 0) setNewBadgeQueue(q => [...q, ...newly]);
      }).catch(() => {});
    } catch (e) {
      console.error('handleVisitSave error:', e);
      throw e; // re-throw so modal can show error state
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoadingAuth(true);
    const { error } = await supabase.auth.signInWithPassword({ email: e.target.email.value, password: e.target.password.value });
    if (error) setToast({ message: 'E-mail ou senha incorretos.', type: 'error' });
    setLoadingAuth(false);
  };
  const handleLogout = async () => await supabase.auth.signOut();
  const updateLeadInState = (updatedLead) => setLeads(prev => prev.map(l => l.id === updatedLead.id ? updatedLead : l));

  const upcomingAppointment = useMemo(() => {
    const now = new Date();
    const inTwoHours = new Date(now.getTime() + 2 * 60 * 60000);
    return appointments.find(a => {
      const d = new Date(a.start_time);
      return d > now && d <= inTwoHours && a.status !== 'cancelado';
    });
  }, [appointments]);

  // Badge de follow-ups pendentes/atrasados (carregado via estado simples)
  const [followupsBadge, setFollowupsBadge] = useState(0);
  useEffect(() => {
    if (!session) return;
    const SB_URL = 'https://hcmpjrqpjohksoznoycq.supabase.co';
    const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhjbXBqcnFwam9oa3Nvem5veWNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5OTk0NjAsImV4cCI6MjA4ODU3NTQ2MH0.XRWi4ZULpICkTucXgGVQCP5wq1RmVwOFWTdMrOEMDnw';
    fetch(`${SB_URL}/rest/v1/follow_ups?status=eq.pendente&select=id`, {
      headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` }
    }).then(r => r.json()).then(data => {
      if (Array.isArray(data)) setFollowupsBadge(data.length);
    }).catch(() => {});
  }, [session]);

  // T14: Counter de ações diárias
  const [dailyActionCount, setDailyActionCount] = useState(0);
  const [counterBumping, setCounterBumping] = useState(false);
  const prevDailyCount = useRef(0);
  useEffect(() => {
    if (!session) return;
    const SB_URL = 'https://hcmpjrqpjohksoznoycq.supabase.co';
    const SB_KEY = supabaseKey;
    const todayStr = new Date().toISOString().slice(0, 10);
    const poll = () => {
      fetch(`${SB_URL}/rest/v1/daily_actions?action_date=eq.${todayStr}&select=id`, {
        headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` }
      }).then(r => r.json()).then(data => {
        if (Array.isArray(data)) {
          const count = data.length;
          if (count !== prevDailyCount.current) {
            setCounterBumping(true);
            setTimeout(() => setCounterBumping(false), 250);
            prevDailyCount.current = count;
          }
          setDailyActionCount(count);
        }
      }).catch(() => {});
    };
    poll();
    const interval = setInterval(poll, 30000);
    return () => clearInterval(interval);
  }, [session]);

  if (!isReady || loadingAuth) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAF8F5]">
        <Loader2 className="w-12 h-12 animate-spin text-[#C4A265] mb-4" />
        <p className="text-[#8A8A8A] font-medium animate-pulse">Iniciando Viva Beiramar...</p>
        {/* Fallback caso demore muito */}
        <div className="mt-8 text-[10px] text-[#8A8A8A]">
          Se o carregamento demorar mais de 10 segundos, tente recarregar a página.
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center p-4">
        {toast && <Toast {...toast} onClose={() => setToastState(null)} />}
        <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-md border border-[#E8E2D8] text-center fade-in">
          <img src="/logo-viva-beiramar.png" alt="Viva Beiramar" className="w-20 h-20 mx-auto mb-6 rounded-full shadow-lg" />
          <h1 className="text-3xl font-bold font-serif text-[#1B2B3A] mb-2">Viva Beiramar</h1>
          <p className="text-[#8A8A8A] mb-8">Gestão Imobiliária</p>
          <form onSubmit={handleLogin} className="space-y-4 text-left">
            <div>
              <label className="block text-sm font-medium text-[#1B2B3A] mb-1">E-mail</label>
              <input name="email" type="email" required defaultValue="contato@vivabeiramar.com.br" className="w-full p-3 rounded-xl border border-[#E8E2D8] outline-none focus:border-[#C4A265] focus:ring-1 focus:ring-[#C4A265] transition-all bg-[#FAF8F5] focus:bg-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1B2B3A] mb-1">Senha</label>
              <input name="password" type="password" required className="w-full p-3 rounded-xl border border-[#E8E2D8] outline-none focus:border-[#C4A265] focus:ring-1 focus:ring-[#C4A265] transition-all bg-[#FAF8F5] focus:bg-white" />
            </div>
            <Button type="submit" className="w-full py-3 mt-4 text-lg" isLoading={loadingAuth}>Entrar no Painel</Button>
          </form>
        </div>
      </div>
    );
  }

  const NavItem = ({ icon: Icon, label, route, badge, alert }) => (
    <button
      onClick={() => { setCurrentRoute(route); setIsMobileMenuOpen(false); }}
      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all font-medium ${currentRoute === route ? 'bg-[rgba(196,162,101,0.1)] text-[#C4A265]' : 'text-[#94A3B8] hover:text-white hover:bg-white/5'}`}
    >
      <div className="flex items-center space-x-3 relative">
        <Icon className="w-5 h-5" />
        <span>{label}</span>
        {alert && <span className="absolute -top-1 -left-1 w-2.5 h-2.5 bg-[#C4A265] rounded-full animate-pulse border-2 border-[#1B2B3A]"></span>}
      </div>
      {badge > 0 && <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{badge}</span>}
    </button>
  );

  // Bottom tab item for mobile
  const BottomTab = ({ icon: Icon, label, route, badge }) => {
    const active = currentRoute === route;
    return (
      <button onClick={() => { setCurrentRoute(route); setShowMoreMenu(false); }}
        className={`flex flex-col items-center justify-center flex-1 py-1.5 relative min-w-[48px] min-h-[48px] ${active ? 'text-[#C4A265]' : 'text-[#94A3B8]'}`}>
        <Icon className="w-5 h-5" />
        <span className="text-[10px] mt-0.5 font-medium">{label}</span>
        {badge > 0 && <span className="absolute top-0.5 right-[calc(50%-16px)] bg-red-500 text-white text-[8px] font-bold w-4 h-4 rounded-full flex items-center justify-center">{badge > 9 ? '9+' : badge}</span>}
      </button>
    );
  };

  const ROUTE_TITLES = {
    dashboard: 'Cockpit', crm: 'Suas Oportunidades', followups: 'Ações Pendentes',
    conversas: 'Chat', agenda: 'Agenda', properties: 'Carteira de Imóveis',
    comissoes: 'Seus Ganhos', relatorios: 'Performance', settings: 'Configurações',
    badges: 'Conquistas',
  };

  return (
    <div className="min-h-screen flex bg-[#FAF8F5]">
      {toast && <Toast {...toast} onClose={() => setToastState(null)} />}

      {agendaModalData && (
        <AppointmentModal
          initialData={agendaModalData}
          leads={leads} properties={properties}
          onClose={() => setAgendaModalData(null)}
          onSave={saveAppointment}
        />
      )}

      {/* T18: Registro pós-visita — obrigatório, não pode fechar */}
      {visitRegModalData && (
        <VisitRegistrationModal
          appointment={visitRegModalData}
          onSave={handleVisitSave}
          onCancel={() => setVisitRegModalData(null)}
        />
      )}

      {/* DESKTOP SIDEBAR (hidden on mobile) */}
      <aside className="hidden md:flex w-64 bg-[#1B2B3A] text-white flex-col flex-shrink-0">
        <div className="p-6 flex items-center space-x-3">
          <img src="/logo-viva-beiramar.png" alt="Viva Beiramar" className="w-10 h-10 rounded-full" />
          <span className="text-xl font-bold font-serif tracking-wide">Viva Beiramar</span>
        </div>
        <nav className="flex-1 px-4 space-y-2 mt-4">
          <NavItem icon={LayoutDashboard} label="Cockpit" route="dashboard" />
          <NavItem icon={Users} label="Oportunidades" route="crm" />
          <NavItem icon={PhoneForwarded} label="Ações Pendentes" route="followups" badge={followupsBadge} />
          <NavItem icon={MessageSquare} label="Chat" route="conversas" badge={3} />
          <NavItem icon={CalendarDays} label="Agenda" route="agenda" alert={!!upcomingAppointment} />
          <NavItem icon={Home} label="Carteira" route="properties" />
          <NavItem icon={DollarSign} label="Comissões" route="comissoes" />
          <NavItem icon={BarChart3} label="Performance" route="relatorios" />
          <NavItem icon={Trophy} label="Conquistas" route="badges" />
          <NavItem icon={Settings} label="Config" route="settings" />
        </nav>
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center space-x-3 px-4 py-3">
            <div className="w-8 h-8 rounded-full bg-[#C4A265] text-[#1B2B3A] flex items-center justify-center font-bold text-sm">A</div>
            <div className="flex-1 min-w-0"><p className="text-sm font-medium text-white truncate">Admin</p></div>
            <button onClick={handleLogout} className="text-[#94A3B8] hover:text-red-400 transition-colors" title="Sair"><LogOut className="w-5 h-5" /></button>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden relative">
        {upcomingAppointment && (
          <div className="bg-[#1B2B3A] text-[#FAF8F5] px-4 py-2 text-xs md:text-sm flex justify-center items-center gap-2 md:gap-3 fade-in">
            <Bell className="w-4 h-4 text-[#C4A265] animate-bounce flex-shrink-0" />
            <span className="truncate"><strong className="text-[#C4A265]">Próximo:</strong> {upcomingAppointment.title} às {new Date(upcomingAppointment.start_time).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}</span>
            <button onClick={() => setAgendaModalData(upcomingAppointment)} className="underline font-bold text-xs hover:text-[#C4A265] flex-shrink-0">Ver</button>
          </div>
        )}

        {/* Header — simplified on mobile */}
        <header className="bg-white border-b border-[#E8E2D8] h-14 md:h-16 flex items-center px-4 md:px-8 justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <img src="/logo-viva-beiramar.png" alt="" className="w-8 h-8 rounded-full md:hidden" />
            <h1 className="text-lg md:text-xl font-bold font-serif text-[#1B2B3A]">
              {ROUTE_TITLES[currentRoute] || currentRoute}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {isLoadingData && <Loader2 className="w-5 h-5 animate-spin text-[#C4A265]" />}
            <button onClick={handleLogout} className="md:hidden text-[#94A3B8] hover:text-red-400" title="Sair"><LogOut className="w-5 h-5" /></button>
          </div>
        </header>

        {/* Page content — padded, with bottom space for mobile nav */}
        <div className={`flex-1 overflow-auto relative ${currentRoute === 'conversas' ? 'p-0 md:p-6' : 'p-3 md:p-8'} pb-20 md:pb-8`}>
          {currentRoute === 'dashboard' && <CockpitDashboard session={session} onNavigate={setCurrentRoute} />}
          {currentRoute === 'crm' && <CRM leads={leads} properties={properties} updateLead={updateLeadInState} setToast={setToast} reloadData={loadData} openAgendaModal={setAgendaModalData} />}
          {currentRoute === 'conversas' && <ConversasPage session={session} setCurrentRoute={setCurrentRoute} />}
          {currentRoute === 'agenda' && <Agenda appointments={appointments} setAppointments={setAppointments} leads={leads} properties={properties} googleCal={googleCal} openAgendaModal={setAgendaModalData} setToast={setToast} onCompleteVisit={setVisitRegModalData} />}
          {currentRoute === 'properties' && <AdminImoveis session={session} />}
          {currentRoute === 'followups' && <FollowUpsPage session={session} />}
          {currentRoute === 'comissoes' && <ComissoesPage session={session} />}
          {currentRoute === 'relatorios' && <RelatoriosPage session={session} />}
          {currentRoute === 'settings' && <SettingsPage uazConfig={uazConfig} setUazConfig={setUazConfig} googleCal={googleCal} setToast={setToast} />}
          {currentRoute === 'badges' && <BadgesPage session={session} />}

          {/* T14: Counter de ações diárias — widget flutuante */}
          {session && dailyActionCount > 0 && (
            <div className="fixed bottom-24 right-4 md:bottom-6 z-40 pointer-events-none">
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold shadow-md border transition-colors ${
                dailyActionCount >= 10
                  ? 'bg-[#1B2B3A] text-[#c9a84c] border-[#c9a84c]/30'
                  : dailyActionCount >= 5
                  ? 'bg-emerald-600 text-white border-emerald-500'
                  : 'bg-white text-gray-700 border-gray-200'
              } ${counterBumping ? 'counter-bump' : ''}`}>
                <span>{dailyActionCount >= 10 ? '⚡' : dailyActionCount >= 5 ? '🔥' : '⚡'}</span>
                <span className="tabular-nums">
                  {dailyActionCount >= 10
                    ? `${dailyActionCount} ações! Imba!`
                    : dailyActionCount >= 5
                    ? `${dailyActionCount} ações! Produtivo!`
                    : `${dailyActionCount} ações hoje`}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* MOBILE BOTTOM NAV (hidden on desktop) */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-[#E8E2D8] flex items-center z-50 safe-bottom">
          <BottomTab icon={LayoutDashboard} label="Cockpit" route="dashboard" />
          <BottomTab icon={Users} label="Oportun." route="crm" />
          <BottomTab icon={MessageSquare} label="Chat" route="conversas" badge={3} />
          <BottomTab icon={CalendarDays} label="Agenda" route="agenda" />
          {/* More menu */}
          <button onClick={() => setShowMoreMenu(v => !v)}
            className={`flex flex-col items-center justify-center flex-1 py-1.5 min-w-[48px] min-h-[48px] ${showMoreMenu ? 'text-[#C4A265]' : 'text-[#94A3B8]'}`}>
            <MoreVertical className="w-5 h-5" />
            <span className="text-[10px] mt-0.5 font-medium">Mais</span>
          </button>
        </nav>

        {/* "More" bottom sheet */}
        {showMoreMenu && (
          <>
            <div className="md:hidden fixed inset-0 bg-black/30 z-40" onClick={() => setShowMoreMenu(false)} />
            <div className="md:hidden fixed bottom-[56px] left-0 right-0 bg-white rounded-t-2xl shadow-xl z-50 p-4 safe-bottom animate-slide-up">
              <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
              <div className="grid grid-cols-4 gap-3">
                {[
                  { icon: PhoneForwarded, label: 'Ações', route: 'followups', badge: followupsBadge },
                  { icon: Home, label: 'Carteira', route: 'properties' },
                  { icon: DollarSign, label: 'Ganhos', route: 'comissoes' },
                  { icon: BarChart3, label: 'Performance', route: 'relatorios' },
                  { icon: Trophy, label: 'Conquistas', route: 'badges' },
                  { icon: Settings, label: 'Config', route: 'settings' },
                ].map(item => (
                  <button key={item.route} onClick={() => { setCurrentRoute(item.route); setShowMoreMenu(false); }}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl transition-colors relative ${currentRoute === item.route ? 'bg-[#C4A265]/10 text-[#C4A265]' : 'text-[#5A5A5A] hover:bg-gray-50'}`}>
                    <item.icon className="w-5 h-5" />
                    <span className="text-[10px] font-medium">{item.label}</span>
                    {item.badge > 0 && <span className="absolute top-1 right-1 bg-red-500 text-white text-[8px] font-bold w-4 h-4 rounded-full flex items-center justify-center">{item.badge > 9 ? '9+' : item.badge}</span>}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </main>

      {/* T21: Badge celebration overlay queue */}
      {newBadgeQueue.length > 0 && badgeDefs[newBadgeQueue[0]] && (
        <BadgeCelebration
          badge={badgeDefs[newBadgeQueue[0]]}
          onClose={() => setNewBadgeQueue(q => q.slice(1))}
        />
      )}
    </div>
  );
}
