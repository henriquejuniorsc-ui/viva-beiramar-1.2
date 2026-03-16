import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useUazapiConfig } from '../../hooks/useUazapiConfig';
import { useWhatsappStatus } from '../../hooks/useWhatsappStatus';
import { useWhatsappChats } from '../../hooks/useWhatsappChats';
import { useWhatsappMessages } from '../../hooks/useWhatsappMessages';
import { useSendMessage } from '../../hooks/useSendMessage';
import { useRealtimeWhatsapp } from '../../hooks/useRealtimeWhatsapp';
import QRCodeScreen from './QRCodeScreen';
import ChatList from './ChatList';
import ChatArea from './ChatArea';
import {
  MessageSquare, Loader2, AlertCircle, Menu, ArrowLeft,
} from 'lucide-react';

export default function ConversasPage({ session, setCurrentRoute }) {
  const { config, isLoading: configLoading, uazFetch } = useUazapiConfig();
  const configReady = !configLoading && !!config.baseUrl && !!config.token;

  const { status: waStatus, isLoading: statusLoading, check: checkStatus, logout, triggerConnect } = useWhatsappStatus(uazFetch, configReady);

  const chatHook = useWhatsappChats(session);
  const msgHook = useWhatsappMessages();
  const sendHook = useSendMessage(uazFetch, msgHook.addMessage, msgHook.updateMessageStatus);

  const [activeChat, setActiveChat] = useState(null);
  const [mobileShowChat, setMobileShowChat] = useState(false);

  // Realtime
  useRealtimeWhatsapp({
    activeChatPhone: activeChat?.phone || null,
    addMessage: msgHook.addMessage,
    updateChatInList: chatHook.updateChatInList,
    incrementUnread: chatHook.incrementUnread,
    markAsRead: chatHook.markAsRead,
    uazFetch,
  });

  // Open a chat
  const openChat = useCallback(async (chat) => {
    setActiveChat(chat);
    setMobileShowChat(true);
    await msgHook.loadMessages(chat.phone, true);
    if (chat.unread_count > 0) {
      chatHook.markAsRead(chat.phone);
      // Mark read in UAZAPI
      uazFetch('/chat/read', {
        method: 'POST',
        body: JSON.stringify({ number: `${chat.phone}@s.whatsapp.net`, read: true }),
      }).catch(() => {});
    }
  }, [msgHook, chatHook, uazFetch]);

  const goBackToList = () => setMobileShowChat(false);

  // Loading state
  if (configLoading || statusLoading) {
    return (
      <div className="h-[calc(100vh-8rem)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#C4A265]" />
      </div>
    );
  }

  // No config
  if (!config.baseUrl || !config.token) {
    return (
      <div className="h-[calc(100vh-8rem)] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-[#E8E2D8] p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-xl font-bold font-serif text-[#1B2B3A] mb-2">UAZAPI não configurada</h2>
          <p className="text-sm text-[#8A8A8A] mb-4">
            Configure a URL e o Token da UAZAPI na seção Configurações para ativar o WhatsApp.
          </p>
          <button
            onClick={() => setCurrentRoute?.('settings')}
            className="px-4 py-2 bg-[#C4A265] text-white rounded-lg text-sm font-medium hover:bg-[#b89355]"
          >
            Ir para Configurações
          </button>
        </div>
      </div>
    );
  }

  // Not connected — show QR
  if (!waStatus.connected) {
    return <QRCodeScreen uazFetch={uazFetch} onConnected={checkStatus} triggerConnect={triggerConnect} />;
  }

  // Connected — show chat interface
  return (
    <div className="h-[calc(100vh-8rem)] bg-white rounded-2xl shadow-sm border border-[#E8E2D8] overflow-hidden flex">
      {/* Chat List - left panel */}
      <div className={`w-full md:w-[340px] md:flex-shrink-0 border-r border-[#E8E2D8] flex flex-col ${mobileShowChat ? 'hidden md:flex' : 'flex'}`}>
        <ChatList
          chats={chatHook.chats}
          search={chatHook.search}
          setSearch={chatHook.setSearch}
          activeChat={activeChat}
          onSelectChat={openChat}
          getLeadForPhone={chatHook.getLeadForPhone}
          connectedNumber={waStatus.number}
          onLogout={logout}
          onNewChat={chatHook.createChat}
          onRefresh={chatHook.reload}
        />
      </div>

      {/* Chat Area - right panel */}
      <div className={`flex-1 flex flex-col min-w-0 ${!mobileShowChat ? 'hidden md:flex' : 'flex'}`}>
        {activeChat ? (
          <ChatArea
            chat={activeChat}
            lead={chatHook.getLeadForPhone(activeChat.phone)}
            messages={msgHook.messages}
            isLoading={msgHook.isLoading}
            hasMore={msgHook.hasMore}
            onLoadOlder={msgHook.loadOlder}
            sendText={sendHook.sendText}
            sendImage={sendHook.sendImage}
            sendDocument={sendHook.sendDocument}
            resend={sendHook.resend}
            sendPresence={sendHook.sendPresence}
            onBack={goBackToList}
            setCurrentRoute={setCurrentRoute}
            uazFetch={uazFetch}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center bg-[#f0f2f5]">
            <div className="text-center">
              <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-[#8A8A8A] text-sm">Selecione uma conversa ou inicie uma nova</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
