import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import {
  type ActionType,
  type ProColumns,
  ProTable,
} from '@ant-design/pro-components';
import { useIntl } from '@umijs/max';
import { Button, Modal, message, Popconfirm, Space, Tag } from 'antd';
import React, { useRef, useState } from 'react';
import AccessControl from '@/components/AccessControl';
import type { SysDictItemVo } from '@/services/web/system';
import { dictItem } from '@/services/web/system';
import DictItemForm from './DictItemForm';

interface DictItemModalProps {
  visible: boolean;
  dictId: number;
  onCancel: () => void;
}

const DictItemModal: React.FC<DictItemModalProps> = ({
  visible,
  dictId,
  onCancel,
}) => {
  const actionRef = useRef<ActionType>(null);
  const intl = useIntl();
  const [formVisible, setFormVisible] = useState(false);
  const [currentItem, setCurrentItem] = useState<SysDictItemVo | null>(null);

  const columns: ProColumns<SysDictItemVo>[] = [
    {
      title: intl.formatMessage({ id: 'system.dict.item.name' }),
      dataIndex: 'label',
      ellipsis: true,
    },
    {
      title: intl.formatMessage({ id: 'system.dict.item.value' }),
      dataIndex: 'value',
      ellipsis: true,
    },
    {
      title: intl.formatMessage({ id: 'system.dict.item.tag.color' }),
      dataIndex: 'color',
      render: (_, record) =>
        record.color ? <Tag color={record.color}>{record.color}</Tag> : '-',
    },
    {
      title: intl.formatMessage({ id: 'system.dict.item.sort' }),
      dataIndex: 'sort',
      width: 80,
    },
    {
      title: intl.formatMessage({ id: 'system.dict.item.status' }),
      dataIndex: 'status',
      width: 100,
      render: (_, record) => (
        <Tag color={record.status === 1 ? 'green' : 'red'}>
          {record.status === 1
            ? intl.formatMessage({ id: 'common.status.enabled' })
            : intl.formatMessage({ id: 'common.status.disabled' })}
        </Tag>
      ),
    },
    {
      title: intl.formatMessage({ id: 'common.field.remark' }),
      dataIndex: 'description',
      ellipsis: true,
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
    setCurrentItem(null);
    setFormVisible(true);
  };

  const handleEdit = (record: SysDictItemVo) => {
    setCurrentItem(record);
    setFormVisible(true);
  };

  const handleDelete = async (record: SysDictItemVo) => {
    try {
      await dictItem.del(record.id);
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
    <Modal
      title={intl.formatMessage({ id: 'system.dict.item.title' })}
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={800}
      destroyOnClose
    >
      <ProTable<SysDictItemVo>
        headerTitle={false}
        actionRef={actionRef}
        rowKey="id"
        columns={columns}
        search={false}
        params={{ dictId }}
        request={async (params) => {
          const { current, pageSize, dictId: id } = params;
          const response = await dictItem.query({
            page: current as number,
            size: pageSize as number,
            dictId: id as number,
          });
          return {
            data: response.data?.list || [],
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

      <DictItemForm
        visible={formVisible}
        dictId={dictId}
        item={currentItem}
        onCancel={() => setFormVisible(false)}
        onSuccess={handleFormSuccess}
      />
    </Modal>
  );
};

export default DictItemModal;
