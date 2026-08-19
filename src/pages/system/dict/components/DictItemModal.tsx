import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import {
  type ActionType,
  type ProColumns,
  ProTable,
} from '@ant-design/pro-components';
import { useIntl } from '@umijs/max';
import { Button, Modal, message, Popconfirm, Space, Switch, Tag } from 'antd';
import React, { useRef, useState } from 'react';
import AccessControl from '@/components/AccessControl';
import type { SysDictItemVo } from '@/services/web/system';
import { dictItem } from '@/services/web/system';
import DictItemForm from './DictItemForm';

interface DictItemModalProps {
  visible: boolean;
  dictCode: string;
  onCancel: () => void;
}

const DictItemModal: React.FC<DictItemModalProps> = ({
  visible,
  dictCode,
  onCancel,
}) => {
  const actionRef = useRef<ActionType>(null);
  const intl = useIntl();
  const [formVisible, setFormVisible] = useState(false);
  const [currentItem, setCurrentItem] = useState<SysDictItemVo | null>(null);

  const columns: ProColumns<SysDictItemVo>[] = [
    {
      title: intl.formatMessage({ id: 'system.dict.item.name' }),
      dataIndex: 'name',
      ellipsis: true,
    },
    {
      title: intl.formatMessage({ id: 'system.dict.item.value' }),
      dataIndex: 'value',
      ellipsis: true,
    },
    {
      title: intl.formatMessage({ id: 'system.dict.item.tag.color' }),
      dataIndex: ['attributes', 'tagColor'],
      render: (_, record) => {
        const color = record.attributes?.tagColor;
        return color ? <Tag color={color}>{color}</Tag> : '-';
      },
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
        <AccessControl permission="system:dict:edit">
          <Switch
            checked={record.status === 1}
            onChange={(checked) => handleStatusChange(record, checked ? 1 : 0)}
          />
        </AccessControl>
      ),
    },
    {
      title: intl.formatMessage({ id: 'common.field.remark' }),
      dataIndex: 'remarks',
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
      await dictItem.del(record);
      message.success(intl.formatMessage({ id: 'common.delete.success' }));
      actionRef.current?.reload();
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  const handleStatusChange = async (record: SysDictItemVo, status: number) => {
    try {
      await dictItem.updateStatus(record.id, status);
      message.success(intl.formatMessage({ id: 'common.operation.success' }));
      actionRef.current?.reload();
    } catch (error) {
      console.error('Status update failed:', error);
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
        params={{ dictCode }}
        request={async (params) => {
          const { current, pageSize, dictCode: code } = params;
          const response = await dictItem.query({
            page: current as number,
            size: pageSize as number,
            dictCode: code as string,
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

      <DictItemForm
        visible={formVisible}
        dictCode={dictCode}
        item={currentItem}
        onCancel={() => setFormVisible(false)}
        onSuccess={handleFormSuccess}
      />
    </Modal>
  );
};

export default DictItemModal;
