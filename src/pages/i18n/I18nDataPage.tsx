import {
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import {
  type ActionType,
  PageContainer,
  type ProColumns,
  ProTable,
} from '@ant-design/pro-components';
import { useIntl } from '@umijs/max';
import { Button, message, Popconfirm, Space } from 'antd';
import React, { useRef, useState } from 'react';
import AccessControl from '@/components/AccessControl';
import * as i18nApi from '@/services/web/system/i18n';
import type { SysI18nVo } from '@/services/web/system/i18n/typings';
import I18nDataForm from './components/I18nDataForm';

const I18nDataPage: React.FC = () => {
  const actionRef = useRef<ActionType>(null);
  const intl = useIntl();
  const [formVisible, setFormVisible] = useState(false);
  const [currentData, setCurrentData] = useState<SysI18nVo | null>(null);

  const columns: ProColumns<SysI18nVo>[] = [
    {
      title: 'Code',
      dataIndex: 'code',
      ellipsis: true,
    },
    {
      title: intl.formatMessage({ id: 'system.i18n.language.tag' }),
      dataIndex: 'languageTag',
      ellipsis: true,
      hideInSearch: true,
    },
    {
      title: intl.formatMessage({ id: 'system.i18n.message' }),
      dataIndex: 'message',
      ellipsis: true,
      hideInSearch: true,
    },
    {
      title: intl.formatMessage({ id: 'common.field.remark' }),
      dataIndex: 'remarks',
      ellipsis: true,
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
          <AccessControl permission="system:i18n:edit">
            <Button
              type="link"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            >
              {intl.formatMessage({ id: 'common.operation.edit' })}
            </Button>
          </AccessControl>
          <AccessControl permission="system:i18n:del">
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
    setCurrentData(null);
    setFormVisible(true);
  };

  const handleEdit = (record: SysI18nVo) => {
    setCurrentData(record);
    setFormVisible(true);
  };

  const handleDelete = async (record: SysI18nVo) => {
    try {
      await i18nApi.del(record);
      message.success(intl.formatMessage({ id: 'common.delete.success' }));
      actionRef.current?.reload();
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  const handleExport = async () => {
    try {
      const response = await i18nApi.exportExcel({
        code: '',
        message: '',
        languageTag: '',
      });
      const url = window.URL.createObjectURL(new Blob([response]));
      const link = document.createElement('a');
      link.href = url;
      link.download = 'i18n-data.xlsx';
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await i18nApi.downloadTemplate();
      const url = window.URL.createObjectURL(new Blob([response]));
      const link = document.createElement('a');
      link.href = url;
      link.download = 'i18n-template.xlsx';
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download template failed:', error);
    }
  };

  const handleFormSuccess = () => {
    setFormVisible(false);
    actionRef.current?.reload();
  };

  return (
    <PageContainer>
      <ProTable<SysI18nVo>
        headerTitle={intl.formatMessage({ id: 'system.i18n.title' })}
        actionRef={actionRef}
        rowKey="id"
        columns={columns}
        request={async (params) => {
          const { current, pageSize, ...rest } = params;
          const response = await i18nApi.query({
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
          <AccessControl key="add" permission="system:i18n:add">
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
              {intl.formatMessage({ id: 'common.operation.add' })}
            </Button>
          </AccessControl>,
          <AccessControl key="export" permission="system:i18n:export">
            <Button icon={<DownloadOutlined />} onClick={handleExport}>
              {intl.formatMessage({ id: 'common.operation.export' })}
            </Button>
          </AccessControl>,
          <AccessControl key="template" permission="system:i18n:export">
            <Button
              icon={<DownloadOutlined />}
              onClick={handleDownloadTemplate}
            >
              {intl.formatMessage({ id: 'system.i18n.download.template' })}
            </Button>
          </AccessControl>,
        ]}
      />

      <I18nDataForm
        visible={formVisible}
        data={currentData}
        onCancel={() => setFormVisible(false)}
        onSuccess={handleFormSuccess}
      />
    </PageContainer>
  );
};

export default I18nDataPage;
