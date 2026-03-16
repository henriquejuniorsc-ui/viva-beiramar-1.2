import React, { useState } from 'react';
import { APPOINTMENT_TYPES } from '../lib/constants';
import { formatPhone, isSameDay, getDaysInMonth, getFirstDayOfMonth } from '../lib/helpers';
import Button from '../components/ui/Button';
import {
  X, Check, Home, Plus, Edit2, User,
  ChevronLeft, ChevronRight, Calendar as CalendarIcon,
  MapIcon, AlignLeft, CalendarDays, CheckCircle2
} from 'lucide-react';

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

// 6. AGENDA
const AgendaPage = ({ appointments, setAppointments, leads, properties, googleCal, openAgendaModal, setToast, onCompleteVisit }) => {
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
                      {a.address && <div className="flex items-center text-sm text-[#5A5A5A]"><MapIcon className="w-4 h-4 mr-2 text-[#C4A265]" /> {a.address}</div>}
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
          { label: 'Google Calendar', value: googleCal.userEmail ? googleCal.userEmail.split('@')[0] : 'Conectado', icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-50' }
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

export { AppointmentModal };
export default AgendaPage;
