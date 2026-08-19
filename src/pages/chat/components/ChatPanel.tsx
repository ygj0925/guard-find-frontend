import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  LoadingOutlined,
  RobotOutlined,
  UserOutlined,
} from '@ant-design/icons';
import type { BubbleItemType, ThoughtChainItemType } from '@ant-design/x';
import { Bubble, CodeHighlighter, Sender, ThoughtChain } from '@ant-design/x';
import { Avatar } from 'antd';
import React, { useMemo } from 'react';
import type { ChatMessage, ToolCall } from '../types';
import ChatWelcome from './ChatWelcome';

interface ChatPanelProps {
  messages: ChatMessage[];
  streaming: boolean;
  onSend: (query: string) => void;
  onCancel: () => void;
  compact?: boolean;
}

const toolStatusMap: Record<
  ToolCall['status'],
  { status: ThoughtChainItemType['status']; icon: React.ReactNode }
> = {
  running: { status: 'loading', icon: <LoadingOutlined spin /> },
  success: {
    status: 'success',
    icon: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
  },
  error: {
    status: 'error',
    icon: <CloseCircleOutlined style={{ color: '#ff4d4f' }} />,
  },
};

function renderToolContent(tool: ToolCall) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <CodeHighlighter lang="javascript">{tool.code}</CodeHighlighter>
      {tool.status === 'success' && tool.output != null && (
        <pre style={{ margin: 0, fontSize: 12, whiteSpace: 'pre-wrap' }}>
          {typeof tool.output === 'string'
            ? tool.output
            : JSON.stringify(tool.output, null, 2)}
        </pre>
      )}
      {tool.status === 'error' && tool.error && (
        <div style={{ color: '#ff4d4f', fontSize: 12 }}>{tool.error}</div>
      )}
    </div>
  );
}

function toThoughtChainItems(tools: ToolCall[]): ThoughtChainItemType[] {
  return tools.map((tool) => {
    const mapped = toolStatusMap[tool.status];
    return {
      key: tool.id,
      title: tool.name,
      icon: mapped.icon,
      status: mapped.status,
      content: renderToolContent(tool),
      collapsible: tool.status !== 'running',
      blink: tool.status === 'running',
    };
  });
}

const roles: React.ComponentProps<typeof Bubble.List>['role'] = {
  user: {
    placement: 'end',
    avatar: (
      <Avatar icon={<UserOutlined />} style={{ background: '#1677ff' }} />
    ),
  },
  ai: {
    placement: 'start',
    avatar: (
      <Avatar icon={<RobotOutlined />} style={{ background: '#52c41a' }} />
    ),
    typing: { effect: 'typing' },
    contentRender: (content, info) => {
      const msg = info?.extraInfo as ChatMessage | undefined;
      const tools = msg?.tools;
      if (!tools?.length) return content;
      return (
        <>
          <ThoughtChain items={toThoughtChainItems(tools)} line="dashed" />
          {msg?.content && <div style={{ marginTop: 8 }}>{msg.content}</div>}
        </>
      );
    },
  },
};

function toBubbleStatus(
  status: ChatMessage['status'],
): BubbleItemType['status'] {
  if (status === 'streaming') return 'loading';
  return status;
}

const ChatPanel: React.FC<ChatPanelProps> = ({
  messages,
  streaming,
  onSend,
  onCancel,
  compact = false,
}) => {
  const items: BubbleItemType[] = useMemo(
    () =>
      messages.map((m) => ({
        key: m.key,
        role: m.role === 'user' ? 'user' : 'ai',
        content: m.content,
        status: toBubbleStatus(m.status),
        streaming: m.status === 'streaming',
        loading: m.status === 'loading',
        variant:
          m.status === 'error' ? ('outlined' as const) : ('filled' as const),
        style: m.status === 'error' ? { borderColor: '#ff4d4f' } : undefined,
        extraInfo: m,
      })),
    [messages],
  );

  const isEmpty = messages.length === 0;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      <div style={{ flex: 1, overflow: 'auto' }}>
        {isEmpty ? (
          <ChatWelcome onSend={onSend} />
        ) : (
          <Bubble.List
            items={items}
            role={roles}
            autoScroll
            style={{ height: '100%', padding: compact ? 12 : 16 }}
          />
        )}
      </div>
      <div
        style={{
          padding: compact ? '8px 12px' : '12px 16px',
          borderTop: '1px solid #f0f0f0',
        }}
      >
        <Sender
          loading={streaming}
          placeholder="输入消息..."
          onSubmit={onSend}
          onCancel={onCancel}
        />
      </div>
    </div>
  );
};

export default ChatPanel;
