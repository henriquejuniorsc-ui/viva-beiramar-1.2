import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabaseUrl, supabaseKey, setSupabaseClient, getSupabase } from './lib/supabase';
import { addGoogleFonts } from './lib/helpers';
import Toast, { toastTimeout } from './components/ui/Toast';
import CockpitDashboard from './components/dashboard/CockpitDashboard';
import FollowUpsPage from './components/followups/FollowUps';
import ComissoesPage from './components/comissoes/Comissoes';
import AdminImoveis from './components/imoveis/AdminImoveis';
import ConversasPage from './components/conversas/ConversasPage';
import RelatoriosPage from './components/relatorios/RelatoriosPage';
import VisitRegistrationModal from './components/agenda/VisitRegistrationModal';
import { saveVisitRegistration } from './hooks/useVisitRegistration';
import { registerAction } from './hooks/useStreak';
import BadgesPage from './components/crm/BadgesPage';
import BadgeCelebration from './components/crm/BadgeCelebration';
import { checkAndUnlockBadges } from './hooks/useBadges';
import CRMPage from './pages/CRMPage';
import AgendaPage, { AppointmentModal } from './pages/AgendaPage';
import SettingsPage from './pages/SettingsPage';
import Button from './components/ui/Button';
import {
  LayoutDashboard, Home, Users, Settings, LogOut,
  PhoneForwarded, MessageSquare, CalendarDays, DollarSign,
  BarChart3, Trophy, MoreVertical, Bell, Loader2
} from 'lucide-react';

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
  let localToastTimeout;
  const setToast = (data) => {
    setToastState(data);
    clearTimeout(toastTimeout);
    clearTimeout(localToastTimeout);
    if(data) localToastTimeout = setTimeout(() => setToastState(null), 4000);
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

        if (window.supabase && !getSupabase()) {
          console.log('Criando cliente Supabase...');
          const client = window.supabase.createClient(supabaseUrl, supabaseKey);
          setSupabaseClient(client);
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
    const supabase = getSupabase();
    if (!supabase) return;
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
    const supabase = getSupabase();
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
    const supabase = getSupabase();
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
          const updatedLead = await onAppointmentCompleted(supabase, payload);
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
    const supabase = getSupabase();
    const { error } = await supabase.auth.signInWithPassword({ email: e.target.email.value, password: e.target.password.value });
    if (error) setToast({ message: 'E-mail ou senha incorretos.', type: 'error' });
    setLoadingAuth(false);
  };
  const handleLogout = async () => {
    const supabase = getSupabase();
    await supabase.auth.signOut();
  };
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
    fetch(`${supabaseUrl}/rest/v1/follow_ups?status=eq.pendente&select=id`, {
      headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` }
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
    const todayStr = new Date().toISOString().slice(0, 10);
    const poll = () => {
      fetch(`${supabaseUrl}/rest/v1/daily_actions?action_date=eq.${todayStr}&select=id`, {
        headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` }
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
      <div className="flex items-center space-x-3 relative min-w-0">
        <Icon className="w-5 h-5 flex-shrink-0" />
        <span className="truncate">{label}</span>
        {alert && <span className="absolute -top-1 -left-1 w-2.5 h-2.5 bg-[#C4A265] rounded-full animate-pulse border-2 border-[#1B2B3A]"></span>}
      </div>
      {badge > 0 && <span className="flex-shrink-0 ml-1 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{badge}</span>}
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
          {currentRoute === 'crm' && <CRMPage leads={leads} properties={properties} updateLead={updateLeadInState} setToast={setToast} reloadData={loadData} openAgendaModal={setAgendaModalData} onBadgeUnlock={(newly) => setNewBadgeQueue(q => [...q, ...newly])} />}
          {currentRoute === 'conversas' && <ConversasPage session={session} setCurrentRoute={setCurrentRoute} />}
          {currentRoute === 'agenda' && <AgendaPage appointments={appointments} setAppointments={setAppointments} leads={leads} properties={properties} googleCal={googleCal} openAgendaModal={setAgendaModalData} setToast={setToast} onCompleteVisit={setVisitRegModalData} />}
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
