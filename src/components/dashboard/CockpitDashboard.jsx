import { useState } from 'react';
import {
  TrendingUp, Home, PhoneForwarded, Clock, DollarSign, Gift,
  Clock as ClockIcon, ChevronRight, X, TrendingDown
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useDashboardData } from '../../hooks/useDashboardData';

// --- Formatters ---
const fmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const fmtCompact = (v) => {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1).replace('.', ',')}M`;
  if (v >= 1_000) return `R$ ${(v / 1_000).toFixed(0)}k`;
  return fmt.format(v);
};

// --- Skeleton ---
const Skeleton = ({ w = 'w-full', h = 'h-4' }) => (
  <div className={`${w} ${h} bg-gray-200 rounded animate-pulse`} />
);

// --- Alert Banner ---
function AlertBanner({ appointment, onDismiss }) {
  const mins = appointment.minutes_until;
  const label = mins <= 1 ? 'menos de 1 min' : `${mins} min`;
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-amber-50 border-l-4 border-amber-400 rounded-lg mb-5">
      <ClockIcon className="w-4 h-4 text-amber-500 flex-shrink-0" />
      <p className="text-sm text-amber-800 flex-1">
        <span className="font-semibold">Compromisso em {label}</span>
        {' — '}{appointment.title}
        {appointment.lead_name && ` com ${appointment.lead_name}`}
        {' às '}{new Date(appointment.start_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
      </p>
      <button onClick={onDismiss} className="p-1 text-amber-400 hover:text-amber-700 rounded">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

// --- Pipeline Card ---
function PipelineCard({ total, changePct, isLoading }) {
  if (isLoading) return (
    <div className="bg-white rounded-xl shadow-sm border-2 border-[#c9a84c] p-5 space-y-3 animate-pulse">
      <Skeleton w="w-32" /><Skeleton w="w-48" h="h-8" /><Skeleton w="w-24" />
    </div>
  );
  const pos = changePct >= 0;
  return (
    <div className="bg-white rounded-xl shadow-sm border-2 border-[#c9a84c] p-5 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-gray-500 uppercase tracking-wider font-medium">Pipeline total</span>
        <div className="p-1.5 bg-amber-50 rounded-lg"><DollarSign className="w-4 h-4 text-[#c9a84c]" /></div>
      </div>
      <div className="mt-3 mb-2">
        <span className="text-3xl font-medium text-gray-900 tabular-nums">{fmtCompact(total)}</span>
      </div>
      <div className={`flex items-center gap-1 text-sm font-medium ${pos ? 'text-[#1D9E75]' : 'text-[#E24B4A]'}`}>
        {pos ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
        <span>{pos ? '+' : ''}{changePct}% vs mês anterior</span>
      </div>
      <div className="mt-4 h-1 bg-gray-100 rounded-full"><div className="h-full bg-[#c9a84c] rounded-full w-full" /></div>
    </div>
  );
}

// --- Commission Card ---
function CommissionCard({ commission, rate, monthlyPct, isLoading }) {
  if (isLoading) return (
    <div className="bg-white rounded-xl shadow-sm border-2 border-[#c9a84c] p-5 space-y-3 animate-pulse">
      <Skeleton w="w-36" /><Skeleton w="w-44" h="h-8" /><Skeleton w="w-28" />
    </div>
  );
  const fill = Math.min(monthlyPct, 100);
  return (
    <div className="bg-white rounded-xl shadow-sm border-2 border-[#c9a84c] p-5 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-gray-500 uppercase tracking-wider font-medium">Comissão potencial</span>
        <div className="p-1.5 bg-emerald-50 rounded-lg"><Gift className="w-4 h-4 text-[#1D9E75]" /></div>
      </div>
      <div className="mt-3 mb-2">
        <span className="text-3xl font-medium text-[#1D9E75] tabular-nums">{fmtCompact(commission)}</span>
      </div>
      <div className="text-sm text-gray-500">{(rate * 100).toFixed(0)}% sobre pipeline ativo</div>
      <div className="mt-4 h-1 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${fill}%`, backgroundColor: monthlyPct >= 100 ? '#1D9E75' : '#c9a84c' }} />
      </div>
    </div>
  );
}

// --- Metric Card ---
function MetricCard({ Icon, iconColor, iconBg, label, labelShort, value, sub, subColor, isLoading }) {
  if (isLoading) return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 sm:p-4 animate-pulse space-y-2">
      <div className="flex gap-3"><Skeleton w="w-9" h="h-9" /><div className="flex-1 space-y-2"><Skeleton /><Skeleton w="w-1/2" h="h-6" /></div></div>
    </div>
  );
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 sm:p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-2 sm:gap-3">
        <div className={`p-1.5 sm:p-2 rounded-lg flex-shrink-0 ${iconBg}`}>
          <Icon className="w-4 h-4" style={{ color: iconColor }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-tight sm:tracking-wider font-medium truncate">
            {labelShort && <span className="sm:hidden">{labelShort}</span>}
            <span className={labelShort ? 'hidden sm:inline' : ''}>{label}</span>
          </p>
          <p className="text-xl sm:text-2xl font-medium text-gray-900 mt-0.5 tabular-nums">{value}</p>
          <p className={`text-[11px] sm:text-xs mt-0.5 sm:mt-1 truncate ${subColor || 'text-gray-500'}`}>{sub}</p>
        </div>
      </div>
    </div>
  );
}

// --- Monthly Goal ---
function MonthlyGoal({ goal, achieved, pct, remaining, closingsNeeded, isLoading }) {
  if (isLoading) return (
    <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 animate-pulse space-y-3">
      <div className="flex justify-between"><Skeleton w="w-40" /><Skeleton w="w-44" h="h-5" /></div>
      <Skeleton h="h-2" /><div className="flex justify-between"><Skeleton w="w-20" /><Skeleton w="w-40" /></div>
    </div>
  );
  const exceeded = pct >= 100;
  const fill = Math.min(pct, 100);
  return (
    <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-3">
        <span className="text-sm text-gray-500">Meta mensal de comissão</span>
        <span className="text-lg font-medium text-gray-900 tabular-nums">
          {fmt.format(achieved)}<span className="text-gray-400 font-normal text-base"> / {fmt.format(goal)}</span>
        </span>
      </div>
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${fill}%`, backgroundColor: exceeded ? '#1D9E75' : '#c9a84c' }} />
      </div>
      <div className="flex justify-between items-center mt-2">
        <span className={`text-xs font-medium ${exceeded ? 'text-[#1D9E75]' : 'text-gray-500'}`}>
          {exceeded ? '🎉 Meta superada!' : `${pct}% atingido`}
        </span>
        {!exceeded && (
          <span className="text-xs text-gray-400">
            Faltam {fmt.format(remaining)}{closingsNeeded > 0 && ` · ~${closingsNeeded} fechamento${closingsNeeded > 1 ? 's' : ''}`}
          </span>
        )}
      </div>
    </div>
  );
}

// --- Funnel ---
function ConversionFunnel({ stages, isLoading }) {
  if (isLoading) return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 animate-pulse">
      <Skeleton w="w-40" h="h-5" /><div className="flex items-end gap-2 h-28 mt-6">{Array.from({length:7}).map((_,i) => <div key={i} className="flex-1 bg-gray-200 rounded-t-md" style={{height:`${Math.random()*80+20}px`}} />)}</div>
    </div>
  );
  const maxCount = Math.max(...stages.map(s => s.count), 1);
  const isEmpty = stages.every(s => s.count === 0);
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      <h3 className="text-base font-medium text-gray-900 mb-5">Funil de conversão</h3>
      {isEmpty ? (
        <div className="flex flex-col items-center py-8 text-gray-400"><div className="text-4xl mb-2">📊</div><p className="text-sm">Seus leads aparecerão aqui</p></div>
      ) : (
        <div className="flex items-end gap-2">
          {stages.map(s => {
            const h = Math.max(4, Math.round((s.count / maxCount) * 96));
            return (
              <div key={s.status} className="flex-1 flex flex-col items-center gap-1.5">
                <span className="text-xs font-medium text-gray-700 tabular-nums">{s.count}</span>
                <div className="w-full rounded-t-md transition-all duration-500" style={{ height: `${h}px`, backgroundColor: s.color }} />
                <span className="text-[10px] text-gray-500 text-center leading-tight w-full truncate">{s.label}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// --- Deal Card ---
function DealCardItem({ deal }) {
  const probColor = deal.probability > 70 ? '#1D9E75' : deal.probability >= 40 ? '#EF9F27' : '#E24B4A';
  const badge = deal.status === 'contrato' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700';
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="font-medium text-gray-900 text-sm">{deal.lead_name}</span>
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide flex-shrink-0 ${badge}`}>{deal.status}</span>
      </div>
      <p className="text-xs text-gray-500 mb-3">{deal.property_title}{deal.property_neighborhood && ` — ${deal.property_neighborhood}`}</p>
      <div className="flex justify-between mb-3">
        <span className="text-sm font-medium text-gray-700 tabular-nums">{fmt.format(deal.deal_value)}</span>
        <span className="text-sm font-medium tabular-nums" style={{ color: deal.status === 'contrato' ? '#1D9E75' : '#EF9F27' }}>{fmt.format(deal.commission_value)}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: probColor }} />
        <span className="text-xs text-gray-500">
          <span className="font-medium" style={{ color: probColor }}>{deal.probability}%</span> chance
          {deal.notes && <span className="text-gray-400"> · {deal.notes.substring(0, 30)}{deal.notes.length > 30 ? '…' : ''}</span>}
        </span>
      </div>
    </div>
  );
}

// --- Upcoming Deals ---
function UpcomingDeals({ deals, isLoading }) {
  const sum = deals.reduce((s, d) => s + d.deal_value, 0);
  if (isLoading) return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 animate-pulse">
      <div className="flex justify-between mb-4"><Skeleton w="w-44" h="h-5" /><Skeleton w="w-28" h="h-5" /></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{[1,2,3,4].map(i => <div key={i} className="border border-gray-100 rounded-xl p-4 space-y-2"><Skeleton w="w-3/4" /><Skeleton /><Skeleton w="w-1/2" /></div>)}</div>
    </div>
  );
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-medium text-gray-900">Próximos fechamentos</h3>
        {deals.length > 0 && <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-amber-50 text-amber-700">{fmtCompact(sum)} no pipeline</span>}
      </div>
      {deals.length === 0 ? (
        <div className="flex flex-col items-center py-10 text-gray-400"><div className="text-4xl mb-2">🤝</div><p className="text-sm">Nenhum negócio em andamento</p></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {deals.map(d => <DealCardItem key={d.id} deal={d} />)}
        </div>
      )}
    </div>
  );
}

// --- Revenue Chart ---
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-md p-3 text-xs">
      <p className="font-medium text-gray-700 mb-2">{label}</p>
      {payload.map(e => (
        <div key={e.dataKey} className="flex items-center gap-2 mb-1">
          <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: e.fill }} />
          <span className="text-gray-600">{e.name}:</span>
          <span className="font-medium">{fmt.format(e.value)}</span>
        </div>
      ))}
    </div>
  );
};

function RevenueChart({ data, isLoading }) {
  if (isLoading) return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 animate-pulse">
      <Skeleton w="w-44" h="h-5" /><div className="h-48 bg-gray-100 rounded-lg mt-4" />
    </div>
  );
  const hasData = data.some(d => d.confirmed + d.probable + d.optimistic > 0);
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <h3 className="text-base font-medium text-gray-900">Previsão de receita</h3>
        <div className="flex items-center gap-4 text-xs text-gray-500">
          {[['#1D9E75','Confirmada'],['#5DCAA5','Provável'],['#D3D1C7','Otimista']].map(([c,l]) => (
            <div key={l} className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: c }} />
              <span>{l}</span>
            </div>
          ))}
        </div>
      </div>
      {!hasData ? (
        <div className="flex flex-col items-center h-48 justify-center text-gray-400"><div className="text-3xl mb-2">📈</div><p className="text-sm">Dados insuficientes para projeção</p></div>
      ) : (
        <div style={{ height: '200px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} barCategoryGap="30%" barGap={2}>
              <CartesianGrid vertical={false} stroke="rgba(0,0,0,0.05)" />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9ca3af' }} tickFormatter={v => v >= 1000 ? `R$${(v/1000).toFixed(0)}k` : `R$${v}`} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
              <Bar dataKey="confirmed" name="Confirmada" stackId="a" fill="#1D9E75" />
              <Bar dataKey="probable" name="Provável" stackId="a" fill="#5DCAA5" />
              <Bar dataKey="optimistic" name="Otimista" stackId="a" fill="#D3D1C7" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

// --- COCKPIT PRINCIPAL ---
export default function CockpitDashboard({ session }) {
  const { data, isLoading, error } = useDashboardData(session);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  const m = data?.metrics;
  const funnel = data?.funnel ?? [];
  const topDeals = data?.topDeals ?? [];
  const nextAppt = data?.nextAppointment ?? null;
  const projection = data?.projection ?? [];

  const followColor = m && m.followups_pending > 0 ? '#E24B4A' : '#9ca3af';
  const followBg = m && m.followups_pending > 0 ? 'bg-red-50' : 'bg-gray-50';
  const respColor = !m ? '#9ca3af' : m.avg_response_time_min < 5 ? '#1D9E75' : m.avg_response_time_min <= 30 ? '#EF9F27' : '#E24B4A';

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-5">
      {/* Banner */}
      {nextAppt && !bannerDismissed && (
        <AlertBanner appointment={nextAppt} onDismiss={() => setBannerDismissed(true)} />
      )}

      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Cockpit do Corretor</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          Erro ao carregar dados do pipeline.
        </div>
      )}

      {/* Cards dourados */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <PipelineCard total={m?.pipeline_total ?? 0} changePct={m?.pipeline_change_pct ?? 0} isLoading={isLoading} />
        <CommissionCard commission={m?.commission_potential ?? 0} rate={m?.commission_rate ?? 0.03} monthlyPct={m?.monthly_pct ?? 0} isLoading={isLoading} />
      </div>

      {/* 4 Métricas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        <MetricCard Icon={TrendingUp} iconColor="#378ADD" iconBg="bg-blue-50" label="Fechamentos Previstos" labelShort="Fecham." value={m?.closings_predicted ?? 0} sub={`${m?.proposals_accepted ?? 0} com proposta`} isLoading={isLoading} />
        <MetricCard Icon={Home} iconColor="#c9a84c" iconBg="bg-amber-50" label="Visitas esta semana" labelShort="Visitas" value={m?.visits_this_week ?? 0} sub="Na Agenda" isLoading={isLoading} />
        <MetricCard Icon={PhoneForwarded} iconColor={followColor} iconBg={followBg} label="Follow-ups pendentes" labelShort="Follow-ups" value={m?.followups_pending ?? 0} sub={m && m.followups_overdue > 0 ? `${m.followups_overdue} atrasados` : 'Em dia ✓'} subColor={m && m.followups_pending > 0 ? 'text-[#E24B4A]' : 'text-gray-400'} isLoading={isLoading} />
        <MetricCard Icon={Clock} iconColor={respColor} iconBg="bg-gray-50" label="Tempo médio resposta" labelShort="T. Resposta" value={`${m?.avg_response_time_min ?? 0}min`} sub="WhatsApp" isLoading={isLoading} />
      </div>

      {/* Meta mensal */}
      <MonthlyGoal goal={m?.monthly_goal ?? 35000} achieved={m?.monthly_achieved ?? 0} pct={m?.monthly_pct ?? 0} remaining={m?.monthly_remaining ?? 35000} closingsNeeded={m?.closings_needed ?? 0} isLoading={isLoading} />

      {/* Funil */}
      <ConversionFunnel stages={funnel} isLoading={isLoading} />

      {/* Próximos fechamentos */}
      <UpcomingDeals deals={topDeals} isLoading={isLoading} />

      {/* Gráfico */}
      <RevenueChart data={projection} isLoading={isLoading} />
    </div>
  );
}
