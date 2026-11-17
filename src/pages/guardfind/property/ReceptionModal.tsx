import {
  Alert,
  Form,
  Input,
  InputNumber,
  Modal,
  message,
  Select,
  Space,
  Spin,
} from 'antd';
import { useEffect, useState } from 'react';
import { useAccess } from '@/hooks/useAccess';
import {
  availabilityLabels,
  type Reception,
  reception,
  saveReception,
} from '@/services/web/guardfind/operations';
import CustomerSelect from '../components/CustomerSelect';
export default function ReceptionModal({
  id,
  onClose,
}: {
  id: string;
  onClose: () => void;
}) {
  const [form] = Form.useForm<Reception>();
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [retry, setRetry] = useState(0);
  const access = useAccess();
  const [activeBookings, setActiveBookings] = useState(0);
  useEffect(() => {
    let current = true;
    setLoading(true);
    setFailed(false);
    reception(id)
      .then((r) => {
        if (current) {
          form.setFieldsValue(r.data);
          setActiveBookings(r.data.activeBookings || 0);
        }
      })
      .catch(() => {
        if (current) setFailed(true);
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
    };
  }, [id, form, retry]);
  const save = async () => {
    const values = await form.validateFields();
    setSaving(true);
    try {
      await saveReception(id, values);
      message.success('房源接待信息已保存');
      onClose();
    } finally {
      setSaving(false);
    }
  };
  return (
    <Modal
      okText="保存接待信息"
      title="房源接待与管家"
      open
      onCancel={onClose}
      onOk={() => void save().catch(() => {})}
      confirmLoading={saving}
      okButtonProps={{
        disabled:
          loading || failed || !access.hasPermission('system:property:update'),
      }}
      cancelButtonProps={{ disabled: saving }}
      maskClosable={!saving}
      closable={!saving}
      width={650}
    >
      {loading ? (
        <Spin />
      ) : failed ? (
        <Alert
          type="error"
          message="接待信息加载失败"
          action={<a onClick={() => setRetry((v) => v + 1)}>重试</a>}
        />
      ) : (
        <Form form={form} layout="vertical">
          <Alert
            type="info"
            message={`该房源有 ${activeBookings} 条进行中的预约。停止接待不会替代预约取消，请到看房预约逐一处理并通知用户。`}
            style={{ marginBottom: 16 }}
          />
          <Form.Item name="version" hidden>
            <InputNumber />
          </Form.Item>
          <Form.Item
            name="managerId"
            label="负责接待的管家"
            extra="与房东归属独立；选择已认证且启用的管家。"
          >
            <CustomerSelect
              managers
              disabled={!access.hasPermission('system:property:assign')}
            />
          </Form.Item>
          <Form.Item
            name="availability"
            label="业务状态"
            rules={[{ required: true }]}
          >
            <Select
              disabled={!access.hasPermission('system:property:status')}
              options={Object.entries(availabilityLabels).map(
                ([value, label]) => ({ value, label }),
              )}
            />
          </Form.Item>
          <Form.Item
            name="reason"
            label="停止接待原因"
            extra="非正常接待状态需填写，会展示给用户。"
          >
            <Input.TextArea maxLength={500} showCount />
          </Form.Item>
          <Form.Item name="reopenDate" label="预计重新开放日期">
            <Input type="date" />
          </Form.Item>
          <Space align="start">
            <Form.Item name="latitude" label="纬度（GCJ-02）">
              <InputNumber min={-90} max={90} precision={7} />
            </Form.Item>
            <Form.Item name="longitude" label="经度（GCJ-02）">
              <InputNumber min={-180} max={180} precision={7} />
            </Form.Item>
          </Space>
          <Form.Item name="meetingPoint" label="看房集合地点">
            <Input maxLength={200} />
          </Form.Item>
          <Form.Item name="instructions" label="到访说明">
            <Input.TextArea rows={4} maxLength={2000} showCount />
          </Form.Item>
        </Form>
      )}
    </Modal>
  );
}
