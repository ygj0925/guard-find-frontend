import { XProvider } from '@ant-design/x';
import React from 'react';
import ChatPanel from './components/ChatPanel';
import ChatSidebar from './components/ChatSidebar';
import { useChat } from './hooks/useChat';

const ChatPage: React.FC = () => {
  const {
    sessions,
    activeSessionId,
    messages,
    streaming,
    sendMessage,
    createSession,
    deleteSession,
    switchSession,
    cancelStream,
  } = useChat();

  return (
    <XProvider>
      <div style={{ display: 'flex', height: '100%', background: '#fff' }}>
        <div
          style={{
            width: 240,
            borderRight: '1px solid #f0f0f0',
            flexShrink: 0,
          }}
        >
          <ChatSidebar
            sessions={sessions}
            activeSessionId={activeSessionId}
            onSwitch={switchSession}
            onCreate={createSession}
            onDelete={deleteSession}
          />
        </div>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <ChatPanel
            messages={messages}
            streaming={streaming}
            onSend={sendMessage}
            onCancel={cancelStream}
          />
        </div>
      </div>
    </XProvider>
  );
};

export default ChatPage;
