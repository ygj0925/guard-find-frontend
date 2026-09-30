import { Card, Modal, Spin, Tag } from 'antd';
import DOMPurify from 'dompurify';
import React, { useEffect, useMemo, useState } from 'react';
import { getNoticeDetail } from '@/services/web/user-message';
import type { UserNoticeDetailVo } from '@/services/web/user-message/typings';
import { NOTICE_STATUS_MAP } from '../constants';

interface NoticeDetailProps {
  noticeId: number | null;
  visible: boolean;
  onCancel: () => void;
}

/** 公告详情（收件人视角 `GET /user/message/notice/{id}`，打开即置为已读） */
const NoticeDetail: React.FC<NoticeDetailProps> = ({
  noticeId,
  visible,
  onCancel,
}) => {
  const [loading, setLoading] = useState(false);
  const [noticeData, setNoticeData] = useState<UserNoticeDetailVo | null>(null);

  useEffect(() => {
    if (!visible || !noticeId) {
      setNoticeData(null);
      return;
    }
    setLoading(true);
    getNoticeDetail(noticeId)
      .then((res) => setNoticeData(res.data ?? null))
      .catch((error) => {
        console.error('Fetch notice detail failed:', error);
      })
      .finally(() => setLoading(false));
  }, [visible, noticeId]);

  const safeContent = useMemo(
    () => DOMPurify.sanitize(noticeData?.content || ''),
    [noticeData?.content],
  );

  const status = noticeData?.status
    ? NOTICE_STATUS_MAP[noticeData.status]
    : undefined;

  return (
    <Modal
      title={
        <span>
          {noticeData?.title || '公告详情'}
          {status && (
            <Tag color={status.color} style={{ marginInlineStart: 8 }}>
              {status.label}
            </Tag>
          )}
        </span>
      }
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={640}
      destroyOnHidden
    >
      <Spin spinning={loading}>
        {noticeData ? (
          <Card
            size="small"
            styles={{ body: { padding: 16, background: '#f5f5f5' } }}
          >
            <div style={{ color: 'rgba(0,0,0,.45)', marginBottom: 12 }}>
              发布时间：{noticeData.publishTime || noticeData.createTime || '-'}
            </div>
            <div
              // biome-ignore lint/security/noDangerouslySetInnerHtml: content is sanitized with DOMPurify
              dangerouslySetInnerHTML={{ __html: safeContent }}
            />
          </Card>
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
