import React, { useState } from 'react';
import { X, Send, UserPlus, Loader2 } from 'lucide-react';

const SUPABASE_URL = 'https://hcmpjrqpjohksoznoycq.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhjbXBqcnFwam9oa3Nvem5veWNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5OTk0NjAsImV4cCI6MjA4ODU3NTQ2MH0.XRWi4ZULpICkTucXgGVQCP5wq1RmVwOFWTdMrOEMDnw';
const headers = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=representation' };

export function RequestReferralModal({ lead, onClose, onSent }) {
  const firstName = lead.name.split(' ')[0];
  const [message, setMessage] = useState(`Oi ${firstName}! Tudo bem?
Você conhece alguém procurando imóvel em Ubatuba? Me indica! Tenho condições especiais pra indicações 😉`);
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    setSending(true);
    try {
      // 1. Send via UAZAPI
      const uazUrl = localStorage.getItem('uazapiUrl');
      const uazToken = localStorage.getItem('uazapiToken');
      
      const phone = lead.phone?.replace(/\D/g, '');
      if (!phone) throw new Error('Lead não possui telefone válido.');
      
      if (uazUrl && uazToken) {
        const r = await fetch(`${uazUrl}/send/text`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', token: uazToken },
          body: JSON.stringify({ number: phone, text: message }),
        });
        if (!r.ok) console.warn('Falha no UAZAPI, mas continuaremos:', await r.text());
      } else {
        console.warn('UAZAPI não configurado, abrindo WhatsApp Web...');
        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
      }

      // 2. Registrar como follow-up
      await fetch(`${SUPABASE_URL}/rest/v1/follow_ups`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          lead_uuid: lead.id,
          lead_name: lead.name,
          lead_phone: lead.phone,
          type: 'whatsapp',
          template_key: 'indicacao',
          message_text: message,
          status: 'enviado',
          due_date: new Date().toISOString(),
          sent_at: new Date().toISOString(),
        })
      });

      onSent();
    } catch (e) {
      console.error(e);
      alert(e.message || 'Erro ao pedir indicação.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] bg-black/50 md:backdrop-blur-sm flex items-end md:items-center justify-center md:p-4" onClick={(e) => { e.stopPropagation(); onClose(); }}>
      <div className="bg-white w-full md:max-w-md md:rounded-2xl rounded-t-2xl shadow-xl overflow-hidden animate-scale-in" onClick={e => e.stopPropagation()}>
        <div className="p-4 md:p-5 border-b border-[#E8E2D8] bg-[#FAF8F5] flex justify-between items-center">
          <div>
            <h2 className="text-base font-bold font-serif text-[#1B2B3A]">Pedir indicação</h2>
            <p className="text-xs text-[#8A8A8A]">para {lead.name}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[#E8E2D8] rounded-full"><X className="w-5 h-5" /></button>
        </div>
        
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-[#1B2B3A] mb-2">Mensagem</label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={6}
              className="w-full p-3 rounded-xl border border-[#E8E2D8] focus:border-[#C4A265] outline-none resize-none text-sm bg-[#FAF8F5] focus:bg-white transition-colors"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button onClick={onClose} className="px-4 py-2 border border-[#E8E2D8] text-[#5A5A5A] text-sm font-medium rounded-xl hover:bg-[#F5F0E8] min-h-[48px] flex-1">
              Cancelar
            </button>
            <button
              onClick={handleSend}
              disabled={sending}
              className="bg-[#C4A265] text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-[#b89355] min-h-[48px] flex-[2] transition-colors"
            >
              {sending ? <><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</> : <><Send className="w-4 h-4" /> Enviar WhatsApp</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function RegisterReferralModal({ lead, properties, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: '',
    phone: '',
    interest: '',
    property_id: ''
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/crm_leads`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: form.name,
          phone: form.phone,
          interest: form.interest || null,
          property_id: form.property_id || null,
          source: `Indicação - ${lead.name}`,
          stage: 'Novo Lead',
          temperatura: 'QUENTE',
          score: 75,
          notes: `Indicado por ${lead.name} (${lead.phone})`
        })
      });
      const data = await r.json();
      if (r.ok && Array.isArray(data) && data[0]) {
        onSaved(data[0]);
      } else {
        throw new Error('Erro ao criar lead');
      }
    } catch (err) {
      console.error(err);
      alert('Erro ao registrar indicação.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] bg-black/50 md:backdrop-blur-sm flex items-end md:items-center justify-center md:p-4" onClick={(e) => { e.stopPropagation(); onClose(); }}>
      <div className="bg-white w-full md:max-w-md md:rounded-2xl rounded-t-2xl shadow-xl overflow-hidden animate-scale-in" onClick={e => e.stopPropagation()}>
        <div className="p-4 md:p-5 border-b border-[#E8E2D8] bg-[#FAF8F5] flex justify-between items-center">
          <div>
            <h2 className="text-base font-bold font-serif text-[#1B2B3A]">Novo lead por indicação</h2>
            <p className="text-xs text-[#8A8A8A]">Indicado por: {lead.name}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[#E8E2D8] rounded-full"><X className="w-5 h-5" /></button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-[#1B2B3A] mb-2">Nome *</label>
            <input required type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})}
              className="w-full p-2.5 rounded-xl border border-[#E8E2D8] focus:border-[#C4A265] outline-none bg-white text-sm" placeholder="Ex: João da Silva" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#1B2B3A] mb-2">Telefone *</label>
            <input required type="text" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})}
              className="w-full p-2.5 rounded-xl border border-[#E8E2D8] focus:border-[#C4A265] outline-none bg-white text-sm" placeholder="(12) 99999-9999" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#1B2B3A] mb-2">Interesse (opcional)</label>
            <input type="text" value={form.interest} onChange={e => setForm({...form, interest: e.target.value})}
              className="w-full p-2.5 rounded-xl border border-[#E8E2D8] focus:border-[#C4A265] outline-none bg-white text-sm" placeholder="Ex: Apartamento 3 quartos, vista mar" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#1B2B3A] mb-2">Imóvel (opcional)</label>
            <select value={form.property_id} onChange={e => setForm({...form, property_id: e.target.value})}
              className="w-full p-2.5 rounded-xl border border-[#E8E2D8] focus:border-[#C4A265] outline-none bg-white text-sm">
              <option value="">Nenhum imóvel específico</option>
              {properties.map(p => <option key={p.id} value={p.id}>{p.title} — {p.neighborhood || 'N/A'}</option>)}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-[#E8E2D8]">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-[#E8E2D8] text-[#5A5A5A] text-sm font-medium rounded-xl hover:bg-[#F5F0E8] min-h-[48px] flex-1">
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="bg-[#1B2B3A] text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-[#2A4054] min-h-[48px] flex-[2] transition-colors">
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Criando...</> : <><UserPlus className="w-4 h-4" /> Criar lead</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
