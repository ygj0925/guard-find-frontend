import { Tag } from 'antd';

export const APPLICATION_STATUS_META: Record<
  string,
  { text: string; color: string }
> = {
  RUNNING: { text: '审批中', color: 'processing' },
  APPROVED: { text: '已通过', color: 'green' },
  REJECTED: { text: '已驳回', color: 'red' },
  CANCELED: { text: '已撤销', color: 'default' },
  WITHDRAWN: { text: '已撤回', color: 'default' },
};

export function applicationStatusTag(status: string) {
  const meta = APPLICATION_STATUS_META[status] || {
    text: status,
    color: 'default',
  };
  return <Tag color={meta.color}>{meta.text}</Tag>;
}
