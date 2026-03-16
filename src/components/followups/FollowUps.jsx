import { useState } from 'react';
import {
  ListChecks, Plus, Phone, Calendar, Check, CheckCheck,
  Clock, AlertCircle, ChevronDown, Search, X, Send, MessageSquare, Edit3
} from 'lucide-react';
import { useFollowUps } from '../../hooks/useFollowUps';

const fmt = new Intl.NumberFormat('pt-BR');
const fmtDate = (d) => new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', timeZone: 'America/Sao_Paulo' });
const fmtTime = (d) => new Date(d).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });

function timeLabel(dueDateStr, todayStr, tomorrowStr) {
  const d = dueDateStr.slice(0, 10);
  if (d < todayStr) {
    const diff = Math.round((new Date(todayStr) - new Date(d)) / 86400000);
    return `Há ${diff} dia${diff > 1 ? 's' : ''}`;
  }
  if (d === todayStr) return `Hoje às ${fmtTime(dueDateStr)}`;
  if (d === tomorrowStr) return `Amanhã`;
  return fmtDate(dueDateStr);
}

function urgencyDot(dueDateStr, todayStr) {
  const d = dueDateStr.slice(0, 10);
  if (d < new Date(new Date(todayStr).getTime() - 3 * 86400000).toISOString().slice(0, 10)) return 'bg-red-500';
  if (d < todayStr) return 'bg-amber-400';
  if (d === todayStr) return 'bg-green-500';
  return 'bg-gray-300';
}

const renderMessage = (template, lead) => {
  if (!template) return '';
  return template.message
    .replace(/{nome}/g, lead?.name || 'Cliente')
    .replace(/{imovel}/g, lead?.property_title || 'imóvel')
    .replace(/{bairro}/g, lead?.neighborhood || 'Ubatuba')
    .replace(/{objetivo}/g, 'imóvel');
};

// Replace placeholders in follow-up message text
function replacePlaceholders(text, fu) {
  if (!text) return '';
  const firstName = (fu.lead_name || 'Cliente').split(' ')[0];
  return text
    .replace(/\{nome\}/g, firstName)
    .replace(/\{imovel\}/g, fu.property_title || 'imóvel')
    .replace(/\{bairro\}/g, fu.property_neighborhood || 'região');
}

function formatPhone(phone) {
  if (!phone) return '';
  const clean = phone.replace(/\D/g, '');
  if (clean.length === 13 && clean.startsWith('55')) {
    return `(${clean.slice(2, 4)}) ${clean.slice(4, 9)}-${clean.slice(9)}`;
  }
  if (clean.length >= 10) {
    const ddd = clean.slice(0, 2);
    const rest = clean.slice(2);
    return `(${ddd}) ${rest.slice(0, rest.length - 4)}-${rest.slice(-4)}`;
  }
  return phone;
}

const TEMP_COLORS = {
  QUENTE: 'text-red-600', MORNO: 'text-amber-600', FRIO: 'text-blue-600',
};

// --- Skeleton ---
const Sk = ({ w = 'w-full', h = 'h-4' }) => <div className={`${w} ${h} bg-gray-200 rounded animate-pulse`} />;

// --- Card de Follow-up ---
function FollowUpCard({ fu, todayStr, tomorrowStr, onSend, onMarkSent, onMarkResponded, onDelay, onReschedule, sending }) {
  const [showReschedule, setShowReschedule] = useState(false);
  const [newDate, setNewDate] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState('');
  const dot = urgencyDot(fu.due_date, todayStr);
  const label = timeLabel(fu.due_date, todayStr, tomorrowStr);
  const isOverdue = fu.due_date?.slice(0, 10) < todayStr;
  const isToday = fu.due_date?.slice(0, 10) === todayStr;

  // Replace placeholders in message
  const displayMessage = replacePlaceholders(fu.message_text, fu);

  const handleEdit = () => {
    setEditedText(displayMessage);
    setIsEditing(true);
  };

  const handleSendEdited = () => {
    onSend({ ...fu, message_text: editedText });
    setIsEditing(false);
  };

  return (
    <div className={`bg-white rounded-xl border p-4 hover:shadow-md transition-shadow ${isOverdue ? 'border-red-100' : isToday ? 'border-green-100' : 'border-gray-100'}`}>
      <div className="flex items-start gap-3">
        <div className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${dot}`} />

        <div className="flex-1 min-w-0">
          {/* Lead info */}
          <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
            <div>
              <span className="font-medium text-gray-900 text-sm">{fu.lead_name || '—'}</span>
              <div className="flex items-center gap-2 text-[11px] text-gray-400 mt-0.5">
                {fu.lead_phone && <span>{formatPhone(fu.lead_phone)}</span>}
                {fu.temperatura && <span className={`font-medium ${TEMP_COLORS[fu.temperatura] || ''}`}>{fu.temperatura}</span>}
                {fu.lead_stage && <span>· {fu.lead_stage}</span>}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${isOverdue ? 'bg-red-50 text-red-600' : isToday ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-500'}`}>
                {label}
              </span>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${
                fu.status === 'enviado' ? 'bg-blue-50 text-blue-600'
                : fu.status === 'respondido' ? 'bg-emerald-50 text-emerald-700'
                : fu.status === 'ignorado' ? 'bg-gray-100 text-gray-400'
                : isOverdue ? 'bg-red-50 text-red-600'
                : 'bg-amber-50 text-amber-700'
              }`}>
                {fu.status === 'pendente' ? (isOverdue ? 'ATRASADO' : 'PENDENTE') : fu.status.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Message — editable or preview */}
          {isEditing ? (
            <div className="mt-2 mb-3">
              <textarea value={editedText} onChange={e => setEditedText(e.target.value)}
                rows={3} className="w-full text-xs border border-[#c9a84c] rounded-lg px-3 py-2 outline-none resize-none focus:ring-1 focus:ring-[#c9a84c]" />
              <div className="flex gap-2 mt-2">
                <button onClick={handleSendEdited} disabled={sending === fu.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#25D366] hover:bg-[#1fba58] text-white text-xs font-medium rounded-lg disabled:opacity-50">
                  <Send className="w-3.5 h-3.5" />{sending === fu.id ? 'Enviando…' : 'Enviar'}
                </button>
                <button onClick={() => setIsEditing(false)}
                  className="px-3 py-1.5 text-gray-500 text-xs hover:bg-gray-100 rounded-lg">Cancelar</button>
              </div>
            </div>
          ) : displayMessage && (
            <p className="text-xs text-gray-500 italic mt-1 mb-3 line-clamp-3 bg-gray-50 rounded-lg px-3 py-2">
              "{displayMessage}"
            </p>
          )}

          {/* Actions */}
          {!isEditing && (
            <div className="flex flex-wrap gap-2">
              {fu.status === 'pendente' && (
                <>
                  <button onClick={handleEdit}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded-lg transition-colors">
                    ✏️ Editar
                  </button>
                  <button onClick={() => onSend({ ...fu, message_text: displayMessage })} disabled={sending === fu.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#25D366] hover:bg-[#1fba58] text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50">
                    <MessageSquare className="w-3.5 h-3.5" />{sending === fu.id ? 'Enviando…' : 'Enviar WhatsApp'}
                  </button>
                  <button onClick={() => onDelay(fu.id, fu.due_date)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded-lg transition-colors">
                    <Clock className="w-3.5 h-3.5" /> Adiar 1 dia
                  </button>
                  <button onClick={() => setShowReschedule(v => !v)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded-lg transition-colors">
                    <Calendar className="w-3.5 h-3.5" /> Reagendar
                  </button>
                  <button onClick={() => onMarkSent(fu.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-medium rounded-lg transition-colors">
                    <Check className="w-3.5 h-3.5" /> Marcar enviado
                  </button>
                </>
              )}
              {fu.status === 'enviado' && (
                <button onClick={() => onMarkResponded(fu.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-medium rounded-lg transition-colors">
                  <CheckCheck className="w-3.5 h-3.5" /> Marcar respondido
                </button>
              )}
            </div>
          )}

          {/* Reschedule inline */}
          {showReschedule && (
            <div className="flex items-center gap-2 mt-3">
              <input type="datetime-local" value={newDate} onChange={e => setNewDate(e.target.value)}
                className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-[#c9a84c]" />
              <button onClick={() => { if (newDate) { onReschedule(fu.id, new Date(newDate).toISOString()); setShowReschedule(false); } }}
                className="px-3 py-1.5 bg-[#c9a84c] text-white text-xs font-medium rounded-lg hover:bg-[#b8923f]">Salvar</button>
              <button onClick={() => setShowReschedule(false)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// --- Modal Novo Follow-up ---
function NovoFollowUpModal({ templates, leads, onSave, onClose }) {
  const [form, setForm] = useState({
    lead_id: '', lead_name: '', lead_phone: '',
    type: 'whatsapp', template_key: '', message_text: '',
    due_date: new Date(Date.now() + 86400000).toISOString().slice(0, 16),
  });

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const handleLeadChange = (id) => {
    const lead = leads.find(l => String(l.id) === String(id));
    set('lead_id', id);
    if (lead) { set('lead_name', lead.name); set('lead_phone', lead.phone || ''); }
  };

  const handleTemplateChange = (key) => {
    const tpl = templates.find(t => t.key === key);
    set('template_key', key);
    if (tpl) {
      const lead = leads.find(l => String(l.id) === String(form.lead_id));
      const msg = tpl.message
        .replace(/{nome}/g, lead?.name || 'Cliente')
        .replace(/{imovel}/g, 'imóvel de interesse')
        .replace(/{bairro}/g, 'Ubatuba')
        .replace(/{objetivo}/g, 'imóvel');
      set('message_text', msg);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ ...form, due_date: new Date(form.due_date).toISOString() });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Novo follow-up</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-full text-gray-400"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Lead / Cliente *</label>
            <select required value={form.lead_id} onChange={e => handleLeadChange(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#c9a84c]">
              <option value="">Selecione um lead...</option>
              {leads.map(l => <option key={l.id} value={l.id}>{l.name} {l.phone ? `· ${l.phone}` : ''}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Tipo</label>
              <select value={form.type} onChange={e => set('type', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#c9a84c]">
                <option value="whatsapp">WhatsApp</option>
                <option value="ligacao">Ligação</option>
                <option value="email">E-mail</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Data e hora *</label>
              <input required type="datetime-local" value={form.due_date} onChange={e => set('due_date', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#c9a84c]" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Template</label>
            <select value={form.template_key} onChange={e => handleTemplateChange(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#c9a84c]">
              <option value="">Sem template (escrever manualmente)</option>
              {templates.map(t => <option key={t.key} value={t.key}>{t.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Mensagem *</label>
            <textarea required value={form.message_text} onChange={e => set('message_text', e.target.value)}
              rows={4} placeholder="Digite a mensagem..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#c9a84c] resize-none" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-200 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50">Cancelar</button>
            <button type="submit" className="px-4 py-2 bg-[#c9a84c] hover:bg-[#b8923f] text-white text-sm font-medium rounded-lg">Salvar</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// --- PÁGINA PRINCIPAL ---
const FILTERS = ['Hoje', 'Amanhã', 'Esta semana', 'Atrasados', 'Todos'];

export default function FollowUpsPage({ session }) {
  const {
    followUps, templates, leads, isLoading, metrics,
    markSent, markResponded, reschedule, delay1Day, sendWhatsApp, createFollowUp,
    todayStr, tomorrowStr,
  } = useFollowUps(session);

  const [activeFilter, setActiveFilter] = useState('Todos');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [sending, setSending] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSend = async (fu) => {
    setSending(fu.id);
    const ok = await sendWhatsApp(fu);
    setSending(null);
    showToast(ok ? '✅ Mensagem enviada!' : '❌ Falha ao enviar. Verifique o UAZAPI.', ok ? 'success' : 'error');
  };

  const handleCreate = async (data) => {
    await createFollowUp(data);
    setShowModal(false);
    showToast('Follow-up criado!');
  };

  // Filtrar
  const weekEnd = new Date(todayStr); weekEnd.setDate(weekEnd.getDate() + (6 - weekEnd.getDay()));
  const weekEndStr = weekEnd.toISOString().slice(0, 10);

  const filtered = followUps.filter(fu => {
    if (fu.status === 'respondido' || fu.status === 'ignorado') return false;
    const d = fu.due_date.slice(0, 10);
    if (activeFilter === 'Hoje') return d === todayStr;
    if (activeFilter === 'Amanhã') return d === tomorrowStr;
    if (activeFilter === 'Esta semana') return d >= todayStr && d <= weekEndStr;
    if (activeFilter === 'Atrasados') return d < todayStr && fu.status === 'pendente';
    return true;
  }).filter(fu =>
    !search || fu.lead_name?.toLowerCase().includes(search.toLowerCase()) || fu.message_text?.toLowerCase().includes(search.toLowerCase())
  );

  // Agrupar
  const atrasados = filtered.filter(f => f.due_date.slice(0, 10) < todayStr && f.status === 'pendente');
  const hoje = filtered.filter(f => f.due_date.slice(0, 10) === todayStr);
  const futuros = filtered.filter(f => f.due_date.slice(0, 10) > todayStr);
  const enviados = filtered.filter(f => f.status === 'enviado');

  const Group = ({ title, items, color }) => items.length === 0 ? null : (
    <div>
      <div className={`flex items-center gap-2 mb-3`}>
        <div className={`h-px flex-1 ${color}`} />
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
          {title} ({items.length})
        </span>
        <div className={`h-px flex-1 ${color}`} />
      </div>
      <div className="space-y-3">
        {items.map(fu => (
          <FollowUpCard key={fu.id} fu={fu} todayStr={todayStr} tomorrowStr={tomorrowStr}
            onSend={handleSend} onMarkSent={markSent} onMarkResponded={markResponded}
            onDelay={delay1Day} onReschedule={reschedule} sending={sending} />
        ))}
      </div>
    </div>
  );

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-5">
      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${toast.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
          {toast.msg}
        </div>
      )}

      {showModal && <NovoFollowUpModal templates={templates} leads={leads} onSave={handleCreate} onClose={() => setShowModal(false)} />}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Follow-ups</h1>
          <p className="text-sm text-gray-400 mt-0.5">Zero lead esquecido</p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#c9a84c] hover:bg-[#b8923f] text-white text-sm font-medium rounded-lg transition-colors">
          <Plus className="w-4 h-4" /> Novo follow-up
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? Array.from({length:4}).map((_,i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 animate-pulse space-y-2"><Sk w="w-24"/><Sk w="w-12" h="h-8"/></div>
        )) : [
          { label: 'Pendentes', value: metrics.pendentes, color: 'text-gray-900', bg: 'bg-white' },
          { label: 'Atrasados', value: metrics.atrasados, color: metrics.atrasados > 0 ? 'text-red-600' : 'text-gray-900', bg: metrics.atrasados > 0 ? 'bg-red-50' : 'bg-white', icon: metrics.atrasados > 0 ? '🔴' : null },
          { label: 'Enviados (mês)', value: metrics.enviados, color: 'text-blue-700', bg: 'bg-white' },
          { label: 'Taxa resposta', value: `${metrics.taxaResposta}%`, color: 'text-[#1D9E75]', bg: 'bg-white' },
        ].map((k, i) => (
          <div key={i} className={`${k.bg} rounded-xl border border-gray-100 p-4 shadow-sm`}>
            <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">{k.label}</p>
            <p className={`text-2xl font-medium mt-1 tabular-nums ${k.color}`}>{k.value} {k.icon}</p>
          </div>
        ))}
      </div>

      {/* Filtros + Busca */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex bg-white border border-gray-100 rounded-lg p-1 gap-1 overflow-x-auto hide-scrollbar">
          {FILTERS.map(f => (
            <button key={f} onClick={() => setActiveFilter(f)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${activeFilter === f ? 'bg-[#1B2B3A] text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
              {f}
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input type="text" placeholder="Buscar lead..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-[#c9a84c]" />
        </div>
      </div>

      {/* Listas agrupadas */}
      {isLoading ? (
        <div className="space-y-3">{Array.from({length:3}).map((_,i) => <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 animate-pulse h-24" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <div className="text-4xl mb-3">🎉</div>
          <p className="text-gray-500 font-medium">Tudo em dia!</p>
          <p className="text-sm text-gray-400 mt-1">Nenhum follow-up pendente para este filtro.</p>
        </div>
      ) : (
        <div className="space-y-6">
          <Group title="Atrasados" items={atrasados} color="bg-red-200" />
          <Group title="Hoje" items={hoje} color="bg-green-200" />
          <Group title="Próximos" items={futuros} color="bg-gray-200" />
          <Group title="Aguardando resposta" items={enviados} color="bg-blue-200" />
        </div>
      )}
    </div>
  );
}
