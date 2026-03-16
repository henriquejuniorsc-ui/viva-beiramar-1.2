import { useState, useCallback, useRef } from 'react';

const SB_URL = 'https://hcmpjrqpjohksoznoycq.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhjbXBqcnFwam9oa3Nvem5veWNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5OTk0NjAsImV4cCI6MjA4ODU3NTQ2MH0.XRWi4ZULpICkTucXgGVQCP5wq1RmVwOFWTdMrOEMDnw';

const headers = {
  apikey: SB_KEY,
  Authorization: `Bearer ${SB_KEY}`,
  'Content-Type': 'application/json',
};

const PAGE_SIZE = 50;

export function useWhatsappMessages() {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const offsetRef = useRef(0);
  const chatIdRef = useRef(null);

  const loadMessages = useCallback(async (chatPhone, reset = true) => {
    if (!chatPhone) return;
    setIsLoading(true);
    if (reset) {
      offsetRef.current = 0;
      chatIdRef.current = chatPhone;
      setMessages([]);
      setHasMore(true);
    }
    try {
      const offset = offsetRef.current;
      const r = await fetch(
        `${SB_URL}/rest/v1/whatsapp_messages?chat_id=eq.${encodeURIComponent(chatPhone)}&select=*&order=created_at.desc&limit=${PAGE_SIZE}&offset=${offset}`,
        { headers }
      );
      const data = await r.json();
      if (!Array.isArray(data)) { setIsLoading(false); return; }

      const sorted = data.reverse();
      if (reset) {
        setMessages(sorted);
      } else {
        setMessages(prev => [...sorted, ...prev]);
      }
      setHasMore(data.length === PAGE_SIZE);
      offsetRef.current = offset + data.length;
    } catch (e) {
      console.error('loadMessages error:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadOlder = useCallback(async () => {
    if (!chatIdRef.current || !hasMore || isLoading) return;
    await loadMessages(chatIdRef.current, false);
  }, [hasMore, isLoading, loadMessages]);

  const addMessage = useCallback((msg) => {
    if (msg.chat_id !== chatIdRef.current) return;
    setMessages(prev => {
      if (prev.find(m => m.id === msg.id || m.message_id === msg.message_id)) return prev;
      return [...prev, msg];
    });
  }, []);

  const updateMessageStatus = useCallback((msgId, status) => {
    setMessages(prev => prev.map(m =>
      (m.id === msgId || m.message_id === msgId) ? { ...m, status } : m
    ));
  }, []);

  return {
    messages, isLoading, hasMore, loadMessages, loadOlder,
    addMessage, updateMessageStatus, activeChatId: chatIdRef.current,
  };
}
