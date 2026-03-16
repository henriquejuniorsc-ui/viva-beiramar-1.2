import { useEffect, useRef } from 'react';

const SB_URL = 'https://hcmpjrqpjohksoznoycq.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhjbXBqcnFwam9oa3Nvem5veWNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5OTk0NjAsImV4cCI6MjA4ODU3NTQ2MH0.XRWi4ZULpICkTucXgGVQCP5wq1RmVwOFWTdMrOEMDnw';

// Lightweight Supabase Realtime via global supabase client
export function useRealtimeWhatsapp({
  activeChatPhone,
  addMessage,
  updateChatInList,
  incrementUnread,
  markAsRead,
  uazFetch,
}) {
  const audioRef = useRef(null);

  useEffect(() => {
    // Wait for supabase to be available globally (loaded in App.jsx via CDN)
    const waitForSupabase = () => {
      return new Promise((resolve) => {
        if (window.__supabaseClient) return resolve(window.__supabaseClient);
        // Try getting from global
        const check = setInterval(() => {
          if (window.__supabaseClient) {
            clearInterval(check);
            resolve(window.__supabaseClient);
          }
        }, 200);
        // Fallback: create our own client
        setTimeout(() => {
          clearInterval(check);
          if (window.supabase?.createClient) {
            const client = window.supabase.createClient(SB_URL, SB_KEY);
            window.__supabaseClient = client;
            resolve(client);
          } else {
            resolve(null);
          }
        }, 3000);
      });
    };

    let channels = [];

    waitForSupabase().then((sb) => {
      if (!sb) {
        console.warn('Supabase Realtime not available, falling back to polling');
        return;
      }

      // Listen for new messages
      const msgChannel = sb
        .channel('whatsapp-messages-realtime')
        .on('postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'whatsapp_messages' },
          (payload) => {
            const msg = payload.new;
            if (!msg) return;

            // Add to active chat
            addMessage(msg);

            // If incoming & not the active chat → increment unread + play sound
            if (msg.direction === 'incoming' && msg.chat_id !== activeChatPhone) {
              incrementUnread(msg.chat_id);
              playNotification();
            }

            // If incoming & active chat → auto-read
            if (msg.direction === 'incoming' && msg.chat_id === activeChatPhone) {
              markAsRead(activeChatPhone);
              if (uazFetch) {
                uazFetch('/chat/read', {
                  method: 'POST',
                  body: JSON.stringify({ number: `${activeChatPhone}@s.whatsapp.net`, read: true }),
                }).catch(() => {});
              }
            }
          }
        )
        .subscribe();
      channels.push(msgChannel);

      // Listen for chat updates
      const chatChannel = sb
        .channel('whatsapp-chats-realtime')
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'whatsapp_chats' },
          (payload) => {
            if (payload.new) updateChatInList(payload.new);
          }
        )
        .subscribe();
      channels.push(chatChannel);
    });

    return () => {
      channels.forEach(ch => {
        try { ch.unsubscribe(); } catch (e) { /* ignore */ }
      });
    };
  }, [activeChatPhone, addMessage, updateChatInList, incrementUnread, markAsRead, uazFetch]);

  function playNotification() {
    if (document.visibilityState !== 'visible') return;
    try {
      if (!audioRef.current) {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 800;
        gain.gain.value = 0.1;
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
        audioRef.current = true;
      } else {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 800;
        gain.gain.value = 0.1;
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      }
    } catch (e) { /* Audio not supported */ }
  }
}
