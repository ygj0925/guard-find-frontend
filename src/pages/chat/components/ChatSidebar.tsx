import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { Conversations } from '@ant-design/x';
import React, { useMemo } from 'react';
import type { Session } from '../types';

interface ChatSidebarProps {
  sessions: Session[];
  activeSessionId?: string;
  onSwitch: (id: string) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
}

const ChatSidebar: React.FC<ChatSidebarProps> = ({
  sessions,
  activeSessionId,
  onSwitch,
  onCreate,
  onDelete,
}) => {
  const items = useMemo(
    () =>
      sessions.map((s) => ({
        key: s.id,
        label: s.label || '新对话',
      })),
    [sessions],
  );

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Conversations
        items={items}
        activeKey={activeSessionId}
        onActiveChange={(key) => onSwitch(key as string)}
        creation={{
          icon: <PlusOutlined />,
          label: '新建对话',
          onClick: onCreate,
        }}
        menu={(conversation) => ({
          items: [
            {
              key: 'delete',
              label: '删除',
              icon: <DeleteOutlined />,
              danger: true,
            },
          ],
          onClick: ({ key }) => {
            if (key === 'delete') {
              onDelete(conversation.key);
            }
          },
        })}
        style={{ flex: 1, overflow: 'auto' }}
      />
    </div>
  );
};

export default ChatSidebar;
