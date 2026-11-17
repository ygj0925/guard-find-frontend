import {
  Alert,
  Button,
  Form,
  Input,
  Modal,
  message,
  Select,
  Space,
  Tag,
  Timeline,
} from 'antd';
import { useEffect, useState } from 'react';
import { useAccess } from '@/hooks/useAccess';
import {
  adminOptions,
  type Ticket,
  ticket,
  ticketAction,
} from '@/services/web/guardfind/operations';
export default function SupportWorkflow({ userId }: { userId: string }) {
  const [data, setData] = useState<Ticket>();
  const [failed, setFailed] = useState(false);
  const [revision, setRevision] = useState(0);
  const [action, setAction] = useState<string>();
  const [saving, setSaving] = useState(false);
  const [admins, setAdmins] = useState<{ id: string; nickname: string }[]>([]);
  const [form] = Form.useForm();
  const access = useAccess();
  useEffect(() => {
    let alive = true;
    setFailed(false);
    setData(undefined);
    ticket(userId)
      .then((r) => {
        if (alive) setData(r.data);
      })
      .catch(() => {
        if (alive) setFailed(true);
      });
    return () => {
      alive = false;
    };
  }, [userId, revision]);
  const begin = async (value: string) => {
    form.resetFields();
    setAction(value);
    if (value === 'TRANSFER') {
      try {
        setAdmins((await adminOptions()).data);
      } catch {
        message.error('客服列表加载失败');
      }
    }
  };
  const submit = async () => {
    if (!data || !action) return;
    const values = await form.validateFields();
    setSaving(true);
    try {
      await ticketAction(userId, { ...values, action, version: data.version });
      message.success('会话处理已保存');
      setAction(undefined);
      setRevision((v) => v + 1);
    } finally {
      setSaving(false);
    }
  };
  const names: Record<string, string> = {
    CLAIM: '认领接待',
    TRANSFER: '转交客服',
    RESOLVE: '标记已解决',
    REOPEN: '重新打开',
    NOTE: '添加内部备注',
  };
  return (
    <div style={{ padding: '12px 20px', borderBottom: '1px solid #eee' }}>
      {failed ? (
        <Alert
          type="error"
          message="接待状态加载失败"
          action={<a onClick={() => setRevision((v) => v + 1)}>重试</a>}
        />
      ) : data ? (
        <>
          <Space wrap>
            <Button size="small" onClick={() => setRevision((v) => v + 1)}>
              刷新接待状态
            </Button>
            <Tag color={data.state === 'OPEN' ? 'blue' : 'green'}>
              {data.state === 'OPEN' ? '待解决' : '已解决'}
            </Tag>
            <span>
              {data.ownerAdminId
                ? `接待客服 ID：${data.ownerAdminId}`
                : '未认领'}
            </span>
            {access.hasPermission('system:im:workflow') &&
              Object.keys(names).map((a) => (
                <Button size="small" key={a} onClick={() => void begin(a)}>
                  {names[a]}
                </Button>
              ))}
          </Space>
          {data.property?.[0] && (
            <div style={{ marginTop: 8 }}>
              咨询房源：{data.property[0].title}（{data.property[0].id}）
            </div>
          )}
          <details style={{ marginTop: 8 }}>
            <summary>内部接待记录（用户不可见）</summary>
            <Timeline
              style={{ marginTop: 12 }}
              items={(data.logs || []).map((l) => ({
                key: l.id,
                children: `${l.createTime} ${l.adminName || '系统'} · ${names[l.action] || l.action} ${l.note || ''}`,
              }))}
            />
          </details>
        </>
      ) : (
        <span>加载接待状态…</span>
      )}
      <Modal
        open={!!action}
        title={action ? names[action] : ''}
        onCancel={() => setAction(undefined)}
        onOk={() => void submit().catch(() => {})}
        confirmLoading={saving}
        closable={!saving}
        maskClosable={!saving}
      >
        <Form form={form} layout="vertical">
          {action === 'TRANSFER' && (
            <Form.Item
              name="ownerAdminId"
              label="转交给"
              rules={[{ required: true }]}
            >
              <Select
                showSearch
                optionFilterProp="label"
                options={admins.map((a) => ({
                  value: a.id,
                  label: a.nickname,
                }))}
              />
            </Form.Item>
          )}
          <Form.Item
            name="note"
            label="内部备注"
            rules={[{ required: action === 'NOTE', whitespace: true }]}
          >
            <Input.TextArea maxLength={2000} rows={4} showCount />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
