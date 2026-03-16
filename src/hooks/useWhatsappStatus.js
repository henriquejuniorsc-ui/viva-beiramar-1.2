import { useState, useEffect, useRef, useCallback } from 'react';

export function useWhatsappStatus(uazFetch, configReady) {
  const [status, setStatus] = useState({ connected: false, number: '', qrcode: '' });
  const [isLoading, setIsLoading] = useState(true);
  const intervalRef = useRef(null);

  const check = useCallback(async () => {
    if (!configReady) return;
    try {
      const data = await uazFetch('/instance/status');
      const inst = data?.instance || {};
      const st = data?.status || {};
      const connected = !!(st.connected || inst.status === 'connected');
      const number = inst.owner || st.jid?.split(':')[0] || inst.number || '';
      const qrcode = inst.qrcode || '';
      setStatus({ connected, number, qrcode, profileName: inst.profileName || '' });
      return connected;
    } catch (e) {
      console.error('WhatsApp status check error:', e);
      setStatus({ connected: false, number: '', qrcode: '' });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [uazFetch, configReady]);

  useEffect(() => {
    if (!configReady) return;
    check();
    intervalRef.current = setInterval(check, 8000);
    return () => clearInterval(intervalRef.current);
  }, [check, configReady]);

  const startPolling = useCallback((ms = 5000) => {
    clearInterval(intervalRef.current);
    intervalRef.current = setInterval(check, ms);
  }, [check]);

  const stopPolling = useCallback(() => {
    clearInterval(intervalRef.current);
  }, []);

  // POST /instance/connect → triggers QR code generation
  const triggerConnect = useCallback(async () => {
    try {
      const data = await uazFetch('/instance/connect', { method: 'POST' });
      const qrcode = data?.instance?.qrcode || data?.qrcode || '';
      if (qrcode) {
        setStatus(prev => ({ ...prev, qrcode }));
      }
      return qrcode;
    } catch (e) {
      console.error('triggerConnect error:', e);
      return '';
    }
  }, [uazFetch]);

  // POST /instance/disconnect
  const logout = useCallback(async () => {
    try {
      await uazFetch('/instance/disconnect', { method: 'POST' });
      setStatus({ connected: false, number: '', qrcode: '' });
    } catch (e) {
      console.error('Logout error:', e);
    }
  }, [uazFetch]);

  return { status, isLoading, check, startPolling, stopPolling, logout, triggerConnect };
}
