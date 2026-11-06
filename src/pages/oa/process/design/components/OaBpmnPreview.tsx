/**
 * 只读预览：用 NavigatedViewer 渲染已通过前端预检的 XML，并展示节点摘要。
 */
import { Descriptions, List, Modal, Tag, Typography } from 'antd';
import React from 'react';
import type { OaBpmnSummary } from '@/utils/oaBpmn';
import OaBpmnCanvas from './OaBpmnCanvas';

type OaBpmnPreviewProps = {
  open: boolean;
  xml: string;
  summary: OaBpmnSummary;
  onClose: () => void;
};

const OaBpmnPreview: React.FC<OaBpmnPreviewProps> = ({
  open,
  xml,
  summary,
  onClose,
}) => {
  return (
    <Modal
      open={open}
      title="流程预览"
      width={1040}
      footer={null}
      destroyOnHidden
      onCancel={onClose}
    >
      {open ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <OaBpmnCanvas xml={xml} readOnly />
          <Descriptions size="small" column={4} bordered>
            <Descriptions.Item label="流程">
              {summary.processName || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="标识">
              <Typography.Text copyable>
                {summary.processId || '-'}
              </Typography.Text>
            </Descriptions.Item>
            <Descriptions.Item label="节点">
              {summary.nodeCount}
            </Descriptions.Item>
            <Descriptions.Item label="条件连线">
              {summary.conditionCount}
            </Descriptions.Item>
            <Descriptions.Item label="审批节点">
              {summary.userTaskCount}
            </Descriptions.Item>
            <Descriptions.Item label="服务任务">
              {summary.serviceTaskCount}
            </Descriptions.Item>
            <Descriptions.Item label="网关">
              {summary.gatewayCount}
            </Descriptions.Item>
            <Descriptions.Item label="定时边界">
              {summary.boundaryTimerCount}
            </Descriptions.Item>
          </Descriptions>
          <List
            size="small"
            header={<Typography.Text strong>审批节点</Typography.Text>}
            dataSource={summary.userTasks}
            locale={{ emptyText: '没有审批节点' }}
            renderItem={(task) => (
              <List.Item>
                <Tag color="blue">{task.name || task.id}</Tag>
                <Typography.Text type="secondary">
                  {task.assignment || '未配置审批范围'}
                </Typography.Text>
              </List.Item>
            )}
          />
        </div>
      ) : null}
    </Modal>
  );
};

export default OaBpmnPreview;
