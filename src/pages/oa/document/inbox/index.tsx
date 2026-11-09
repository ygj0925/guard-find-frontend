/**
 * 公文阅读：本人收到的已发布公文与知识文章，打开即记阅读，需签收的公文阅读后确认签收；修订发布后需重新阅读。
 */
import {
  type ActionType,
  PageContainer,
  type ProColumns,
  ProTable,
} from '@ant-design/pro-components';
import {
  Alert,
  Button,
  Descriptions,
  Drawer,
  message,
  Space,
  Spin,
  Switch,
  Tag,
  Typography,
} from 'antd';
import React, { useRef, useState } from 'react';
import {
  ackOaDocument,
  type OaDocumentInboxVo,
  type OaDocumentReadVo,
  queryOaDocumentInbox,
  readOaDocument,
} from '@/services/web/guardfind/oa';
import { DOCUMENT_TYPE_META, inboxState } from '@/utils/oaContract';
import { LinkedFileList } from '../../contract/components/ContractDetail';
import { metaTag } from '../../purchase/components/PurchaseDetail';

function errorText(error: unknown) {
  return error instanceof Error ? error.message : '操作失败';
}

function stateTag(item: OaDocumentInboxVo) {
  const state = inboxState(item);
  return <Tag color={state.color}>{state.text}</Tag>;
}

const DocumentInboxPage: React.FC = () => {
  const actionRef = useRef<ActionType>(null);
  const [pendingOnly, setPendingOnly] = useState(false);
  const [open, setOpen] = useState(false);
  const [reading, setReading] = useState<OaDocumentReadVo | null>(null);
  const [loading, setLoading] = useState(false);
  const [acking, setAcking] = useState(false);

  const openRead = async (record: OaDocumentInboxVo) => {
    setOpen(true);
    setReading(null);
    setLoading(true);
    try {
      const response = await readOaDocument(record.documentId);
      setReading(response.data);
    } catch (error) {
      message.error(errorText(error));
    } finally {
      setLoading(false);
    }
  };

  const close = () => {
    setOpen(false);
    actionRef.current?.reload();
  };

  const ack = async () => {
    if (!reading) return;
    setAcking(true);
    try {
      const response = await ackOaDocument(reading.item.documentId);
      setReading({ ...reading, item: response.data });
      message.success('已签收');
    } catch (error) {
      message.error(errorText(error));
    } finally {
      setAcking(false);
    }
  };

  const columns: ProColumns<OaDocumentInboxVo>[] = [
    {
      title: '关键词',
      dataIndex: 'keyword',
      hideInTable: true,
      fieldProps: { placeholder: '文号、标题或分类' },
    },
    {
      title: '状态',
      key: 'state',
      search: false,
      width: 90,
      render: (_, record) => stateTag(record),
    },
    { title: '文号', dataIndex: 'docNo', search: false, width: 150 },
    {
      title: '类型',
      dataIndex: 'docType',
      search: false,
      width: 100,
      render: (_, record) => metaTag(DOCUMENT_TYPE_META, record.docType),
    },
    {
      title: '标题',
      dataIndex: 'title',
      search: false,
      ellipsis: true,
      width: 220,
    },
    {
      title: '分类',
      dataIndex: 'category',
      search: false,
      width: 100,
      render: (_, record) => record.category || '—',
    },
    {
      title: '版本',
      dataIndex: 'versionNo',
      search: false,
      width: 64,
      render: (_, record) => `v${record.versionNo}`,
    },
    {
      title: '发布人',
      dataIndex: 'ownerName',
      search: false,
      width: 90,
      render: (_, record) => record.ownerName || '—',
    },
    {
      title: '发布时间',
      dataIndex: 'publishTime',
      search: false,
      width: 170,
      render: (_, record) => record.publishTime || '—',
    },
    {
      title: '操作',
      valueType: 'option',
      fixed: 'right',
      width: 80,
      render: (_, record) => (
        <Button type="link" onClick={() => void openRead(record)}>
          阅读
        </Button>
      ),
    },
  ];

  const item = reading?.item;

  return (
    <PageContainer header={{ title: '公文阅读' }}>
      <ProTable<OaDocumentInboxVo>
        headerTitle="我的公文"
        rowKey="documentId"
        actionRef={actionRef}
        columns={columns}
        scroll={{ x: 1100 }}
        params={{ pendingOnly }}
        toolBarRender={() => [
          <Space key="pending">
            <Switch
              checked={pendingOnly}
              onChange={setPendingOnly}
              aria-label="只看未读或待签收"
            />
            只看未读或待签收
          </Space>,
        ]}
        request={async (params) => {
          const response = await queryOaDocumentInbox({
            page: (params.current as number) || 1,
            size: (params.pageSize as number) || 10,
            keyword: (params.keyword as string)?.trim() || undefined,
            pendingOnly: params.pendingOnly || undefined,
          });
          return {
            data: response.data?.list ?? [],
            total: response.data?.total ?? 0,
            success: true,
          };
        }}
      />
      <Drawer
        title={item ? item.title : '公文'}
        width={820}
        open={open}
        destroyOnHidden
        onClose={close}
        extra={
          item?.requireAck && !item.ackTime ? (
            <Button type="primary" loading={acking} onClick={() => void ack()}>
              确认签收
            </Button>
          ) : null
        }
      >
        <Spin spinning={loading}>
          {reading && item ? (
            <Space direction="vertical" size={16} style={{ width: '100%' }}>
              {item.requireAck && !item.ackTime ? (
                <Alert
                  type="warning"
                  showIcon
                  message="本公文需要签收，阅读后请点击右上角“确认签收”"
                />
              ) : null}
              {reading.changeNote ? (
                <Alert
                  type="info"
                  showIcon
                  message={`本版修订：${reading.changeNote}`}
                />
              ) : null}
              <Descriptions column={{ xs: 1, sm: 2 }} size="small" bordered>
                <Descriptions.Item label="文号">{item.docNo}</Descriptions.Item>
                <Descriptions.Item label="状态">
                  {stateTag(item)}
                </Descriptions.Item>
                <Descriptions.Item label="类型">
                  {metaTag(DOCUMENT_TYPE_META, item.docType)}
                </Descriptions.Item>
                <Descriptions.Item label="版本">{`v${item.versionNo}`}</Descriptions.Item>
                <Descriptions.Item label="发布人">
                  {item.ownerName || '—'}
                </Descriptions.Item>
                <Descriptions.Item label="发布时间">
                  {item.publishTime || '—'}
                </Descriptions.Item>
              </Descriptions>
              <Typography.Paragraph
                style={{ margin: 0, whiteSpace: 'pre-wrap' }}
                aria-label="公文正文"
              >
                {reading.content}
              </Typography.Paragraph>
              <Typography.Title level={5} style={{ margin: 0 }}>
                附件
              </Typography.Title>
              <LinkedFileList
                files={reading.files}
                pathOf={(file) =>
                  `system/oa/document/inbox/${item.documentId}/files/${file.fileId}`
                }
              />
            </Space>
          ) : null}
        </Spin>
      </Drawer>
    </PageContainer>
  );
};

export default DocumentInboxPage;
