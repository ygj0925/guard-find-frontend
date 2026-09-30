import { history } from '@umijs/max';
import { Button, Modal, Spin, Tag } from 'antd';
import DOMPurify from 'dompurify';
import React, { useEffect, useMemo, useState } from 'react';
import { getMessageDetail } from '@/services/web/user-message';
import type { UserMessageDetailVo } from '@/services/web/user-message/typings';
import { MESSAGE_TYPE_MAP } from '../constants';

interface MessageDetailProps {
  messageId: number | null;
  open: boolean;
  onCancel: () => void;
  /** 后端在 `GET /user/message/{id}` 里会顺带把该条置为已读，关闭时通知列表刷新 */
  onRead?: () => void;
}

/**
 * 消息详情（`GET /user/message/{id}`）。
 *
 * 注意不要用 `system/message/{id}`：那是管理端接口，要 `system:message:get` 权限码，
 * 普通用户在"我的消息"里点开会直接 403。
 */
const MessageDetail: React.FC<MessageDetailProps> = ({
  messageId,
  open,
  onCancel,
  onRead,
}) => {
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<UserMessageDetailVo | null>(null);

  useEffect(() => {
    if (!open || !messageId) {
      setDetail(null);
      return;
    }
    setLoading(true);
    getMessageDetail(messageId)
      .then((res) => setDetail(res.data ?? null))
      .catch((error) => console.error('Fetch message detail failed:', error))
      .finally(() => setLoading(false));
  }, [open, messageId]);

  const safeContent = useMemo(
    () => DOMPurify.sanitize(detail?.content || ''),
    [detail?.content],
  );

  const typeInfo = detail ? MESSAGE_TYPE_MAP[detail.type] : undefined;

  return (
    <Modal
      title={
        <span>
          {detail?.title || '消息详情'}
          {typeInfo && (
            <Tag color={typeInfo.color} style={{ marginInlineStart: 8 }}>
              {typeInfo.label}
            </Tag>
          )}
        </span>
      }
      open={open}
      onCancel={() => {
        onCancel();
        onRead?.();
      }}
      footer={
        detail?.path
          ? [
              <Button
                key="path"
                type="primary"
                onClick={() => {
                  onCancel();
                  onRead?.();
                  history.push(detail.path as string);
                }}
              >
                查看关联内容
              </Button>,
            ]
          : null
      }
      width={640}
      destroyOnHidden
    >
      <Spin spinning={loading}>
        {detail ? (
          <>
            <div style={{ color: 'rgba(0,0,0,.45)', marginBottom: 12 }}>
              {detail.createTime}
            </div>
            <div
              // biome-ignore lint/security/noDangerouslySetInnerHtml: content is sanitized with DOMPurify
              dangerouslySetInnerHTML={{ __html: safeContent }}
              style={{ padding: 16, background: '#f5f5f5', borderRadius: 4 }}
            />
          </>
        ) : (
          !loading && (
            <div style={{ textAlign: 'center', color: '#999' }}>暂无内容</div>
          )
        )}
      </Spin>
    </Modal>
  );
};

export default MessageDetail;
