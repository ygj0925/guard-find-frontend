import { CloseOutlined, FullscreenOutlined } from '@ant-design/icons';
import { XProvider } from '@ant-design/x';
import { history } from '@umijs/max';
import React from 'react';
import ChatPanel from '@/pages/chat/components/ChatPanel';
import { useChat } from '@/pages/chat/hooks/useChat';

interface ChatWindowProps {
  onClose: () => void;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ onClose }) => {
  const {
    sessions,
    activeSessionId,
    messages,
    streaming,
    sendMessage,
    cancelStream,
  } = useChat();
  const currentSession = sessions.find(
    (session) => session.id === activeSessionId,
  );

  const openFullScreen = () => {
    onClose();
    history.push(
      activeSessionId ? `/chat?sessionId=${activeSessionId}` : '/chat',
    );
  };

  return (
    <div className="chat-float-window">
      <XProvider>
        <div className="chat-float-inner">
          <div className="chat-float-header">
            <span style={{ fontWeight: 500 }}>
              {currentSession?.label || '智能助手'}
            </span>
            <span>
              <FullscreenOutlined
                className="chat-float-header-icon"
                onClick={openFullScreen}
              />
              <CloseOutlined
                className="chat-float-header-icon"
                onClick={onClose}
              />
            </span>
          </div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <ChatPanel
              messages={messages}
              streaming={streaming}
              onSend={sendMessage}
              onCancel={cancelStream}
              compact
            />
          </div>
        </div>
      </XProvider>
    </div>
  );
};

export default ChatWindow;
