import { Modal, Spin } from 'antd';
import DOMPurify from 'dompurify';
import React, { useEffect, useMemo, useState } from 'react';
import { getNoticeDetail } from '@/services/web/user-message';

interface NoticeDetailProps {
  noticeId: number | null;
  visible: boolean;
  onCancel: () => void;
}

interface NoticeData {
  title: string;
  content: string;
}

const NoticeDetail: React.FC<NoticeDetailProps> = ({
  noticeId,
  visible,
  onCancel,
}) => {
  const [loading, setLoading] = useState(false);
  const [noticeData, setNoticeData] = useState<NoticeData | null>(null);

  useEffect(() => {
    if (visible && noticeId) {
      setLoading(true);
      getNoticeDetail(noticeId)
        .then((res) => {
          setNoticeData(res.data);
        })
        .catch((error) => {
          console.error('Fetch notice detail failed:', error);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setNoticeData(null);
    }
  }, [visible, noticeId]);

  const safeContent = useMemo(
    () => DOMPurify.sanitize(noticeData?.content || ''),
    [noticeData?.content],
  );

  return (
    <Modal
      title={noticeData?.title || '消息详情'}
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={640}
      destroyOnClose
    >
      <Spin spinning={loading}>
        {noticeData ? (
          <div
            // biome-ignore lint/security/noDangerouslySetInnerHtml: content is sanitized with DOMPurify
            dangerouslySetInnerHTML={{ __html: safeContent }}
            style={{ padding: 16, background: '#f5f5f5', borderRadius: 4 }}
          />
        ) : (
          !loading && (
            <div style={{ textAlign: 'center', color: '#999' }}>暂无内容</div>
          )
        )}
      </Spin>
    </Modal>
  );
};

export default NoticeDetail;
