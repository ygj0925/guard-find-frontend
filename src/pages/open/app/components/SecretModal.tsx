import { CopyOutlined, ReloadOutlined } from '@ant-design/icons';
import {
  Button,
  Modal,
  message,
  Popconfirm,
  Space,
  Spin,
  Typography,
} from 'antd';
import React, { useEffect, useState } from 'react';
import { getAppSecret, resetAppSecret } from '@/services/web/open/app';
import type { AppVo } from '@/services/web/open/typings';

const { Paragraph } = Typography;

interface SecretModalProps {
  visible: boolean;
  app: AppVo | null;
  onCancel: () => void;
}

const SecretModal: React.FC<SecretModalProps> = ({
  visible,
  app,
  onCancel,
}) => {
  const [secret, setSecret] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const fetchSecret = async () => {
    if (!app) return;
    setLoading(true);
    try {
      const response = await getAppSecret(app.id);
      setSecret(response.data || '');
    } catch (error) {
      console.error('Fetch secret failed:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible && app) {
      fetchSecret();
    }
    if (!visible) {
      setSecret('');
    }
  }, [visible, app]);

  const handleReset = async () => {
    if (!app) return;
    try {
      await resetAppSecret(app.id);
      message.success('密钥重置成功');
      fetchSecret();
    } catch (error) {
      console.error('Reset secret failed:', error);
    }
  };

  return (
    <Modal
      title="应用密钥"
      open={visible}
      onCancel={onCancel}
      footer={[
        <Popconfirm
          key="reset"
          title="确认重置密钥吗？重置后旧密钥将失效。"
          onConfirm={handleReset}
        >
          <Button icon={<ReloadOutlined />} danger>
            重置密钥
          </Button>
        </Popconfirm>,
        <Button key="close" onClick={onCancel}>
          关闭
        </Button>,
      ]}
      destroyOnClose
    >
      <Spin spinning={loading}>
        <div style={{ marginBottom: 16 }}>
          <strong>应用名称：</strong>
          {app?.name}
        </div>
        <div>
          <strong>密钥：</strong>
          <Paragraph
            copyable={{ icon: <CopyOutlined /> }}
            style={{ display: 'inline', marginLeft: 8 }}
          >
            {secret}
          </Paragraph>
        </div>
      </Spin>
    </Modal>
  );
};

export default SecretModal;
