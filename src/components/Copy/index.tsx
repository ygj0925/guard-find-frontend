import { CheckOutlined, CopyOutlined } from '@ant-design/icons';
import { Tooltip } from 'antd';
import React, { useState } from 'react';
import CopyToClipboard from 'react-copy-to-clipboard';

interface CopyProps {
  text: string;
  children?: React.ReactNode;
  tooltipText?: string;
  copiedText?: string;
}

const Copy: React.FC<CopyProps> = ({
  text,
  children,
  tooltipText = '复制',
  copiedText = '已复制',
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <CopyToClipboard text={text} onCopy={handleCopy}>
      <Tooltip title={copied ? copiedText : tooltipText}>
        {children || (
          <span style={{ cursor: 'pointer', marginLeft: 4 }}>
            {copied ? (
              <CheckOutlined style={{ color: '#52c41a' }} />
            ) : (
              <CopyOutlined />
            )}
          </span>
        )}
      </Tooltip>
    </CopyToClipboard>
  );
};

export default Copy;
