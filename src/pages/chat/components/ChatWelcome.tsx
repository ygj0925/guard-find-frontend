import { CommentOutlined } from '@ant-design/icons';
import { Prompts, Welcome } from '@ant-design/x';
import React from 'react';

interface ChatWelcomeProps {
  onSend: (query: string) => void;
}

const promptItems = [
  { key: '1', label: '帮我写一个会议纪要模板' },
  { key: '2', label: '如何高效组织一场会议？' },
  { key: '3', label: '总结一下今天的待办事项' },
  { key: '4', label: '帮我草拟一封会议邀请邮件' },
];

const ChatWelcome: React.FC<ChatWelcomeProps> = ({ onSend }) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
        padding: 24,
      }}
    >
      <Welcome
        icon={<CommentOutlined style={{ fontSize: 28 }} />}
        title="你好，有什么可以帮你的吗？"
        description="你可以选择下方的快捷提问，或直接输入你的问题"
        style={{ marginBottom: 24 }}
      />
      <Prompts
        items={promptItems}
        wrap
        onItemClick={({ data }) => {
          if (data.label && typeof data.label === 'string') {
            onSend(data.label);
          }
        }}
      />
    </div>
  );
};

export default ChatWelcome;
