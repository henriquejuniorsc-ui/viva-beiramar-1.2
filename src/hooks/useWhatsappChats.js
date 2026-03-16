import { useState, useEffect, useCallback, useMemo } from 'react';

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
  return r.json();
}

async function sbPatch(path, body) {
  const r = await fetch(`${SB_URL}/rest/v1/${path}`, { method: 'PATCH', headers, body: JSON.stringify(body) });
  return r.json();
}

async function sbPost(path, body) {
  const r = await fetch(`${SB_URL}/rest/v1/${path}`, {
    method: 'POST',
    headers: { ...headers, Prefer: 'return=representation,resolution=merge-duplicates' },
    body: JSON.stringify(body),
  });
  return r.json();
}

export function useWhatsappChats(session) {
  const [chats, setChats] = useState([]);
  const [leads, setLeads] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    if (!session) return;
    setIsLoading(true);
    try {
      const [chatData, leadData] = await Promise.all([
        sbGet('whatsapp_chats?select=*&order=last_message_at.desc.nullsfirst&is_archived=eq.false'),
        sbGet('crm_leads?select=id,name,phone,stage,source,interest'),
      ]);
      setChats(Array.isArray(chatData) ? chatData : []);
      setLeads(Array.isArray(leadData) ? leadData : []);
    } catch (e) {
      console.error('useWhatsappChats load error:', e);
    } finally {
      setIsLoading(false);
    }
  }, [session]);

  useEffect(() => { load(); }, [load]);

  const leadByPhone = useMemo(() => {
    const map = {};
    leads.forEach(l => {
      if (l.phone) {
        const clean = l.phone.replace(/\D/g, '');
        map[clean] = l;
        if (clean.startsWith('55') && clean.length >= 12) map[clean.slice(2)] = l;
        if (!clean.startsWith('55') && clean.length >= 10) map['55' + clean] = l;
      }
    });
    return map;
  }, [leads]);

  const getLeadForPhone = useCallback((phone) => {
    if (!phone) return null;
    const clean = phone.replace(/\D/g, '').replace(/@.*$/, '');
    return leadByPhone[clean] || leadByPhone[clean.replace(/^55/, '')] || null;
  }, [leadByPhone]);

  const filtered = useMemo(() => {
    if (!search) return chats;
    const s = search.toLowerCase();
    return chats.filter(c => {
      const lead = getLeadForPhone(c.phone);
      const name = lead?.name || c.name || c.phone || '';
      return name.toLowerCase().includes(s) || (c.phone || '').includes(s);
    });
  }, [chats, search, getLeadForPhone]);

  const markAsRead = useCallback(async (phone) => {
    await sbPatch(`whatsapp_chats?phone=eq.${encodeURIComponent(phone)}`, { unread_count: 0 });
    setChats(prev => prev.map(c => c.phone === phone ? { ...c, unread_count: 0 } : c));
  }, []);

  const createChat = useCallback(async (phone, name) => {
    const clean = phone.replace(/\D/g, '');
    const result = await sbPost('whatsapp_chats', {
      phone: clean,
      name: name || null,
      unread_count: 0,
      is_archived: false,
      is_blocked: false,
    });
    if (Array.isArray(result) && result[0]) {
      setChats(prev => [result[0], ...prev]);
      return result[0];
    }
    return null;
  }, []);

  const updateChatInList = useCallback((updated) => {
    setChats(prev => {
      const exists = prev.find(c => c.id === updated.id || c.phone === updated.phone);
      if (exists) {
        return prev.map(c => (c.id === updated.id || c.phone === updated.phone) ? { ...c, ...updated } : c)
          .sort((a, b) => new Date(b.last_message_at || 0) - new Date(a.last_message_at || 0));
      }
      return [updated, ...prev];
    });
  }, []);

  const incrementUnread = useCallback((phone) => {
    setChats(prev => prev.map(c => c.phone === phone ? { ...c, unread_count: (c.unread_count || 0) + 1 } : c));
  }, []);

  return {
    chats: filtered, allChats: chats, leads, isLoading, search, setSearch,
    getLeadForPhone, markAsRead, createChat, updateChatInList, incrementUnread, reload: load,
  };
}
