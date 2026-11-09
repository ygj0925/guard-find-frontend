/**
 * 公文知识：发布台账（阅读/签收统计、回执、版本与附件）与撤稿；一键生成公文表单与流程草稿。
 * 审批通过才按当时在职受众生成回执并发布；修订通过后受众需重新阅读，撤稿后受众不可再查看。
 */
import { ThunderboltOutlined } from '@ant-design/icons';
import {
  type ActionType,
  PageContainer,
  type ProColumns,
  ProTable,
} from '@ant-design/pro-components';
import { history } from '@umijs/max';
import {
  Alert,
  Button,
  Descriptions,
  Drawer,
  Form,
  Input,
  Modal,
  message,
  Popconfirm,
  Progress,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
} from 'antd';
import React, { useRef, useState } from 'react';
import AccessControl from '@/components/AccessControl';
import {
  createOaDocumentTemplate,
  getOaDocument,
  type OaDocumentDetailVo,
  type OaDocumentReceiptVo,
  type OaDocumentVersionVo,
  type OaDocumentVo,
  queryOaDocuments,
  revokeOaDocument,
} from '@/services/web/guardfind/oa';
import {
  audienceText,
  DOCUMENT_STATUS_META,
  DOCUMENT_TYPE_META,
  DOCUMENT_VERSION_STATUS_META,
  percent,
} from '@/utils/oaContract';
import { statusValueEnum } from '@/utils/oaTravel';
import { LinkedFileList } from '../contract/components/ContractDetail';
import { metaTag, TrackButton } from '../purchase/components/PurchaseDetail';

function errorText(error: unknown) {
  return error instanceof Error ? error.message : '操作失败';
}

const documentStatusTag = (status: string) =>
  metaTag(DOCUMENT_STATUS_META, status);

function readSummary(document: OaDocumentVo) {
  const total = document.receiptCount;
  if (total === 0) return '—';
  return document.requireAck
    ? `已签收 ${document.ackCount}/${total}`
    : `已读 ${document.readCount}/${total}`;
}

const DocumentDetailContent: React.FC<{ detail: OaDocumentDetailVo }> = ({
  detail,
}) => {
  const { document } = detail;
  const published = detail.versions.find(
    (version) => version.versionNo === document.publishedVersion,
  );
  const total = document.receiptCount;
  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      {document.status === 'REVOKED' ? (
        <Alert
          type="error"
          showIcon
          message={`已撤稿：${document.revokeReason ?? ''}（${document.revokeByName || document.revokeBy || ''} ${document.revokeTime ?? ''}）`}
        />
      ) : null}
      {document.pendingApplicationId ? (
        <Alert
          type="info"
          showIcon
          message={`v${document.latestVersion} 修订审批中，通过前受众仍阅读 v${document.publishedVersion}`}
        />
      ) : null}
      <Descriptions column={{ xs: 1, sm: 2 }} size="small" bordered>
        <Descriptions.Item label="文号">{document.docNo}</Descriptions.Item>
        <Descriptions.Item label="状态">
          {documentStatusTag(document.status)}
        </Descriptions.Item>
        <Descriptions.Item label="标题">{document.title}</Descriptions.Item>
        <Descriptions.Item label="类型">
          {metaTag(DOCUMENT_TYPE_META, document.docType)}
        </Descriptions.Item>
        <Descriptions.Item label="分类">
          {document.category || '—'}
        </Descriptions.Item>
        <Descriptions.Item label="发布人">
          {document.ownerName || document.ownerId}
        </Descriptions.Item>
        <Descriptions.Item label="发布版本">
          {document.publishedVersion > 0
            ? `v${document.publishedVersion}`
            : '—'}
        </Descriptions.Item>
        <Descriptions.Item label="发布时间">
          {document.publishTime || '—'}
        </Descriptions.Item>
        <Descriptions.Item label="发布范围">
          {audienceText(published?.audience)}
        </Descriptions.Item>
        <Descriptions.Item label="需签收">
          {document.requireAck ? '是' : '否'}
        </Descriptions.Item>
        <Descriptions.Item label="已读">
          <Progress
            size="small"
            percent={percent(document.readCount, total)}
            format={() => `${document.readCount}/${total}`}
          />
        </Descriptions.Item>
        <Descriptions.Item label="已签收">
          {document.requireAck ? (
            <Progress
              size="small"
              percent={percent(document.ackCount, total)}
              format={() => `${document.ackCount}/${total}`}
            />
          ) : (
            '无需签收'
          )}
        </Descriptions.Item>
      </Descriptions>
      {published ? (
        <>
          <Typography.Title level={5} style={{ margin: 0 }}>
            发布正文
          </Typography.Title>
          <Typography.Paragraph
            style={{ margin: 0, whiteSpace: 'pre-wrap' }}
            aria-label="发布正文"
          >
            {published.content}
          </Typography.Paragraph>
        </>
      ) : null}
      <Typography.Title level={5} style={{ margin: 0 }}>
        附件
      </Typography.Title>
      <LinkedFileList
        files={detail.files}
        pathOf={(file) =>
          `system/oa/document/${document.id}/files/${file.fileId}`
        }
        versions={detail.versions}
      />
      <Typography.Title level={5} style={{ margin: 0 }}>
        阅读回执
      </Typography.Title>
      <Table<OaDocumentReceiptVo>
        rowKey="userId"
        size="small"
        bordered
        pagination={{ pageSize: 10, hideOnSinglePage: true }}
        dataSource={detail.receipts}
        aria-label="阅读回执"
        locale={{ emptyText: '暂无回执' }}
        columns={[
          {
            title: '人员',
            key: 'user',
            render: (_, record) => record.userName || record.userId,
          },
          {
            title: '部门',
            dataIndex: 'deptName',
            render: (value) => value || '—',
          },
          {
            title: '阅读时间',
            dataIndex: 'readTime',
            width: 170,
            render: (value) => value || <Tag color="red">未读</Tag>,
          },
          ...(document.requireAck
            ? [
                {
                  title: '签收时间',
                  dataIndex: 'ackTime',
                  width: 170,
                  render: (value?: string | null) =>
                    value || <Tag color="orange">未签收</Tag>,
                },
              ]
            : []),
        ]}
      />
      <Typography.Title level={5} style={{ margin: 0 }}>
        版本记录
      </Typography.Title>
      <Table<OaDocumentVersionVo>
        rowKey="id"
        size="small"
        bordered
        pagination={false}
        scroll={{ x: 760 }}
        dataSource={detail.versions}
        aria-label="公文版本"
        expandable={{
          expandedRowRender: (record) => (
            <Typography.Paragraph style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
              {record.content}
            </Typography.Paragraph>
          ),
        }}
        columns={[
          {
            title: '版本',
            dataIndex: 'versionNo',
            width: 64,
            render: (value) => `v${value}`,
          },
          {
            title: '状态',
            dataIndex: 'status',
            width: 90,
            render: (value: string) =>
              metaTag(DOCUMENT_VERSION_STATUS_META, value),
          },
          { title: '标题', dataIndex: 'title', ellipsis: true },
          {
            title: '范围',
            key: 'audience',
            width: 170,
            render: (_, record) => audienceText(record.audience),
          },
          {
            title: '修订说明',
            dataIndex: 'changeNote',
            ellipsis: true,
            render: (value) => value || '—',
          },
          {
            title: '轨迹',
            key: 'track',
            width: 120,
            render: (_, record) => (
              <TrackButton applicationId={record.applicationId} />
            ),
          },
        ]}
      />
    </Space>
  );
};

const DocumentLedger: React.FC = () => {
  const actionRef = useRef<ActionType>(null);
  const [detail, setDetail] = useState<OaDocumentDetailVo | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [revoking, setRevoking] = useState<OaDocumentVo | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm<{ reason: string }>();

  const openDetail = async (record: OaDocumentVo) => {
    setOpen(true);
    setDetail(null);
    setLoading(true);
    try {
      const response = await getOaDocument(record.id);
      setDetail(response.data);
    } catch (error) {
      message.error(errorText(error));
    } finally {
      setLoading(false);
    }
  };

  const openRevoke = (record: OaDocumentVo) => {
    form.resetFields();
    setRevoking(record);
  };

  const submitRevoke = async () => {
    if (!revoking) return;
    const values = await form.validateFields().catch(() => null);
    if (!values) return;
    setSubmitting(true);
    try {
      await revokeOaDocument(revoking.id, { reason: values.reason.trim() });
      message.success('已撤稿');
      setRevoking(null);
      actionRef.current?.reload();
    } catch (error) {
      message.error(errorText(error));
    } finally {
      setSubmitting(false);
    }
  };

  const columns: ProColumns<OaDocumentVo>[] = [
    {
      title: '关键词',
      dataIndex: 'keyword',
      hideInTable: true,
      fieldProps: { placeholder: '文号、标题或分类' },
    },
    { title: '文号', dataIndex: 'docNo', search: false, width: 150 },
    {
      title: '类型',
      dataIndex: 'docType',
      valueType: 'select',
      width: 100,
      valueEnum: statusValueEnum(DOCUMENT_TYPE_META),
      render: (_, record) => metaTag(DOCUMENT_TYPE_META, record.docType),
    },
    {
      title: '状态',
      dataIndex: 'status',
      valueType: 'select',
      width: 140,
      valueEnum: statusValueEnum(DOCUMENT_STATUS_META),
      render: (_, record) => (
        <>
          {documentStatusTag(record.status)}
          {record.pendingApplicationId ? (
            <Tag color="processing">修订中</Tag>
          ) : null}
        </>
      ),
    },
    {
      title: '标题',
      dataIndex: 'title',
      search: false,
      ellipsis: true,
      width: 200,
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
      dataIndex: 'publishedVersion',
      search: false,
      width: 64,
      render: (_, record) =>
        record.publishedVersion > 0 ? `v${record.publishedVersion}` : '—',
    },
    {
      title: '阅读',
      key: 'reads',
      search: false,
      width: 120,
      render: (_, record) => readSummary(record),
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
      width: 140,
      render: (_, record) => [
        <Button
          key="detail"
          type="link"
          onClick={() => void openDetail(record)}
        >
          详情
        </Button>,
        record.status === 'PUBLISHED' && !record.pendingApplicationId ? (
          <AccessControl key="revoke" permission="system:oa:document:manage">
            <Button type="link" danger onClick={() => openRevoke(record)}>
              撤稿
            </Button>
          </AccessControl>
        ) : null,
      ],
    },
  ];

  return (
    <>
      <ProTable<OaDocumentVo>
        headerTitle="公文台账"
        rowKey="id"
        actionRef={actionRef}
        columns={columns}
        scroll={{ x: 1200 }}
        request={async (params) => {
          const response = await queryOaDocuments({
            page: (params.current as number) || 1,
            size: (params.pageSize as number) || 10,
            status: params.status || undefined,
            docType: params.docType || undefined,
            keyword: (params.keyword as string)?.trim() || undefined,
          });
          return {
            data: response.data?.list ?? [],
            total: response.data?.total ?? 0,
            success: true,
          };
        }}
      />
      <Drawer
        title="公文详情"
        width={900}
        open={open}
        destroyOnHidden
        onClose={() => setOpen(false)}
      >
        <Spin spinning={loading}>
          {detail ? <DocumentDetailContent detail={detail} /> : null}
        </Spin>
      </Drawer>
      <Modal
        title={revoking ? `撤稿：${revoking.docNo}` : '撤稿'}
        open={Boolean(revoking)}
        width={520}
        confirmLoading={submitting}
        okText="确认撤稿"
        okButtonProps={{ danger: true }}
        destroyOnHidden
        onCancel={() => setRevoking(null)}
        onOk={() => void submitRevoke()}
      >
        {revoking ? (
          <Form form={form} name="oaDocumentRevokeForm" layout="vertical">
            <Alert
              type="warning"
              showIcon
              style={{ marginBottom: 16 }}
              message={`撤稿后「${revoking.title}」从所有受众的收件箱下线，不可恢复；需要更正请发起修订。`}
            />
            <Form.Item
              name="reason"
              label="撤稿原因"
              rules={[
                { required: true, whitespace: true, message: '请填写撤稿原因' },
              ]}
            >
              <Input.TextArea
                rows={3}
                maxLength={500}
                showCount
                aria-label="撤稿原因"
              />
            </Form.Item>
          </Form>
        ) : null}
      </Modal>
    </>
  );
};

const DocumentManagePage: React.FC = () => {
  const [templating, setTemplating] = useState(false);

  const handleTemplate = async () => {
    setTemplating(true);
    try {
      const response = await createOaDocumentTemplate();
      message.success(`已生成公文流程草稿 ${response.data.modelKey}`);
      history.push(`/oa/process/design?id=${response.data.modelId}`);
    } catch (error) {
      message.error(errorText(error));
    } finally {
      setTemplating(false);
    }
  };

  return (
    <PageContainer
      header={{ title: '公文知识' }}
      extra={[
        <AccessControl key="template" permission="system:oa:document:manage">
          <Popconfirm
            title="生成公文模板？"
            description={
              <div style={{ maxWidth: 360 }}>
                生成并发布“公文发布”表单（类型、标题、分类、正文、发布范围、是否需签收、附件，可填原文号修订），并创建流程草稿：直属上级审批，通知公告再由总经理岗位审批。需选择表单版本后发布。
              </div>
            }
            okText="生成"
            cancelText="取消"
            onConfirm={() => handleTemplate()}
          >
            <Button icon={<ThunderboltOutlined />} loading={templating}>
              生成公文模板
            </Button>
          </Popconfirm>
        </AccessControl>,
      ]}
    >
      <DocumentLedger />
    </PageContainer>
  );
};

export default DocumentManagePage;
