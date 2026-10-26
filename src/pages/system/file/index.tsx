import {
  CalculatorOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  FolderAddOutlined,
  MoreOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import {
  type ActionType,
  ModalForm,
  PageContainer,
  type ProColumns,
  ProFormText,
  ProTable,
} from '@ant-design/pro-components';
import type { MenuProps } from 'antd';
import { Button, Dropdown, message, Space, Tabs } from 'antd';
import React, { useRef, useState } from 'react';
import AccessControl from '@/components/AccessControl';
import { useAccess } from '@/hooks/useAccess';
import {
  calcDirSize,
  createDir,
  deleteFile,
  queryFiles,
  renameFile,
} from '@/services/web/file';
import type { FileQuery, FileReq, FileVo } from '@/services/web/file/typings';
import { formatFileSize } from '@/utils/format';
import FileUpload from './components/FileUpload';
import RecycleBin from './components/RecycleBin';
import StorageStats from './components/StorageStats';

/** 后端 `FileTypeEnum.DIR` */
const TYPE_DIR = 0;

/** 触发浏览器下载：后端 `FileResp.url` 是对象存储地址（公共读或带签名），不走本站鉴权 */
function openDownload(url: string, filename: string) {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

const FilePage: React.FC = () => {
  const actionRef = useRef<ActionType>(null);
  const { hasAnyPermission } = useAccess();
  const [dirFormOpen, setDirFormOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<FileVo | null>(null);

  const reload = () => actionRef.current?.reload();

  const handleDelete = async (record: FileVo) => {
    await deleteFile(record.id);
    message.success('已移入回收站');
    reload();
  };

  const handleCalcSize = async (record: FileVo) => {
    const response = await calcDirSize(record.id);
    message.info({
      content: `${record.originalName || record.name}：${formatFileSize(
        Number(response.data?.size) || 0,
      )}`,
      duration: 4,
    });
  };

  const rowMenu = (record: FileVo): MenuProps['items'] => {
    const items: MenuProps['items'] = [];
    if (record.type !== TYPE_DIR && record.url) {
      items.push({
        key: 'download',
        icon: <DownloadOutlined />,
        label: '下载',
        onClick: () =>
          openDownload(record.url, record.originalName || record.name),
      });
    }
    if (
      record.type === TYPE_DIR &&
      hasAnyPermission(['system:file:calcDirSize'])
    ) {
      items.push({
        key: 'size',
        icon: <CalculatorOutlined />,
        label: '计算大小',
        onClick: () => handleCalcSize(record),
      });
    }
    if (hasAnyPermission(['system:file:delete'])) {
      items.push({
        key: 'delete',
        icon: <DeleteOutlined />,
        label: '移入回收站',
        danger: true,
        onClick: () => handleDelete(record),
      });
    }
    return items;
  };

  const columns: ProColumns<FileVo>[] = [
    {
      title: '文件名',
      // 展示与筛选都用 originalName（后端 `FileQuery.originalName` 做 like）
      dataIndex: 'originalName',
      width: 240,
      ellipsis: true,
      render: (_, record) => (
        <Space size={4}>
          {record.type === TYPE_DIR && (
            <FolderAddOutlined style={{ color: '#faad14' }} />
          )}
          <span>{record.originalName || record.name}</span>
        </Space>
      ),
    },
    {
      title: '大小',
      dataIndex: 'size',
      width: 120,
      hideInSearch: true,
      render: (_, record) => formatFileSize(record.size),
    },
    {
      title: '类型',
      dataIndex: 'type',
      width: 100,
      valueEnum: {
        0: { text: '目录' },
        1: { text: '其他' },
        2: { text: '图片' },
        3: { text: '文档' },
        4: { text: '视频' },
        5: { text: '音频' },
      },
    },
    {
      title: '上级目录',
      dataIndex: 'parentPath',
      width: 140,
      ellipsis: true,
      hideInSearch: true,
    },
    {
      title: '存储',
      dataIndex: 'storageName',
      width: 100,
      hideInSearch: true,
    },
    {
      title: '上传者',
      dataIndex: 'createUserString',
      width: 120,
      hideInSearch: true,
    },
    {
      title: '创建时间',
      dataIndex: 'createTime',
      width: 180,
      hideInSearch: true,
    },
    {
      title: '操作',
      valueType: 'option',
      width: 150,
      render: (_, record) => (
        <Space size={0}>
          <AccessControl permission="system:file:update">
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => setRenameTarget(record)}
            >
              重命名
            </Button>
          </AccessControl>
          <Dropdown menu={{ items: rowMenu(record) }} trigger={['click']}>
            <Button type="link" size="small" icon={<MoreOutlined />} />
          </Dropdown>
        </Space>
      ),
    },
  ];

  const fileList = (
    <ProTable<FileVo, FileQuery>
      headerTitle="文件列表"
      actionRef={actionRef}
      rowKey="id"
      columns={columns}
      scroll={{ x: 'max-content' }}
      pagination={{ defaultPageSize: 10 }}
      request={async ({ current, pageSize, ...rest }) => {
        const response = await queryFiles({
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
        <AccessControl
          key="mkdir"
          permission="system:file:createDir"
          mode="disable"
          disabledTip="没有新建文件夹的权限"
        >
          <Button
            icon={<FolderAddOutlined />}
            onClick={() => setDirFormOpen(true)}
          >
            新建文件夹
          </Button>
        </AccessControl>,
        <AccessControl
          key="upload"
          permission="system:file:upload"
          mode="disable"
          disabledTip="没有上传文件的权限"
        >
          <FileUpload onSuccess={reload} />
        </AccessControl>,
        <Button key="refresh" icon={<ReloadOutlined />} onClick={reload}>
          刷新
        </Button>,
      ]}
    />
  );

  return (
    <PageContainer>
      <StorageStats />
      <Tabs
        defaultActiveKey="files"
        items={[
          { key: 'files', label: '文件列表', children: fileList },
          ...(hasAnyPermission(['system:fileRecycle:list'])
            ? [{ key: 'recycle', label: '回收站', children: <RecycleBin /> }]
            : []),
        ]}
      />

      {/* 创建文件夹：后端 createDir 显式要求 parentPath 非空 */}
      <ModalForm
        title="新建文件夹"
        open={dirFormOpen}
        width={480}
        modalProps={{
          destroyOnHidden: true,
          onCancel: () => setDirFormOpen(false),
        }}
        initialValues={{ parentPath: '/' }}
        onFinish={async (values) => {
          await createDir(values as FileReq);
          message.success('文件夹创建成功');
          setDirFormOpen(false);
          reload();
          return true;
        }}
      >
        <ProFormText
          name="originalName"
          label="文件夹名称"
          placeholder="请输入文件夹名称"
          rules={[
            { required: true, message: '请输入文件夹名称' },
            {
              pattern: /^[^/\\]{1,255}$/,
              message: '不能包含 / \\，且长度不超过 255',
            },
          ]}
        />
        <ProFormText
          name="parentPath"
          label="上级目录"
          placeholder="例如 / 或 /2026/09"
          rules={[{ required: true, message: '上级目录不能为空' }]}
        />
      </ModalForm>

      {/* 重命名：`PUT /system/file/{id}`，body 是 FileReq（originalName 必填） */}
      <ModalForm
        title="重命名"
        open={renameTarget !== null}
        width={480}
        modalProps={{
          destroyOnHidden: true,
          onCancel: () => setRenameTarget(null),
        }}
        initialValues={{
          originalName: renameTarget?.originalName || renameTarget?.name || '',
          parentPath: renameTarget?.parentPath || '/',
        }}
        onFinish={async (values) => {
          if (!renameTarget) return false;
          await renameFile(renameTarget.id, values as FileReq);
          message.success('重命名成功');
          setRenameTarget(null);
          reload();
          return true;
        }}
      >
        <ProFormText
          name="originalName"
          label="名称"
          rules={[
            { required: true, message: '请输入名称' },
            { max: 255, message: '名称长度不能超过 255 个字符' },
          ]}
        />
        <ProFormText
          name="parentPath"
          label="上级目录"
          placeholder="留空表示不移动"
        />
      </ModalForm>
    </PageContainer>
  );
};

export default FilePage;
