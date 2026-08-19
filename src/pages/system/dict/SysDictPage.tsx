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
import type { SysDictVo } from '@/services/web/system';
import { dict } from '@/services/web/system';
import DictForm from './components/DictForm';
import DictItemModal from './components/DictItemModal';

const DictPage: React.FC = () => {
  const actionRef = useRef<ActionType>(null);
  const intl = useIntl();
  const [formVisible, setFormVisible] = useState(false);
  const [currentDict, setCurrentDict] = useState<SysDictVo | null>(null);
  const [dictItemVisible, setDictItemVisible] = useState(false);
  const [currentDictCode, setCurrentDictCode] = useState('');

  const valueTypeMap: Record<number, string> = {
    1: 'Number',
    2: 'String',
    3: 'Boolean',
  };

  const columns: ProColumns<SysDictVo>[] = [
    {
      title: intl.formatMessage({ id: 'system.dict.code' }),
      dataIndex: 'code',
      ellipsis: true,
    },
    {
      title: intl.formatMessage({ id: 'system.dict.title' }),
      dataIndex: 'title',
      ellipsis: true,
    },
    {
      title: intl.formatMessage({ id: 'system.dict.value.type' }),
      dataIndex: 'valueType',
      render: (_, record) => valueTypeMap[record.valueType] || '-',
      hideInSearch: true,
    },
    {
      title: intl.formatMessage({ id: 'common.field.remark' }),
      dataIndex: 'remarks',
      ellipsis: true,
      hideInSearch: true,
    },
    {
      title: intl.formatMessage({ id: 'common.field.status' }),
      dataIndex: 'status',
      render: (_, record) => (
        <Tag color={record.status === 1 ? 'green' : 'red'}>
          {record.status === 1
            ? intl.formatMessage({ id: 'common.status.enabled' })
            : intl.formatMessage({ id: 'common.status.disabled' })}
        </Tag>
      ),
      hideInSearch: true,
    },
    {
      title: intl.formatMessage({ id: 'common.time.create' }),
      dataIndex: 'createTime',
      hideInSearch: true,
    },
    {
      title: intl.formatMessage({ id: 'common.operation.confirm' }),
      valueType: 'option',
      render: (_, record) => (
        <Space>
          <AccessControl permission="system:dict:edit">
            <Button
              type="link"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            >
              {intl.formatMessage({ id: 'common.operation.edit' })}
            </Button>
          </AccessControl>
          <AccessControl permission="system:dict:del">
            <Popconfirm
              title={intl.formatMessage({ id: 'common.delete.confirm' })}
              description={intl.formatMessage({
                id: 'system.dict.delete.items.confirm',
              })}
              onConfirm={() => handleDelete(record)}
            >
              <Button type="link" danger icon={<DeleteOutlined />}>
                {intl.formatMessage({ id: 'common.operation.delete' })}
              </Button>
            </Popconfirm>
          </AccessControl>
          <Button type="link" onClick={() => handleOpenDictItem(record)}>
            {intl.formatMessage({ id: 'system.dict.items' })}
          </Button>
        </Space>
      ),
    },
  ];

  const handleAdd = () => {
    setCurrentDict(null);
    setFormVisible(true);
  };

  const handleEdit = (record: SysDictVo) => {
    setCurrentDict(record);
    setFormVisible(true);
  };

  const handleDelete = async (record: SysDictVo) => {
    try {
      await dict.del(record);
      message.success(intl.formatMessage({ id: 'common.delete.success' }));
      actionRef.current?.reload();
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  const handleOpenDictItem = (record: SysDictVo) => {
    setCurrentDictCode(record.code);
    setDictItemVisible(true);
  };

  const handleFormSuccess = () => {
    setFormVisible(false);
    actionRef.current?.reload();
  };

  return (
    <PageContainer>
      <ProTable<SysDictVo>
        headerTitle={intl.formatMessage({ id: 'system.dict.title' })}
        actionRef={actionRef}
        rowKey="id"
        columns={columns}
        request={async (params) => {
          const { current, pageSize, ...rest } = params;
          const response = await dict.query({
            page: current as number,
            size: pageSize as number,
            ...rest,
          });
          return {
            data: response.data?.records || [],
            total: response.data?.total || 0,
            success: true,
          };
        }}
        toolBarRender={() => [
          <AccessControl key="add" permission="system:dict:add">
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
              {intl.formatMessage({ id: 'common.operation.add' })}
            </Button>
          </AccessControl>,
        ]}
      />

      <DictForm
        visible={formVisible}
        dict={currentDict}
        onCancel={() => setFormVisible(false)}
        onSuccess={handleFormSuccess}
      />

      <DictItemModal
        visible={dictItemVisible}
        dictCode={currentDictCode}
        onCancel={() => setDictItemVisible(false)}
      />
    </PageContainer>
  );
};

export default DictPage;
