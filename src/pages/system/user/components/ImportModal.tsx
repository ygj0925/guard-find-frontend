import { InboxOutlined } from '@ant-design/icons';
import {
  Alert,
  Button,
  Modal,
  message,
  Select,
  Space,
  Statistic,
  Upload,
} from 'antd';
import React, { useState } from 'react';
import type { ImportPolicy, UserImportParseResp } from '@/services/web/system';
import { user } from '@/services/web/system';

interface ImportModalProps {
  visible: boolean;
  onCancel: () => void;
  onSuccess: () => void;
}

/** 后端 ImportPolicyEnum：1 跳过该行 / 2 修改数据 / 3 停止导入 */
const POLICY_OPTIONS: { label: string; value: ImportPolicy }[] = [
  { label: '跳过该行', value: 1 },
  { label: '修改数据', value: 2 },
  { label: '停止导入', value: 3 },
];

const UserImportModal: React.FC<ImportModalProps> = ({
  visible,
  onCancel,
  onSuccess,
}) => {
  const [parsing, setParsing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [parsed, setParsed] = useState<UserImportParseResp>();
  const [policies, setPolicies] = useState<{
    duplicateUser: ImportPolicy;
    duplicateEmail: ImportPolicy;
    duplicatePhone: ImportPolicy;
    defaultStatus: 1 | 2;
  }>({
    duplicateUser: 1,
    duplicateEmail: 1,
    duplicatePhone: 1,
    defaultStatus: 1,
  });

  const handleClose = () => {
    setParsed(undefined);
    onCancel();
  };

  const handleDownloadTemplate = async () => {
    try {
      await user.downloadImportTemplate();
    } catch (error) {
      console.error('Download template failed:', error);
    }
  };

  const handleFile = (file: File) => {
    setParsing(true);
    user
      .parseImport(file)
      .then((response) => {
        if (response?.data) {
          setParsed(response.data);
        } else {
          message.error('解析失败：后端未返回结果');
        }
      })
      .catch((error) => console.error('Parse failed:', error))
      .finally(() => setParsing(false));
    // 阻止 antd 自动上传，我们自己发 /import/parse
    return Upload.LIST_IGNORE;
  };

  const handleSubmit = async () => {
    if (!parsed?.importKey) {
      message.warning('请先上传并解析文件');
      return;
    }
    setSubmitting(true);
    try {
      const response = await user.importUsers({
        importKey: parsed.importKey,
        ...policies,
      });
      const result = response?.data;
      message.success(
        result
          ? `导入完成：共 ${result.totalRows} 行，新增 ${result.insertRows}，更新 ${result.updateRows}`
          : '导入完成',
      );
      onSuccess();
      handleClose();
    } catch (error) {
      console.error('Import failed:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title="导入用户"
      open={visible}
      onCancel={handleClose}
      footer={
        <Space>
          <Button onClick={handleClose}>取消</Button>
          <Button
            type="primary"
            disabled={!parsed}
            loading={submitting}
            onClick={handleSubmit}
          >
            开始导入
          </Button>
        </Space>
      }
      width={640}
      destroyOnHidden
    >
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <Space>
          <Button onClick={handleDownloadTemplate}>下载导入模板</Button>
          <span style={{ color: 'rgba(0,0,0,.45)' }}>
            请先下载模板，按要求填写后再上传
          </span>
        </Space>

        <Upload.Dragger
          accept=".xlsx,.xls"
          maxCount={1}
          showUploadList={false}
          beforeUpload={(file) => handleFile(file as unknown as File)}
        >
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text">点击或拖拽 Excel 文件到此区域</p>
          <p className="ant-upload-hint">
            {parsing ? '正在解析…' : '仅支持 .xlsx / .xls，解析后不会立即入库'}
          </p>
        </Upload.Dragger>

        {parsed && (
          <>
            <Space size="large">
              <Statistic title="总行数" value={parsed.totalRows ?? 0} />
              <Statistic title="有效行数" value={parsed.validRows ?? 0} />
              <Statistic
                title="重复用户"
                value={parsed.duplicateUserRows ?? 0}
                valueStyle={{ color: '#faad14' }}
              />
              <Statistic
                title="重复邮箱"
                value={parsed.duplicateEmailRows ?? 0}
                valueStyle={{ color: '#faad14' }}
              />
              <Statistic
                title="重复手机"
                value={parsed.duplicatePhoneRows ?? 0}
                valueStyle={{ color: '#faad14' }}
              />
            </Space>
            <Space size="large" wrap>
              <Space>
                <span>重复用户：</span>
                <Select
                  value={policies.duplicateUser}
                  options={POLICY_OPTIONS}
                  style={{ width: 120 }}
                  onChange={(value) =>
                    setPolicies((prev) => ({ ...prev, duplicateUser: value }))
                  }
                />
              </Space>
              <Space>
                <span>重复邮箱：</span>
                <Select
                  value={policies.duplicateEmail}
                  options={POLICY_OPTIONS}
                  style={{ width: 120 }}
                  onChange={(value) =>
                    setPolicies((prev) => ({ ...prev, duplicateEmail: value }))
                  }
                />
              </Space>
              <Space>
                <span>重复手机：</span>
                <Select
                  value={policies.duplicatePhone}
                  options={POLICY_OPTIONS}
                  style={{ width: 120 }}
                  onChange={(value) =>
                    setPolicies((prev) => ({ ...prev, duplicatePhone: value }))
                  }
                />
              </Space>
              <Space>
                <span>新用户状态：</span>
                <Select
                  value={policies.defaultStatus}
                  options={[
                    { label: '启用', value: 1 },
                    { label: '禁用', value: 2 },
                  ]}
                  style={{ width: 90 }}
                  onChange={(value) =>
                    setPolicies((prev) => ({
                      ...prev,
                      defaultStatus: value as 1 | 2,
                    }))
                  }
                />
              </Space>
            </Space>
            <Alert
              type="info"
              showIcon
              message="「停止导入」会在遇到第一条重复数据时终止本次导入。"
            />
          </>
        )}
      </Space>
    </Modal>
  );
};

export default UserImportModal;
