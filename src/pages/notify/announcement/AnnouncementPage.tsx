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
import React, { useRef, useState } from 'react';
import AccessControl from '@/components/AccessControl';
import { announcement } from '@/services/web/notify';
import type { AnnouncementVo } from '@/services/web/notify/typings';
import AnnouncementForm from './components/AnnouncementForm';
import AnnouncementPreview from './components/AnnouncementPreview';

const AnnouncementPage: React.FC = () => {
  const actionRef = useRef<ActionType>(null);
  const intl = useIntl();
  const [formVisible, setFormVisible] = useState(false);
  const [currentAnnouncement, setCurrentAnnouncement] =
    useState<AnnouncementVo | null>(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewContent, setPreviewContent] = useState('');

  const statusMap: Record<number, { label: string; color: string }> = {
    0: {
      label: intl.formatMessage({ id: 'notify.announcement.status.draft' }),
      color: 'default',
    },
    1: {
      label: intl.formatMessage({ id: 'notify.announcement.status.published' }),
      color: 'success',
    },
    2: {
      label: intl.formatMessage({ id: 'notify.announcement.status.closed' }),
      color: 'error',
    },
  };

  const columns: ProColumns<AnnouncementVo>[] = [
    {
      title: intl.formatMessage({ id: 'notify.announcement.name' }),
      dataIndex: 'title',
      ellipsis: true,
    },
    {
      title: intl.formatMessage({ id: 'notify.announcement.status' }),
      dataIndex: 'status',
      render: (_, record) => {
        const status = statusMap[record.status];
        return status ? <Tag color={status.color}>{status.label}</Tag> : '-';
      },
      hideInSearch: true,
    },
    {
      title: intl.formatMessage({ id: 'notify.announcement.publish.time' }),
      dataIndex: 'publishTime',
      hideInSearch: true,
    },
    {
      title: intl.formatMessage({ id: 'notify.announcement.expire.time' }),
      dataIndex: 'expireTime',
      render: (_, record) =>
        record.permanent
          ? intl.formatMessage({ id: 'notify.announcement.permanent' })
          : record.expireTime,
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
          {record.status === 0 && (
            <AccessControl permission="notify:announcement:edit">
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
          {record.status === 0 && (
            <AccessControl permission="notify:announcement:publish">
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
          {record.status === 1 && (
            <AccessControl permission="notify:announcement:publish">
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
          {record.status === 0 && (
            <AccessControl permission="notify:announcement:del">
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
    setCurrentAnnouncement(null);
    setFormVisible(true);
  };

  const handleEdit = (record: AnnouncementVo) => {
    setCurrentAnnouncement(record);
    setFormVisible(true);
  };

  const handlePreview = (record: AnnouncementVo) => {
    setPreviewContent(record.content);
    setPreviewVisible(true);
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
    setFormVisible(false);
    actionRef.current?.reload();
  };

  return (
    <PageContainer>
      <ProTable<AnnouncementVo>
        headerTitle={intl.formatMessage({ id: 'notify.announcement.title' })}
        actionRef={actionRef}
        rowKey="id"
        columns={columns}
        request={async (params) => {
          const { current, pageSize, ...rest } = params;
          const response = await announcement.query({
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
          <AccessControl key="add" permission="notify:announcement:add">
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
              {intl.formatMessage({ id: 'common.operation.add' })}
            </Button>
          </AccessControl>,
        ]}
      />

      <AnnouncementForm
        visible={formVisible}
        announcement={currentAnnouncement}
        onCancel={() => setFormVisible(false)}
        onSuccess={handleFormSuccess}
      />

      <AnnouncementPreview
        visible={previewVisible}
        content={previewContent}
        onCancel={() => setPreviewVisible(false)}
      />
    </PageContainer>
  );
};

export default AnnouncementPage;
