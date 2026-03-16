import { useState, useEffect } from 'react';
import {
  TrendingUp, Home, PhoneForwarded, Clock, DollarSign, Gift,
  Clock as ClockIcon, ChevronRight, X, TrendingDown,
  Phone, MessageCircle, Calendar, AlertTriangle, FileText
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useDashboardData } from '../../hooks/useDashboardData';
import { useStreak } from '../../hooks/useStreak';
import StreakBanner from './StreakBanner';

// --- Formatters ---
const fmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const fmtCompact = (v) => {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1).replace('.', ',')}M`;
  if (v >= 1_000) return `R$ ${(v / 1_000).toFixed(0)}k`;
  return fmt.format(v);
};
const cleanPhone = (phone) => {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  return digits.startsWith('55') ? digits : `55${digits}`;
};

// --- Skeleton ---
const Skeleton = ({ w = 'w-full', h = 'h-4' }) => (
  <div className={`${w} ${h} bg-gray-200 rounded animate-pulse`} />
);
const SkeletonDark = ({ w = 'w-full', h = 'h-4' }) => (
  <div className={`${w} ${h} bg-white/10 rounded animate-pulse`} />
);

// ============================================================
// MOTOR DE PREVISÃO DE COMISSÃO
// ============================================================

// --- Bloco 1: Previsão Principal ---
function CommissionForecast({ prediction, isLoading }) {
  if (isLoading) return (
    <div className="bg-gradient-to-br from-[#1B2B3A] to-[#0F1922] rounded-2xl p-6 md:p-8 min-h-[calc(100dvh-56px)] md:min-h-0 flex flex-col justify-center">
      <SkeletonDark w="w-40" h="h-4" />
      <div className="mt-3"><SkeletonDark w="w-56" h="h-12" /></div>
      <div className="mt-2"><SkeletonDark w="w-48" h="h-4" /></div>
      <div className="flex gap-3 mt-8">
        <div className="flex-1"><SkeletonDark h="h-16" /></div>
        <div className="flex-1"><SkeletonDark h="h-16" /></div>
      </div>
      <div className="mt-8"><SkeletonDark h="h-2" /></div>
    </div>
  );

  const { conservador, provavel, otimista, percentMeta, monthlyGoal } = prediction;
  const fill = Math.min(percentMeta, 100);
  const exceeded = percentMeta >= 100;

  return (
    <div className="bg-gradient-to-br from-[#1B2B3A] to-[#0F1922] rounded-2xl p-6 md:p-8 min-h-[calc(100dvh-56px)] md:min-h-0 flex flex-col justify-center">
      <p className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-3">
        Previsão de comissão
      </p>
      <p className="text-4xl md:text-5xl font-bold text-[#C9A84C] tabular-nums leading-tight">
        {fmt.format(Math.round(provavel))}
      </p>
      <p className="text-sm text-gray-400 mt-1 mb-8">
        provável nos próximos 30 dias
      </p>

      <div className="flex gap-3 mb-8">
        <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 flex-1 text-center">
          <p className="text-lg font-semibold text-gray-200 tabular-nums">{fmtCompact(conservador)}</p>
          <p className="text-[11px] text-gray-500 mt-0.5">conservador</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 flex-1 text-center">
          <p className="text-lg font-semibold text-gray-200 tabular-nums">{fmtCompact(otimista)}</p>
          <p className="text-[11px] text-gray-500 mt-0.5">otimista</p>
        </div>
      </div>

      <div>
        <div className="h-2.5 bg-white/10 rounded-full overflow-hidden mb-2">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${fill}%`, backgroundColor: exceeded ? '#1D9E75' : '#C9A84C' }}
          />
        </div>
        <div className="flex justify-between items-center">
          <span className={`text-sm font-medium ${exceeded ? 'text-[#1D9E75]' : 'text-gray-300'}`}>
            {exceeded ? 'Meta superada!' : `${percentMeta}% da meta`}
          </span>
          <span className="text-xs text-gray-500">meta: {fmt.format(monthlyGoal)}</span>
        </div>
      </div>
    </div>
  );
}

// --- Bloco 2: Ações que destravam dinheiro ---
function DealActionCard({ deal }) {
  const borderColor = deal.probability > 75 ? '#E24B4A' : deal.probability >= 30 ? '#EF9F27' : '#9ca3af';
  const phone = cleanPhone(deal.lead_phone);
  const showContactBtns = (deal.action === 'Fechar contrato' || deal.action === 'Fazer follow-up') && phone;

  return (
    <div
      className="rounded-xl border border-gray-100 p-4 hover:shadow-md transition-shadow"
      style={{ borderLeftWidth: '4px', borderLeftColor: borderColor }}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="min-w-0">
          <span className="font-semibold text-gray-900 text-sm">{deal.lead_name}</span>
          {deal.property_title && (
            <p className="text-xs text-gray-400 mt-0.5 truncate">
              {deal.property_title}{deal.property_neighborhood ? ` — ${deal.property_neighborhood}` : ''}
            </p>
          )}
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 flex-shrink-0 whitespace-nowrap">
          {deal.action}
        </span>
      </div>

      <div className="flex items-center gap-2 text-xs text-gray-500 mb-1.5">
        <span className="tabular-nums font-medium">{fmt.format(Math.round(deal.commission))} comissão</span>
        <span className="text-gray-300">&middot;</span>
        <span className="tabular-nums">{deal.probability}%</span>
      </div>

      <p className="text-xs text-[#1D9E75] font-medium mb-3 tabular-nums">
        +{fmt.format(Math.round(deal.gainPotential))} na previsão
      </p>

      <div className="flex flex-wrap gap-2">
        {showContactBtns && (
          <>
            <a
              href={`tel:+${phone}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-[#1B2B3A] text-white hover:bg-[#253848] transition-colors"
            >
              <Phone className="w-3 h-3" />
              {deal.action === 'Fechar contrato' ? 'Ligar agora' : 'Ligar'}
            </a>
            <a
              href={`https://wa.me/${phone}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-[#25D366] text-white hover:bg-[#1da851] transition-colors"
            >
              <MessageCircle className="w-3 h-3" />
              WhatsApp
            </a>
          </>
        )}
        {deal.action === 'Enviar proposta' && (
          <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-[#c9a84c] text-white hover:bg-[#b89a42] transition-colors">
            <FileText className="w-3 h-3" />
            Enviar proposta
          </button>
        )}
        {deal.action === 'Agendar visita' && (
          <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-[#c9a84c] text-white hover:bg-[#b89a42] transition-colors">
            <Calendar className="w-3 h-3" />
            Agendar visita
          </button>
        )}
      </div>
    </div>
  );
}

function ActionableDeals({ prediction, isLoading }) {
  if (isLoading) return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-3 animate-pulse">
      <Skeleton w="w-56" h="h-5" />
      <Skeleton w="w-40" h="h-4" />
      <Skeleton h="h-24" />
      <Skeleton h="h-24" />
    </div>
  );

  const { seAgirHoje, ganhoExtra, dealActions } = prediction;
  if (!dealActions || dealActions.length === 0) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      <div className="mb-4">
        <p className="text-lg font-semibold text-[#1D9E75] tabular-nums">
          Se agir hoje: {fmt.format(Math.round(seAgirHoje))}
        </p>
        <p className="text-sm text-[#1D9E75]/70 tabular-nums">
          +{fmt.format(Math.round(ganhoExtra))} a mais que agora
        </p>
      </div>
      <p className="text-[11px] text-gray-500 uppercase tracking-wider font-medium mb-3">
        {dealActions.length} {dealActions.length === 1 ? 'ação destrava' : 'ações destravam'} esse dinheiro:
      </p>
      <div className="space-y-3">
        {dealActions.map(deal => (
          <DealActionCard key={deal.id} deal={deal} />
        ))}
      </div>
    </div>
  );
}

// --- Bloco 3: Dinheiro em risco ---
function AtRiskAlert({ prediction }) {
  if (!prediction?.atRiskDeals || prediction.atRiskDeals.length === 0) return null;

  return (
    <div className="space-y-2">
      {prediction.atRiskDeals.map(deal => (
        <div key={deal.id} className="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-100 rounded-xl">
          <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700 flex-1">
            <span className="font-semibold tabular-nums">{fmt.format(Math.round(deal.commission))} em risco</span>
            {' — '}{deal.lead_name} sem contato há {deal.daysSinceContact} dias
          </p>
          {deal.lead_phone && (
            <a
              href={`https://wa.me/${cleanPhone(deal.lead_phone)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-medium text-red-600 hover:text-red-800 px-3 py-1.5 rounded-lg hover:bg-red-100 border border-red-200 transition-colors flex-shrink-0 whitespace-nowrap"
            >
              Resolver agora
            </a>
          )}
        </div>
      ))}
    </div>
  );
}

// ============================================================
// T11: LISTA DE AÇÕES PRIORIZADAS POR DINHEIRO
// ============================================================

const CATEGORY_CONFIG = {
  urgente: { dot: '🔴', label: 'URGENTE', dotBg: 'bg-red-500', textColor: 'text-red-700', badgeBg: 'bg-red-50 text-red-600', borderColor: '#E24B4A' },
  hoje:    { dot: '🟡', label: 'HOJE',    dotBg: 'bg-amber-400', textColor: 'text-amber-700', badgeBg: 'bg-amber-50 text-amber-700', borderColor: '#EF9F27' },
  oportunidade: { dot: '🟢', label: 'OPORTUNIDADE', dotBg: 'bg-emerald-500', textColor: 'text-emerald-700', badgeBg: 'bg-emerald-50 text-emerald-700', borderColor: '#1D9E75' },
};

function PriorityActionItem({ action, onNavigate }) {
  const cfg = CATEGORY_CONFIG[action.category] || CATEGORY_CONFIG.oportunidade;
  const phone = cleanPhone(action.lead_phone);

  return (
    <div
      className="bg-white rounded-xl border border-gray-100 p-4 hover:shadow-md transition-all duration-200 group"
      style={{ borderLeftWidth: '4px', borderLeftColor: cfg.borderColor }}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="font-bold text-gray-900 text-sm">
              {action.isOverdueGroup ? action.lead_name : action.lead_name}
            </span>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${cfg.badgeBg}`}>
              {cfg.dot} {cfg.label}
            </span>
          </div>
          {action.property_title && (
            <p className="text-[11px] text-gray-400 truncate">{action.property_title}</p>
          )}
        </div>
      </div>

      {/* Financial info */}
      <div className="flex items-center gap-3 mb-3 flex-wrap">
        {action.commission > 0 && (
          <span className="text-sm font-semibold text-[#1B2B3A] tabular-nums">
            {fmt.format(Math.round(action.commission))} comissão
          </span>
        )}
        {action.probability > 0 && (
          <span className="text-xs text-gray-500 tabular-nums">{action.probability}% prob</span>
        )}
        {action.gainPotential > 0 && (
          <span className="text-xs text-[#1D9E75] font-medium tabular-nums">
            +{fmt.format(Math.round(action.gainPotential))} na previsão
          </span>
        )}
        {action.isOverdueGroup && action.overdueTotal > 0 && (
          <span className="text-sm font-semibold text-amber-700 tabular-nums">
            {fmtCompact(action.overdueTotal)} em pipeline
          </span>
        )}
      </div>

      {/* Action badge */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[11px] text-gray-500 font-medium bg-gray-50 px-2 py-1 rounded-lg">
          {action.action}
        </span>

        {/* CTA buttons */}
        {action.isOverdueGroup && (
          <button
            onClick={() => onNavigate && onNavigate('followups')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-amber-500 text-white hover:bg-amber-600 transition-colors"
          >
            <ChevronRight className="w-3 h-3" />
            Resolver agora
          </button>
        )}
        {!action.isOverdueGroup && phone && (action.action === 'Fechar contrato' || action.action === 'Enviar proposta' || action.action.startsWith('Confirmar')) && (
          <>
            {action.action === 'Fechar contrato' && (
              <a href={`tel:+${phone}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-[#1B2B3A] text-white hover:bg-[#253848] transition-colors">
                <Phone className="w-3 h-3" /> Ligar agora
              </a>
            )}
            <a href={`https://wa.me/${phone}`} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-[#25D366] text-white hover:bg-[#1da851] transition-colors">
              <MessageCircle className="w-3 h-3" />
              {action.action.startsWith('Confirmar') ? 'Confirmar WhatsApp' : 'WhatsApp'}
            </a>
          </>
        )}
        {!action.isOverdueGroup && !phone && action.action === 'Agendar visita' && (
          <button
            onClick={() => onNavigate && onNavigate('agenda')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-[#c9a84c] text-white hover:bg-[#b89a42] transition-colors">
            <Calendar className="w-3 h-3" /> Agendar
          </button>
        )}
        {!action.isOverdueGroup && phone && action.action === 'Fazer follow-up' && (
          <a href={`https://wa.me/${phone}`} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-[#25D366] text-white hover:bg-[#1da851] transition-colors">
            <MessageCircle className="w-3 h-3" /> Agir Agora
          </a>
        )}
        {!action.isOverdueGroup && phone && action.action === 'Agendar visita' && (
          <a href={`https://wa.me/${phone}`} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-[#25D366] text-white hover:bg-[#1da851] transition-colors">
            <MessageCircle className="w-3 h-3" /> Propor visita
          </a>
        )}
      </div>
    </div>
  );
}

function PrioritizedActions({ actions, totalActions, isLoading, onNavigate }) {
  const [expanded, setExpanded] = useState(false);
  const MAX_VISIBLE = 6;

  if (isLoading) return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-3 animate-pulse">
      <Skeleton w="w-56" h="h-5" />
      <Skeleton h="h-20" />
      <Skeleton h="h-20" />
      <Skeleton h="h-20" />
    </div>
  );

  if (!actions || actions.length === 0) return null;

  const visibleActions = expanded ? actions : actions.slice(0, MAX_VISIBLE);
  const hiddenCount = totalActions - MAX_VISIBLE;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            🎯 Ações que destravam dinheiro
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">{totalActions} aç{totalActions === 1 ? 'ão' : 'ões'} ordenada{totalActions === 1 ? '' : 's'} por impacto financeiro</p>
        </div>
        <div className="flex items-center gap-2">
          {actions.some(a => a.category === 'urgente') && (
            <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-red-50 text-red-600 animate-pulse">
              🔴 {actions.filter(a => a.category === 'urgente').length} urgente{actions.filter(a => a.category === 'urgente').length > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Actions list */}
      <div className="p-4 space-y-3">
        {visibleActions.map(action => (
          <PriorityActionItem key={action.id} action={action} onNavigate={onNavigate} />
        ))}
      </div>

      {/* Show more */}
      {!expanded && hiddenCount > 0 && (
        <div className="px-5 pb-4">
          <button
            onClick={() => setExpanded(true)}
            className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-gray-500 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors"
          >
            Ver todas as ações ({totalActions})
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
      {expanded && (
        <div className="px-5 pb-4">
          <button
            onClick={() => setExpanded(false)}
            className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-gray-400 hover:text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors"
          >
            Mostrar menos
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================================
// COMPONENTES EXISTENTES (KPIs, Funil, Gráficos)
// ============================================================

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
          {exceeded ? 'Meta superada!' : `${pct}% atingido`}
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

// ============================================================
// COCKPIT PRINCIPAL
// ============================================================

// ============================================================
// T22: PULSO SEMANAL
// ============================================================

const SB = 'https://hcmpjrqpjohksoznoycq.supabase.co';
const SBK = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhjbXBqcnFwam9oa3Nvem5veWNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5OTk0NjAsImV4cCI6MjA4ODU3NTQ2MH0.XRWi4ZULpICkTucXgGVQCP5wq1RmVwOFWTdMrOEMDnw';
const sbh = { apikey: SBK, Authorization: `Bearer ${SBK}` };

async function createFakeLeads(session) {
  if (!session?.user?.id) return alert('Sessão expirada');
  const userId = session.user.id;
  const leads = [
    { name: 'Ricardo Almeida', phone: '12997441020', email: 'ricardo@email.com', source: 'ZAP Imóveis', stage: 'Novo Lead', temperatura: 'QUENTE', assigned_to: userId },
    { name: 'Patrícia Rocha', phone: '11988223344', email: 'patricia@email.com', source: 'VivaReal', stage: 'Agendamento', temperatura: 'MORNO', assigned_to: userId },
    { name: 'Felipe Mendes', phone: '12991112233', email: 'felipe@email.com', source: 'Instagram', stage: 'Visita', temperatura: 'QUENTE', assigned_to: userId },
    { name: 'Juliana Costa', phone: '11977665544', email: 'juliana@email.com', source: 'Site Próprio', stage: 'Proposta', temperatura: 'QUENTE', assigned_to: userId },
    { name: 'Marcos Oliveira', phone: '13996655443', email: 'marcos@email.com', source: 'OLX', stage: 'Fechado', temperatura: 'QUENTE', assigned_to: userId },
    { name: 'Letícia Souza', phone: '11955443322', email: 'leticia@email.com', source: 'Facebook', stage: 'Novo Lead', temperatura: 'FRIO', assigned_to: userId },
    { name: 'Bruno Santos', phone: '12988776655', email: 'bruno@email.com', source: 'Indicação', stage: 'Agendamento', temperatura: 'MORNO', assigned_to: userId },
    { name: 'Camila Ferreira', phone: '11944332211', email: 'camila@email.com', source: 'ZAP Imóveis', stage: 'Visita', temperatura: 'QUENTE', assigned_to: userId },
    { name: 'Rodrigo Lima', phone: '13988990011', email: 'rodrigo@email.com', source: 'Google Ads', stage: 'Proposta', temperatura: 'MORNO', assigned_to: userId },
    { name: 'Beatriz Gomes', phone: '11911223344', email: 'beatriz@email.com', source: 'VivaReal', stage: 'Novo Lead', temperatura: 'QUENTE', assigned_to: userId },
    { name: 'Thiago Martins', phone: '12977445566', email: 'thiago@email.com', source: 'Instagram', stage: 'Agendamento', temperatura: 'MORNO', assigned_to: userId },
    { name: 'Amanda Rocha', phone: '11988997766', email: 'amanda@email.com', source: 'Site Próprio', stage: 'Visita', temperatura: 'QUENTE', assigned_to: userId },
    { name: 'Gustavo Lima', phone: '13999887766', email: 'gustavo@email.com', source: 'OLX', stage: 'Documentação', temperatura: 'MORNO', assigned_to: userId },
    { name: 'Heloísa Silva', phone: '11944556677', email: 'heloisa@email.com', source: 'Facebook', stage: 'Novo Lead', temperatura: 'FRIO', assigned_to: userId },
    { name: 'Daniel Alves', phone: '12911224455', email: 'daniel@email.com', source: 'Indicação', stage: 'Fechado', temperatura: 'QUENTE', assigned_to: userId },
    { name: 'Isabela Castro', phone: '11922334455', email: 'isabela@email.com', source: 'ZAP Imóveis', stage: 'Agendamento', temperatura: 'MORNO', assigned_to: userId },
    { name: 'Gabriel Machado', phone: '13977889900', email: 'gabriel@email.com', source: 'Google Ads', stage: 'Novo Lead', temperatura: 'QUENTE', assigned_to: userId },
    { name: 'Larissa Nunes', phone: '11933445566', email: 'larissa@email.com', source: 'VivaReal', stage: 'Visita', temperatura: 'QUENTE', assigned_to: userId },
    { name: 'Vinícius Rocha', phone: '12999001122', email: 'vinicius@email.com', source: 'Instagram', stage: 'Proposta', temperatura: 'MORNO', assigned_to: userId },
    { name: 'Fernanda Lima', phone: '11955667788', email: 'fernanda@email.com', source: 'Site Próprio', stage: 'Novo Lead', temperatura: 'FRIO', assigned_to: userId }
  ];

  for (const lead of leads) {
    await fetch(`${SB}/rest/v1/crm_leads`, {
      method: 'POST',
      headers: { ...sbh, 'Content-Type': 'application/json' },
      body: JSON.stringify(lead)
    });
  }
  window.location.reload();
}

function getWeekRange() {
  const now = new Date();
  const dow = now.getDay(); // 0=sun
  // Last monday (in BR week Mon=2nd day, so we shift)
  const lastMonday = new Date(now);
  lastMonday.setDate(now.getDate() - dow - 6);
  lastMonday.setHours(0, 0, 0, 0);
  const lastSunday = new Date(lastMonday);
  lastSunday.setDate(lastMonday.getDate() + 6);
  lastSunday.setHours(23, 59, 59, 999);
  return {
    start: lastMonday.toISOString(),
    end: lastSunday.toISOString(),
    label: `${lastMonday.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} — ${lastSunday.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`,
  };
}

function getWeekKey() {
  const now = new Date();
  const firstJan = new Date(now.getFullYear(), 0, 1);
  const weekNum = Math.ceil(((now - firstJan) / 86400000 + firstJan.getDay() + 1) / 7);
  return `pulse_seen_week_${now.getFullYear()}_${weekNum}`;
}

function shouldShowPulse() {
  // Show every Monday OR if this week's pulse hasn't been seen yet
  const seen = localStorage.getItem(getWeekKey());
  if (seen) return false;
  // Always show if not seen this week (not just Mondays, per spec "ou se não viu")
  return true;
}

function markPulseSeen() {
  localStorage.setItem(getWeekKey(), '1');
}

async function fetchPulseData() {
  const { start, end, label } = getWeekRange();
  const get = (path) => fetch(`${SB}/rest/v1/${path}`, { headers: sbh }).then(r => r.json());

  const [fuSent, visitas, closedDeals, pipelineData, streakData, topLeads, propEnviadas] = await Promise.all([
    get(`follow_ups?status=eq.enviado&sent_at=gte.${start}&sent_at=lte.${end}&select=id`),
    get(`agenda_appointments?appointment_type=eq.visita&status=eq.concluido&completed_at=gte.${start}&completed_at=lte.${end}&select=id`),
    get(`pipeline_deals?status=eq.fechado&closed_at=gte.${start}&closed_at=lte.${end}&select=commission_value`),
    get(`pipeline_deals?status=neq.fechado&status=neq.perdido&select=deal_value`),
    get(`user_streaks?select=current_streak&limit=1`),
    get(`pipeline_deals?status=neq.fechado&status=neq.perdido&select=commission_value,probability&order=probability.desc&limit=3`),
    get(`pipeline_deals?status=eq.proposta&closed_at=gte.${start}&closed_at=lte.${end}&select=id`),
  ]);

  const fuCount = Array.isArray(fuSent) ? fuSent.length : 0;
  const visitasCount = Array.isArray(visitas) ? visitas.length : 0;
  const fechamentos = Array.isArray(closedDeals) ? closedDeals.length : 0;
  const comissao = Array.isArray(closedDeals) ? closedDeals.reduce((s, d) => s + Number(d.commission_value || 0), 0) : 0;
  const pipeline = Array.isArray(pipelineData) ? pipelineData.reduce((s, d) => s + Number(d.deal_value || 0), 0) : 0;
  const streak = Array.isArray(streakData) && streakData[0] ? streakData[0].current_streak || 0 : 0;
  const potencial = Array.isArray(topLeads) ? topLeads.reduce((s, d) => s + Number(d.commission_value || 0), 0) : 0;
  const propostas = Array.isArray(propEnviadas) ? propEnviadas.length : 0;

  return { fuCount, visitasCount, fechamentos, comissao, pipeline, streak, potencial, propostas, label };
}

function useWeeklyPulse(session) {
  const [pulse, setPulse] = useState(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!session) return;
    if (!shouldShowPulse()) return;
    fetchPulseData().then(data => {
      setPulse(data);
      setShow(true);
    }).catch(() => {});
  }, [session]);

  const dismiss = () => {
    markPulseSeen();
    setShow(false);
  };

  return { pulse, show, dismiss };
}

function WeeklyPulse({ pulse, onDismiss, onNavigate }) {
  const zero = pulse.fuCount === 0 && pulse.visitasCount === 0 && pulse.fechamentos === 0;

  return (
    <div className="bg-white rounded-2xl border-2 border-[#C4A265] shadow-lg overflow-hidden animate-scale-in">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-[#1B2B3A] to-[#253848]">
        <div>
          <p className="text-xs font-bold text-[#C4A265] uppercase tracking-widest">📊 Seu pulso da semana</p>
          <p className="text-[11px] text-gray-400 mt-0.5">{pulse.label}</p>
        </div>
        <button onClick={onDismiss} className="p-1.5 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-white/10">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-5 space-y-4">
        {zero ? (
          <div className="text-center py-4">
            <p className="text-2xl mb-2">😤</p>
            <p className="font-bold text-[#1B2B3A]">Semana zerada</p>
            <p className="text-sm text-gray-500 mt-1">Bora mudar isso! Uma ação hoje já faz diferença.</p>
          </div>
        ) : (
          <>
            {/* Metrics */}
            <div className="space-y-2">
              {pulse.fuCount > 0 && (
                <div className="flex items-center gap-3">
                  <span className="text-lg w-8 text-center">📞</span>
                  <span className="text-2xl font-bold text-[#1B2B3A] tabular-nums">{pulse.fuCount}</span>
                  <span className="text-sm text-gray-500">follow-ups enviados</span>
                  {pulse.fuCount >= 20 && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">🏆 Recorde!</span>}
                </div>
              )}
              {pulse.visitasCount > 0 && (
                <div className="flex items-center gap-3">
                  <span className="text-lg w-8 text-center">🏠</span>
                  <span className="text-2xl font-bold text-[#1B2B3A] tabular-nums">{pulse.visitasCount}</span>
                  <span className="text-sm text-gray-500">visitas realizadas</span>
                </div>
              )}
              {pulse.propostas > 0 && (
                <div className="flex items-center gap-3">
                  <span className="text-lg w-8 text-center">📄</span>
                  <span className="text-2xl font-bold text-[#1B2B3A] tabular-nums">{pulse.propostas}</span>
                  <span className="text-sm text-gray-500">{pulse.propostas === 1 ? 'proposta enviada' : 'propostas enviadas'}</span>
                </div>
              )}
              {pulse.fechamentos > 0 && (
                <div className="flex items-center gap-3">
                  <span className="text-lg w-8 text-center">✅</span>
                  <span className="text-2xl font-bold text-[#1B2B3A] tabular-nums">{pulse.fechamentos}</span>
                  <span className="text-sm text-gray-500">{pulse.fechamentos === 1 ? 'fechamento' : 'fechamentos'}</span>
                </div>
              )}
              {pulse.comissao > 0 && (
                <div className="flex items-center gap-3">
                  <span className="text-lg w-8 text-center">💰</span>
                  <span className="text-xl font-bold text-emerald-600 tabular-nums">{fmtCompact(pulse.comissao)}</span>
                  <span className="text-sm text-gray-500">em comissão</span>
                </div>
              )}
            </div>

            {/* Streak + Pipeline pills */}
            <div className="flex gap-2 flex-wrap">
              {pulse.streak > 0 && (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800">
                  🔥 Streak: {pulse.streak} {pulse.streak === 1 ? 'dia' : 'dias'}
                </span>
              )}
              {pulse.pipeline > 0 && (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-800">
                  📈 Pipeline: {fmtCompact(pulse.pipeline)}
                </span>
              )}
            </div>
          </>
        )}

        {/* Potential section */}
        {pulse.potencial > 0 && (
          <>
            <div className="h-px bg-gray-100" />
            <div className="space-y-1">
              <p className="text-xs text-gray-500">Esta semana, seus 3 leads mais quentes valem:</p>
              <p className="text-xl font-bold text-[#C4A265] tabular-nums">{fmtCompact(pulse.potencial)}</p>
              <p className="text-xs text-gray-400">em comissão potencial</p>
            </div>
          </>
        )}

        {/* CTA */}
        <button
          onClick={() => { onDismiss(); onNavigate && onNavigate('crm'); }}
          className="w-full bg-gradient-to-r from-[#C4A265] to-[#D4B87A] hover:from-[#b89355] hover:to-[#c4a460] text-white font-bold py-3 rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2 text-sm"
        >
          🔥 Bora fechar!
        </button>
      </div>
    </div>
  );
}

// ============================================================
// MENSAGEM MOTIVACIONAL
// ============================================================

function getMotivationalMessage(data) {
  const { streak, pendingActions, metaPercent, todayActions, pipeline, hour } = data;
  
  if (hour < 12 && todayActions === 0 && pendingActions > 0) return `Bom dia! ${pendingActions} oportunidades esperando. Bora caçar! 🔥`;
  if (metaPercent >= 85 && metaPercent < 100) return `Falta pouco! Mais um fechamento e você bate a meta! 💪`;
  if (metaPercent >= 100) return `Meta batida! 🏆 Agora é bônus. Quanto mais, melhor.`;
  if (hour >= 14 && todayActions === 0) return `Dia parado = dinheiro perdido. Uma ação muda tudo.`;
  
  if (streak >= 20) return `${streak} dias seguidos! Você é imparável! 🔥🔥🔥`;
  if (streak >= 10) return `${streak} dias de streak! Máquina de vendas! 🔥`;
  if (streak >= 5) return `${streak} dias consecutivos. Não pare agora! 🔥`;
  
  if (todayActions >= 5) return `${todayActions} ações hoje! Dia produtivo! ⚡`;
  
  if (pipeline > 1000000) return `R$ ${(pipeline/1000000).toFixed(1).replace('.', ',')}M no pipeline. Cada ação aproxima o fechamento.`;
  
  if (hour < 12) return `Novo dia, novas vendas. Quem começa cedo, fecha primeiro.`;
  if (hour < 18) return `Tarde é hora de follow-up. Não deixe lead esfriar.`;
  return `Planeje amanhã agora. Corretor preparado fecha mais.`;
}

export default function CockpitDashboard({ session, onNavigate }) {
  const { data, isLoading, error } = useDashboardData(session);
  const { streak, isLoading: streakLoading, refresh: refreshStreak } = useStreak(session);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  // T22: Weekly Pulse
  const { pulse, show: showPulse, dismiss: dismissPulse } = useWeeklyPulse(session);

  const m = data?.metrics;
  const funnel = data?.funnel ?? [];
  const topDeals = data?.topDeals ?? [];
  const nextAppt = data?.nextAppointment ?? null;
  const projection = data?.projection ?? [];
  const prediction = data?.prediction ?? null;
  const prioritizedActions = data?.prioritizedActions ?? [];
  const totalPrioritizedActions = data?.totalPrioritizedActions ?? 0;

  const followColor = m && m.followups_pending > 0 ? '#E24B4A' : '#9ca3af';
  const followBg = m && m.followups_pending > 0 ? 'bg-red-50' : 'bg-gray-50';
  const respColor = !m ? '#9ca3af' : m.avg_response_time_min < 5 ? '#1D9E75' : m.avg_response_time_min <= 30 ? '#EF9F27' : '#E24B4A';

  const todayStr = new Date().toISOString().slice(0, 10);
  const isActionToday = streak?.last_action_date === todayStr;
  
  const motData = {
    streak: streak?.current_streak || 0,
    pendingActions: m?.followups_pending || 0,
    metaPercent: m?.monthly_pct || 0,
    todayActions: isActionToday ? 1 : 0,
    pipeline: m?.pipeline_total || 0,
    hour: new Date().getHours()
  };
  const motivationalMessage = getMotivationalMessage(motData);

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-5">
      {/* Banner */}
      {nextAppt && !bannerDismissed && (
        <AlertBanner appointment={nextAppt} onDismiss={() => setBannerDismissed(true)} />
      )}

      {/* T22: Pulso semanal — topo do dashboard, toda segunda ou se não viu */}
      {showPulse && pulse && (
        <WeeklyPulse pulse={pulse} onDismiss={dismissPulse} onNavigate={onNavigate} />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Cockpit do Corretor</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <button
          onClick={() => createFakeLeads(session)}
          className="px-4 py-2 text-xs font-bold bg-amber-100 text-amber-700 rounded-xl hover:bg-amber-200 transition-colors flex items-center gap-2"
        >
          🚀 Gerar 20 Leads
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          Erro ao carregar dados do pipeline.
        </div>
      )}

      {/* ========== STREAK DIÁRIO ========== */}
      <div className="space-y-4">
        <StreakBanner streak={streak} isLoading={streakLoading} />
        {!streakLoading && (
          <p className="text-[13px] italic text-[#8A8A8A] text-center w-full pb-2">
            {motivationalMessage}
          </p>
        )}
      </div>

      {/* ========== MOTOR DE PREVISÃO ========== */}

      {/* Bloco 1 — Previsão de comissão */}
      <CommissionForecast prediction={prediction} isLoading={isLoading} />

      {/* Bloco 2 — Se agir hoje */}
      <ActionableDeals prediction={prediction} isLoading={isLoading} />

      {/* Bloco 3 — Dinheiro em risco */}
      {!isLoading && <AtRiskAlert prediction={prediction} />}

      {/* ========== T11: AÇÕES PRIORIZADAS ========== */}
      <PrioritizedActions
        actions={prioritizedActions}
        totalActions={totalPrioritizedActions}
        isLoading={isLoading}
        onNavigate={onNavigate}
      />

      {/* ========== SEPARADOR ========== */}
      <div className="flex items-center gap-3 pt-2">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-[10px] text-gray-400 font-medium uppercase tracking-widest">Métricas detalhadas</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      {/* ========== DASHBOARD EXISTENTE ========== */}

      {/* Cards dourados */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <PipelineCard total={m?.pipeline_total ?? 0} changePct={m?.pipeline_change_pct ?? 0} isLoading={isLoading} />
        <CommissionCard commission={m?.commission_potential ?? 0} rate={m?.commission_rate ?? 0.03} monthlyPct={m?.monthly_pct ?? 0} isLoading={isLoading} />
      </div>

      {/* 4 Métricas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        <MetricCard Icon={TrendingUp} iconColor="#378ADD" iconBg="bg-blue-50" label="Fechamentos" labelShort="Fecham." value={m?.closings_predicted ?? 0} sub={`${m?.proposals_accepted ?? 0} com proposta`} isLoading={isLoading} />
        <MetricCard Icon={Home} iconColor="#c9a84c" iconBg="bg-amber-50" label="Visitas" labelShort="Visitas" value={m?.visits_this_week ?? 0} sub="Na Agenda" isLoading={isLoading} />
        <MetricCard Icon={PhoneForwarded} iconColor={followColor} iconBg={followBg} label="Ações pendentes" labelShort="Ações" value={m?.followups_pending ?? 0} sub={m && m.followups_overdue > 0 ? `${m.followups_overdue} atrasados` : 'Em dia ✓'} subColor={m && m.followups_pending > 0 ? 'text-[#E24B4A]' : 'text-gray-400'} isLoading={isLoading} />
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
