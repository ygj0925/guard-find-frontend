import { PageContainer, ProTable } from '@ant-design/pro-components';
import {
  Alert,
  Button,
  DatePicker,
  Form,
  Input,
  InputNumber,
  message,
  Space,
  Spin,
  Switch,
  Tabs,
} from 'antd';
import { useEffect, useState } from 'react';
import {
  notificationRecords,
  type Settings,
  saveSettings,
  settings,
} from '@/services/web/guardfind/operations';
export default function SettingsPage() {
  const [form] = Form.useForm<Settings>();
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setFailed(false);
    settings()
      .then((r) => {
        if (alive) form.setFieldsValue(r.data);
      })
      .catch(() => {
        if (alive) setFailed(true);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [form, revision]);
  const save = async () => {
    const values = {
      ...form.getFieldsValue(true),
      ...(await form.validateFields()),
    };
    setSaving(true);
    try {
      await saveSettings(values);
      message.success('运营配置已保存');
    } finally {
      setSaving(false);
    }
  };
  const content = loading ? (
    <Spin />
  ) : failed ? (
    <Alert
      type="error"
      message="配置加载失败"
      action={<Button onClick={() => setRevision((v) => v + 1)}>重试</Button>}
    />
  ) : (
    <Form form={form} layout="vertical" style={{ maxWidth: 850 }}>
      <Tabs
        items={[
          {
            key: 'policy',
            label: '运营资料与协议',
            children: (
              <>
                <Alert
                  message="正式资料尚未准备时保持未发布。正文按纯文本展示，支持换行。"
                  type="info"
                  style={{ marginBottom: 20 }}
                />
                <Form.Item name="operator" label="运营主体名称">
                  <Input maxLength={100} />
                </Form.Item>
                <Form.Item name="contact" label="客服电话 / 邮箱">
                  <Input maxLength={100} />
                </Form.Item>
                <Space align="start">
                  <Form.Item name="policyVersion" label="协议版本">
                    <Input maxLength={40} placeholder="如 2026-11-v1" />
                  </Form.Item>
                  <Form.Item name="effectiveDate" label="生效日期">
                    <Input type="date" />
                  </Form.Item>
                </Space>
                <Form.Item name="userAgreement" label="用户协议正文">
                  <Input.TextArea rows={10} maxLength={30000} showCount />
                </Form.Item>
                <Form.Item name="privacyPolicy" label="隐私政策正文">
                  <Input.TextArea rows={10} maxLength={30000} showCount />
                </Form.Item>
                <Form.Item
                  name="policiesPublished"
                  label="发布协议"
                  valuePropName="checked"
                >
                  <Switch />
                </Form.Item>
              </>
            ),
          },
          {
            key: 'reminders',
            label: '预约与微信提醒',
            children: (
              <>
                <Alert
                  type="info"
                  message="微信订阅消息默认未启用。启用前需配置服务端 MINIAPP_WECHAT_APP_ID、MINIAPP_WECHAT_APP_SECRET，并填入同一小程序的有效订阅模板。用户主动授权后才会发送。"
                  style={{ marginBottom: 20 }}
                />
                <Form.Item
                  name="reminderHours"
                  label="看房前提醒（小时）"
                  rules={[{ required: true }]}
                >
                  <InputNumber min={1} max={168} />
                </Form.Item>
                <Form.Item
                  name="expiryHours"
                  label="超过预约时间后的自动关闭宽限（小时）"
                  rules={[{ required: true }]}
                >
                  <InputNumber min={1} max={168} />
                </Form.Item>
                <Form.Item name="templateId" label="微信模板 ID">
                  <Input maxLength={100} />
                </Form.Item>
                <Form.Item name="titleField" label="房源名称字段（thing 类型）">
                  <Input placeholder="thing1" />
                </Form.Item>
                <Form.Item name="timeField" label="预约时间字段（time 类型）">
                  <Input placeholder="time2" />
                </Form.Item>
                <Form.Item
                  name="statusField"
                  label="预约状态字段（phrase 类型）"
                >
                  <Input placeholder="phrase3" />
                </Form.Item>
                <Form.Item
                  name="subscriptionEnabled"
                  label="启用微信订阅消息"
                  valuePropName="checked"
                >
                  <Switch />
                </Form.Item>
              </>
            ),
          },
        ]}
      />
      <Button
        type="primary"
        loading={saving}
        onClick={() => void save().catch(() => {})}
      >
        保存全部配置
      </Button>
    </Form>
  );
  return (
    <PageContainer title="房源运营配置">
      {content}
      <h3 style={{ marginTop: 40 }}>微信提醒发送记录</h3>
      <ProTable
        rowKey="id"
        search={false}
        columns={[
          { title: '预约编号', dataIndex: 'bookingId' },
          { title: '用户 ID', dataIndex: 'userId' },
          {
            title: '结果',
            dataIndex: 'state',
            valueEnum: {
              PENDING: { text: '待发送' },
              SENDING: { text: '发送中' },
              SENT: { text: '已发送' },
              FAILED: { text: '微信拒绝' },
              UNKNOWN: { text: '结果未确认' },
              DISABLED: { text: '未启用' },
              NO_CONSENT: { text: '无可用授权' },
            },
          },
          { title: '说明', dataIndex: 'result' },
          { title: '时间', dataIndex: 'createTime' },
        ]}
        request={async ({ current, pageSize }) => {
          const r = await notificationRecords({
            page: current || 1,
            size: pageSize || 10,
          });
          return { data: r.data.list, total: r.data.total, success: true };
        }}
      />
    </PageContainer>
  );
}
