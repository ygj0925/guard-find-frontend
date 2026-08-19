import { DeleteOutlined } from '@ant-design/icons';
import {
  type ActionType,
  type ProColumns,
  ProTable,
} from '@ant-design/pro-components';
import { useIntl } from '@umijs/max';
import { Button, Modal, message, Popconfirm, Space } from 'antd';
import React, { useRef } from 'react';
import type { SysRoleBindVo } from '@/services/web/system';
import { role } from '@/services/web/system';

interface UserBindProps {
  visible: boolean;
  roleCode: string;
  onCancel: () => void;
}

const UserBind: React.FC<UserBindProps> = ({ visible, roleCode, onCancel }) => {
  const actionRef = useRef<ActionType>(null);
  const intl = useIntl();

  const columns: ProColumns<SysRoleBindVo>[] = [
    {
      title: intl.formatMessage({ id: 'system.user.username' }),
      dataIndex: 'username',
      ellipsis: true,
    },
    {
      title: intl.formatMessage({ id: 'system.user.nickname' }),
      dataIndex: 'nickname',
      ellipsis: true,
    },
    {
      title: intl.formatMessage({ id: 'system.user.organization' }),
      dataIndex: 'organizationName',
      ellipsis: true,
    },
    {
      title: intl.formatMessage({ id: 'common.operation.confirm' }),
      valueType: 'option',
      render: (_, record) => (
        <Space>
          <Popconfirm
            title={intl.formatMessage({ id: 'common.delete.confirm' })}
            onConfirm={() => handleUnbind(record)}
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              {intl.formatMessage({ id: 'system.role.user.unbind' })}
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const handleUnbind = async (record: SysRoleBindVo) => {
    try {
      await role.unbindUser(record.userId, roleCode);
      message.success(intl.formatMessage({ id: 'common.operation.success' }));
      actionRef.current?.reload();
    } catch (error) {
      console.error('Unbind failed:', error);
    }
  };

  return (
    <Modal
      title={intl.formatMessage({ id: 'system.role.user.bind' })}
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={700}
      destroyOnClose
    >
      <ProTable<SysRoleBindVo>
        headerTitle={false}
        actionRef={actionRef}
        rowKey="userId"
        columns={columns}
        search={false}
        params={{ roleCode }}
        request={async (params) => {
          const { current, pageSize, roleCode: code } = params;
          const response = await role.listRoleBindUser({
            page: current as number,
            size: pageSize as number,
            roleCode: code as string,
          });
          return {
            data: response.data?.records || [],
            total: response.data?.total || 0,
            success: true,
          };
        }}
      />
    </Modal>
  );
};

export default UserBind;
