import { useState, useEffect, useCallback, useRef } from 'react';

// Google OAuth2 Client ID — configure this in Settings or set here
const GOOGLE_CLIENT_ID_KEY = 'googleCalendarClientId';
const GOOGLE_TOKEN_KEY = 'googleCalendarToken';
const GOOGLE_TOKEN_EXPIRY_KEY = 'googleCalendarTokenExpiry';
const SCOPES = 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events';
const CALENDAR_API = 'https://www.googleapis.com/calendar/v3';

// Load Google Identity Services script
function loadGIS() {
  return new Promise((resolve) => {
    if (window.google?.accounts?.oauth2) return resolve();
    const existing = document.querySelector('script[src*="accounts.google.com/gsi/client"]');
    if (existing) { existing.onload = resolve; return; }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = resolve;
    document.head.appendChild(script);
  });
}

export function useGoogleCalendar() {
  const [clientId, setClientId] = useState(localStorage.getItem(GOOGLE_CLIENT_ID_KEY) || '');
  const [accessToken, setAccessToken] = useState(localStorage.getItem(GOOGLE_TOKEN_KEY) || '');
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const tokenClientRef = useRef(null);

  // Check if token is still valid
  useEffect(() => {
    const token = localStorage.getItem(GOOGLE_TOKEN_KEY);
    const expiry = localStorage.getItem(GOOGLE_TOKEN_EXPIRY_KEY);
    if (token && expiry && Date.now() < Number(expiry)) {
      setAccessToken(token);
      setIsConnected(true);
      // Fetch user info
      fetchUserInfo(token);
    } else {
      setIsConnected(false);
      setAccessToken('');
    }
  }, []);

  const fetchUserInfo = async (token) => {
    try {
      const r = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (r.ok) {
        const data = await r.json();
        setUserName(data.name || '');
        setUserEmail(data.email || '');
      }
    } catch (e) { /* ignore */ }
  };

  // Save Client ID
  const saveClientId = useCallback((id) => {
    setClientId(id);
    localStorage.setItem(GOOGLE_CLIENT_ID_KEY, id);
  }, []);

  // Connect — triggers Google OAuth2 popup
  const connect = useCallback(async () => {
    const cid = clientId || localStorage.getItem(GOOGLE_CLIENT_ID_KEY);
    if (!cid) {
      throw new Error('Configure o Client ID do Google nas Configurações primeiro.');
    }

    setIsLoading(true);
    try {
      await loadGIS();

      return new Promise((resolve, reject) => {
        tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
          client_id: cid,
          scope: SCOPES,
          callback: (response) => {
            setIsLoading(false);
            if (response.error) {
              reject(new Error(response.error));
              return;
            }
            const token = response.access_token;
            const expiry = Date.now() + (response.expires_in * 1000);
            setAccessToken(token);
            setIsConnected(true);
            localStorage.setItem(GOOGLE_TOKEN_KEY, token);
            localStorage.setItem(GOOGLE_TOKEN_EXPIRY_KEY, String(expiry));
            // Also store in old key for backward compat
            localStorage.setItem('googleApiToken', token);
            fetchUserInfo(token);
            resolve(token);
          },
          error_callback: (err) => {
            setIsLoading(false);
            reject(err);
          },
        });
        tokenClientRef.current.requestAccessToken({ prompt: 'consent' });
      });
    } catch (e) {
      setIsLoading(false);
      throw e;
    }
  }, [clientId]);

  // Disconnect
  const disconnect = useCallback(() => {
    if (accessToken && window.google?.accounts?.oauth2) {
      window.google.accounts.oauth2.revoke(accessToken, () => {});
    }
    setAccessToken('');
    setIsConnected(false);
    setUserName('');
    setUserEmail('');
    localStorage.removeItem(GOOGLE_TOKEN_KEY);
    localStorage.removeItem(GOOGLE_TOKEN_EXPIRY_KEY);
    localStorage.removeItem('googleApiToken');
  }, [accessToken]);

  // Refresh token if expired (re-triggers consent)
  const ensureToken = useCallback(async () => {
    const expiry = localStorage.getItem(GOOGLE_TOKEN_EXPIRY_KEY);
    if (accessToken && expiry && Date.now() < Number(expiry)) {
      return accessToken;
    }
    // Token expired, need to reconnect
    return connect();
  }, [accessToken, connect]);

  // --- Calendar API methods ---

  const calFetch = useCallback(async (path, options = {}) => {
    const token = await ensureToken();
    const r = await fetch(`${CALENDAR_API}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    if (!r.ok) {
      const err = await r.text().catch(() => '');
      throw new Error(`Google API ${r.status}: ${err}`);
    }
    return r.json();
  }, [ensureToken]);

  // List events for a date range
  const listEvents = useCallback(async (timeMin, timeMax) => {
    const params = new URLSearchParams({
      timeMin: new Date(timeMin).toISOString(),
      timeMax: new Date(timeMax).toISOString(),
      singleEvents: 'true',
      orderBy: 'startTime',
      maxResults: '100',
    });
    const data = await calFetch(`/calendars/primary/events?${params}`);
    return (data.items || []).map(ev => ({
      id: ev.id,
      title: ev.summary || '',
      start_time: ev.start?.dateTime || ev.start?.date,
      end_time: ev.end?.dateTime || ev.end?.date,
      notes: ev.description || '',
      address: ev.location || '',
      google_event_id: ev.id,
      _fromGoogle: true,
    }));
  }, [calFetch]);

  // Create event
  const createEvent = useCallback(async (appointment) => {
    const body = {
      summary: appointment.title,
      description: [
        appointment.lead_name ? `Lead: ${appointment.lead_name}` : '',
        appointment.lead_phone ? `Tel: ${appointment.lead_phone}` : '',
        appointment.property_title ? `Imóvel: ${appointment.property_title}` : '',
        appointment.notes || '',
      ].filter(Boolean).join('\n'),
      location: appointment.address || '',
      start: { dateTime: new Date(appointment.start_time).toISOString(), timeZone: 'America/Sao_Paulo' },
      end: { dateTime: new Date(appointment.end_time).toISOString(), timeZone: 'America/Sao_Paulo' },
    };
    const data = await calFetch('/calendars/primary/events', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    return data.id; // Google event ID
  }, [calFetch]);

  // Delete event
  const deleteEvent = useCallback(async (googleEventId) => {
    const token = await ensureToken();
    await fetch(`${CALENDAR_API}/calendars/primary/events/${googleEventId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
  }, [ensureToken]);

  return {
    clientId, saveClientId,
    isConnected, isLoading, accessToken,
    userName, userEmail,
    connect, disconnect, ensureToken,
    listEvents, createEvent, deleteEvent,
  };
}
