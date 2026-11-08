/**
 * 限时代理设置：委托人维护自己的代理规则，窗口内代理人可代为处理审批。
 */
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import {
  Button,
  Card,
  DatePicker,
  Form,
  Input,
  Modal,
  message,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import React, { useEffect, useState } from 'react';
import { useModel } from 'umi';
import {
  createOaDelegateRule,
  deleteOaDelegateRule,
  type OaDelegateRuleVo,
  type OaEmployeeOptionVo,
  queryOaDelegateRules,
  queryOaEmployeeOptions,
} from '@/services/web/guardfind/oa';

const MAX_WINDOW_DAYS = 90;

interface DelegateFormValues {
  delegateId: number;
  window: [Dayjs, Dayjs];
  reason?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
}

function errorText(error: unknown) {
  return error instanceof Error ? error.message : '操作失败';
}

function statusTag(rule: OaDelegateRuleVo) {
  if (rule.status !== 'ENABLED') {
    return <Tag>已取消</Tag>;
  }
  const now = dayjs();
  if (now.isBefore(dayjs(rule.startTime))) {
    return <Tag color="blue">未开始</Tag>;
  }
  if (!now.isBefore(dayjs(rule.endTime))) {
    return <Tag>已结束</Tag>;
  }
  return <Tag color="green">代理中</Tag>;
}

const DelegateRulesModal: React.FC<Props> = ({ open, onClose }) => {
  const currentUser = useModel(
    '@@initialState',
    (model) => model.initialState?.user,
  );
  const [form] = Form.useForm<DelegateFormValues>();
  const [rules, setRules] = useState<OaDelegateRuleVo[]>([]);
  const [employees, setEmployees] = useState<OaEmployeeOptionVo[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [ruleResp, employeeResp] = await Promise.all([
        queryOaDelegateRules(),
        queryOaEmployeeOptions(),
      ]);
      setRules(ruleResp.data ?? []);
      setEmployees(employeeResp.data ?? []);
    } catch (error) {
      message.error(errorText(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    form.resetFields();
    void load();
  }, [open]);

  const submit = async () => {
    const values = await form.validateFields();
    const [start, end] = values.window;
    setSaving(true);
    try {
      await createOaDelegateRule({
        delegateId: values.delegateId,
        startTime: start.format('YYYY-MM-DDTHH:mm:ss'),
        endTime: end.format('YYYY-MM-DDTHH:mm:ss'),
        reason: values.reason?.trim() || undefined,
      });
      message.success('代理规则已创建');
      form.resetFields();
      await load();
    } catch (error) {
      message.error(errorText(error));
    } finally {
      setSaving(false);
    }
  };

  const cancelRule = async (rule: OaDelegateRuleVo) => {
    try {
      await deleteOaDelegateRule(rule.id);
      message.success('代理规则已取消');
      await load();
    } catch (error) {
      message.error(errorText(error));
    }
  };

  const employeeOptions = employees
    .filter((employee) => String(employee.userId) !== String(currentUser?.id))
    .map((employee) => ({
      value: employee.userId,
      label: employee.employeeNo
        ? `${employee.nickname}（${employee.employeeNo}）`
        : employee.nickname,
    }));

  return (
    <Modal
      title="限时代理"
      open={open}
      width={760}
      footer={null}
      onCancel={onClose}
      destroyOnHidden
    >
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <Typography.Text type="secondary">
          代理窗口最长 {MAX_WINDOW_DAYS}{' '}
          天。代理期间，代理人可在待办中看到并处理你的任务，
          审批轨迹会同时记录代理人与委托人。
        </Typography.Text>
        <Card size="small" title="新建代理">
          <Form form={form} layout="vertical" requiredMark={false}>
            <Space size={12} align="start" wrap>
              <Form.Item
                name="delegateId"
                label="代理人"
                rules={[{ required: true, message: '请选择代理人' }]}
                style={{ minWidth: 220 }}
              >
                <Select
                  showSearch
                  optionFilterProp="label"
                  placeholder="选择本租户在职员工"
                  options={employeeOptions}
                />
              </Form.Item>
              <Form.Item
                name="window"
                label="代理时间"
                rules={[
                  { required: true, message: '请选择代理时间' },
                  {
                    validator: (_, value: [Dayjs, Dayjs] | undefined) => {
                      if (!value?.[0] || !value?.[1]) {
                        return Promise.resolve();
                      }
                      if (!value[0].isBefore(value[1])) {
                        return Promise.reject(
                          new Error('开始时间必须早于结束时间'),
                        );
                      }
                      if (value[1].diff(value[0], 'day') > MAX_WINDOW_DAYS) {
                        return Promise.reject(
                          new Error(`代理窗口不能超过 ${MAX_WINDOW_DAYS} 天`),
                        );
                      }
                      return Promise.resolve();
                    },
                  },
                ]}
              >
                <DatePicker.RangePicker
                  showTime={{ format: 'HH:mm' }}
                  format="YYYY-MM-DD HH:mm"
                  style={{ width: 360 }}
                />
              </Form.Item>
            </Space>
            <Form.Item name="reason" label="原因">
              <Input maxLength={500} placeholder="选填，例如出差、休假" />
            </Form.Item>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              loading={saving}
              onClick={() => void submit()}
            >
              创建代理
            </Button>
          </Form>
        </Card>
        <Table<OaDelegateRuleVo>
          size="small"
          rowKey="id"
          loading={loading}
          dataSource={rules}
          pagination={false}
          scroll={{ x: 640 }}
          columns={[
            {
              title: '代理人',
              dataIndex: 'delegateName',
              render: (_, record) => record.delegateName || record.delegateId,
            },
            {
              title: '状态',
              key: 'status',
              width: 90,
              render: (_, record) => statusTag(record),
            },
            {
              title: '代理时间',
              key: 'window',
              render: (_, record) =>
                `${dayjs(record.startTime).format('YYYY-MM-DD HH:mm')} ~ ${dayjs(
                  record.endTime,
                ).format('YYYY-MM-DD HH:mm')}`,
            },
            {
              title: '原因',
              dataIndex: 'reason',
              ellipsis: true,
              render: (_, record) => record.reason || '—',
            },
            {
              title: '操作',
              key: 'action',
              width: 90,
              render: (_, record) =>
                record.status === 'ENABLED' ? (
                  <Popconfirm
                    title="取消这条代理规则？"
                    onConfirm={() => void cancelRule(record)}
                  >
                    <Button danger type="link" icon={<DeleteOutlined />}>
                      取消
                    </Button>
                  </Popconfirm>
                ) : (
                  <span>—</span>
                ),
            },
          ]}
          locale={{ emptyText: '还没有代理规则' }}
        />
      </Space>
    </Modal>
  );
};

export default DelegateRulesModal;
