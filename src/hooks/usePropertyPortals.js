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
    headers: { ...headers, Prefer: 'return=representation,resolution=merge-duplicates' },
    body: JSON.stringify(body),
  });
  return r.json();
}

async function sbPatch(path, body) {
  const r = await fetch(`${SB_URL}/rest/v1/${path}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(body),
  });
  return r.json();
}

async function sbDelete(path) {
  await fetch(`${SB_URL}/rest/v1/${path}`, { method: 'DELETE', headers });
}

export function usePropertyPortals(session) {
  const [portalConfigs, setPortalConfigs] = useState([]);
  const [propertyPortals, setPropertyPortals] = useState([]);
  const [syncLogs, setSyncLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    if (!session) return;
    setIsLoading(true);
    try {
      const [configs, pp, logs] = await Promise.all([
        sbGet('portal_configs?order=portal_name.asc&select=*'),
        sbGet('property_portals?select=*'),
        sbGet('portal_sync_logs?order=created_at.desc&limit=20&select=*'),
      ]);
      setPortalConfigs(configs);
      setPropertyPortals(pp);
      setSyncLogs(logs);
    } catch (e) {
      console.error('usePropertyPortals load error:', e);
    } finally {
      setIsLoading(false);
    }
  }, [session]);

  useEffect(() => { load(); }, [load]);

  const updatePortalConfig = useCallback(async (portalName, data) => {
    const result = await sbPatch(`portal_configs?portal_name=eq.${portalName}`, {
      ...data,
      updated_at: new Date().toISOString(),
    });
    if (Array.isArray(result) && result[0]) {
      setPortalConfigs(prev => prev.map(c => c.portal_name === portalName ? result[0] : c));
    }
    return result;
  }, []);

  const togglePropertyPortal = useCallback(async (propertyId, portalName, publish) => {
    const existing = propertyPortals.find(pp => pp.property_id === propertyId && pp.portal_name === portalName);
    if (existing) {
      const result = await sbPatch(`property_portals?id=eq.${existing.id}`, {
        is_published: publish,
        status: publish ? 'published' : 'pending',
        published_at: publish ? new Date().toISOString() : null,
        last_updated_at: new Date().toISOString(),
      });
      if (Array.isArray(result) && result[0]) {
        setPropertyPortals(prev => prev.map(pp => pp.id === existing.id ? result[0] : pp));
      }
    } else if (publish) {
      const result = await sbPost('property_portals', {
        property_id: propertyId,
        portal_name: portalName,
        is_published: true,
        status: 'published',
        published_at: new Date().toISOString(),
      });
      if (Array.isArray(result) && result[0]) {
        setPropertyPortals(prev => [...prev, result[0]]);
      }
    }
  }, [propertyPortals]);

  const bulkPublish = useCallback(async (propertyIds, portalNames, publish) => {
    for (const propId of propertyIds) {
      for (const portal of portalNames) {
        await togglePropertyPortal(propId, portal, publish);
      }
    }
  }, [togglePropertyPortal]);

  const addSyncLog = useCallback(async (portalName, syncType, status, count, errorMsg) => {
    const result = await sbPost('portal_sync_logs', {
      portal_name: portalName,
      sync_type: syncType,
      status,
      properties_synced: count,
      error_message: errorMsg || null,
    });
    if (Array.isArray(result) && result[0]) {
      setSyncLogs(prev => [result[0], ...prev].slice(0, 20));
    }
    await sbPatch(`portal_configs?portal_name=eq.${portalName}`, {
      last_sync_at: new Date().toISOString(),
      last_sync_status: status,
      last_sync_count: count,
    });
    setPortalConfigs(prev => prev.map(c => c.portal_name === portalName ? {
      ...c,
      last_sync_at: new Date().toISOString(),
      last_sync_status: status,
      last_sync_count: count,
    } : c));
  }, []);

  const getPortalStatusForProperty = useCallback((propertyId) => {
    const map = {};
    propertyPortals
      .filter(pp => pp.property_id === propertyId)
      .forEach(pp => { map[pp.portal_name] = pp; });
    return map;
  }, [propertyPortals]);

  const getPublishedCount = useCallback((portalName) => {
    return propertyPortals.filter(pp => pp.portal_name === portalName && pp.is_published).length;
  }, [propertyPortals]);

  return {
    portalConfigs, propertyPortals, syncLogs, isLoading,
    updatePortalConfig, togglePropertyPortal, bulkPublish,
    addSyncLog, getPortalStatusForProperty, getPublishedCount,
    reload: load,
  };
}
