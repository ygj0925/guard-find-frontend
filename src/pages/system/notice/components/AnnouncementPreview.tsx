import { useIntl } from '@umijs/max';
import { Alert, Modal } from 'antd';
import DOMPurify from 'dompurify';
import React, { useEffect, useMemo, useState } from 'react';
import { announcement } from '@/services/web/notify';

interface AnnouncementPreviewProps {
  visible: boolean;
  announcementId: number;
  onCancel: () => void;
}

const AnnouncementPreview: React.FC<AnnouncementPreviewProps> = ({
  visible,
  announcementId,
  onCancel,
}) => {
  const intl = useIntl();
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    if (!visible) return;
    let active = true;
    setLoading(true);
    setLoadFailed(false);
    void announcement
      .detail(announcementId)
      .then((response) => {
        if (active) setContent(response.data?.content || '');
      })
      .catch((error) => {
        if (!active) return;
        setLoadFailed(true);
        console.error('Preview failed:', error);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [visible, announcementId]);
  const safeContent = useMemo(() => DOMPurify.sanitize(content), [content]);

  return (
    <Modal
      title={intl.formatMessage({ id: 'common.operation.preview' })}
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={600}
      loading={loading}
      destroyOnHidden
    >
      {loadFailed ? (
        <Alert type="error" showIcon message="公告加载失败，请关闭后重试" />
      ) : (
        <div
          // biome-ignore lint/security/noDangerouslySetInnerHtml: content is sanitized with DOMPurify
          dangerouslySetInnerHTML={{ __html: safeContent }}
          style={{ padding: 16, background: '#f5f5f5', borderRadius: 4 }}
        />
      )}
    </Modal>
  );
};

export default AnnouncementPreview;
