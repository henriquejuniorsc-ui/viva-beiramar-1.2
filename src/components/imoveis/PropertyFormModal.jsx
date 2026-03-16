import React, { useState, useRef, useCallback } from 'react';
import { uploadPropertyImage, deletePropertyImage } from '../../hooks/useProperties';
import {
  X, Save, Trash2, Loader2, Upload, GripVertical, Star,
  Plus, Minus, MapPin, Image as ImageIcon, ChevronDown, ChevronUp,
} from 'lucide-react';

const TYPES = ['Casa', 'Apartamento', 'Terreno', 'Sobrado', 'Chácara', 'Cobertura', 'Studio', 'Sala Comercial'];
const MODALITIES = ['Venda', 'Aluguel', 'Venda e Aluguel'];
const CATEGORIES = ['Residencial', 'Comercial', 'Industrial', 'Rural'];
const STATUSES = ['Disponível', 'Reservado', 'Vendido', 'Alugado', 'Indisponível'];

const AMENITIES = [
  'Piscina', 'Churrasqueira', 'Área gourmet', 'Jardim', 'Varanda/Sacada', 'Vista para o mar',
  'Suite master', 'Closet', 'Ar condicionado', 'Aquecimento solar', 'Lareira', 'Home office',
  'Playground', 'Salão de festas', 'Academia', 'Sauna', 'Elevador', 'Portaria 24h',
  'Segurança', 'Câmeras', 'Condomínio fechado', 'Pet friendly', 'Mobiliado', 'Perto da praia',
  'Energia solar', 'Cisterna', 'Água de poço',
];

const formatBRL = (v) => {
  if (!v && v !== 0) return '';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v);
};

function Stepper({ value, onChange, label }) {
  return (
    <div>
      <label className="text-xs text-[#8A8A8A] mb-1 block">{label}</label>
      <div className="flex items-center border border-[#E8E2D8] rounded-lg overflow-hidden">
        <button type="button" onClick={() => onChange(Math.max(0, (value || 0) - 1))}
          className="px-3 py-2 hover:bg-gray-50 text-[#8A8A8A]"><Minus className="w-3 h-3" /></button>
        <span className="px-3 py-2 text-sm font-medium text-[#1B2B3A] min-w-[40px] text-center bg-gray-50">{value || 0}</span>
        <button type="button" onClick={() => onChange((value || 0) + 1)}
          className="px-3 py-2 hover:bg-gray-50 text-[#8A8A8A]"><Plus className="w-3 h-3" /></button>
      </div>
    </div>
  );
}

function SectionHeader({ title, open, toggle }) {
  return (
    <button type="button" onClick={toggle}
      className="w-full flex items-center justify-between py-3 border-b border-[#E8E2D8] text-left">
      <h3 className="font-medium text-[#1B2B3A]">{title}</h3>
      {open ? <ChevronUp className="w-4 h-4 text-[#8A8A8A]" /> : <ChevronDown className="w-4 h-4 text-[#8A8A8A]" />}
    </button>
  );
}

export default function PropertyFormModal({ property, onClose, onCreate, onUpdate, onDelete, reload, getToken }) {
  const isEdit = !!property;
  const [form, setForm] = useState({
    title: property?.title || '',
    description: property?.description || '',
    type: property?.type || 'Casa',
    modality: property?.modality || 'Venda',
    category: property?.category || 'Residencial',
    price: property?.price || '',
    status: property?.status || 'Disponível',
    area: property?.area || '',
    bedrooms: property?.bedrooms || 0,
    bathrooms: property?.bathrooms || 0,
    suites: property?.suites || 0,
    garage: property?.garage || 0,
    zip_code: property?.zip_code || '',
    address: property?.address || '',
    address_number: property?.address_number || '',
    complement: property?.complement || '',
    neighborhood: property?.neighborhood || '',
    city: property?.city || 'Ubatuba',
    amenities: property?.amenities || [],
    images: property?.images || [],
    is_featured: property?.is_featured || false,
    is_launch: property?.is_launch || false,
    badge: property?.badge || '',
    condominium_fee: property?.condominium_fee || '',
    iptu_annual: property?.iptu_annual || '',
    construction_year: property?.construction_year || '',
    floor: property?.floor || '',
    total_floors: property?.total_floors || '',
    is_furnished: property?.is_furnished || false,
    accepts_pets: property?.accepts_pets || false,
    video_url: property?.video_url || '',
    portal_description: property?.portal_description || '',
  });

  const [isSaving, setIsSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [errors, setErrors] = useState({});
  const [sections, setSections] = useState({ basic: true, specs: true, location: true, amenities: false, photos: true, highlights: false, portal: false });
  const fileInputRef = useRef();

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const toggleSection = (s) => setSections(prev => ({ ...prev, [s]: !prev[s] }));

  const toggleAmenity = (a) => {
    setForm(f => ({
      ...f,
      amenities: f.amenities.includes(a)
        ? f.amenities.filter(x => x !== a)
        : [...f.amenities, a],
    }));
  };

  // ViaCEP
  const fetchCEP = async (cep) => {
    const clean = cep.replace(/\D/g, '');
    if (clean.length !== 8) return;
    try {
      const r = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
      const data = await r.json();
      if (!data.erro) {
        setForm(f => ({
          ...f,
          address: data.logradouro || f.address,
          neighborhood: data.bairro || f.neighborhood,
          city: data.localidade || f.city,
          complement: data.complemento || f.complement,
        }));
      }
    } catch (e) { console.error('ViaCEP error:', e); }
  };

  // Photo upload
  const handlePhotoUpload = async (files) => {
    const propId = property?.id || 'temp_' + Date.now();
    const maxFiles = 20 - form.images.length;
    const toUpload = Array.from(files).slice(0, maxFiles);
    if (toUpload.length === 0) return;

    setUploadProgress(0);
    const newUrls = [];
    for (let i = 0; i < toUpload.length; i++) {
      try {
        const url = await uploadPropertyImage(propId, toUpload[i], getToken?.());
        newUrls.push(url);
      } catch (e) { console.error('Upload failed:', e); }
      setUploadProgress(Math.round(((i + 1) / toUpload.length) * 100));
    }
    setForm(f => ({ ...f, images: [...f.images, ...newUrls] }));
    setUploadProgress(null);
  };

  const removePhoto = (idx) => {
    const url = form.images[idx];
    setForm(f => ({ ...f, images: f.images.filter((_, i) => i !== idx) }));
    deletePropertyImage(url, getToken?.()).catch(() => {});
  };

  const movePhoto = (from, to) => {
    if (to < 0 || to >= form.images.length) return;
    setForm(f => {
      const imgs = [...f.images];
      const [moved] = imgs.splice(from, 1);
      imgs.splice(to, 0, moved);
      return { ...f, images: imgs };
    });
  };

  // Drag and drop
  const handleDrop = (e) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length) handlePhotoUpload(files);
  };

  // Validate
  const validate = () => {
    const errs = {};
    if (!form.title || form.title.length < 5) errs.title = 'Título deve ter pelo menos 5 caracteres';
    if (!form.price || Number(form.price) <= 0) errs.price = 'Preço é obrigatório';
    if (!form.type) errs.type = 'Tipo é obrigatório';
    if (!form.modality) errs.modality = 'Modalidade é obrigatória';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Save
  const handleSave = async () => {
    if (!validate()) return;
    setIsSaving(true);
    try {
      const data = {
        ...form,
        price: Number(form.price) || 0,
        area: form.area ? Number(form.area) : null,
        condominium_fee: form.condominium_fee ? Number(form.condominium_fee) : null,
        iptu_annual: form.iptu_annual ? Number(form.iptu_annual) : null,
        construction_year: form.construction_year ? Number(form.construction_year) : null,
        floor: form.floor ? Number(form.floor) : null,
        total_floors: form.total_floors ? Number(form.total_floors) : null,
      };
      if (isEdit) {
        await onUpdate(property.id, data);
      } else {
        await onCreate(data);
      }
      onClose();
    } catch (e) {
      console.error('Save error:', e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteProperty = async () => {
    if (!window.confirm('Tem certeza que deseja excluir este imóvel?')) return;
    await onDelete(property.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex justify-end" onClick={onClose}>
      <div className="bg-white w-full md:max-w-2xl h-full overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 bg-white z-10 border-b border-[#E8E2D8] px-4 md:px-6 py-3 md:py-4 flex items-center justify-between">
          <h2 className="text-base md:text-lg font-bold text-[#1B2B3A] font-serif">{isEdit ? 'Editar Imóvel' : 'Novo Imóvel'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg min-w-[44px] min-h-[44px] flex items-center justify-center"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 space-y-4">
          {/* Seção 1: Info Básicas */}
          <SectionHeader title="Informações Básicas" open={sections.basic} toggle={() => toggleSection('basic')} />
          {sections.basic && (
            <div className="space-y-3">
              <div>
                <label className="text-xs text-[#8A8A8A] mb-1 block">Título *</label>
                <input type="text" value={form.title} onChange={e => set('title', e.target.value)}
                  className={`w-full px-3 py-2.5 rounded-lg border text-sm focus:outline-none focus:border-[#C4A265] ${errors.title ? 'border-red-300' : 'border-[#E8E2D8]'}`}
                  placeholder="Ex: Casa 4 quartos vista mar na Praia Grande" />
                {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title}</p>}
              </div>
              <div>
                <label className="text-xs text-[#8A8A8A] mb-1 block">Descrição</label>
                <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={4}
                  className="w-full px-3 py-2.5 rounded-lg border border-[#E8E2D8] text-sm focus:outline-none focus:border-[#C4A265] resize-none"
                  placeholder="Descreva o imóvel..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[#8A8A8A] mb-1 block">Tipo *</label>
                  <select value={form.type} onChange={e => set('type', e.target.value)}
                    className={`w-full px-3 py-2.5 rounded-lg border text-sm focus:outline-none focus:border-[#C4A265] ${errors.type ? 'border-red-300' : 'border-[#E8E2D8]'}`}>
                    {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-[#8A8A8A] mb-1 block">Modalidade *</label>
                  <select value={form.modality} onChange={e => set('modality', e.target.value)}
                    className={`w-full px-3 py-2.5 rounded-lg border text-sm focus:outline-none focus:border-[#C4A265] ${errors.modality ? 'border-red-300' : 'border-[#E8E2D8]'}`}>
                    {MODALITIES.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[#8A8A8A] mb-1 block">Categoria</label>
                  <select value={form.category} onChange={e => set('category', e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-[#E8E2D8] text-sm focus:outline-none focus:border-[#C4A265]">
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-[#8A8A8A] mb-1 block">Status *</label>
                  <select value={form.status} onChange={e => set('status', e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-[#E8E2D8] text-sm focus:outline-none focus:border-[#C4A265]">
                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-[#8A8A8A] mb-1 block">Preço (R$) *</label>
                <input type="number" value={form.price} onChange={e => set('price', e.target.value)}
                  className={`w-full px-3 py-2.5 rounded-lg border text-sm focus:outline-none focus:border-[#C4A265] ${errors.price ? 'border-red-300' : 'border-[#E8E2D8]'}`}
                  placeholder="0" />
                {errors.price && <p className="text-xs text-red-500 mt-1">{errors.price}</p>}
                {form.price > 0 && <p className="text-xs text-[#C4A265] mt-1">{formatBRL(form.price)}</p>}
              </div>
            </div>
          )}

          {/* Seção 2: Características */}
          <SectionHeader title="Características" open={sections.specs} toggle={() => toggleSection('specs')} />
          {sections.specs && (
            <div className="space-y-3">
              <div>
                <label className="text-xs text-[#8A8A8A] mb-1 block">Área (m²)</label>
                <input type="number" value={form.area} onChange={e => set('area', e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-[#E8E2D8] text-sm focus:outline-none focus:border-[#C4A265]" placeholder="0" />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Stepper label="Quartos" value={form.bedrooms} onChange={v => set('bedrooms', v)} />
                <Stepper label="Banheiros" value={form.bathrooms} onChange={v => set('bathrooms', v)} />
                <Stepper label="Suítes" value={form.suites} onChange={v => set('suites', v)} />
                <Stepper label="Vagas" value={form.garage} onChange={v => set('garage', v)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[#8A8A8A] mb-1 block">Condomínio (R$/mês)</label>
                  <input type="number" value={form.condominium_fee} onChange={e => set('condominium_fee', e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-[#E8E2D8] text-sm focus:outline-none focus:border-[#C4A265]" placeholder="0" />
                </div>
                <div>
                  <label className="text-xs text-[#8A8A8A] mb-1 block">IPTU anual (R$)</label>
                  <input type="number" value={form.iptu_annual} onChange={e => set('iptu_annual', e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-[#E8E2D8] text-sm focus:outline-none focus:border-[#C4A265]" placeholder="0" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-[#8A8A8A] mb-1 block">Ano construção</label>
                  <input type="number" value={form.construction_year} onChange={e => set('construction_year', e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-[#E8E2D8] text-sm focus:outline-none focus:border-[#C4A265]" placeholder="2024" />
                </div>
                <div>
                  <label className="text-xs text-[#8A8A8A] mb-1 block">Andar</label>
                  <input type="number" value={form.floor} onChange={e => set('floor', e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-[#E8E2D8] text-sm focus:outline-none focus:border-[#C4A265]" placeholder="0" />
                </div>
                <div>
                  <label className="text-xs text-[#8A8A8A] mb-1 block">Total andares</label>
                  <input type="number" value={form.total_floors} onChange={e => set('total_floors', e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-[#E8E2D8] text-sm focus:outline-none focus:border-[#C4A265]" placeholder="0" />
                </div>
              </div>
              <div className="flex gap-6">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={form.is_furnished} onChange={e => set('is_furnished', e.target.checked)}
                    className="w-4 h-4 rounded border-[#E8E2D8] text-[#C4A265] focus:ring-[#C4A265]" />
                  Mobiliado
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={form.accepts_pets} onChange={e => set('accepts_pets', e.target.checked)}
                    className="w-4 h-4 rounded border-[#E8E2D8] text-[#C4A265] focus:ring-[#C4A265]" />
                  Aceita pets
                </label>
              </div>
            </div>
          )}

          {/* Seção 3: Localização */}
          <SectionHeader title="Localização" open={sections.location} toggle={() => toggleSection('location')} />
          {sections.location && (
            <div className="space-y-3">
              <div>
                <label className="text-xs text-[#8A8A8A] mb-1 block">CEP</label>
                <input type="text" value={form.zip_code} maxLength={9}
                  onChange={e => {
                    const v = e.target.value.replace(/\D/g, '').replace(/(\d{5})(\d)/, '$1-$2');
                    set('zip_code', v);
                    if (v.replace(/\D/g, '').length === 8) fetchCEP(v);
                  }}
                  className="w-full px-3 py-2.5 rounded-lg border border-[#E8E2D8] text-sm focus:outline-none focus:border-[#C4A265]"
                  placeholder="00000-000" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="text-xs text-[#8A8A8A] mb-1 block">Endereço</label>
                  <input type="text" value={form.address} onChange={e => set('address', e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-[#E8E2D8] text-sm focus:outline-none focus:border-[#C4A265]" />
                </div>
                <div>
                  <label className="text-xs text-[#8A8A8A] mb-1 block">Número</label>
                  <input type="text" value={form.address_number} onChange={e => set('address_number', e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-[#E8E2D8] text-sm focus:outline-none focus:border-[#C4A265]" />
                </div>
              </div>
              <div>
                <label className="text-xs text-[#8A8A8A] mb-1 block">Complemento</label>
                <input type="text" value={form.complement} onChange={e => set('complement', e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-[#E8E2D8] text-sm focus:outline-none focus:border-[#C4A265]" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[#8A8A8A] mb-1 block">Bairro</label>
                  <input type="text" value={form.neighborhood} onChange={e => set('neighborhood', e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-[#E8E2D8] text-sm focus:outline-none focus:border-[#C4A265]" />
                </div>
                <div>
                  <label className="text-xs text-[#8A8A8A] mb-1 block">Cidade</label>
                  <input type="text" value={form.city} onChange={e => set('city', e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-[#E8E2D8] text-sm focus:outline-none focus:border-[#C4A265]" />
                </div>
              </div>
            </div>
          )}

          {/* Seção 4: Amenidades */}
          <SectionHeader title="Amenidades" open={sections.amenities} toggle={() => toggleSection('amenities')} />
          {sections.amenities && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {AMENITIES.map(a => (
                <label key={a} className="flex items-center gap-2 text-sm cursor-pointer p-2 rounded-lg hover:bg-gray-50">
                  <input type="checkbox" checked={form.amenities.includes(a)} onChange={() => toggleAmenity(a)}
                    className="w-4 h-4 rounded border-[#E8E2D8] text-[#C4A265] focus:ring-[#C4A265]" />
                  {a}
                </label>
              ))}
            </div>
          )}

          {/* Seção 5: Fotos */}
          <SectionHeader title={`Fotos (${form.images.length}/20)`} open={sections.photos} toggle={() => toggleSection('photos')} />
          {sections.photos && (
            <div className="space-y-3">
              {form.images.length === 0 && (
                <p className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">Recomendado: adicione pelo menos 1 foto para melhor apresentação.</p>
              )}
              {/* Upload area */}
              <div className="border-2 border-dashed border-[#E8E2D8] rounded-xl p-6 text-center hover:border-[#C4A265] transition-colors cursor-pointer"
                onDrop={handleDrop} onDragOver={e => e.preventDefault()}
                onClick={() => fileInputRef.current?.click()}>
                <Upload className="w-8 h-8 text-[#C4A265] mx-auto mb-2" />
                <p className="text-sm text-[#8A8A8A]">Arraste fotos aqui ou clique para selecionar</p>
                <p className="text-xs text-[#8A8A8A] mt-1">JPG, PNG, WebP — Máx. 10MB por foto — Máx. 20 fotos</p>
                <input ref={fileInputRef} type="file" multiple accept="image/jpeg,image/png,image/webp"
                  onChange={e => handlePhotoUpload(e.target.files)} className="hidden" />
              </div>
              {uploadProgress !== null && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex justify-between text-xs text-[#8A8A8A] mb-1">
                    <span>Enviando fotos...</span><span>{uploadProgress}%</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-[#C4A265] rounded-full transition-all" style={{ width: `${uploadProgress}%` }} />
                  </div>
                </div>
              )}
              {/* Photo grid */}
              {form.images.length > 0 && (
                <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                  {form.images.map((url, i) => (
                    <div key={i} className="relative group aspect-square rounded-lg overflow-hidden bg-slate-100">
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      {i === 0 && (
                        <span className="absolute top-1 left-1 bg-[#C4A265] text-white text-[10px] px-1.5 py-0.5 rounded">Capa</span>
                      )}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
                        {i > 0 && (
                          <button type="button" onClick={() => movePhoto(i, i - 1)}
                            className="p-1 bg-white rounded text-xs">←</button>
                        )}
                        {i < form.images.length - 1 && (
                          <button type="button" onClick={() => movePhoto(i, i + 1)}
                            className="p-1 bg-white rounded text-xs">→</button>
                        )}
                        <button type="button" onClick={() => removePhoto(i)}
                          className="p-1 bg-red-500 text-white rounded"><X className="w-3 h-3" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Seção 6: Destaques */}
          <SectionHeader title="Destaques" open={sections.highlights} toggle={() => toggleSection('highlights')} />
          {sections.highlights && (
            <div className="space-y-3">
              <label className="flex items-center gap-3 p-3 rounded-lg border border-[#E8E2D8] cursor-pointer hover:bg-gray-50">
                <input type="checkbox" checked={form.is_featured} onChange={e => set('is_featured', e.target.checked)}
                  className="w-4 h-4 rounded border-[#E8E2D8] text-[#C4A265] focus:ring-[#C4A265]" />
                <div>
                  <p className="text-sm font-medium text-[#1B2B3A]">Imóvel em destaque</p>
                  <p className="text-xs text-[#8A8A8A]">Aparece com prioridade na lista e no site</p>
                </div>
              </label>
              <label className="flex items-center gap-3 p-3 rounded-lg border border-[#E8E2D8] cursor-pointer hover:bg-gray-50">
                <input type="checkbox" checked={form.is_launch} onChange={e => set('is_launch', e.target.checked)}
                  className="w-4 h-4 rounded border-[#E8E2D8] text-[#C4A265] focus:ring-[#C4A265]" />
                <div>
                  <p className="text-sm font-medium text-[#1B2B3A]">Lançamento</p>
                  <p className="text-xs text-[#8A8A8A]">Exibe badge de lançamento</p>
                </div>
              </label>
              <div>
                <label className="text-xs text-[#8A8A8A] mb-1 block">Badge especial</label>
                <input type="text" value={form.badge} onChange={e => set('badge', e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-[#E8E2D8] text-sm focus:outline-none focus:border-[#C4A265]"
                  placeholder="Ex: Oportunidade, Exclusivo, Última unidade" />
              </div>
            </div>
          )}

          {/* Seção 7: Portal/Extras */}
          <SectionHeader title="Extras para Portais" open={sections.portal} toggle={() => toggleSection('portal')} />
          {sections.portal && (
            <div className="space-y-3">
              <div>
                <label className="text-xs text-[#8A8A8A] mb-1 block">Descrição para portais</label>
                <textarea value={form.portal_description} onChange={e => set('portal_description', e.target.value)} rows={3}
                  className="w-full px-3 py-2.5 rounded-lg border border-[#E8E2D8] text-sm focus:outline-none focus:border-[#C4A265] resize-none"
                  placeholder="Descrição otimizada para ZAP, VivaReal, etc. (Se vazio, usa a descrição principal)" />
              </div>
              <div>
                <label className="text-xs text-[#8A8A8A] mb-1 block">URL de vídeo / Tour virtual</label>
                <input type="url" value={form.video_url} onChange={e => set('video_url', e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-[#E8E2D8] text-sm focus:outline-none focus:border-[#C4A265]"
                  placeholder="https://youtube.com/..." />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-[#E8E2D8] px-4 md:px-6 py-3 md:py-4 flex items-center justify-between safe-bottom">
          <div>
            {isEdit && (
              <button onClick={handleDeleteProperty} className="text-sm text-red-500 hover:text-red-700 flex items-center gap-1">
                <Trash2 className="w-4 h-4" />Excluir imóvel
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2.5 text-sm text-[#8A8A8A] hover:bg-gray-50 rounded-lg">Cancelar</button>
            <button onClick={handleSave} disabled={isSaving}
              className="px-6 py-2.5 bg-[#C4A265] text-white rounded-lg text-sm font-medium hover:bg-[#b89355] disabled:opacity-50 flex items-center gap-2">
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {isEdit ? 'Salvar alterações' : 'Criar imóvel'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
