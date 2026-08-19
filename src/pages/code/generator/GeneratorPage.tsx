import {
  DownloadOutlined,
  EyeOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import {
  type ActionType,
  PageContainer,
  type ProColumns,
  ProTable,
} from '@ant-design/pro-components';
import { Button, message, Space, Tag } from 'antd';
import React, { useRef, useState } from 'react';
import AccessControl from '@/components/AccessControl';
import {
  batchGenerate,
  downloadCode,
  queryTables,
} from '@/services/web/code/generator';
import type { GeneratorTableVo } from '@/services/web/code/typings';
import CodePreview from './components/CodePreview';
import FieldConfig from './components/FieldConfig';
import TableConfig from './components/TableConfig';

const GeneratorPage: React.FC = () => {
  const actionRef = useRef<ActionType>(null);
  const [tableConfigVisible, setTableConfigVisible] = useState(false);
  const [fieldConfigVisible, setFieldConfigVisible] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [currentTableName, setCurrentTableName] = useState<string | null>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  const columns: ProColumns<GeneratorTableVo>[] = [
    {
      title: '表名',
      dataIndex: 'tableName',
      ellipsis: true,
    },
    {
      title: '表注释',
      dataIndex: 'tableComment',
      ellipsis: true,
      hideInSearch: true,
    },
    {
      title: '类名',
      dataIndex: 'className',
      ellipsis: true,
      hideInSearch: true,
    },
    {
      title: '模块名',
      dataIndex: 'moduleName',
      ellipsis: true,
      hideInSearch: true,
    },
    {
      title: '配置状态',
      dataIndex: 'isConfigured',
      hideInSearch: true,
      render: (_, record) => (
        <Tag color={record.isConfigured ? 'green' : 'default'}>
          {record.isConfigured ? '已配置' : '未配置'}
        </Tag>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createTime',
      hideInSearch: true,
    },
    {
      title: '操作',
      valueType: 'option',
      render: (_, record) => (
        <Space>
          <AccessControl permission="code:generator:config">
            <Button
              type="link"
              icon={<SettingOutlined />}
              onClick={() => handleConfigure(record)}
            >
              配置
            </Button>
          </AccessControl>
          <AccessControl permission="code:generator:preview">
            <Button
              type="link"
              icon={<EyeOutlined />}
              onClick={() => handlePreview(record)}
            >
              预览
            </Button>
          </AccessControl>
          <AccessControl permission="code:generator:download">
            <Button
              type="link"
              icon={<DownloadOutlined />}
              onClick={() => handleDownload(record)}
            >
              下载
            </Button>
          </AccessControl>
        </Space>
      ),
    },
  ];

  const handleConfigure = (record: GeneratorTableVo) => {
    setCurrentTableName(record.tableName);
    setTableConfigVisible(true);
  };

  const handlePreview = (record: GeneratorTableVo) => {
    setCurrentTableName(record.tableName);
    setPreviewVisible(true);
  };

  const handleDownload = async (record: GeneratorTableVo) => {
    try {
      const blob = await downloadCode(record.tableName);
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${record.tableName}.zip`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      message.success('下载成功');
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  const handleBatchGenerate = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请选择要生成的表');
      return;
    }
    try {
      const blob = await batchGenerate(selectedRowKeys as string[]);
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'batch-code.zip');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      message.success('批量生成成功');
      setSelectedRowKeys([]);
    } catch (error) {
      console.error('Batch generate failed:', error);
    }
  };

  const handleTableConfigSuccess = () => {
    setTableConfigVisible(false);
    setCurrentTableName(null);
    actionRef.current?.reload();
  };

  const handleOpenFieldConfig = () => {
    setTableConfigVisible(false);
    setFieldConfigVisible(true);
  };

  const handleFieldConfigSuccess = () => {
    setFieldConfigVisible(false);
    setCurrentTableName(null);
    actionRef.current?.reload();
  };

  return (
    <PageContainer>
      <ProTable<GeneratorTableVo>
        headerTitle="代码生成"
        actionRef={actionRef}
        rowKey="tableName"
        columns={columns}
        rowSelection={{
          selectedRowKeys,
          onChange: (keys) => setSelectedRowKeys(keys),
        }}
        request={async (params) => {
          const { current, pageSize, ...rest } = params;
          const response = await queryTables({
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
          <AccessControl key="batch" permission="code:generator:download">
            <Button
              type="primary"
              icon={<DownloadOutlined />}
              disabled={selectedRowKeys.length === 0}
              onClick={handleBatchGenerate}
            >
              批量生成
            </Button>
          </AccessControl>,
        ]}
      />

      <TableConfig
        visible={tableConfigVisible}
        tableName={currentTableName}
        onCancel={() => {
          setTableConfigVisible(false);
          setCurrentTableName(null);
        }}
        onSuccess={handleTableConfigSuccess}
      />

      <FieldConfig
        visible={fieldConfigVisible}
        tableName={currentTableName}
        onCancel={() => {
          setFieldConfigVisible(false);
          setCurrentTableName(null);
        }}
        onSuccess={handleFieldConfigSuccess}
      />

      <CodePreview
        visible={previewVisible}
        tableName={currentTableName}
        onCancel={() => {
          setPreviewVisible(false);
          setCurrentTableName(null);
        }}
      />
    </PageContainer>
  );
};

export default GeneratorPage;
