import React, { useState } from 'react';
import {
  Search, MoreVertical, Edit3, RefreshCw, LogOut, Phone,
  User, X, Check, Plus,
} from 'lucide-react';

const STAGE_TAGS = {
  'Novo Lead': { label: 'Novo', cls: 'bg-blue-50 text-blue-600' },
  'Interessado': { label: 'Interessado', cls: 'bg-blue-50 text-blue-600' },
  'Qualificado': { label: 'Qualificado', cls: 'bg-amber-50 text-amber-600' },
  'Visita Agendada': { label: 'Visita', cls: 'bg-amber-50 text-amber-600' },
  'Em Negociação': { label: 'Negociação', cls: 'bg-green-50 text-green-600' },
  'Contrato': { label: 'Contrato', cls: 'bg-green-50 text-green-600' },
  'Fechado': { label: 'Fechado', cls: 'bg-[#C4A265]/10 text-[#C4A265]' },
  'Perdido': { label: 'Perdido', cls: 'bg-gray-100 text-gray-500' },
};

function formatPhone(phone) {
  if (!phone) return '';
  const clean = phone.replace(/\D/g, '');
  if (clean.length === 13 && clean.startsWith('55')) {
    return `+55 (${clean.slice(2, 4)}) ${clean.slice(4, 9)}-${clean.slice(9)}`;
  }
  if (clean.length >= 10) {
    const ddd = clean.slice(0, 2);
    const rest = clean.slice(2);
    return `(${ddd}) ${rest.slice(0, rest.length - 4)}-${rest.slice(-4)}`;
  }
  return phone;
}

function formatTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now - d;
  const isToday = d.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();

  if (isToday) return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  if (isYesterday) return 'Ontem';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

function hashColor(str) {
  let hash = 0;
  for (let i = 0; i < (str || '').length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 45%, 55%)`;
}

function ChatListItem({ chat, isActive, lead, onSelect }) {
  const name = lead?.name || chat.name || formatPhone(chat.phone);
  const stage = lead?.stage ? STAGE_TAGS[lead.stage] : null;
  const avatarColor = hashColor(chat.phone);

  return (
    <button
      onClick={() => onSelect(chat)}
      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50 ${isActive ? 'bg-gray-50' : ''}`}
    >
      {/* Avatar */}
      <div className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-white text-sm font-bold"
        style={{ backgroundColor: chat.avatar_url ? 'transparent' : avatarColor }}>
        {chat.avatar_url ? (
          <img src={chat.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
        ) : getInitials(name)}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium text-[#1B2B3A] truncate">{name}</span>
          {stage && (
            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${stage.cls}`}>{stage.label}</span>
          )}
        </div>
        <p className="text-xs text-[#8A8A8A] truncate mt-0.5">{chat.last_message || 'Sem mensagens'}</p>
      </div>

      {/* Time + Badge */}
      <div className="flex-shrink-0 flex flex-col items-end gap-1">
        <span className={`text-[10px] ${chat.unread_count > 0 ? 'text-[#25D366] font-medium' : 'text-[#8A8A8A]'}`}>
          {formatTime(chat.last_message_at)}
        </span>
        {chat.unread_count > 0 && (
          <span className="bg-[#25D366] text-white text-[10px] font-bold min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1">
            {chat.unread_count}
          </span>
        )}
      </div>
    </button>
  );
}

export default function ChatList({
  chats, search, setSearch, activeChat, onSelectChat,
  getLeadForPhone, connectedNumber, onLogout, onNewChat, onRefresh,
}) {
  const [showMenu, setShowMenu] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [newPhone, setNewPhone] = useState('');

  const handleNewChat = async () => {
    if (!newPhone.trim()) return;
    const clean = newPhone.replace(/\D/g, '');
    const phone = clean.startsWith('55') ? clean : `55${clean}`;
    const chat = await onNewChat(phone);
    if (chat) {
      onSelectChat(chat);
      setShowNewChat(false);
      setNewPhone('');
    }
  };

  return (
    <>
      {/* Header */}
      <div className="px-4 py-3 border-b border-[#E8E2D8] bg-[#FAF8F5] flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#25D366]" />
            <span className="text-xs text-[#1B2B3A] font-medium">Conectado</span>
            {connectedNumber && (
              <span className="text-[10px] text-[#8A8A8A]">
                +{connectedNumber.replace(/^55/, '55 ')}
              </span>
            )}
          </div>
          <div className="flex gap-1">
            <button onClick={() => setShowNewChat(!showNewChat)}
              className="p-1.5 hover:bg-white rounded-lg transition-colors" title="Nova conversa">
              <Edit3 className="w-4 h-4 text-[#8A8A8A]" />
            </button>
            <div className="relative">
              <button onClick={() => setShowMenu(!showMenu)}
                className="p-1.5 hover:bg-white rounded-lg transition-colors">
                <MoreVertical className="w-4 h-4 text-[#8A8A8A]" />
              </button>
              {showMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                  <div className="absolute right-0 top-8 bg-white rounded-lg shadow-lg border border-[#E8E2D8] py-1 z-20 w-48">
                    <button onClick={() => { onRefresh(); setShowMenu(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[#1B2B3A] hover:bg-gray-50">
                      <RefreshCw className="w-3.5 h-3.5" />Atualizar lista
                    </button>
                    <button onClick={() => { onLogout(); setShowMenu(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-500 hover:bg-red-50">
                      <LogOut className="w-3.5 h-3.5" />Desconectar WhatsApp
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* New chat input */}
        {showNewChat && (
          <div className="flex gap-2 mb-3">
            <div className="flex-1 relative">
              <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8A8A8A]" />
              <input
                type="text"
                placeholder="DDD + número (ex: 12999999999)"
                value={newPhone}
                onChange={e => setNewPhone(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleNewChat()}
                className="w-full pl-8 pr-3 py-2 rounded-lg border border-[#E8E2D8] text-xs focus:outline-none focus:border-[#25D366]"
                autoFocus
              />
            </div>
            <button onClick={handleNewChat}
              className="px-3 py-2 bg-[#25D366] text-white rounded-lg text-xs hover:bg-[#1da851]">
              <Plus className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => { setShowNewChat(false); setNewPhone(''); }}
              className="px-2 py-2 text-[#8A8A8A] hover:bg-gray-100 rounded-lg">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8A8A8A]" />
          <input
            type="text"
            placeholder="Buscar contato..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-white border border-[#E8E2D8] text-xs focus:outline-none focus:border-[#C4A265]"
          />
        </div>
      </div>

      {/* Chat list */}
      <div className="flex-1 overflow-y-auto">
        {chats.length === 0 ? (
          <div className="p-8 text-center">
            <User className="w-10 h-10 text-gray-200 mx-auto mb-2" />
            <p className="text-xs text-[#8A8A8A]">Nenhuma conversa encontrada</p>
          </div>
        ) : (
          <div className="divide-y divide-[#E8E2D8]/50">
            {chats.map(chat => (
              <ChatListItem
                key={chat.id}
                chat={chat}
                isActive={activeChat?.phone === chat.phone}
                lead={getLeadForPhone(chat.phone)}
                onSelect={onSelectChat}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
