import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
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
import type { SysDictQo, SysDictVo } from '@/services/web/system';
import { dict } from '@/services/web/system';
import DictForm from './components/DictForm';
import DictItemModal from './components/DictItemModal';

const DictPage: React.FC = () => {
  const actionRef = useRef<ActionType>(null);
  const intl = useIntl();
  const [formVisible, setFormVisible] = useState(false);
  const [currentDict, setCurrentDict] = useState<SysDictVo | null>(null);
  const [dictItemVisible, setDictItemVisible] = useState(false);
  const [currentDictId, setCurrentDictId] = useState<number>(0);

  const columns: ProColumns<SysDictVo>[] = [
    {
      title: intl.formatMessage({ id: 'system.dict.code' }),
      dataIndex: 'code',
      width: 180,
      ellipsis: true,
    },
    {
      title: intl.formatMessage({ id: 'system.dict.title' }),
      dataIndex: 'name',
      width: 180,
      ellipsis: true,
    },
    {
      title: intl.formatMessage({ id: 'common.field.remark' }),
      dataIndex: 'description',
      width: 220,
      ellipsis: true,
      hideInSearch: true,
    },
    {
      title: intl.formatMessage({ id: 'system.dict.system.builtin' }),
      dataIndex: 'isSystem',
      render: (_, record) =>
        record.isSystem ? (
          <Tag color="blue">
            {intl.formatMessage({ id: 'common.operation.yes' })}
          </Tag>
        ) : (
          <Tag>{intl.formatMessage({ id: 'common.operation.no' })}</Tag>
        ),
      hideInSearch: true,
    },
    {
      title: intl.formatMessage({ id: 'common.time.create' }),
      dataIndex: 'createTime',
      width: 180,
      hideInSearch: true,
    },
    {
      title: intl.formatMessage({ id: 'common.operation.confirm' }),
      valueType: 'option',
      width: 220,
      render: (_, record) => (
        <Space>
          <AccessControl permission="system:dict:update">
            <Button
              type="link"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            >
              {intl.formatMessage({ id: 'common.operation.edit' })}
            </Button>
          </AccessControl>
          <AccessControl permission="system:dict:clearCache">
            <Button
              type="link"
              icon={<ReloadOutlined />}
              onClick={() => handleClearCache(record)}
            >
              清理缓存
            </Button>
          </AccessControl>
          <AccessControl permission="system:dict:delete">
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
      await dict.del(record.id);
      message.success(intl.formatMessage({ id: 'common.delete.success' }));
      actionRef.current?.reload();
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  /** 清理该字典的服务端缓存：`DELETE /system/dict/cache/{code}` */
  const handleClearCache = async (record: SysDictVo) => {
    try {
      await dict.clearCache(record.code);
      message.success('缓存已清理');
    } catch (error) {
      console.error('Clear cache failed:', error);
    }
  };

  const handleOpenDictItem = (record: SysDictVo) => {
    setCurrentDictId(record.id);
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
        scroll={{ x: 'max-content' }}
        pagination={false}
        request={async (params) => {
          const { name, code } = params as Partial<SysDictQo>;
          const response = await dict.query({ name, code });
          // 后端 `GET /system/dict/list` 不分页
          return {
            data: response.data || [],
            success: true,
          };
        }}
        toolBarRender={() => [
          <AccessControl key="add" permission="system:dict:create">
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
        dictId={currentDictId}
        onCancel={() => setDictItemVisible(false)}
      />
    </PageContainer>
  );
};

export default DictPage;
