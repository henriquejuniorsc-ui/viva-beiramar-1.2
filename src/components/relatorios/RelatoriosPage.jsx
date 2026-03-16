import React from 'react';
import { useRelatorios } from '../../hooks/useRelatorios';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, PieChart, Pie, Cell, Legend,
} from 'recharts';
import {
  Users, TrendingUp, Clock, DollarSign, Download, FileText,
  Loader2, Calendar, BarChart3, ChevronRight, Home,
} from 'lucide-react';

const formatBRL = (v) => {
  if (!v && v !== 0) return 'R$ 0';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v);
};

const formatMinutes = (m) => {
  if (!m || m === 0) return '—';
  if (m < 60) return `${Math.round(m)} min`;
  const h = Math.floor(m / 60);
  const mins = Math.round(m % 60);
  return `${h}h ${mins}min`;
};

const PERIOD_OPTIONS = [
  { value: '7d', label: '7 dias' },
  { value: '30d', label: '30 dias' },
  { value: '90d', label: '90 dias' },
  { value: 'month', label: 'Este mês' },
  { value: 'custom', label: 'Personalizado' },
];

const FUNNEL_COLORS = ['#378ADD', '#85B7EB', '#EF9F27', '#FAC775', '#1D9E75', '#5DCAA5', '#c9a84c', '#c9a84c', '#9CA3AF'];
const SOURCE_COLORS = ['#C4A265', '#1B2B3A', '#378ADD', '#1D9E75', '#EF9F27', '#9CA3AF', '#8B5CF6', '#EC4899'];

function KPICard({ label, value, subtitle, icon: Icon, color }) {
  return (
    <div className="bg-white rounded-xl border border-[#E8E2D8] p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-[#8A8A8A] font-medium uppercase tracking-wider">{label}</p>
          <p className="text-2xl font-bold text-[#1B2B3A] mt-1 font-serif">{value}</p>
          {subtitle && <p className="text-xs text-[#8A8A8A] mt-0.5">{subtitle}</p>}
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl border border-[#E8E2D8] p-5 animate-pulse">
      <div className="h-3 w-20 bg-gray-200 rounded mb-3" />
      <div className="h-7 w-24 bg-gray-200 rounded" />
    </div>
  );
}

const CustomTooltipStyle = {
  borderRadius: '8px',
  border: 'none',
  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
  fontSize: '12px',
};

export default function RelatoriosPage({ session }) {
  const {
    isLoading, period, setPeriod, customRange, setCustomRange,
    kpis, funnel, leadsOverTime, sourceData, topProperties,
    filteredLeads, exportCSV,
  } = useRelatorios(session);

  return (
    <div className="space-y-6 fade-in pb-8">
      {/* Period selector */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 bg-white rounded-xl border border-[#E8E2D8] p-1">
          {PERIOD_OPTIONS.map(opt => (
            <button key={opt.value} onClick={() => setPeriod(opt.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                period === opt.value ? 'bg-[#1B2B3A] text-white' : 'text-[#8A8A8A] hover:text-[#1B2B3A]'
              }`}>
              {opt.label}
            </button>
          ))}
        </div>
        {period === 'custom' && (
          <div className="flex items-center gap-2">
            <input type="date" value={customRange.from}
              onChange={e => setCustomRange(r => ({ ...r, from: e.target.value }))}
              className="px-3 py-1.5 rounded-lg border border-[#E8E2D8] text-xs" />
            <span className="text-xs text-[#8A8A8A]">até</span>
            <input type="date" value={customRange.to}
              onChange={e => setCustomRange(r => ({ ...r, to: e.target.value }))}
              className="px-3 py-1.5 rounded-lg border border-[#E8E2D8] text-xs" />
          </div>
        )}
        <div className="flex-1" />
        <button onClick={exportCSV}
          className="px-3 py-1.5 border border-[#E8E2D8] rounded-lg text-xs text-[#1B2B3A] hover:bg-gray-50 flex items-center gap-1.5">
          <Download className="w-3.5 h-3.5" />Exportar CSV
        </button>
      </div>

      {/* KPIs */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KPICard label="Oportunidades recebidas" value={kpis.leadsRecebidos}
            icon={Users} color="bg-blue-50 text-blue-600" />
          <KPICard label="Taxa de fechamento" value={`${kpis.taxaConversao.toFixed(1)}%`}
            subtitle={`${filteredLeads.filter(l => l.stage === 'Fechado').length} fechados`}
            icon={TrendingUp} color="bg-green-50 text-green-600" />
          <KPICard label="Velocidade de resposta" value={formatMinutes(kpis.tempoMedioMin)}
            icon={Clock} color="bg-amber-50 text-amber-600" />
          <KPICard label="Valor médio por venda" value={formatBRL(kpis.ticketMedio)}
            icon={DollarSign} color="bg-[#C4A265]/10 text-[#C4A265]" />
        </div>
      )}

      {/* Row: Funnel + Line chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Funnel */}
        <div className="bg-white rounded-xl border border-[#E8E2D8] p-5">
          <h3 className="text-sm font-bold text-[#1B2B3A] font-serif mb-4">Funil de Conversão</h3>
          {isLoading ? (
            <div className="h-64 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-[#C4A265]" /></div>
          ) : (
            <div className="space-y-2">
              {funnel.map((s, i) => {
                const maxCount = Math.max(...funnel.map(f => f.count), 1);
                const width = Math.max((s.count / maxCount) * 100, 4);
                return (
                  <div key={s.stage} className="flex items-center gap-3">
                    <span className="text-xs text-[#1B2B3A] w-28 text-right truncate font-medium">{s.stage}</span>
                    <div className="flex-1 relative">
                      <div className="h-6 bg-gray-50 rounded-md overflow-hidden">
                        <div className="h-full rounded-md transition-all flex items-center px-2"
                          style={{ width: `${width}%`, backgroundColor: FUNNEL_COLORS[i] || '#9CA3AF' }}>
                          <span className="text-[10px] text-white font-bold">{s.count}</span>
                        </div>
                      </div>
                    </div>
                    {i > 0 && i < funnel.length - 1 && (
                      <span className="text-[10px] text-[#8A8A8A] w-10 text-right">{s.convRate}%</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Line chart - Leads over time */}
        <div className="bg-white rounded-xl border border-[#E8E2D8] p-5">
          <h3 className="text-sm font-bold text-[#1B2B3A] font-serif mb-4">Leads por Período</h3>
          {isLoading ? (
            <div className="h-64 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-[#C4A265]" /></div>
          ) : leadsOverTime.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-sm text-[#8A8A8A]">Sem dados para o período</div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={leadsOverTime} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E8E2D8" />
                  <XAxis dataKey="label" fontSize={10} tick={{ fill: '#8A8A8A' }} axisLine={false} tickLine={false} />
                  <YAxis fontSize={10} tick={{ fill: '#8A8A8A' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={CustomTooltipStyle} />
                  <Line type="monotone" dataKey="recebidos" name="Recebidos" stroke="#378ADD" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="fechados" name="Fechados" stroke="#1D9E75" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Row: Source doughnut + Top properties */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Source distribution */}
        <div className="bg-white rounded-xl border border-[#E8E2D8] p-5">
          <h3 className="text-sm font-bold text-[#1B2B3A] font-serif mb-4">Origem dos Leads</h3>
          {isLoading ? (
            <div className="h-64 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-[#C4A265]" /></div>
          ) : sourceData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-sm text-[#8A8A8A]">Sem dados</div>
          ) : (
            <div className="flex items-center gap-4">
              <div className="w-48 h-48 flex-shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={sourceData} cx="50%" cy="50%" innerRadius={45} outerRadius={75}
                      paddingAngle={3} dataKey="value" nameKey="name">
                      {sourceData.map((_, i) => (
                        <Cell key={i} fill={SOURCE_COLORS[i % SOURCE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={CustomTooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-2">
                {sourceData.map((s, i) => (
                  <div key={s.name} className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: SOURCE_COLORS[i % SOURCE_COLORS.length] }} />
                    <span className="text-xs text-[#1B2B3A] flex-1 truncate">{s.name}</span>
                    <span className="text-xs font-bold text-[#1B2B3A]">{s.value}</span>
                    <span className="text-[10px] text-[#8A8A8A] w-8 text-right">{s.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Top properties */}
        <div className="bg-white rounded-xl border border-[#E8E2D8] p-5">
          <h3 className="text-sm font-bold text-[#1B2B3A] font-serif mb-4">Imóveis Mais Procurados</h3>
          {isLoading ? (
            <div className="h-64 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-[#C4A265]" /></div>
          ) : topProperties.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-sm text-[#8A8A8A]">Nenhum imóvel vinculado a leads</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#E8E2D8]">
                    <th className="text-left py-2 text-xs font-medium text-[#8A8A8A]">Imóvel</th>
                    <th className="text-center py-2 text-xs font-medium text-[#8A8A8A] w-16">Leads</th>
                    <th className="text-center py-2 text-xs font-medium text-[#8A8A8A] w-16">Visitas</th>
                    <th className="text-center py-2 text-xs font-medium text-[#8A8A8A] w-20">Propostas</th>
                  </tr>
                </thead>
                <tbody>
                  {topProperties.map((p, i) => (
                    <tr key={p.id} className="border-b border-[#E8E2D8]/50 last:border-0">
                      <td className="py-2.5">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded bg-[#C4A265]/10 text-[#C4A265] text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                            {i + 1}
                          </span>
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-[#1B2B3A] truncate">{p.title}</p>
                            {p.neighborhood && <p className="text-[10px] text-[#8A8A8A]">{p.neighborhood}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="text-center py-2.5 text-xs font-bold text-[#1B2B3A]">{p.total}</td>
                      <td className="text-center py-2.5 text-xs text-[#5A5A5A]">{p.visitas}</td>
                      <td className="text-center py-2.5 text-xs text-[#5A5A5A]">{p.propostas}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
