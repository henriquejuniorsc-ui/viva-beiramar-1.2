import { useState } from 'react';
import { Wallet, ChevronLeft, ChevronRight, Download, Check, TrendingUp, Clock, BarChart2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useComissoes } from '../../hooks/useComissoes';

const fmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const fmtCompact = (v) => {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1).replace('.', ',')}M`;
  if (v >= 1_000) return `R$ ${(v / 1_000).toFixed(0)}k`;
  return fmt.format(v);
};
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Sao_Paulo' }) : '—';

// --- Skeleton ---
const Sk = ({ w = 'w-full', h = 'h-4' }) => <div className={`${w} ${h} bg-gray-200 rounded animate-pulse`} />;

// --- Calculadora ---
const SPLITS = [
  { label: '100% meu', value: 1 },
  { label: '70/30', value: 0.7 },
  { label: '60/40', value: 0.6 },
  { label: '50/50', value: 0.5 },
];

function Calculadora() {
  const [valor, setValor] = useState('1200000');
  const [pct, setPct] = useState('3');
  const [split, setSplit] = useState(1);

  const valorNum = Number(valor.replace(/\D/g, '')) || 0;
  const pctNum = Number(pct) || 0;
  const total = valorNum * (pctNum / 100);
  const minha = total * split;

  return (
    <div className="bg-amber-50 border border-amber-100 rounded-xl p-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
        <BarChart2 className="w-4 h-4 text-[#c9a84c]" /> Calculadora rápida de comissão
      </h3>
      <div className="flex flex-wrap gap-3 items-end mb-4">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Valor do imóvel</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">R$</span>
            <input type="text" value={Number(valor.replace(/\D/g,'')||0).toLocaleString('pt-BR')}
              onChange={e => setValor(e.target.value.replace(/\D/g,''))}
              className="pl-8 pr-3 py-2 border border-amber-200 rounded-lg text-sm font-medium w-40 outline-none focus:border-[#c9a84c] bg-white" />
          </div>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Comissão (%)</label>
          <div className="relative">
            <input type="number" step="0.5" min="0" max="10" value={pct} onChange={e => setPct(e.target.value)}
              className="pr-6 pl-3 py-2 border border-amber-200 rounded-lg text-sm font-medium w-24 outline-none focus:border-[#c9a84c] bg-white" />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">%</span>
          </div>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Split</label>
          <select value={split} onChange={e => setSplit(Number(e.target.value))}
            className="border border-amber-200 rounded-lg px-3 py-2 text-sm bg-white outline-none focus:border-[#c9a84c]">
            {SPLITS.map(s => <option key={s.label} value={s.value}>{s.label}</option>)}
          </select>
        </div>
      </div>
      <div className="flex items-center gap-6 flex-wrap">
        <div>
          <p className="text-xs text-gray-500">Comissão total</p>
          <p className="text-xl font-medium text-gray-900 tabular-nums">{fmt.format(total)}</p>
        </div>
        <div className="text-2xl text-gray-300">→</div>
        <div>
          <p className="text-xs text-gray-500">Sua parte</p>
          <p className="text-xl font-semibold text-[#1D9E75] tabular-nums">{fmt.format(minha)}</p>
        </div>
      </div>
    </div>
  );
}

// --- Tooltip do gráfico ---
const ChartTooltip = ({ active, payload, label }) => {
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

// --- Deal Row ---
function DealRow({ deal, onMarkRecebido }) {
  const statusConfig = {
    recebido: { icon: '✅', label: 'RECEBIDO', cls: 'bg-emerald-50 text-emerald-700' },
    pendente: { icon: '⏳', label: 'PENDENTE', cls: 'bg-amber-50 text-amber-700' },
    parcial: { icon: '🔄', label: 'PARCIAL', cls: 'bg-blue-50 text-blue-700' },
  };
  const s = statusConfig[deal.payment_status] || statusConfig.pendente;
  const isFechado = deal.status === 'fechado';
  const isPrevisto = ['proposta', 'contrato'].includes(deal.status);
  const refDate = deal.closed_at || deal.expected_close_date;

  return (
    <div className={`bg-white rounded-xl border p-4 hover:shadow-sm transition-shadow ${deal.payment_status === 'recebido' ? 'border-emerald-100' : isPrevisto ? 'border-gray-100' : 'border-amber-100'}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <span className="text-xl mt-0.5">{isFechado ? (deal.payment_status === 'recebido' ? '✅' : '⏳') : '📋'}</span>
          <div className="min-w-0">
            <p className="font-medium text-gray-900 text-sm">{deal.lead_name}</p>
            <p className="text-xs text-gray-500 truncate">{deal.property_title}{deal.property_neighborhood && ` — ${deal.property_neighborhood}`}</p>
            <p className="text-xs text-gray-400 mt-0.5">{isFechado ? 'Fechado' : 'Previsto'}: {fmtDate(refDate)}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 flex-wrap justify-end">
          <div className="text-right">
            <p className="text-xs text-gray-400">Imóvel</p>
            <p className="text-sm font-medium text-gray-700 tabular-nums">{fmtCompact(deal.deal_value || 0)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400">Comissão</p>
            <p className={`text-sm font-semibold tabular-nums ${deal.payment_status === 'recebido' ? 'text-[#1D9E75]' : isPrevisto ? 'text-gray-500' : 'text-amber-600'}`}>
              {fmt.format(deal.commission_value || 0)}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${s.cls}`}>{s.label}</span>
            {isFechado && deal.payment_status !== 'recebido' && (
              <button onClick={() => onMarkRecebido(deal.id)}
                className="flex items-center gap-1 text-[10px] font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-1 rounded-lg transition-colors whitespace-nowrap">
                <Check className="w-3 h-3" /> Marcar recebido
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Exportar CSV ---
function exportCSV(deals, monthLabel) {
  const rows = [['Data', 'Lead', 'Imóvel', 'Bairro', 'Valor', 'Comissão', 'Status Pagamento']];
  deals.forEach(d => {
    rows.push([
      fmtDate(d.closed_at || d.expected_close_date),
      d.lead_name || '',
      d.property_title || '',
      d.property_neighborhood || '',
      (d.deal_value || 0).toString(),
      (d.commission_value || 0).toString(),
      d.payment_status || 'pendente',
    ]);
  });
  const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url;
  a.download = `comissoes_${monthLabel.replace(' ', '_')}.csv`;
  a.click(); URL.revokeObjectURL(url);
}

// --- PÁGINA PRINCIPAL ---
export default function ComissoesPage({ session }) {
  const {
    currentMonth, deals, dealsDoMes, histChart, isLoading,
    metrics, annual, prevMonth, nextMonth, markRecebido, monthLabel,
  } = useComissoes(session);

  const [toast, setToast] = useState(null);
  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const handleMarkRecebido = async (id) => {
    await markRecebido(id);
    showToast('✅ Comissão marcada como recebida!');
  };

  // Separar deals do mês por status
  const fechados = dealsDoMes.filter(d => d.status === 'fechado');
  const previstos = dealsDoMes.filter(d => ['proposta', 'contrato'].includes(d.status));

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-5">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Seus Ganhos 💰</h1>
          <p className="text-sm text-gray-400 mt-0.5">Cada fechamento conta. Aqui está seu resultado.</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Navegação de mês */}
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2">
            <button onClick={prevMonth} className="text-gray-400 hover:text-gray-700 transition-colors"><ChevronLeft className="w-4 h-4" /></button>
            <span className="text-sm font-medium text-gray-900 min-w-[120px] text-center">{monthLabel}</span>
            <button onClick={nextMonth} className="text-gray-400 hover:text-gray-700 transition-colors"><ChevronRight className="w-4 h-4" /></button>
          </div>
          <button onClick={() => exportCSV(dealsDoMes, monthLabel)}
            className="flex items-center gap-2 px-3 py-2 border border-gray-200 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">
            <Download className="w-4 h-4" /> Exportar
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? Array.from({length:4}).map((_,i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 animate-pulse space-y-2"><Sk w="w-24"/><Sk w="w-16" h="h-7"/><Sk w="w-20"/></div>
        )) : [
          { label: 'No Bolso 💰', value: fmtCompact(metrics.recebidoTotal), sub: `${fechados.filter(d => d.payment_status === 'recebido').length} deal${fechados.filter(d=>d.payment_status==='recebido').length!==1?'s':''}`, color: 'text-[#1D9E75]', border: 'border-emerald-100' },
          { label: 'Entrando', value: fmtCompact(metrics.aReceberTotal), sub: `${deals.filter(d=>d.status==='fechado'&&d.payment_status!=='recebido').length} deal${deals.filter(d=>d.status==='fechado'&&d.payment_status!=='recebido').length!==1?'s':''}`, color: 'text-amber-600', border: 'border-amber-100' },
          { label: 'Previsão', value: fmtCompact(metrics.previstoTotal), sub: `${deals.filter(d=>['proposta','contrato'].includes(d.status)).length} deals`, color: 'text-gray-700', border: 'border-gray-100' },
          { label: 'Meta do mês', value: `${metrics.metaPct}%`, sub: `de ${fmtCompact(metrics.monthlyGoal)}`, color: metrics.metaPct >= 100 ? 'text-[#1D9E75]' : metrics.metaPct >= 50 ? 'text-amber-600' : 'text-gray-700', border: metrics.metaPct >= 100 ? 'border-emerald-100' : 'border-gray-100' },
        ].map((k, i) => (
          <div key={i} className={`bg-white rounded-xl border ${k.border} p-4 shadow-sm`}>
            <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">{k.label}</p>
            <p className={`text-2xl font-medium mt-1 tabular-nums ${k.color}`}>{k.value}</p>
            <p className="text-xs text-gray-400 mt-1">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Calculadora */}
      <Calculadora />

      {/* Gráfico */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-medium text-gray-900">Comissão mensal — últimos 6 meses</h3>
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-[#1D9E75]"/><span>Recebido</span></div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-[#EF9F27]"/><span>Pendente</span></div>
          </div>
        </div>
        {isLoading ? <div className="h-48 bg-gray-100 rounded-lg animate-pulse" /> : (
          <div style={{ height: '200px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={histChart} barCategoryGap="35%" barGap={3}>
                <CartesianGrid vertical={false} stroke="rgba(0,0,0,0.05)" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9ca3af' }} tickFormatter={v => v >= 1000 ? `R$${(v/1000).toFixed(0)}k` : `R$${v}`} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
                <Bar dataKey="recebido" name="Recebido" fill="#1D9E75" radius={[4,4,0,0]} />
                <Bar dataKey="pendente" name="Pendente" fill="#EF9F27" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Deals do mês */}
      <div className="space-y-4">
        {isLoading ? (
          Array.from({length:3}).map((_,i) => <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 animate-pulse h-20" />)
        ) : (
          <>
            {fechados.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-px flex-1 bg-emerald-200" />
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Deals fechados ({fechados.length})</span>
                  <div className="h-px flex-1 bg-emerald-200" />
                </div>
                <div className="space-y-3">
                  {fechados.map(d => <DealRow key={d.id} deal={d} onMarkRecebido={handleMarkRecebido} />)}
                </div>
              </div>
            )}
            {previstos.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-px flex-1 bg-gray-200" />
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Previstos ({previstos.length})</span>
                  <div className="h-px flex-1 bg-gray-200" />
                </div>
                <div className="space-y-3">
                  {previstos.map(d => <DealRow key={d.id} deal={d} onMarkRecebido={handleMarkRecebido} />)}
                </div>
              </div>
            )}
            {fechados.length === 0 && previstos.length === 0 && (
              <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
                <div className="text-4xl mb-3">💼</div>
                <p className="text-gray-500 font-medium">Nenhum deal neste mês</p>
                <p className="text-sm text-gray-400 mt-1">Navegue pelos meses ou adicione deals no Pipeline</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Resumo anual */}
      <div className="bg-[#1B2B3A] rounded-xl p-5 text-white">
        <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider mb-4">Resumo anual {annual.year}</h3>
        {isLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{Array.from({length:4}).map((_,i) => <div key={i} className="animate-pulse space-y-1"><Sk h="h-3" /><Sk w="w-24" h="h-6" /></div>)}</div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { label: 'Total recebido', value: fmtCompact(annual.yearTotal) },
              { label: 'Deals fechados', value: annual.dealsCount },
              { label: 'Ticket médio', value: fmtCompact(annual.avgTicket) },
              { label: 'Comissão média', value: fmtCompact(annual.avgComm) },
            ].map((k, i) => (
              <div key={i}>
                <p className="text-xs text-white/50 uppercase tracking-wider">{k.label}</p>
                <p className="text-xl font-medium text-[#c9a84c] tabular-nums mt-1">{k.value}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
