import { useIntl } from '@umijs/max';
import { Modal } from 'antd';
import DOMPurify from 'dompurify';
import React, { useMemo } from 'react';

interface AnnouncementPreviewProps {
  visible: boolean;
  content: string;
  onCancel: () => void;
}

const AnnouncementPreview: React.FC<AnnouncementPreviewProps> = ({
  visible,
  content,
  onCancel,
}) => {
  const intl = useIntl();
  const safeContent = useMemo(() => DOMPurify.sanitize(content), [content]);

  return (
    <Modal
      title={intl.formatMessage({ id: 'common.operation.preview' })}
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={600}
    >
      <div
        // biome-ignore lint/security/noDangerouslySetInnerHtml: content is sanitized with DOMPurify
        dangerouslySetInnerHTML={{ __html: safeContent }}
        style={{ padding: 16, background: '#f5f5f5', borderRadius: 4 }}
      />
    </Modal>
  );
};

export default AnnouncementPreview;
