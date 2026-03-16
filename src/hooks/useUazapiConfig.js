import { useState, useEffect } from 'react';

const SB_URL = 'https://hcmpjrqpjohksoznoycq.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhjbXBqcnFwam9oa3Nvem5veWNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5OTk0NjAsImV4cCI6MjA4ODU3NTQ2MH0.XRWi4ZULpICkTucXgGVQCP5wq1RmVwOFWTdMrOEMDnw';

const headers = {
  apikey: SB_KEY,
  Authorization: `Bearer ${SB_KEY}`,
  'Content-Type': 'application/json',
};

export function useUazapiConfig() {
  const [config, setConfig] = useState({ baseUrl: '', token: '' });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(
          `${SB_URL}/rest/v1/admin_settings?key=in.(uazapi_base_url,uazapi_token)&select=key,value`,
          { headers }
        );
        const data = await r.json();
        if (Array.isArray(data)) {
          const map = {};
          data.forEach(d => { map[d.key] = d.value; });
          setConfig({
            baseUrl: (map.uazapi_base_url || '').replace(/\/$/, ''),
            token: map.uazapi_token || '',
          });
        }
      } catch (e) {
        console.error('useUazapiConfig error:', e);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const uazFetch = async (path, options = {}) => {
    if (!config.baseUrl || !config.token) throw new Error('UAZAPI não configurada');
    const url = `${config.baseUrl}${path}`;
    const r = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        token: config.token,
        ...options.headers,
      },
    });
    if (!r.ok) {
      const text = await r.text().catch(() => '');
      let parsed;
      try { parsed = JSON.parse(text); } catch { parsed = { message: text }; }
      throw new Error(`UAZAPI ${r.status}: ${parsed.message || text}`);
    }
    const text = await r.text();
    try { return JSON.parse(text); } catch { return { raw: text }; }
  };

  return { config, isLoading, uazFetch };
}
