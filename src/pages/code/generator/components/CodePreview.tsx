import { CopyOutlined } from '@ant-design/icons';
import { Button, Modal, message, Spin, Tabs } from 'antd';
import React, { useEffect, useState } from 'react';
import { previewCode } from '@/services/web/code/generator';
import type { CodePreviewVo } from '@/services/web/code/typings';

interface CodePreviewProps {
  visible: boolean;
  tableName: string | null;
  onCancel: () => void;
}

const CodePreview: React.FC<CodePreviewProps> = ({
  visible,
  tableName,
  onCancel,
}) => {
  const [loading, setLoading] = useState(false);
  const [codeFiles, setCodeFiles] = useState<CodePreviewVo[]>([]);

  useEffect(() => {
    if (visible && tableName) {
      fetchPreview();
    }
    if (!visible) {
      setCodeFiles([]);
    }
  }, [visible, tableName]);

  const fetchPreview = async () => {
    if (!tableName) return;
    setLoading(true);
    try {
      const response = await previewCode(tableName);
      setCodeFiles(response.data || []);
    } catch (error) {
      console.error('Fetch preview failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (content: string) => {
    navigator.clipboard
      .writeText(content)
      .then(() => {
        message.success('复制成功');
      })
      .catch(() => {
        message.error('复制失败');
      });
  };

  const tabItems = codeFiles.map((file, index) => ({
    key: String(index),
    label: file.fileName,
    children: (
      <div style={{ position: 'relative' }}>
        <Button
          type="text"
          icon={<CopyOutlined />}
          onClick={() => handleCopy(file.content)}
          style={{ position: 'absolute', top: 8, right: 8, zIndex: 1 }}
        >
          复制
        </Button>
        <pre
          style={{
            background: '#f5f5f5',
            padding: 16,
            borderRadius: 4,
            overflow: 'auto',
            maxHeight: 500,
            fontFamily: 'Menlo, Monaco, Consolas, "Courier New", monospace',
            fontSize: 13,
            lineHeight: 1.6,
          }}
        >
          <code>{file.content}</code>
        </pre>
      </div>
    ),
  }));

  return (
    <Modal
      title="代码预览"
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={900}
      destroyOnClose
    >
      <Spin spinning={loading}>
        {codeFiles.length > 0 ? (
          <Tabs items={tabItems} />
        ) : (
          !loading && (
            <div style={{ textAlign: 'center', padding: 24 }}>暂无预览内容</div>
          )
        )}
      </Spin>
    </Modal>
  );
};

export default CodePreview;
