import React, { useState } from 'react';
import Button from '../components/ui/Button';
import { MessageSquare, CalendarDays, Check } from 'lucide-react';

// 4. CONFIGURAÇÕES
const SettingsPage = ({ uazConfig, setUazConfig, googleCal, setToast }) => {
  const handleSaveUaz = (e) => {
    e.preventDefault();
    localStorage.setItem('uazapiUrl', uazConfig.url);
    localStorage.setItem('uazapiToken', uazConfig.token);
    setToast({ message: 'Configurações de WhatsApp salvas!', type: 'success' });
  };
  const [gcClientId, setGcClientId] = useState(googleCal.clientId || '');

  return (
    <div className="max-w-3xl mx-auto space-y-6 fade-in pb-12">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-[#E8E2D8]">
        <div className="flex items-center space-x-4 mb-8">
          <img src="/logo-viva-beiramar.png" alt="Viva Beiramar" className="w-16 h-16 rounded-full shadow-md" />
          <div>
            <h2 className="text-xl font-bold font-serif text-[#1B2B3A]">Viva Beiramar</h2>
            <p className="text-[#8A8A8A]">contato@vivabeiramar.com.br</p>
          </div>
        </div>
      </div>

      <div className="bg-white p-8 rounded-2xl shadow-sm border border-[#E8E2D8]">
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-2 bg-[#F5F0E8] rounded-lg"><MessageSquare className="w-6 h-6 text-[#C4A265]" /></div>
          <h3 className="text-lg font-bold text-[#1B2B3A] font-serif">Integração WhatsApp (UAZAPI)</h3>
        </div>
        <form onSubmit={handleSaveUaz} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#1B2B3A] mb-1">Base URL da API</label>
            <input type="url" placeholder="Ex: https://api.uazapi.com" value={uazConfig.url} onChange={e => setUazConfig({...uazConfig, url: e.target.value})} className="w-full p-2.5 rounded-xl border border-[#E8E2D8] bg-[#FAF8F5] focus:bg-white outline-none focus:border-[#C4A265]" />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#1B2B3A] mb-1">Token de Acesso</label>
            <input type="password" placeholder="Seu token JWT ou Bearer" value={uazConfig.token} onChange={e => setUazConfig({...uazConfig, token: e.target.value})} className="w-full p-2.5 rounded-xl border border-[#E8E2D8] bg-[#FAF8F5] focus:bg-white outline-none focus:border-[#C4A265]" />
          </div>
          <div className="pt-2 flex justify-end">
            <Button type="submit">Salvar Configurações</Button>
          </div>
        </form>
      </div>

      <div className="bg-white p-8 rounded-2xl shadow-sm border border-[#E8E2D8]">
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-2 bg-[#F5F0E8] rounded-lg"><CalendarDays className="w-6 h-6 text-[#C4A265]" /></div>
          <h3 className="text-lg font-bold text-[#1B2B3A] font-serif">Google Calendar</h3>
        </div>

        {googleCal.isConnected ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-green-50 rounded-xl border border-green-200">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <Check className="w-5 h-5 text-green-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-green-800">Conectado ao Google Calendar</p>
                {googleCal.userEmail && <p className="text-xs text-green-600">{googleCal.userEmail}</p>}
              </div>
              <Button variant="danger" className="text-xs px-3 py-1.5" onClick={() => { googleCal.disconnect(); setToast({ message: 'Google Calendar desconectado.', type: 'info' }); }}>
                Desconectar
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-[#8A8A8A]">Conecte sua conta Google para sincronizar agendamentos automaticamente.</p>

            <div>
              <label className="block text-sm font-medium text-[#1B2B3A] mb-1">Client ID do Google</label>
              <input type="text" placeholder="xxxx.apps.googleusercontent.com" value={gcClientId}
                onChange={e => setGcClientId(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-[#E8E2D8] bg-[#FAF8F5] focus:bg-white outline-none focus:border-[#C4A265] text-sm" />
              <p className="text-[10px] text-[#8A8A8A] mt-1">
                Crie em <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="text-[#C4A265] underline">Google Cloud Console</a> → Credenciais → ID do cliente OAuth 2.0 (tipo: Aplicativo da Web)
              </p>
            </div>

            <div className="flex gap-3">
              <Button variant="outlineGray" onClick={() => {
                googleCal.saveClientId(gcClientId);
                setToast({ message: 'Client ID salvo!', type: 'success' });
              }}>Salvar Client ID</Button>

              <Button onClick={async () => {
                if (gcClientId) googleCal.saveClientId(gcClientId);
                try {
                  await googleCal.connect();
                  setToast({ message: 'Google Calendar conectado com sucesso!', type: 'success' });
                } catch (e) {
                  setToast({ message: e.message || 'Erro ao conectar.', type: 'error' });
                }
              }} isLoading={googleCal.isLoading}>
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="currentColor" d="M21.35,11.1H12.18V13.83H18.69C18.36,17.64 15.19,19.27 12.19,19.27C8.36,19.27 5,16.25 5,12C5,7.9 8.2,4.73 12.2,4.73C15.29,4.73 17.1,6.7 17.1,6.7L19,4.72C19,4.72 16.56,2 12.1,2C6.42,2 2.03,6.8 2.03,12C2.03,17.05 6.16,22 12.25,22C17.6,22 21.5,18.33 21.5,12.91C21.5,11.76 21.35,11.1 21.35,11.1V11.1Z" /></svg>
                  Conectar com Google
                </div>
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsPage;
