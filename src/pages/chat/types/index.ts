export type ToolCall = {
  id: string;
  name: string;
  code: string;
  status: 'running' | 'success' | 'error';
  output?: any;
  error?: string;
};

export type ToolCallChunk = {
  id: string;
  name: string;
  code: string;
  status: 'pending' | 'running' | 'success' | 'error';
  output?: any;
  error?: string;
};

export type ChatMessage = {
  key: string;
  role: 'user' | 'assistant';
  content: string;
  status: 'local' | 'loading' | 'streaming' | 'success' | 'error';
  time?: string;
  tools?: ToolCall[];
};

export type Session = {
  id: string;
  label: string;
  createdAt: string;
  updatedAt?: string;
};

export type ChatStreamChunk = {
  content: string;
  time: string;
  status: 'success' | 'error';
  role: 'assistant' | 'user';
  tools?: ToolCallChunk[];
};

export type ChatRequest = {
  query: string;
  sessionId?: string;
};
