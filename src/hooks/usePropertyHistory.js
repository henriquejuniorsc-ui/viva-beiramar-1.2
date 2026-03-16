import { useState, useEffect, useCallback } from 'react';

const SB_URL = 'https://hcmpjrqpjohksoznoycq.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhjbXBqcnFwam9oa3Nvem5veWNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5OTk0NjAsImV4cCI6MjA4ODU3NTQ2MH0.XRWi4ZULpICkTucXgGVQCP5wq1RmVwOFWTdMrOEMDnw';

const headers = {
  apikey: SB_KEY,
  Authorization: `Bearer ${SB_KEY}`,
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
};

async function sbGet(path) {
  const r = await fetch(`${SB_URL}/rest/v1/${path}`, { headers });
  const data = await r.json();
  return Array.isArray(data) ? data : [];
}

async function sbPost(path, body) {
  const r = await fetch(`${SB_URL}/rest/v1/${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  return r.json();
}

// Friendly field labels for display
const FIELD_LABELS = {
  title: 'Título',
  description: 'Descrição',
  type: 'Tipo',
  modality: 'Modalidade',
  category: 'Categoria',
  price: 'Preço',
  status: 'Status',
  area: 'Área',
  bedrooms: 'Quartos',
  bathrooms: 'Banheiros',
  suites: 'Suítes',
  garage: 'Vagas',
  zip_code: 'CEP',
  address: 'Endereço',
  address_number: 'Número',
  complement: 'Complemento',
  neighborhood: 'Bairro',
  city: 'Cidade',
  amenities: 'Comodidades',
  images: 'Fotos',
  is_featured: 'Destaque',
  is_launch: 'Lançamento',
  badge: 'Badge',
  condominium_fee: 'Condomínio',
  iptu_annual: 'IPTU Anual',
  construction_year: 'Ano de Construção',
  floor: 'Andar',
  total_floors: 'Total de Andares',
  is_furnished: 'Mobiliado',
  accepts_pets: 'Aceita Pets',
  video_url: 'Vídeo',
  portal_description: 'Descrição para Portais',
};

// Format value for display
function formatValue(field, value) {
  if (value === null || value === undefined || value === '') return '—';
  if (field === 'price' || field === 'condominium_fee' || field === 'iptu_annual') {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value);
  }
  if (field === 'is_featured' || field === 'is_launch' || field === 'is_furnished' || field === 'accepts_pets') {
    return value ? 'Sim' : 'Não';
  }
  if (field === 'amenities' && Array.isArray(value)) {
    return value.join(', ');
  }
  if (field === 'images' && Array.isArray(value)) {
    return `${value.length} foto(s)`;
  }
  if (field === 'area') return `${value}m²`;
  return String(value);
}

// Compare two property objects and return changed fields
export function diffProperties(oldProp, newProp) {
  const changes = [];
  const fieldsToTrack = [
    'title', 'description', 'type', 'modality', 'category', 'price', 'status',
    'area', 'bedrooms', 'bathrooms', 'suites', 'garage',
    'zip_code', 'address', 'address_number', 'complement', 'neighborhood', 'city',
    'is_featured', 'is_launch', 'badge',
    'condominium_fee', 'iptu_annual', 'construction_year', 'floor', 'total_floors',
    'is_furnished', 'accepts_pets', 'video_url', 'portal_description',
  ];

  for (const field of fieldsToTrack) {
    const oldVal = oldProp[field];
    const newVal = newProp[field];
    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      changes.push({
        field,
        label: FIELD_LABELS[field] || field,
        oldValue: formatValue(field, oldVal),
        newValue: formatValue(field, newVal),
      });
    }
  }

  // Check images separately (array comparison)
  const oldImages = JSON.stringify(oldProp.images || []);
  const newImages = JSON.stringify(newProp.images || []);
  if (oldImages !== newImages) {
    const oldCount = (oldProp.images || []).length;
    const newCount = (newProp.images || []).length;
    changes.push({
      field: 'images',
      label: 'Fotos',
      oldValue: `${oldCount} foto(s)`,
      newValue: `${newCount} foto(s)`,
    });
  }

  // Check amenities
  const oldAmenities = JSON.stringify((oldProp.amenities || []).sort());
  const newAmenities = JSON.stringify((newProp.amenities || []).sort());
  if (oldAmenities !== newAmenities) {
    changes.push({
      field: 'amenities',
      label: 'Comodidades',
      oldValue: (oldProp.amenities || []).join(', ') || '—',
      newValue: (newProp.amenities || []).join(', ') || '—',
    });
  }

  return changes;
}

export function usePropertyHistory(session) {
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadHistory = useCallback(async (propertyId) => {
    if (!session) return;
    setIsLoading(true);
    try {
      const path = propertyId
        ? `property_history?property_id=eq.${propertyId}&order=created_at.desc&limit=50`
        : 'property_history?order=created_at.desc&limit=100';
      const data = await sbGet(path);
      setHistory(data);
    } catch (e) {
      console.error('usePropertyHistory load error:', e);
    } finally {
      setIsLoading(false);
    }
  }, [session]);

  const logAction = useCallback(async (propertyId, action, description, fieldChanged, oldValue, newValue) => {
    const entry = {
      property_id: propertyId,
      action,
      description,
      field_changed: fieldChanged || null,
      old_value: oldValue || null,
      new_value: newValue || null,
      user_email: session?.user?.email || 'admin',
    };
    const result = await sbPost('property_history', entry);
    if (Array.isArray(result) && result[0]) {
      setHistory(prev => [result[0], ...prev]);
    }
    return result;
  }, [session]);

  // Log property creation
  const logCreation = useCallback(async (property) => {
    await logAction(
      property.id,
      'created',
      `Imóvel "${property.title}" criado`,
    );
  }, [logAction]);

  // Log property update with field diffs
  const logUpdate = useCallback(async (propertyId, oldProp, newProp) => {
    const changes = diffProperties(oldProp, newProp);

    // Check if status specifically changed
    if (oldProp.status !== newProp.status) {
      await logAction(
        propertyId,
        'status_changed',
        `Status alterado de "${oldProp.status}" para "${newProp.status}"`,
        'status',
        oldProp.status,
        newProp.status,
      );
    }

    // Log each field change (excluding status which was already logged)
    const otherChanges = changes.filter(c => c.field !== 'status');
    if (otherChanges.length > 0) {
      const summary = otherChanges.length <= 3
        ? otherChanges.map(c => c.label).join(', ')
        : `${otherChanges.length} campos`;
      await logAction(
        propertyId,
        'updated',
        `Imóvel atualizado: ${summary}`,
        otherChanges.map(c => c.field).join(','),
        otherChanges.map(c => `${c.label}: ${c.oldValue}`).join(' | '),
        otherChanges.map(c => `${c.label}: ${c.newValue}`).join(' | '),
      );
    }
  }, [logAction]);

  // Log duplication
  const logDuplication = useCallback(async (originalId, newProperty) => {
    await logAction(
      newProperty.id,
      'duplicated',
      `Duplicado a partir do imóvel #${originalId.substring(0, 8)}`,
    );
  }, [logAction]);

  // Log portal publish/unpublish
  const logPortalAction = useCallback(async (propertyId, portalName, published) => {
    await logAction(
      propertyId,
      published ? 'portal_published' : 'portal_unpublished',
      `${published ? 'Publicado' : 'Removido'} no portal ${portalName}`,
      'portal',
      null,
      portalName,
    );
  }, [logAction]);

  return {
    history,
    isLoading,
    loadHistory,
    logCreation,
    logUpdate,
    logDuplication,
    logPortalAction,
    logAction,
  };
}
