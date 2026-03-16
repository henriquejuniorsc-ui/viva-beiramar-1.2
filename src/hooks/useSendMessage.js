import { useCallback } from 'react';

const SB_URL = 'https://hcmpjrqpjohksoznoycq.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhjbXBqcnFwam9oa3Nvem5veWNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5OTk0NjAsImV4cCI6MjA4ODU3NTQ2MH0.XRWi4ZULpICkTucXgGVQCP5wq1RmVwOFWTdMrOEMDnw';

const sbHeaders = {
  apikey: SB_KEY,
  Authorization: `Bearer ${SB_KEY}`,
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
};

function generateId() {
  return 'msg_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
}

export function useSendMessage(uazFetch, addMessage, updateMessageStatus) {

  const sendText = useCallback(async (chatPhone, text) => {
    const msgId = generateId();
    const now = new Date().toISOString();

    // 1. Optimistic insert
    const optimistic = {
      id: msgId,
      chat_id: chatPhone,
      message_id: msgId,
      direction: 'outgoing',
      content_type: 'text',
      content: text,
      status: 'pending',
      created_at: now,
    };
    addMessage(optimistic);

    // 2. Insert in Supabase
    try {
      const sbRes = await fetch(`${SB_URL}/rest/v1/whatsapp_messages`, {
        method: 'POST',
        headers: sbHeaders,
        body: JSON.stringify(optimistic),
      });
      const sbData = await sbRes.json();
      if (Array.isArray(sbData) && sbData[0]) {
        optimistic.id = sbData[0].id;
      }
    } catch (e) {
      console.error('DB insert error:', e);
    }

    // 3. Send via UAZAPI
    try {
      await uazFetch('/send/text', {
        method: 'POST',
        body: JSON.stringify({ number: chatPhone, text }),
      });
      updateMessageStatus(msgId, 'sent');

      // Update status in DB
      await fetch(`${SB_URL}/rest/v1/whatsapp_messages?message_id=eq.${msgId}`, {
        method: 'PATCH',
        headers: sbHeaders,
        body: JSON.stringify({ status: 'sent' }),
      });
    } catch (e) {
      console.error('UAZAPI send error:', e);
      updateMessageStatus(msgId, 'failed');
      await fetch(`${SB_URL}/rest/v1/whatsapp_messages?message_id=eq.${msgId}`, {
        method: 'PATCH',
        headers: sbHeaders,
        body: JSON.stringify({ status: 'failed' }),
      });
    }

    // 4. Update chat last_message
    try {
      await fetch(`${SB_URL}/rest/v1/whatsapp_chats?phone=eq.${encodeURIComponent(chatPhone)}`, {
        method: 'PATCH',
        headers: sbHeaders,
        body: JSON.stringify({ last_message: text, last_message_at: now }),
      });
    } catch (e) { /* ignore */ }

    return msgId;
  }, [uazFetch, addMessage, updateMessageStatus]);

  const sendImage = useCallback(async (chatPhone, file, caption = '') => {
    const msgId = generateId();
    const now = new Date().toISOString();

    const reader = new FileReader();
    const base64 = await new Promise((resolve) => {
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(file);
    });

    const optimistic = {
      id: msgId,
      chat_id: chatPhone,
      message_id: msgId,
      direction: 'outgoing',
      content_type: 'image',
      content: caption,
      media_url: base64,
      status: 'pending',
      created_at: now,
    };
    addMessage(optimistic);

    try {
      await fetch(`${SB_URL}/rest/v1/whatsapp_messages`, {
        method: 'POST',
        headers: sbHeaders,
        body: JSON.stringify({ ...optimistic, media_url: null }),
      });
    } catch (e) { /* ignore */ }

    try {
      await uazFetch('/send/image', {
        method: 'POST',
        body: JSON.stringify({ number: chatPhone, image: base64, caption }),
      });
      updateMessageStatus(msgId, 'sent');
    } catch (e) {
      console.error('UAZAPI send image error:', e);
      updateMessageStatus(msgId, 'failed');
    }

    return msgId;
  }, [uazFetch, addMessage, updateMessageStatus]);

  const sendDocument = useCallback(async (chatPhone, file) => {
    const msgId = generateId();
    const now = new Date().toISOString();

    const reader = new FileReader();
    const base64 = await new Promise((resolve) => {
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(file);
    });

    const optimistic = {
      id: msgId,
      chat_id: chatPhone,
      message_id: msgId,
      direction: 'outgoing',
      content_type: 'document',
      content: file.name,
      media_filename: file.name,
      status: 'pending',
      created_at: now,
    };
    addMessage(optimistic);

    try {
      await uazFetch('/send/document', {
        method: 'POST',
        body: JSON.stringify({ number: chatPhone, document: base64, fileName: file.name }),
      });
      updateMessageStatus(msgId, 'sent');
    } catch (e) {
      updateMessageStatus(msgId, 'failed');
    }

    return msgId;
  }, [uazFetch, addMessage, updateMessageStatus]);

  const resend = useCallback(async (chatPhone, msg) => {
    updateMessageStatus(msg.message_id || msg.id, 'pending');
    try {
      if (msg.content_type === 'image') {
        await uazFetch('/send/image', {
          method: 'POST',
          body: JSON.stringify({ number: chatPhone, image: msg.media_url, caption: msg.content }),
        });
      } else {
        await uazFetch('/send/text', {
          method: 'POST',
          body: JSON.stringify({ number: chatPhone, text: msg.content }),
        });
      }
      updateMessageStatus(msg.message_id || msg.id, 'sent');
    } catch (e) {
      updateMessageStatus(msg.message_id || msg.id, 'failed');
    }
  }, [uazFetch, updateMessageStatus]);

  const sendPresence = useCallback(async (chatPhone) => {
    try {
      await uazFetch('/message/presence', {
        method: 'POST',
        body: JSON.stringify({ number: chatPhone, presence: 'composing', delay: 5000 }),
      });
    } catch (e) { /* ignore */ }
  }, [uazFetch]);

  return { sendText, sendImage, sendDocument, resend, sendPresence };
}
