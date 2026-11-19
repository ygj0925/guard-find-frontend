import {
  Alert,
  Button,
  Empty,
  Form,
  Input,
  List,
  Modal,
  message,
  Space,
  Tag,
  Typography,
} from 'antd';
import { useEffect, useRef, useState } from 'react';
import { useAccess } from '@/hooks/useAccess';
import {
  type LeaseDetail,
  type LeaseReview,
  replyLeaseReview,
} from '@/services/web/guardfind/leases';

export default function LeaseReviewPanel({
  lease,
  onChanged,
}: {
  lease: LeaseDetail;
  onChanged: () => void;
}) {
  const { hasPermission } = useAccess();
  const [review, setReview] = useState<LeaseReview>();
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm<{ content: string }>();
  const generation = useRef(0);
  const busy = useRef(false);
  useEffect(() => {
    generation.current++;
    setReview(undefined);
    setSaving(false);
    busy.current = false;
    return () => {
      generation.current++;
    };
  }, [lease.id, lease.publishedVersion]);
  const submit = async () => {
    if (!review || busy.current) return;
    let content: string;
    try {
      content = (await form.validateFields()).content.trim();
    } catch {
      return;
    }
    busy.current = true;
    setSaving(true);
    const current = generation.current;
    try {
      await replyLeaseReview(lease.id, {
        action: 'REPLY',
        publishedVersion: lease.publishedVersion,
        contentHash: lease.contentHash,
        reviewId: review.id,
        version: review.version,
        content,
      });
      if (current !== generation.current) return;
      message.success('回复已发送，等待意见提出人确认');
      setReview(undefined);
      onChanged();
    } catch {
      /* 请求层统一提示，保留输入。 */
    } finally {
      if (current === generation.current) {
        setSaving(false);
        busy.current = false;
      }
    }
  };
  const labels = {
    OPEN: '待回复',
    REPLIED: '待提出人确认',
    RESOLVED: '已解决',
  };
  return (
    <>
      <Alert
        type={lease.unresolvedReviews ? 'warning' : 'info'}
        showIcon
        message={
          lease.unresolvedReviews
            ? `${lease.unresolvedReviews} 条审阅意见尚未解决，双方暂不能继续签署`
            : '合同审阅记录'
        }
        description="管理员回复后，由意见提出人确认是否解决。需要改正文时，双方均未签署的合同可先撤回修改，再重新发送；历史意见保留。"
      />
      <List
        locale={{
          emptyText: (
            <Empty
              description="暂无审阅意见"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          ),
        }}
        dataSource={lease.reviews || []}
        renderItem={(item) => (
          <List.Item
            key={item.id}
            actions={
              item.currentRound &&
              item.status === 'OPEN' &&
              lease.status === 'PENDING_SIGNATURE' &&
              hasPermission('system:property:lease:update')
                ? [
                    <Button
                      key="reply"
                      onClick={() => {
                        form.resetFields();
                        setReview(item);
                      }}
                    >
                      回复意见
                    </Button>,
                  ]
                : undefined
            }
          >
            <List.Item.Meta
              title={
                <Space wrap>
                  <Typography.Text strong>{item.clauseLabel}</Typography.Text>
                  <Tag>
                    {item.currentRound ? labels[item.status] : '历史签约轮次'}
                  </Tag>
                </Space>
              }
              description={
                <div>
                  <Typography.Text type="secondary">
                    {item.authorRole === 'TENANT' ? '承租方' : '出租方'} ·{' '}
                    {item.createTime}
                  </Typography.Text>
                  <Typography.Paragraph
                    style={{ whiteSpace: 'pre-wrap', marginTop: 8 }}
                  >
                    {item.content}
                  </Typography.Paragraph>
                  {item.reply && (
                    <Typography.Paragraph style={{ whiteSpace: 'pre-wrap' }}>
                      <strong>管理员回复：</strong>
                      {item.reply}
                    </Typography.Paragraph>
                  )}
                </div>
              }
            />
          </List.Item>
        )}
      />
      <Modal
        title="回复合同审阅意见"
        open={Boolean(review)}
        onCancel={() => {
          if (!saving) setReview(undefined);
        }}
        onOk={submit}
        okText="发送回复"
        cancelText="取消"
        confirmLoading={saving}
        cancelButtonProps={{ disabled: saving }}
        destroyOnHidden
      >
        <Typography.Paragraph>
          {review?.clauseLabel}：{review?.content}
        </Typography.Paragraph>
        <Form form={form} layout="vertical">
          <Form.Item
            name="content"
            label="处理说明"
            rules={[
              {
                required: true,
                whitespace: true,
                message: '请填写具体处理说明',
              },
              { max: 800 },
            ]}
          >
            <Input.TextArea
              rows={5}
              maxLength={800}
              showCount
              placeholder="说明如何处理该问题。回复不会直接修改合同条款。"
            />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
