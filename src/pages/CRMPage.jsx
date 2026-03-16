import React, { useState, useEffect, useCallback } from 'react';
import { supabaseUrl, supabaseKey, getSupabase } from '../lib/supabase';
import { KANBAN_STAGES, TEMP_COLORS } from '../lib/constants';
import { formatCurrency, formatPhone } from '../lib/helpers';
import Button from '../components/ui/Button';
import CelebrationScreen from '../components/crm/CelebrationScreen';
import { registerAction } from '../hooks/useStreak';
import { checkAndUnlockBadges } from '../hooks/useBadges';
import { RequestReferralModal, RegisterReferralModal } from '../components/crm/ReferralModals';
import {
  Search, X, Phone, DollarSign, ChevronRight, ChevronLeft,
  MessageSquare, CalendarDays, HeartHandshake, UserPlus
} from 'lucide-react';

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

const ProbBadge = ({ prob }) => {
  if (!prob && prob !== 0) return null;
  const cls = prob >= 70 ? 'bg-green-50 text-green-700' : prob >= 40 ? 'bg-amber-50 text-amber-700' : 'bg-gray-100 text-gray-500';
  return <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${cls}`}>{prob}%</span>;
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

// 2. CRM / LEADS (enriched with pipeline_deals + drag-and-drop + sync)
const CRMPage = ({ leads, properties, updateLead, setToast, reloadData, openAgendaModal, onBadgeUnlock }) => {
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

    const leadId = e.dataTransfer.getData('text/plain');
    const lead = leads.find(l => l.id === leadId);
    if (!lead || lead.stage === newStage) return;

    const oldStage = lead.stage;

    // Optimistic update
    updateLead({ ...lead, stage: newStage });

    // Sync: update DB + deal + auto follow-up
    const supabase = getSupabase();
    const { onLeadStageChange } = await import('../hooks/useSyncLeadStage.js');
    const result = await onLeadStageChange(supabase, lead, newStage, oldStage);

    if (result.updatedLead) {
      updateLead(result.updatedLead);
    }

    // 🎉 Celebration when moved to "Fechado" and lead has a deal
    if (newStage === 'Fechado') {
      const existingDeal = getDealForLead(lead);
      if (existingDeal) {
        registerAction('deal_closed', lead.id).catch(() => {});
        // T21: check badges async
        checkAndUnlockBadges().then(newly => {
          if (newly.length > 0 && onBadgeUnlock) onBadgeUnlock(newly);
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
            if (newly.length > 0 && onBadgeUnlock) onBadgeUnlock(newly);
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

export default CRMPage;
