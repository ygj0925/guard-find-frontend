import { DownloadOutlined } from '@ant-design/icons';
import {
  Alert,
  Button,
  Descriptions,
  message,
  Space,
  Table,
  type TableColumnsType,
  Typography,
} from 'antd';
import React from 'react';
import type {
  OaContractDetailVo,
  OaContractVersionVo,
  OaLinkedFileVo,
  OaSealRequestVo,
} from '@/services/web/guardfind/oa';
import { download } from '@/utils/download';
import {
  CONTRACT_STATUS_META,
  CONTRACT_TYPE_META,
  CONTRACT_VERSION_STATUS_META,
  expiryHint,
  SEAL_REQUEST_STATUS_META,
  SEAL_TYPE_META,
} from '@/utils/oaContract';
import { formatAmount } from '@/utils/oaExpense';
import { applicationStatusTag } from '../../application/components/ApplicationStatus';
import { metaTag, TrackButton } from '../../purchase/components/PurchaseDetail';

export const contractStatusTag = (status: string) =>
  metaTag(CONTRACT_STATUS_META, status);

export const sealRequestStatusTag = (status: string) =>
  metaTag(SEAL_REQUEST_STATUS_META, status);

function sizeText(size?: number | null) {
  if (!size) return '';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

/** 业务附件按业务接口鉴权下载，链接随业务权限失效 */
export const LinkedFileList: React.FC<{
  files: OaLinkedFileVo[];
  pathOf: (file: OaLinkedFileVo) => string;
  emptyText?: string;
  versions?: { applicationId: number | string; versionNo: number }[];
}> = ({ files, pathOf, emptyText = '暂无附件', versions }) => {
  const versionOf = (file: OaLinkedFileVo) =>
    versions && versions.length > 1
      ? versions.find(
          (version) =>
            String(version.applicationId) === String(file.applicationId),
        )?.versionNo
      : undefined;
  const handleDownload = async (file: OaLinkedFileVo) => {
    try {
      await download(pathOf(file), { filename: file.name });
    } catch (error) {
      message.error(
        error instanceof Error && error.message
          ? error.message
          : '附件下载失败，请稍后重试',
      );
    }
  };
  if (files.length === 0) {
    return <Typography.Text type="secondary">{emptyText}</Typography.Text>;
  }
  return (
    <Space size={8} wrap>
      {files.map((file) => (
        <Button
          key={`${file.applicationId}-${file.fileId}`}
          size="small"
          icon={<DownloadOutlined />}
          onClick={() => void handleDownload(file)}
        >
          {versionOf(file) ? `v${versionOf(file)} · ` : ''}
          {file.name}
          {file.size ? ` (${sizeText(file.size)})` : ''}
        </Button>
      ))}
    </Space>
  );
};

const VersionTable: React.FC<{ versions: OaContractVersionVo[] }> = ({
  versions,
}) => (
  <Table<OaContractVersionVo>
    rowKey="id"
    size="small"
    bordered
    pagination={false}
    scroll={{ x: 820 }}
    dataSource={versions}
    aria-label="合同版本"
    expandable={{
      expandedRowRender: (record) => (
        <Typography.Paragraph style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
          {record.summary}
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
        render: (value: string) => metaTag(CONTRACT_VERSION_STATUS_META, value),
      },
      { title: '合同名称', dataIndex: 'title', ellipsis: true },
      {
        title: '金额',
        dataIndex: 'amount',
        width: 120,
        render: (value) => formatAmount(value),
      },
      {
        title: '期限',
        key: 'period',
        width: 200,
        render: (_, record) => `${record.startDate} ~ ${record.endDate}`,
      },
      {
        title: '修订说明',
        dataIndex: 'changeNote',
        ellipsis: true,
        render: (value) => value || '—',
      },
      {
        title: '送审人',
        key: 'applicant',
        width: 90,
        render: (_, record) => record.applicantName || record.applicantId,
      },
    ]}
  />
);

export const SealRequestTable: React.FC<{
  requests: OaSealRequestVo[];
  extraColumns?: TableColumnsType<OaSealRequestVo>;
}> = ({ requests, extraColumns = [] }) => (
  <Table<OaSealRequestVo>
    rowKey="id"
    size="small"
    bordered
    pagination={false}
    scroll={{ x: 760 }}
    dataSource={requests}
    aria-label="用印记录"
    locale={{ emptyText: '暂无用印申请' }}
    columns={[
      {
        title: '印章',
        key: 'seal',
        render: (_, record) => (
          <Space size={4}>
            {record.sealName}
            {metaTag(SEAL_TYPE_META, record.sealType)}
          </Space>
        ),
      },
      {
        title: '状态',
        dataIndex: 'status',
        width: 90,
        render: (value: string) => sealRequestStatusTag(value),
      },
      {
        title: '份数',
        key: 'copies',
        width: 90,
        render: (_, record) =>
          record.usedCopies === null || record.usedCopies === undefined
            ? `${record.copies}`
            : `${record.usedCopies}/${record.copies}`,
      },
      {
        title: '用印日期',
        key: 'date',
        width: 110,
        render: (_, record) => record.usedDate || record.useDate,
      },
      {
        title: '申请人',
        key: 'applicant',
        width: 90,
        render: (_, record) => record.applicantName || record.applicantId,
      },
      ...extraColumns,
    ]}
  />
);

export const ContractDetailContent: React.FC<{
  detail: OaContractDetailVo;
  filePath: (file: OaLinkedFileVo) => string;
}> = ({ detail, filePath }) => {
  const { contract } = detail;
  const hint = expiryHint(contract.status, contract.endDate);
  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      {hint ? (
        <Alert
          type="warning"
          showIcon
          message={`合同${hint}，请及时续签或归档处理`}
        />
      ) : null}
      <Descriptions column={{ xs: 1, sm: 2 }} size="small" bordered>
        <Descriptions.Item label="合同编号">
          {contract.contractNo}
        </Descriptions.Item>
        <Descriptions.Item label="合同状态">
          {contractStatusTag(contract.status)}
        </Descriptions.Item>
        <Descriptions.Item label="合同名称">{contract.title}</Descriptions.Item>
        <Descriptions.Item label="类型">
          {metaTag(CONTRACT_TYPE_META, contract.contractType)}
        </Descriptions.Item>
        <Descriptions.Item label="相对方">
          {contract.counterparty}
        </Descriptions.Item>
        <Descriptions.Item label="金额">
          {formatAmount(contract.amount)}
        </Descriptions.Item>
        <Descriptions.Item label="期限">
          {`${contract.startDate} ~ ${contract.endDate}`}
        </Descriptions.Item>
        <Descriptions.Item label="经办人">
          {contract.ownerName || contract.ownerId}
        </Descriptions.Item>
        <Descriptions.Item label="当前版本">
          {`v${contract.currentVersion}`}
        </Descriptions.Item>
        <Descriptions.Item label="审批状态">
          {contract.applicationStatus
            ? applicationStatusTag(contract.applicationStatus)
            : '—'}
        </Descriptions.Item>
        <Descriptions.Item label="签署">
          {contract.signedDate
            ? `${contract.signedDate}，${contract.signatories ?? ''}（登记人 ${contract.signedByName || contract.signedBy}）`
            : '—'}
        </Descriptions.Item>
        <Descriptions.Item label="归档">
          {contract.archiveNo
            ? `${contract.archiveNo}${contract.archiveLocation ? `，${contract.archiveLocation}` : ''}（${contract.archivedByName || contract.archivedBy}）`
            : '—'}
        </Descriptions.Item>
      </Descriptions>
      <TrackButton applicationId={contract.currentApplicationId} />
      <Typography.Title level={5} style={{ margin: 0 }}>
        合同文本
      </Typography.Title>
      <LinkedFileList
        files={detail.files}
        pathOf={filePath}
        versions={detail.versions}
      />
      <Typography.Title level={5} style={{ margin: 0 }}>
        版本记录
      </Typography.Title>
      <VersionTable versions={detail.versions} />
      <Typography.Title level={5} style={{ margin: 0 }}>
        用印记录
      </Typography.Title>
      <SealRequestTable requests={detail.sealRequests} />
    </Space>
  );
};
