import { CrownOutlined } from '@ant-design/icons';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import { Avatar, Button, Form, Input, Modal, message, Popconfirm } from 'antd';
import { useRef, useState } from 'react';
import AccessControl from '@/components/AccessControl';
import type { ManagerVo } from '@/services/web/guardfind/property';
import { queryManagers, setManager } from '@/services/web/guardfind/property';

export default function ManagersPage() {
  const actionRef = useRef<ActionType>(null);
  const [form] = Form.useForm<{ userId: string }>();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const addManager = async () => {
    if (saving) return;
    const values = await form.validateFields();
    setSaving(true);
    try {
      await setManager(values.userId.trim(), true);
      message.success('已设为认证管家');
      setOpen(false);
      form.resetFields();
      actionRef.current?.reload();
    } finally {
      setSaving(false);
    }
  };
  const columns: ProColumns<ManagerVo>[] = [
    { title: '用户 ID', dataIndex: 'userId', width: 180, copyable: true },
    {
      title: '头像',
      dataIndex: 'avatar',
      width: 80,
      render: (_, row) => (
        <Avatar src={row.avatar || undefined}>
          {(row.nickname || '管家').slice(0, 1)}
        </Avatar>
      ),
    },
    { title: '管家姓名', dataIndex: 'nickname', ellipsis: true },
    { title: '联系电话', dataIndex: 'phone', copyable: true },
    {
      title: '操作',
      valueType: 'option',
      width: 130,
      render: (_, row) => (
        <AccessControl permission="system:property:manager:set">
          <Popconfirm
            title="确定取消该用户的管家身份？"
            onConfirm={async () => {
              await setManager(row.userId, false);
              message.success('已取消管家');
              actionRef.current?.reload();
            }}
          >
            <Button type="link" danger>
              取消管家
            </Button>
          </Popconfirm>
        </AccessControl>
      ),
    },
  ];
  return (
    <PageContainer title="管家列表">
      <ProTable<ManagerVo>
        headerTitle="认证管家"
        rowKey="userId"
        actionRef={actionRef}
        columns={columns}
        search={false}
        scroll={{ x: 720 }}
        pagination={{ defaultPageSize: 10, showSizeChanger: true }}
        request={async ({ current, pageSize }) => {
          const response = await queryManagers({
            page: current || 1,
            size: pageSize || 10,
          });
          return {
            data: response.data?.list || [],
            total: response.data?.total || 0,
            success: true,
          };
        }}
        toolBarRender={() => [
          <AccessControl key="add" permission="system:property:manager:set">
            <Button
              type="primary"
              icon={<CrownOutlined />}
              onClick={() => setOpen(true)}
            >
              设置管家
            </Button>
          </AccessControl>,
        ]}
      />
      <Modal
        title="设置认证管家"
        open={open}
        onCancel={() => setOpen(false)}
        onOk={() => void addManager().catch(() => {})}
        confirmLoading={saving}
        cancelButtonProps={{ disabled: saving }}
        closable={!saving}
        maskClosable={!saving}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="userId"
            label="小程序用户 ID"
            extra="可在小程序「我的」页面查看用户 ID。"
            rules={[
              { required: true, message: '请输入用户 ID' },
              { pattern: /^[1-9]\d*$/, message: '请输入有效用户 ID' },
            ]}
          >
            <Input placeholder="输入需要设为管家的用户 ID" disabled={saving} />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
}
