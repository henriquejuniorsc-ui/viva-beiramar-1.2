import React, { useState, useMemo } from 'react';
import { generateZapXML, downloadXML } from './PortalXMLGenerator';
import {
  Globe, Settings, RefreshCw, Check, X, AlertTriangle, Loader2,
  Search, Download, Upload, ChevronDown, Eye, ExternalLink, Copy,
  Clock, CheckCircle2, XCircle, Filter, Home, MapPin,
} from 'lucide-react';

const PORTAL_COLORS = {
  zap: '#0077B6', vivareal: '#00A651', olx: '#6E0AD6', imovelweb: '#FF6B00',
  chavesnamao: '#E91E63', creci: '#795548',
};
const PORTAL_LABELS = { zap: 'ZAP', vivareal: 'Viva', olx: 'OLX', imovelweb: 'Imov', chavesnamao: 'Chaves', creci: 'CRECI' };

const FEED_URL = typeof window !== 'undefined'
  ? `${window.location.origin}/api/feed/vrsync`
  : '/api/feed/vrsync';

// Validate property for portal publishing
function validateForPortal(property) {
  const errors = [];
  if (!property.title || property.title.length < 5) errors.push('Título curto ou ausente');
  if (!property.type) errors.push('Tipo não definido');
  if (!property.price || Number(property.price) <= 0) errors.push('Preço ausente');
  if (!property.description && !property.portal_description) errors.push('Sem descrição');
  if (!property.images || property.images.length === 0) errors.push('Sem fotos');
  if (!property.neighborhood) errors.push('Sem bairro');
  return errors;
}

function timeAgo(date) {
  if (!date) return '—';
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `há ${mins}min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `há ${hrs}h`;
  return `há ${Math.floor(hrs / 24)}d`;
}

// --- Portal Card ---
function PortalCard({ config, publishedCount, onConfigure, onSync }) {
  const [copied, setCopied] = useState(false);
  const copyUrl = () => {
    navigator.clipboard.writeText(FEED_URL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="bg-white rounded-xl border border-[#E8E2D8] p-4 flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm"
          style={{ backgroundColor: PORTAL_COLORS[config.portal_name] || '#666' }}>
          {(config.display_name || '')[0]}
        </div>
        <div className="flex-1">
          <h3 className="font-medium text-[#1B2B3A] text-sm">{config.display_name}</h3>
          <div className="flex items-center gap-1.5">
            {config.is_active ? (
              <span className="flex items-center gap-1 text-xs text-green-600"><CheckCircle2 className="w-3 h-3" />Ativo</span>
            ) : (
              <span className="flex items-center gap-1 text-xs text-[#8A8A8A]"><XCircle className="w-3 h-3" />Inativo</span>
            )}
          </div>
        </div>
      </div>
      <div className="text-xs text-[#8A8A8A] space-y-1">
        <p>{publishedCount} imóveis publicados</p>
        {config.last_sync_at && <p className="flex items-center gap-1"><Clock className="w-3 h-3" />Última leitura: {timeAgo(config.last_sync_at)}</p>}
        {config.last_sync_status === 'error' && <p className="text-red-500 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />Erro na última sync</p>}
      </div>
      {/* Feed URL */}
      <div className="bg-gray-50 rounded-lg p-2">
        <p className="text-[10px] text-[#8A8A8A] mb-1">URL do XML Feed:</p>
        <div className="flex gap-1">
          <input type="text" readOnly value={FEED_URL} className="flex-1 text-[10px] bg-white px-2 py-1 rounded border border-[#E8E2D8] truncate" />
          <button onClick={copyUrl}
            className={`px-2 py-1 rounded text-[10px] transition-colors ${copied ? 'bg-green-100 text-green-700' : 'bg-white border border-[#E8E2D8] hover:bg-gray-100'}`}>
            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          </button>
        </div>
      </div>
      <div className="flex gap-2 mt-auto">
        <a href={FEED_URL} target="_blank" rel="noopener noreferrer"
          className="flex-1 px-3 py-2 bg-gray-50 text-[#1B2B3A] rounded-lg text-xs font-medium hover:bg-gray-100 flex items-center justify-center gap-1">
          <Eye className="w-3 h-3" />Ver XML
        </a>
        <button onClick={() => onConfigure(config)}
          className="flex-1 px-3 py-2 bg-gray-50 text-[#1B2B3A] rounded-lg text-xs font-medium hover:bg-gray-100 flex items-center justify-center gap-1">
          <Settings className="w-3 h-3" />Configurar
        </button>
      </div>
    </div>
  );
}

// --- Portal Config Modal ---
function PortalConfigModal({ config, onClose, onSave }) {
  const [form, setForm] = useState({
    is_active: config.is_active || false,
    integration_type: config.integration_type || 'xml_feed',
    auto_sync: config.auto_sync || false,
    sync_interval_hours: config.sync_interval_hours || 6,
    config: config.config || {},
  });
  const [isSaving, setIsSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setConfig = (k, v) => setForm(f => ({ ...f, config: { ...f.config, [k]: v } }));

  const handleSave = async () => {
    setIsSaving(true);
    await onSave(config.portal_name, form);
    setIsSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-md w-full shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-[#E8E2D8] flex items-center justify-between">
          <h3 className="font-bold text-[#1B2B3A]">Configurar {config.display_name}</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <div className={`w-10 h-6 rounded-full relative transition-colors ${form.is_active ? 'bg-green-500' : 'bg-gray-300'}`}
              onClick={() => set('is_active', !form.is_active)}>
              <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all shadow ${form.is_active ? 'left-[18px]' : 'left-0.5'}`} />
            </div>
            <span className="text-sm font-medium text-[#1B2B3A]">{form.is_active ? 'Ativo' : 'Inativo'}</span>
          </label>

          <div>
            <label className="text-xs text-[#8A8A8A] mb-1 block">Tipo de integração</label>
            <select value={form.integration_type} onChange={e => set('integration_type', e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-[#E8E2D8] text-sm">
              <option value="xml_feed">XML Feed (URL pública)</option>
              <option value="ftp">FTP Upload</option>
              <option value="api">API direta</option>
            </select>
          </div>

          {form.integration_type === 'xml_feed' && (
            <div className="bg-gray-50 rounded-lg p-3">
              <label className="text-xs text-[#8A8A8A] mb-1 block">URL do feed</label>
              <div className="flex gap-2">
                <input type="text" readOnly value={`https://vivabeiramar.com.br/feed/${config.portal_name}.xml`}
                  className="flex-1 px-3 py-2 rounded-lg border border-[#E8E2D8] text-xs bg-white" />
                <button onClick={() => navigator.clipboard.writeText(`https://vivabeiramar.com.br/feed/${config.portal_name}.xml`)}
                  className="px-3 py-2 border border-[#E8E2D8] rounded-lg hover:bg-white"><Copy className="w-3 h-3" /></button>
              </div>
              <p className="text-[10px] text-[#8A8A8A] mt-1">Cadastre esta URL no painel do portal</p>
            </div>
          )}

          {form.integration_type === 'ftp' && (
            <div className="space-y-3">
              <div>
                <label className="text-xs text-[#8A8A8A] mb-1 block">Host</label>
                <input type="text" value={form.config.ftp_host || ''} onChange={e => setConfig('ftp_host', e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-[#E8E2D8] text-sm" placeholder="ftp.portal.com.br" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[#8A8A8A] mb-1 block">Usuário</label>
                  <input type="text" value={form.config.ftp_user || ''} onChange={e => setConfig('ftp_user', e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-[#E8E2D8] text-sm" />
                </div>
                <div>
                  <label className="text-xs text-[#8A8A8A] mb-1 block">Senha</label>
                  <input type="password" value={form.config.ftp_pass || ''} onChange={e => setConfig('ftp_pass', e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-[#E8E2D8] text-sm" />
                </div>
              </div>
              <div>
                <label className="text-xs text-[#8A8A8A] mb-1 block">Pasta</label>
                <input type="text" value={form.config.ftp_path || '/xml/'} onChange={e => setConfig('ftp_path', e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-[#E8E2D8] text-sm" />
              </div>
            </div>
          )}

          {form.integration_type === 'api' && (
            <div className="space-y-3">
              <div>
                <label className="text-xs text-[#8A8A8A] mb-1 block">API Key</label>
                <input type="text" value={form.config.api_key || ''} onChange={e => setConfig('api_key', e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-[#E8E2D8] text-sm" />
              </div>
              <div>
                <label className="text-xs text-[#8A8A8A] mb-1 block">Client ID</label>
                <input type="text" value={form.config.client_id || ''} onChange={e => setConfig('client_id', e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-[#E8E2D8] text-sm" />
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={form.auto_sync} onChange={e => set('auto_sync', e.target.checked)}
                className="w-4 h-4 rounded border-[#E8E2D8] text-[#C4A265] focus:ring-[#C4A265]" />
              Sync automático
            </label>
            {form.auto_sync && (
              <select value={form.sync_interval_hours} onChange={e => set('sync_interval_hours', Number(e.target.value))}
                className="px-2 py-1 border border-[#E8E2D8] rounded text-xs">
                <option value={1}>a cada 1h</option>
                <option value={3}>a cada 3h</option>
                <option value={6}>a cada 6h</option>
                <option value={12}>a cada 12h</option>
                <option value={24}>a cada 24h</option>
              </select>
            )}
          </div>
        </div>
        <div className="px-6 py-4 border-t border-[#E8E2D8] flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-[#8A8A8A] hover:bg-gray-50 rounded-lg">Cancelar</button>
          <button onClick={handleSave} disabled={isSaving}
            className="px-4 py-2 bg-[#C4A265] text-white rounded-lg text-sm font-medium hover:bg-[#b89355] disabled:opacity-50 flex items-center gap-1">
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}Salvar
          </button>
        </div>
      </div>
    </div>
  );
}

// --- XML Preview Modal ---
function XMLPreviewModal({ properties, onClose }) {
  const xml = useMemo(() => {
    const sample = properties.slice(0, 3);
    return generateZapXML(sample);
  }, [properties]);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] flex flex-col shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-[#E8E2D8] flex items-center justify-between">
          <h3 className="font-bold text-[#1B2B3A]">Preview XML (ZAP/VivaReal)</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <div className="flex-1 overflow-auto p-4">
          <pre className="text-xs bg-gray-50 p-4 rounded-lg overflow-x-auto whitespace-pre-wrap font-mono text-[#1B2B3A]">{xml}</pre>
        </div>
        <div className="px-6 py-4 border-t border-[#E8E2D8] flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-[#8A8A8A] hover:bg-gray-50 rounded-lg">Fechar</button>
          <button onClick={() => downloadXML(generateZapXML(properties), 'zap-vivareal-feed.xml')}
            className="px-4 py-2 bg-[#C4A265] text-white rounded-lg text-sm font-medium hover:bg-[#b89355] flex items-center gap-1">
            <Download className="w-4 h-4" />Download XML Completo ({properties.length} imóveis)
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Main PortalsTab ---
export default function PortalsTab({ session, portalHook, properties, reload }) {
  const {
    portalConfigs, syncLogs, isLoading,
    updatePortalConfig, togglePropertyPortal, bulkPublish,
    addSyncLog, getPortalStatusForProperty, getPublishedCount,
  } = portalHook;

  const [configModal, setConfigModal] = useState(null);
  const [xmlPreview, setXmlPreview] = useState(false);
  const [search, setSearch] = useState('');
  const [portalFilter, setPortalFilter] = useState('');
  const [publishFilter, setPublishFilter] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [syncing, setSyncing] = useState(null);
  const [bulkPortal, setBulkPortal] = useState(null);
  const [validationWarning, setValidationWarning] = useState(null);

  // Wrap toggle with validation
  const handleTogglePublish = (propId, portalName, publish) => {
    if (publish) {
      const prop = properties.find(p => p.id === propId);
      if (prop) {
        const errors = validateForPortal(prop);
        if (errors.length > 0) {
          setValidationWarning({ title: prop.title, errors });
          return;
        }
      }
    }
    togglePropertyPortal(propId, portalName, publish);
  };

  const portalNames = portalConfigs.map(c => c.portal_name);

  const filteredProperties = useMemo(() => {
    let list = [...properties];
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(p => (p.title || '').toLowerCase().includes(s));
    }
    if (publishFilter === 'published') {
      list = list.filter(p => {
        const status = getPortalStatusForProperty(p.id);
        return Object.values(status).some(pp => pp?.is_published);
      });
    } else if (publishFilter === 'unpublished') {
      list = list.filter(p => {
        const status = getPortalStatusForProperty(p.id);
        return !Object.values(status).some(pp => pp?.is_published);
      });
    }
    if (portalFilter) {
      list = list.filter(p => {
        const status = getPortalStatusForProperty(p.id);
        return status[portalFilter]?.is_published;
      });
    }
    return list;
  }, [properties, search, publishFilter, portalFilter, getPortalStatusForProperty]);

  const handleSync = async (portalName) => {
    setSyncing(portalName);
    const published = properties.filter(p => {
      const status = getPortalStatusForProperty(p.id);
      return status[portalName]?.is_published;
    });
    await addSyncLog(portalName, 'manual', 'success', published.length);
    setSyncing(null);
  };

  const handleSaveConfig = async (portalName, data) => {
    await updatePortalConfig(portalName, data);
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const selectAll = () => {
    if (selectedIds.length === filteredProperties.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredProperties.map(p => p.id));
    }
  };

  const handleBulkAction = async (action) => {
    if (!bulkPortal || selectedIds.length === 0) return;
    await bulkPublish(selectedIds, [bulkPortal], action === 'publish');
    await addSyncLog(bulkPortal, 'manual', 'success', selectedIds.length);
    setSelectedIds([]);
    setBulkPortal(null);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-32"><Loader2 className="w-6 h-6 animate-spin text-[#C4A265]" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Portal Cards */}
      <div>
        <h3 className="text-sm font-medium text-[#1B2B3A] mb-3">Portais Conectados</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {portalConfigs.map(config => (
            <PortalCard key={config.portal_name} config={config}
              publishedCount={getPublishedCount(config.portal_name)}
              onConfigure={setConfigModal}
              onSync={handleSync} />
          ))}
        </div>
      </div>

      {/* Property × Portal Table */}
      <div className="bg-white rounded-xl border border-[#E8E2D8]">
        <div className="px-4 py-3 border-b border-[#E8E2D8] flex flex-wrap items-center gap-3">
          <h3 className="font-medium text-[#1B2B3A] text-sm">Imóveis × Portais</h3>
          <div className="flex-1" />
          <div className="relative min-w-[180px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8A8A8A]" />
            <input type="text" placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 rounded-lg border border-[#E8E2D8] text-xs focus:outline-none focus:border-[#C4A265]" />
          </div>
          <select value={publishFilter} onChange={e => setPublishFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-[#E8E2D8] text-xs">
            <option value="">Todos</option>
            <option value="published">Publicados</option>
            <option value="unpublished">Não publicados</option>
          </select>
          <select value={portalFilter} onChange={e => setPortalFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-[#E8E2D8] text-xs">
            <option value="">Todos portais</option>
            {portalConfigs.map(c => <option key={c.portal_name} value={c.portal_name}>{c.display_name}</option>)}
          </select>
        </div>

        {/* Bulk Actions */}
        {selectedIds.length > 0 && (
          <div className="px-4 py-2 bg-blue-50 border-b border-blue-100 flex items-center gap-3 text-xs">
            <span className="text-blue-700 font-medium">{selectedIds.length} selecionados</span>
            <select value={bulkPortal || ''} onChange={e => setBulkPortal(e.target.value)}
              className="px-2 py-1 border border-blue-200 rounded text-xs bg-white">
              <option value="">Selecionar portal...</option>
              {portalConfigs.map(c => <option key={c.portal_name} value={c.portal_name}>{c.display_name}</option>)}
            </select>
            <button onClick={() => handleBulkAction('publish')} disabled={!bulkPortal}
              className="px-2 py-1 bg-green-500 text-white rounded text-xs disabled:opacity-50">Publicar</button>
            <button onClick={() => handleBulkAction('unpublish')} disabled={!bulkPortal}
              className="px-2 py-1 bg-red-500 text-white rounded text-xs disabled:opacity-50">Despublicar</button>
            <button onClick={() => setSelectedIds([])} className="text-blue-600 ml-auto">Limpar seleção</button>
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E8E2D8]">
                <th className="px-4 py-3 text-left">
                  <input type="checkbox" checked={selectedIds.length === filteredProperties.length && filteredProperties.length > 0}
                    onChange={selectAll} className="w-3.5 h-3.5 rounded border-[#E8E2D8] text-[#C4A265] focus:ring-[#C4A265]" />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#8A8A8A]">Imóvel</th>
                {portalConfigs.map(c => (
                  <th key={c.portal_name} className="px-3 py-3 text-center text-xs font-medium" style={{ color: PORTAL_COLORS[c.portal_name] }}>
                    {PORTAL_LABELS[c.portal_name]}
                  </th>
                ))}
                <th className="px-4 py-3 text-right text-xs font-medium text-[#8A8A8A]">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredProperties.map(prop => {
                const portalStatus = getPortalStatusForProperty(prop.id);
                return (
                  <tr key={prop.id} className="border-b border-[#E8E2D8] last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <input type="checkbox" checked={selectedIds.includes(prop.id)} onChange={() => toggleSelect(prop.id)}
                        className="w-3.5 h-3.5 rounded border-[#E8E2D8] text-[#C4A265] focus:ring-[#C4A265]" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-8 rounded bg-slate-100 overflow-hidden flex-shrink-0">
                          {prop.images?.[0] ? <img src={prop.images[0]} alt="" className="w-full h-full object-cover" /> :
                            <div className="w-full h-full flex items-center justify-center"><Home className="w-3 h-3 text-gray-300" /></div>}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-[#1B2B3A] truncate max-w-[200px]">{prop.title}</p>
                          <p className="text-[10px] text-[#8A8A8A]">{prop.neighborhood}</p>
                        </div>
                      </div>
                    </td>
                    {portalConfigs.map(c => {
                      const pp = portalStatus[c.portal_name];
                      const published = pp?.is_published;
                      return (
                        <td key={c.portal_name} className="px-3 py-3 text-center">
                          <button onClick={() => handleTogglePublish(prop.id, c.portal_name, !published)}
                            className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all
                              ${published ? 'border-green-400 bg-green-50 text-green-600' : 'border-gray-200 bg-white text-gray-300 hover:border-gray-400'}`}>
                            {published ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                          </button>
                        </td>
                      );
                    })}
                    <td className="px-4 py-3 text-right">
                      <span className="text-[10px] text-[#8A8A8A]">
                        {Object.values(portalStatus).filter(pp => pp?.is_published).length}/{portalConfigs.length}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredProperties.length === 0 && (
            <div className="py-8 text-center text-sm text-[#8A8A8A]">Nenhum imóvel encontrado.</div>
          )}
        </div>
      </div>

      {/* Actions Row */}
      <div className="flex flex-wrap gap-3">
        <button onClick={() => setXmlPreview(true)}
          className="px-4 py-2.5 bg-white border border-[#E8E2D8] text-[#1B2B3A] rounded-xl text-sm hover:bg-gray-50 flex items-center gap-1.5">
          <Eye className="w-4 h-4" />Preview XML
        </button>
        <button onClick={() => downloadXML(generateZapXML(properties), 'zap-vivareal-feed.xml')}
          className="px-4 py-2.5 bg-white border border-[#E8E2D8] text-[#1B2B3A] rounded-xl text-sm hover:bg-gray-50 flex items-center gap-1.5">
          <Download className="w-4 h-4" />Exportar XML
        </button>
        <button onClick={async () => {
          for (const c of portalConfigs.filter(c => c.is_active)) {
            await handleSync(c.portal_name);
          }
        }} className="px-4 py-2.5 bg-[#C4A265] text-white rounded-xl text-sm font-medium hover:bg-[#b89355] flex items-center gap-1.5">
          <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />Sincronizar todos
        </button>
      </div>

      {/* Sync Log */}
      {syncLogs.length > 0 && (
        <div className="bg-white rounded-xl border border-[#E8E2D8]">
          <div className="px-4 py-3 border-b border-[#E8E2D8]">
            <h3 className="text-sm font-medium text-[#1B2B3A]">Log de Sincronização</h3>
          </div>
          <div className="divide-y divide-[#E8E2D8] max-h-60 overflow-auto">
            {syncLogs.map(log => (
              <div key={log.id} className="px-4 py-2.5 flex items-center gap-3 text-xs">
                <span className="text-[#8A8A8A] min-w-[50px]">{new Date(log.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                <span className="font-medium" style={{ color: PORTAL_COLORS[log.portal_name] }}>{PORTAL_LABELS[log.portal_name] || log.portal_name}</span>
                <span className="flex-1 text-[#8A8A8A]">
                  {log.status === 'success' && `${log.properties_synced} imóveis sincronizados`}
                  {log.status === 'error' && (log.error_message || 'Erro na sincronização')}
                  {log.status === 'partial' && `${log.properties_synced} ok, ${log.properties_failed} com erro`}
                </span>
                {log.status === 'success' && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                {log.status === 'error' && <XCircle className="w-4 h-4 text-red-500" />}
                {log.status === 'partial' && <AlertTriangle className="w-4 h-4 text-amber-500" />}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Feed URL Card */}
      <div className="bg-white rounded-xl border border-[#E8E2D8] p-4">
        <div className="flex items-center gap-3 mb-3">
          <Globe className="w-5 h-5 text-[#C4A265]" />
          <div>
            <h3 className="text-sm font-medium text-[#1B2B3A]">URL do XML Feed (VRSync)</h3>
            <p className="text-[10px] text-[#8A8A8A]">Cole esta URL no Canal Pro (ZAP/VivaReal/OLX) ou no painel de cada portal</p>
          </div>
        </div>
        <div className="flex gap-2">
          <input type="text" readOnly value={FEED_URL}
            className="flex-1 px-3 py-2 rounded-lg border border-[#E8E2D8] text-xs bg-gray-50 text-[#1B2B3A]" />
          <button onClick={() => { navigator.clipboard.writeText(FEED_URL); }}
            className="px-3 py-2 bg-[#C4A265] text-white rounded-lg text-xs font-medium hover:bg-[#b89355] flex items-center gap-1">
            <Copy className="w-3.5 h-3.5" />Copiar
          </button>
          <a href={FEED_URL} target="_blank" rel="noopener noreferrer"
            className="px-3 py-2 border border-[#E8E2D8] rounded-lg text-xs text-[#1B2B3A] hover:bg-gray-50 flex items-center gap-1">
            <ExternalLink className="w-3.5 h-3.5" />Abrir
          </a>
        </div>
      </div>

      {/* Modals */}
      {configModal && (
        <PortalConfigModal config={configModal} onClose={() => setConfigModal(null)} onSave={handleSaveConfig} />
      )}
      {xmlPreview && (
        <XMLPreviewModal properties={properties} onClose={() => setXmlPreview(false)} />
      )}

      {/* Validation Warning */}
      {validationWarning && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setValidationWarning(null)}>
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <h3 className="font-bold text-[#1B2B3A] text-sm">Não pode publicar</h3>
                <p className="text-xs text-[#8A8A8A]">{validationWarning.title}</p>
              </div>
            </div>
            <p className="text-sm text-[#1B2B3A] mb-2">Campos obrigatórios faltando:</p>
            <ul className="text-xs text-red-600 space-y-1 mb-4">
              {validationWarning.errors.map((err, i) => (
                <li key={i} className="flex items-center gap-1"><XCircle className="w-3 h-3" />{err}</li>
              ))}
            </ul>
            <button onClick={() => setValidationWarning(null)}
              className="w-full px-4 py-2 bg-[#C4A265] text-white rounded-lg text-sm hover:bg-[#b89355]">Entendi</button>
          </div>
        </div>
      )}
    </div>
  );
}
