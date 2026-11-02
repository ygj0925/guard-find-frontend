import {
  CloseOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  PlusOutlined,
  SendOutlined,
} from '@ant-design/icons';
import {
  type ActionType,
  PageContainer,
  type ProColumns,
  ProTable,
} from '@ant-design/pro-components';
import { useIntl } from '@umijs/max';
import { Button, message, Popconfirm, Space, Tag } from 'antd';
import React, { useRef } from 'react';
import AccessControl from '@/components/AccessControl';
import DialogHost, { useDialog } from '@/components/DialogHost';
import { announcement } from '@/services/web/notify';
import type { AnnouncementVo } from '@/services/web/notify/typings';
import { getTableScrollX } from '@/utils/tableLayout';
import AnnouncementForm from './components/AnnouncementForm';
import AnnouncementPreview from './components/AnnouncementPreview';

const AnnouncementPage: React.FC = () => {
  const actionRef = useRef<ActionType>(null);
  const intl = useIntl();
  const formDialog = useDialog<number | null>();
  const previewDialog = useDialog<number>();

  const statusMap: Record<number, { label: string; color: string }> = {
    1: {
      label: intl.formatMessage({ id: 'notify.announcement.status.draft' }),
      color: 'warning',
    },
    2: {
      label: intl.formatMessage({ id: 'notify.announcement.status.pending' }),
      color: 'processing',
    },
    3: {
      label: intl.formatMessage({ id: 'notify.announcement.status.published' }),
      color: 'success',
    },
  };

  const columns: ProColumns<AnnouncementVo>[] = [
    {
      title: intl.formatMessage({ id: 'notify.announcement.name' }),
      dataIndex: 'title',
      width: 220,
      ellipsis: true,
    },
    {
      title: intl.formatMessage({ id: 'notify.announcement.status' }),
      dataIndex: 'status',
      width: 100,
      render: (_, record) => {
        const status = statusMap[record.status];
        return status ? <Tag color={status.color}>{status.label}</Tag> : '-';
      },
      hideInSearch: true,
    },
    {
      title: intl.formatMessage({ id: 'notify.announcement.publish.time' }),
      dataIndex: 'publishTime',
      width: 180,
      hideInSearch: true,
    },
    {
      title: intl.formatMessage({ id: 'common.time.create' }),
      dataIndex: 'createTime',
      width: 180,
      hideInSearch: true,
    },
    {
      title: intl.formatMessage({ id: 'common.table.actions' }),
      valueType: 'option',
      fixed: 'right',
      className: 'table-action-column',
      width: 180,
      render: (_, record) => (
        <Space wrap>
          {record.status === 1 && (
            <AccessControl permission="system:notice:update">
              <Button
                type="link"
                icon={<EditOutlined />}
                onClick={() => handleEdit(record)}
              >
                {intl.formatMessage({ id: 'common.operation.edit' })}
              </Button>
            </AccessControl>
          )}
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => handlePreview(record)}
          >
            {intl.formatMessage({ id: 'common.operation.preview' })}
          </Button>
          {record.status === 1 && (
            <AccessControl permission="system:notice:update">
              <Popconfirm
                title={intl.formatMessage({
                  id: 'notify.announcement.publish.confirm',
                })}
                onConfirm={() => handlePublish(record)}
              >
                <Button type="link" icon={<SendOutlined />}>
                  {intl.formatMessage({ id: 'common.operation.publish' })}
                </Button>
              </Popconfirm>
            </AccessControl>
          )}
          {record.status === 3 && (
            <AccessControl permission="system:notice:update">
              <Popconfirm
                title={intl.formatMessage({
                  id: 'notify.announcement.close.confirm',
                })}
                onConfirm={() => handleClose(record)}
              >
                <Button type="link" icon={<CloseOutlined />}>
                  {intl.formatMessage({ id: 'common.operation.close' })}
                </Button>
              </Popconfirm>
            </AccessControl>
          )}
          {record.status === 1 && (
            <AccessControl permission="system:notice:delete">
              <Popconfirm
                title={intl.formatMessage({ id: 'common.delete.confirm' })}
                onConfirm={() => handleDelete(record)}
              >
                <Button type="link" danger icon={<DeleteOutlined />}>
                  {intl.formatMessage({ id: 'common.operation.delete' })}
                </Button>
              </Popconfirm>
            </AccessControl>
          )}
        </Space>
      ),
    },
  ];

  const handleAdd = () => {
    formDialog.open(null);
  };

  const handleEdit = (record: AnnouncementVo) => {
    formDialog.open(record.id);
  };

  const handlePreview = (record: AnnouncementVo) => {
    previewDialog.open(record.id);
  };

  const handlePublish = async (record: AnnouncementVo) => {
    try {
      await announcement.publish(record.id);
      message.success(intl.formatMessage({ id: 'common.operation.success' }));
      actionRef.current?.reload();
    } catch (error) {
      console.error('Publish failed:', error);
    }
  };

  const handleClose = async (record: AnnouncementVo) => {
    try {
      await announcement.close(record.id);
      message.success(intl.formatMessage({ id: 'common.operation.success' }));
      actionRef.current?.reload();
    } catch (error) {
      console.error('Close failed:', error);
    }
  };

  const handleDelete = async (record: AnnouncementVo) => {
    try {
      await announcement.del(record.id);
      message.success(intl.formatMessage({ id: 'common.delete.success' }));
      actionRef.current?.reload();
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  const handleFormSuccess = () => {
    formDialog.close();
    actionRef.current?.reload();
  };

  return (
    <PageContainer>
      <ProTable<AnnouncementVo>
        headerTitle={intl.formatMessage({ id: 'notify.announcement.title' })}
        actionRef={actionRef}
        rowKey="id"
        columns={columns}
        scroll={{ x: getTableScrollX(columns) }}
        request={async (params) => {
          const { current, pageSize, ...rest } = params;
          const response = await announcement.query({
            page: current as number,
            size: pageSize as number,
            ...rest,
          });
          return {
            data: response.data?.list || [],
            total: response.data?.total || 0,
            success: true,
          };
        }}
        toolBarRender={() => [
          <AccessControl key="add" permission="system:notice:create">
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
              {intl.formatMessage({ id: 'common.operation.add' })}
            </Button>
          </AccessControl>,
        ]}
      />

      <DialogHost dialog={formDialog}>
        {({ visible, data }) => (
          <AnnouncementForm
            visible={visible}
            announcementId={data}
            onCancel={() => formDialog.close()}
            onSuccess={handleFormSuccess}
          />
        )}
      </DialogHost>

      <DialogHost dialog={previewDialog}>
        {({ visible, data }) => (
          <AnnouncementPreview
            visible={visible}
            announcementId={data}
            onCancel={() => previewDialog.close()}
          />
        )}
      </DialogHost>
    </PageContainer>
  );
};

export default AnnouncementPage;
