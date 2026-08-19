import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import {
  type ActionType,
  PageContainer,
  type ProColumns,
  ProTable,
} from '@ant-design/pro-components';
import { useIntl } from '@umijs/max';
import { Button, message, Popconfirm, Space, Tag } from 'antd';
import React, { useRef, useState } from 'react';
import AccessControl from '@/components/AccessControl';
import type { SysMenuVo } from '@/services/web/system';
import { menu } from '@/services/web/system';
import MenuForm from './components/MenuForm';

const MenuPage: React.FC = () => {
  const actionRef = useRef<ActionType>(null);
  const intl = useIntl();
  const [formVisible, setFormVisible] = useState(false);
  const [currentMenu, setCurrentMenu] = useState<SysMenuVo | null>(null);
  const [parentMenu, setParentMenu] = useState<SysMenuVo | null>(null);

  const typeMap: Record<number, { label: string; color: string }> = {
    0: {
      label: intl.formatMessage({ id: 'system.menu.type.directory' }),
      color: 'blue',
    },
    1: {
      label: intl.formatMessage({ id: 'system.menu.type.menu' }),
      color: 'green',
    },
    2: {
      label: intl.formatMessage({ id: 'system.menu.type.button' }),
      color: 'orange',
    },
  };

  const targetTypeMap: Record<number, string> = {
    1: intl.formatMessage({ id: 'system.menu.target.component' }),
    2: intl.formatMessage({ id: 'system.menu.target.iframe' }),
    3: intl.formatMessage({ id: 'system.menu.target.link' }),
  };

  const columns: ProColumns<SysMenuVo>[] = [
    {
      title: intl.formatMessage({ id: 'system.menu.name' }),
      dataIndex: 'title',
      ellipsis: true,
    },
    {
      title: intl.formatMessage({ id: 'system.menu.type' }),
      dataIndex: 'type',
      width: 80,
      render: (_, record) => {
        const typeInfo = typeMap[record.type];
        return typeInfo ? (
          <Tag color={typeInfo.color}>{typeInfo.label}</Tag>
        ) : (
          '-'
        );
      },
    },
    {
      title: intl.formatMessage({ id: 'system.menu.icon' }),
      dataIndex: 'icon',
      width: 80,
      hideInSearch: true,
    },
    {
      title: intl.formatMessage({ id: 'system.menu.path' }),
      dataIndex: 'path',
      ellipsis: true,
    },
    {
      title: intl.formatMessage({ id: 'system.menu.permission' }),
      dataIndex: 'permission',
      ellipsis: true,
    },
    {
      title: intl.formatMessage({ id: 'system.menu.target.type' }),
      dataIndex: 'targetType',
      width: 100,
      render: (_, record) => targetTypeMap[record.targetType] || '-',
      hideInSearch: true,
    },
    {
      title: intl.formatMessage({ id: 'common.field.sort' }),
      dataIndex: 'sort',
      width: 80,
      hideInSearch: true,
    },
    {
      title: intl.formatMessage({ id: 'common.operation.confirm' }),
      valueType: 'option',
      render: (_, record) => (
        <Space>
          {record.type !== 2 && (
            <AccessControl permission="system:menu:add">
              <Button
                type="link"
                icon={<PlusOutlined />}
                onClick={() => handleAddChild(record)}
              >
                {intl.formatMessage({ id: 'common.operation.add.child' })}
              </Button>
            </AccessControl>
          )}
          <AccessControl permission="system:menu:edit">
            <Button
              type="link"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            >
              {intl.formatMessage({ id: 'common.operation.edit' })}
            </Button>
          </AccessControl>
          <AccessControl permission="system:menu:del">
            <Popconfirm
              title={intl.formatMessage({ id: 'common.delete.confirm' })}
              description={intl.formatMessage({
                id: 'system.menu.delete.children.confirm',
              })}
              onConfirm={() => handleDelete(record)}
            >
              <Button type="link" danger icon={<DeleteOutlined />}>
                {intl.formatMessage({ id: 'common.operation.delete' })}
              </Button>
            </Popconfirm>
          </AccessControl>
        </Space>
      ),
    },
  ];

  const handleAdd = () => {
    setCurrentMenu(null);
    setParentMenu(null);
    setFormVisible(true);
  };

  const handleAddChild = (record: SysMenuVo) => {
    setCurrentMenu(null);
    setParentMenu(record);
    setFormVisible(true);
  };

  const handleEdit = (record: SysMenuVo) => {
    setCurrentMenu(record);
    setParentMenu(null);
    setFormVisible(true);
  };

  const handleDelete = async (record: SysMenuVo) => {
    try {
      await menu.del(record);
      message.success(intl.formatMessage({ id: 'common.delete.success' }));
      actionRef.current?.reload();
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  const handleFormSuccess = () => {
    setFormVisible(false);
    actionRef.current?.reload();
  };

  return (
    <PageContainer>
      <ProTable<SysMenuVo>
        headerTitle={intl.formatMessage({ id: 'system.menu.title' })}
        actionRef={actionRef}
        rowKey="id"
        columns={columns}
        search={false}
        request={async (params) => {
          const { current, pageSize, ...rest } = params;
          const response = await menu.query(rest as any);
          return {
            data: response.data || [],
            success: true,
          };
        }}
        toolBarRender={() => [
          <AccessControl key="add" permission="system:menu:add">
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
              {intl.formatMessage({ id: 'common.operation.add' })}
            </Button>
          </AccessControl>,
        ]}
      />

      <MenuForm
        visible={formVisible}
        menu={currentMenu}
        parentMenu={parentMenu}
        onCancel={() => setFormVisible(false)}
        onSuccess={handleFormSuccess}
      />
    </PageContainer>
  );
};

export default MenuPage;
