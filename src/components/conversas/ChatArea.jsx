import React, { useState, useRef, useEffect, useCallback } from 'react';
import EmojiPicker from 'emoji-picker-react';
import {
  ArrowLeft, Phone, Calendar, MoreVertical, Send, Smile, Paperclip,
  Check, CheckCheck, Clock, AlertCircle, RefreshCw, X,
  FileText, Download, Play, Pause, Image as ImageIcon, Loader2,
  Archive, Ban, Eye,
} from 'lucide-react';

// --- Date formatting ---
function formatMsgTime(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function formatDateSeparator(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return 'Hoje';
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Ontem';
  return d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function formatPhone(phone) {
  if (!phone) return '';
  const clean = phone.replace(/\D/g, '');
  if (clean.length === 13 && clean.startsWith('55')) {
    return `+55 (${clean.slice(2, 4)}) ${clean.slice(4, 9)}-${clean.slice(9)}`;
  }
  return phone;
}

function isSameDay(d1, d2) {
  const a = new Date(d1), b = new Date(d2);
  return a.toDateString() === b.toDateString();
}

const STAGE_TAGS = {
  'Novo Lead': { label: 'Novo Lead', cls: 'bg-blue-50 text-blue-600 border-blue-200' },
  'Interessado': { label: 'Interessado', cls: 'bg-blue-50 text-blue-600 border-blue-200' },
  'Qualificado': { label: 'Qualificado', cls: 'bg-amber-50 text-amber-600 border-amber-200' },
  'Visita Agendada': { label: 'Visita Agendada', cls: 'bg-amber-50 text-amber-600 border-amber-200' },
  'Em Negociação': { label: 'Em Negociação', cls: 'bg-green-50 text-green-600 border-green-200' },
  'Contrato': { label: 'Contrato', cls: 'bg-green-50 text-green-600 border-green-200' },
  'Fechado': { label: 'Fechado', cls: 'bg-[#C4A265]/10 text-[#C4A265] border-[#C4A265]/20' },
  'Perdido': { label: 'Perdido', cls: 'bg-gray-100 text-gray-500 border-gray-200' },
};

// --- Status indicator ---
function StatusIcon({ status }) {
  switch (status) {
    case 'pending': return <Clock className="w-3 h-3 text-gray-400" />;
    case 'sent': return <Check className="w-3 h-3 text-gray-400" />;
    case 'delivered': return <CheckCheck className="w-3 h-3 text-gray-400" />;
    case 'read': return <CheckCheck className="w-3 h-3 text-[#53bdeb]" />;
    case 'failed': return <AlertCircle className="w-3 h-3 text-red-500" />;
    default: return null;
  }
}

// --- Chat Bubble ---
function ChatBubble({ msg, onResend, onImageClick }) {
  const isOut = msg.direction === 'outgoing';
  const time = formatMsgTime(msg.created_at);

  const bubbleClass = isOut
    ? 'bg-[#fdf6e3] ml-auto rounded-xl rounded-tr-sm'
    : 'bg-white mr-auto rounded-xl rounded-tl-sm';

  const renderContent = () => {
    switch (msg.content_type) {
      case 'image':
        return (
          <div>
            {msg.media_url && (
              <img
                src={msg.media_url}
                alt=""
                className="max-w-[280px] rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => onImageClick(msg.media_url)}
              />
            )}
            {msg.content && <p className="text-sm mt-1 whitespace-pre-wrap">{msg.content}</p>}
          </div>
        );
      case 'audio':
        return (
          <div className="flex items-center gap-2 min-w-[200px]">
            <audio controls className="h-8 max-w-full" style={{ filter: 'sepia(20%) saturate(70%) grayscale(20%) brightness(100%)' }}>
              {msg.media_url && <source src={msg.media_url} />}
            </audio>
          </div>
        );
      case 'document':
        return (
          <div className="flex items-center gap-3 bg-gray-50/50 rounded-lg p-2 min-w-[200px]">
            <FileText className="w-8 h-8 text-[#C4A265] flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-[#1B2B3A] truncate">{msg.media_filename || msg.content || 'Documento'}</p>
              <p className="text-[10px] text-[#8A8A8A]">Documento</p>
            </div>
            {msg.media_url && (
              <a href={msg.media_url} download className="p-1 hover:bg-gray-200 rounded">
                <Download className="w-4 h-4 text-[#8A8A8A]" />
              </a>
            )}
          </div>
        );
      default:
        return <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>;
    }
  };

  return (
    <div className={`flex ${isOut ? 'justify-end' : 'justify-start'} px-4 group`}>
      <div className={`max-w-[65%] px-3 py-2 shadow-sm ${bubbleClass}`}>
        {renderContent()}
        <div className={`flex items-center gap-1 mt-1 ${isOut ? 'justify-end' : ''}`}>
          <span className="text-[10px] text-gray-400">{time}</span>
          {isOut && <StatusIcon status={msg.status} />}
          {msg.status === 'failed' && isOut && (
            <button onClick={() => onResend(msg)}
              className="ml-1 text-[10px] text-red-500 hover:text-red-700 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <RefreshCw className="w-3 h-3" />Reenviar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// --- Date Separator ---
function DateSeparator({ date }) {
  return (
    <div className="flex justify-center my-3">
      <span className="bg-white/80 text-gray-500 text-[11px] py-1 px-3 rounded-full shadow-sm">
        {formatDateSeparator(date)}
      </span>
    </div>
  );
}

// --- Image Preview Modal ---
function ImagePreviewModal({ src, onClose }) {
  if (!src) return null;
  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-white/10 rounded-full hover:bg-white/20">
        <X className="w-6 h-6 text-white" />
      </button>
      <img src={src} alt="" className="max-w-full max-h-full rounded-lg" onClick={e => e.stopPropagation()} />
    </div>
  );
}

// --- File Preview (before sending) ---
function FilePreview({ file, onSend, onCancel }) {
  const [preview, setPreview] = useState(null);
  const isImage = file.type.startsWith('image/');

  useEffect(() => {
    if (isImage) {
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target.result);
      reader.readAsDataURL(file);
    }
  }, [file, isImage]);

  return (
    <div className="absolute bottom-full left-0 right-0 bg-white border-t border-[#E8E2D8] p-4 shadow-lg">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-[#1B2B3A]">Enviar {isImage ? 'imagem' : 'documento'}</span>
        <button onClick={onCancel} className="p-1 hover:bg-gray-100 rounded"><X className="w-4 h-4" /></button>
      </div>
      <div className="flex items-center gap-3">
        {isImage && preview ? (
          <img src={preview} alt="" className="w-20 h-20 object-cover rounded-lg" />
        ) : (
          <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center">
            <FileText className="w-8 h-8 text-gray-400" />
          </div>
        )}
        <div className="flex-1">
          <p className="text-sm text-[#1B2B3A] truncate">{file.name}</p>
          <p className="text-xs text-[#8A8A8A]">{(file.size / 1024).toFixed(0)} KB</p>
        </div>
        <button onClick={onSend}
          className="px-4 py-2 bg-[#C4A265] text-white rounded-lg text-sm font-medium hover:bg-[#b89355] flex items-center gap-1">
          <Send className="w-4 h-4" />Enviar
        </button>
      </div>
    </div>
  );
}

// --- Main ChatArea ---
export default function ChatArea({
  chat, lead, messages, isLoading, hasMore, onLoadOlder,
  sendText, sendImage, sendDocument, resend, sendPresence,
  onBack, setCurrentRoute, uazFetch,
}) {
  const [text, setText] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [pendingFile, setPendingFile] = useState(null);
  const [showMenu, setShowMenu] = useState(false);
  const [atBottom, setAtBottom] = useState(true);
  const [newMsgIndicator, setNewMsgIndicator] = useState(false);

  const messagesEndRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const presenceTimer = useRef(null);
  const prevMsgCount = useRef(0);

  const name = lead?.name || chat.name || formatPhone(chat.phone);
  const stage = lead?.stage ? STAGE_TAGS[lead.stage] : null;

  // Auto-scroll on new messages
  useEffect(() => {
    if (messages.length > prevMsgCount.current) {
      if (atBottom) {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      } else {
        setNewMsgIndicator(true);
      }
    }
    prevMsgCount.current = messages.length;
  }, [messages.length, atBottom]);

  // Initial scroll to bottom
  useEffect(() => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView();
    }, 100);
  }, [chat.phone]);

  // Track scroll position
  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
    setAtBottom(isAtBottom);
    if (isAtBottom) setNewMsgIndicator(false);

    // Load older when scrolled to top
    if (el.scrollTop < 50 && hasMore && !isLoading) {
      const prevHeight = el.scrollHeight;
      onLoadOlder().then(() => {
        requestAnimationFrame(() => {
          el.scrollTop = el.scrollHeight - prevHeight;
        });
      });
    }
  }, [hasMore, isLoading, onLoadOlder]);

  // Send text
  const handleSend = async () => {
    const msg = text.trim();
    if (!msg) return;
    setText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    await sendText(chat.phone, msg);
  };

  // Keyboard
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Auto-resize textarea
  const handleTextChange = (e) => {
    setText(e.target.value);
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = 'auto';
      ta.style.height = Math.min(ta.scrollHeight, 120) + 'px';
    }
    // Send presence (debounced)
    clearTimeout(presenceTimer.current);
    presenceTimer.current = setTimeout(() => {
      sendPresence(chat.phone);
    }, 3000);
  };

  // Emoji
  const handleEmojiClick = (emojiData) => {
    setText(prev => prev + emojiData.emoji);
    textareaRef.current?.focus();
  };

  // File
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPendingFile(file);
    e.target.value = '';
  };

  const handleFileSend = async () => {
    if (!pendingFile) return;
    const file = pendingFile;
    setPendingFile(null);
    if (file.type.startsWith('image/')) {
      await sendImage(chat.phone, file, '');
    } else {
      await sendDocument(chat.phone, file);
    }
  };

  // Render messages with date separators
  const renderMessages = () => {
    const elements = [];
    let lastDate = null;

    messages.forEach((msg, i) => {
      const msgDate = msg.created_at;
      if (!lastDate || !isSameDay(lastDate, msgDate)) {
        elements.push(<DateSeparator key={`sep-${i}`} date={msgDate} />);
      }
      lastDate = msgDate;
      elements.push(
        <ChatBubble
          key={msg.id || msg.message_id}
          msg={msg}
          onResend={(m) => resend(chat.phone, m)}
          onImageClick={setImagePreview}
        />
      );
    });

    return elements;
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header */}
      <div className="px-4 py-3 bg-[#FAF8F5] border-b border-[#E8E2D8] flex items-center gap-3 flex-shrink-0">
        <button onClick={onBack} className="md:hidden p-1.5 hover:bg-white rounded-lg mr-1">
          <ArrowLeft className="w-5 h-5 text-[#1B2B3A]" />
        </button>

        <div className="w-9 h-9 rounded-full bg-[#C4A265] flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
          {(name || '?')[0]?.toUpperCase()}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm text-[#1B2B3A] truncate">{name}</span>
            {stage && (
              <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-medium ${stage.cls}`}>{stage.label}</span>
            )}
          </div>
          <p className="text-[10px] text-[#8A8A8A]">{formatPhone(chat.phone)}</p>
        </div>

        <div className="flex items-center gap-1">
          {lead ? (
            <>
              {lead.interest && (
                <span className="text-[9px] text-[#8A8A8A] px-1.5 py-0.5 bg-gray-50 rounded hidden md:inline">{lead.interest}</span>
              )}
              <button onClick={() => setCurrentRoute?.('crm')}
                className="px-2.5 py-1.5 text-[10px] text-[#C4A265] border border-[#C4A265] rounded-lg hover:bg-[#C4A265] hover:text-white transition-colors font-medium">
                Ver no CRM
              </button>
            </>
          ) : (
            <button onClick={() => {
              // Navigate to CRM — in future could open a create-lead modal
              setCurrentRoute?.('crm');
            }}
              className="px-2.5 py-1.5 text-[10px] text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors font-medium">
              + Criar lead
            </button>
          )}
          <button onClick={() => setCurrentRoute?.('agenda')}
            className="p-1.5 hover:bg-white rounded-lg" title="Agendar">
            <Calendar className="w-4 h-4 text-[#8A8A8A]" />
          </button>
          <div className="relative">
            <button onClick={() => setShowMenu(!showMenu)} className="p-1.5 hover:bg-white rounded-lg">
              <MoreVertical className="w-4 h-4 text-[#8A8A8A]" />
            </button>
            {showMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 top-8 bg-white rounded-lg shadow-lg border border-[#E8E2D8] py-1 z-20 w-44">
                  <button className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[#1B2B3A] hover:bg-gray-50"
                    onClick={() => setShowMenu(false)}>
                    <Eye className="w-3.5 h-3.5" />Marcar como lida
                  </button>
                  <button className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[#1B2B3A] hover:bg-gray-50"
                    onClick={() => setShowMenu(false)}>
                    <Archive className="w-3.5 h-3.5" />Arquivar
                  </button>
                  <button className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-500 hover:bg-red-50"
                    onClick={() => setShowMenu(false)}>
                    <Ban className="w-3.5 h-3.5" />Bloquear
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Messages area */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto bg-[#f0f2f5] py-3 space-y-1 relative"
      >
        {isLoading && messages.length === 0 && (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-[#C4A265]" />
          </div>
        )}
        {hasMore && messages.length > 0 && (
          <div className="flex justify-center py-2">
            <button onClick={onLoadOlder} className="text-xs text-[#8A8A8A] hover:text-[#1B2B3A] flex items-center gap-1">
              {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
              Carregar mensagens anteriores
            </button>
          </div>
        )}
        {renderMessages()}
        <div ref={messagesEndRef} />
      </div>

      {/* New message indicator */}
      {newMsgIndicator && (
        <button
          onClick={() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            setNewMsgIndicator(false);
          }}
          className="absolute bottom-20 right-6 bg-white shadow-lg rounded-full px-3 py-1.5 text-xs text-[#1B2B3A] flex items-center gap-1 z-10 border border-[#E8E2D8] hover:shadow-xl"
        >
          ↓ Nova mensagem
        </button>
      )}

      {/* Input area */}
      <div className="bg-white border-t border-[#E8E2D8] px-3 py-2 flex items-end gap-2 flex-shrink-0 relative">
        {/* File preview */}
        {pendingFile && (
          <FilePreview file={pendingFile} onSend={handleFileSend} onCancel={() => setPendingFile(null)} />
        )}

        {/* Emoji picker */}
        {showEmoji && (
          <div className="absolute bottom-full left-0 z-20 mb-2">
            <div className="relative">
              <button onClick={() => setShowEmoji(false)} className="absolute -top-2 -right-2 bg-white rounded-full shadow p-1 z-30">
                <X className="w-3 h-3" />
              </button>
              <EmojiPicker onEmojiClick={handleEmojiClick} width={320} height={350}
                searchPlaceholder="Buscar emoji..." previewConfig={{ showPreview: false }}
                lazyLoadEmojis={true} />
            </div>
          </div>
        )}

        <button onClick={() => setShowEmoji(!showEmoji)}
          className="p-2 hover:bg-gray-100 rounded-full flex-shrink-0">
          <Smile className="w-5 h-5 text-[#8A8A8A]" />
        </button>

        <button onClick={() => fileInputRef.current?.click()}
          className="p-2 hover:bg-gray-100 rounded-full flex-shrink-0">
          <Paperclip className="w-5 h-5 text-[#8A8A8A]" />
        </button>
        <input ref={fileInputRef} type="file" className="hidden"
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
          onChange={handleFileSelect} />

        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          placeholder="Digite uma mensagem..."
          rows={1}
          className="flex-1 bg-[#f0f2f5] rounded-2xl px-4 py-2.5 text-sm resize-none focus:outline-none max-h-[120px]"
        />

        {text.trim() && (
          <button onClick={handleSend}
            className="p-2 bg-[#C4A265] text-white rounded-full hover:bg-[#b89355] flex-shrink-0 transition-colors">
            <Send className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Image preview modal */}
      <ImagePreviewModal src={imagePreview} onClose={() => setImagePreview(null)} />
    </div>
  );
}
