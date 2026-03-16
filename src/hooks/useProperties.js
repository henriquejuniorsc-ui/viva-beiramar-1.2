import { useState, useEffect, useCallback, useMemo, useRef } from 'react';

const SB_URL = 'https://hcmpjrqpjohksoznoycq.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhjbXBqcnFwam9oa3Nvem5veWNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5OTk0NjAsImV4cCI6MjA4ODU3NTQ2MH0.XRWi4ZULpICkTucXgGVQCP5wq1RmVwOFWTdMrOEMDnw';
const STORAGE_URL = `${SB_URL}/storage/v1/object`;

// Read headers (anon key — works with public SELECT policy)
const readHeaders = {
  apikey: SB_KEY,
  Authorization: `Bearer ${SB_KEY}`,
  'Content-Type': 'application/json',
};

// Write headers need the user's JWT token for RLS authenticated policies
function authHeaders(token) {
  return {
    apikey: SB_KEY,
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  };
}

async function sbGet(path) {
  const r = await fetch(`${SB_URL}/rest/v1/${path}`, { headers: readHeaders });
  const data = await r.json();
  return Array.isArray(data) ? data : [];
}

async function sbPost(path, body, token) {
  const r = await fetch(`${SB_URL}/rest/v1/${path}`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(body),
  });
  const data = await r.json();
  if (!r.ok) console.error('sbPost error:', r.status, data);
  return data;
}

async function sbPatch(path, body, token) {
  const r = await fetch(`${SB_URL}/rest/v1/${path}`, {
    method: 'PATCH',
    headers: authHeaders(token),
    body: JSON.stringify(body),
  });
  const data = await r.json();
  if (!r.ok) console.error('sbPatch error:', r.status, data);
  return data;
}

async function sbDelete(path, token) {
  const r = await fetch(`${SB_URL}/rest/v1/${path}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
  if (!r.ok) console.error('sbDelete error:', r.status);
  return r.ok;
}

export async function uploadPropertyImage(propertyId, file, token) {
  const ext = file.name.split('.').pop();
  const fileName = `${propertyId}/${Date.now()}.${ext}`;
  const r = await fetch(`${STORAGE_URL}/property-images/${fileName}`, {
    method: 'POST',
    headers: {
      apikey: SB_KEY,
      Authorization: `Bearer ${token || SB_KEY}`,
      'Content-Type': file.type,
    },
    body: file,
  });
  if (!r.ok) throw new Error('Upload failed');
  return `${STORAGE_URL}/public/property-images/${fileName}`;
}

export async function deletePropertyImage(url, token) {
  const path = url.split('/property-images/')[1];
  if (!path) return;
  await fetch(`${STORAGE_URL}/property-images/${path}`, {
    method: 'DELETE',
    headers: {
      apikey: SB_KEY,
      Authorization: `Bearer ${token || SB_KEY}`,
    },
  });
}

export function useProperties(session) {
  const [properties, setProperties] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    type: '',
    status: '',
    modality: '',
    priceMin: '',
    priceMax: '',
    sortBy: 'created_at_desc',
  });

  // Keep a ref to the latest token so callbacks always use the fresh value
  const tokenRef = useRef(null);
  useEffect(() => {
    tokenRef.current = session?.access_token || null;
  }, [session]);

  const getToken = () => tokenRef.current || SB_KEY;

  const load = useCallback(async () => {
    if (!session) return;
    setIsLoading(true);
    try {
      const data = await sbGet('properties?select=*&order=created_at.desc');
      setProperties(data);
    } catch (e) {
      console.error('useProperties load error:', e);
    } finally {
      setIsLoading(false);
    }
  }, [session]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    let list = [...properties];
    const { search, type, status, modality, priceMin, priceMax, sortBy } = filters;

    if (search) {
      const s = search.toLowerCase();
      list = list.filter(p =>
        (p.title || '').toLowerCase().includes(s) ||
        (p.neighborhood || '').toLowerCase().includes(s) ||
        (p.address || '').toLowerCase().includes(s)
      );
    }
    if (type) list = list.filter(p => p.type === type);
    if (status) list = list.filter(p => p.status === status);
    if (modality) list = list.filter(p => (p.modality || '').includes(modality));
    if (priceMin) list = list.filter(p => (p.price || 0) >= Number(priceMin));
    if (priceMax) list = list.filter(p => (p.price || 0) <= Number(priceMax));

    switch (sortBy) {
      case 'created_at_desc': list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)); break;
      case 'created_at_asc': list.sort((a, b) => new Date(a.created_at) - new Date(b.created_at)); break;
      case 'price_desc': list.sort((a, b) => (b.price || 0) - (a.price || 0)); break;
      case 'price_asc': list.sort((a, b) => (a.price || 0) - (b.price || 0)); break;
      case 'title_asc': list.sort((a, b) => (a.title || '').localeCompare(b.title || '')); break;
      default: break;
    }
    return list;
  }, [properties, filters]);

  const kpis = useMemo(() => {
    const total = properties.length;
    const aVenda = properties.filter(p => (p.modality || '').includes('Venda') && p.status === 'Disponível').length;
    const aluguel = properties.filter(p => (p.modality || '').includes('Aluguel') && p.status === 'Disponível').length;
    const vendidos = properties.filter(p => ['Vendido', 'Alugado'].includes(p.status)).length;
    return { total, aVenda, aluguel, vendidos };
  }, [properties]);

  const createProperty = useCallback(async (data) => {
    const result = await sbPost('properties', data, getToken());
    if (Array.isArray(result) && result[0]) {
      setProperties(prev => [result[0], ...prev]);
      return result[0];
    }
    return null;
  }, []);

  const updateProperty = useCallback(async (id, data) => {
    const result = await sbPatch(`properties?id=eq.${id}`, data, getToken());
    if (Array.isArray(result) && result[0]) {
      setProperties(prev => prev.map(p => p.id === id ? result[0] : p));
      return result[0];
    }
    return null;
  }, []);

  const deleteProperty = useCallback(async (id) => {
    const ok = await sbDelete(`properties?id=eq.${id}`, getToken());
    if (ok) setProperties(prev => prev.filter(p => p.id !== id));
    return ok;
  }, []);

  const duplicateProperty = useCallback(async (property) => {
    const { id, created_at, ...rest } = property;
    const dup = { ...rest, title: `${rest.title} (Cópia)`, status: 'Disponível', is_featured: false };
    return createProperty(dup);
  }, [createProperty]);

  return {
    properties, filtered, isLoading, kpis, filters, setFilters,
    createProperty, updateProperty, deleteProperty, duplicateProperty,
    reload: load, getToken,
  };
}
