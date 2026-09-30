import {
  ProForm,
  ProFormRadio,
  ProFormText,
  ProFormTextArea,
} from '@ant-design/pro-components';
import { Modal, message } from 'antd';
import React, { useEffect } from 'react';
import { createJob, updateJob } from '@/services/web/schedule/job';
import type { JobVo } from '@/services/web/schedule/typings';

interface JobFormProps {
  visible: boolean;
  record: JobVo | null;
  onCancel: () => void;
  onSuccess: () => void;
}

const JobForm: React.FC<JobFormProps> = ({
  visible,
  record,
  onCancel,
  onSuccess,
}) => {
  const [form] = ProForm.useForm();

  useEffect(() => {
    if (visible) {
      if (record) {
        form.setFieldsValue(record);
      } else {
        form.resetFields();
      }
    }
  }, [visible, record, form]);

  const handleSubmit = async (values: any) => {
    try {
      if (record) {
        await updateJob({ ...values, id: record.id });
      } else {
        await createJob(values);
      }
      message.success('操作成功');
      onSuccess();
    } catch (error) {
      console.error('Submit failed:', error);
    }
  };

  return (
    <Modal
      title={record ? '编辑定时任务' : '新增定时任务'}
      open={visible}
      onCancel={onCancel}
      footer={null}
      destroyOnClose
    >
      <ProForm
        form={form}
        onFinish={handleSubmit}
        initialValues={{ jobStatus: 1, triggerType: 1, groupName: 'jgroup' }}
      >
        <ProFormText
          name="jobName"
          label="任务名称"
          placeholder="请输入任务名称"
          rules={[{ required: true, message: '请输入任务名称' }]}
        />
        <ProFormText
          name="groupName"
          label="任务分组"
          placeholder="请输入任务分组"
          rules={[{ required: true, message: '请输入任务分组' }]}
        />
        <ProFormRadio.Group
          name="triggerType"
          label="触发类型"
          options={[
            { label: 'CRON', value: 1 },
            { label: '固定时间', value: 2 },
            { label: 'API', value: 3 },
          ]}
        />
        <ProFormText
          name="triggerInterval"
          label="触发表达式"
          placeholder="CRON 表达式或固定间隔秒数"
          rules={[{ required: true, message: '请输入触发表达式' }]}
        />
        <ProFormText
          name="executorInfo"
          label="执行器信息"
          placeholder="如 Bean 名或方法签名"
        />
        <ProFormTextArea
          name="argsStr"
          label="任务参数"
          placeholder="请输入任务参数"
        />
        <ProFormTextArea
          name="description"
          label="描述"
          placeholder="请输入描述"
        />
        <ProFormRadio.Group
          name="jobStatus"
          label="状态"
          extra="后端 JobStatusEnum：0 禁用 / 1 启用"
          options={[
            { label: '禁用', value: 0 },
            { label: '启用', value: 1 },
          ]}
        />
      </ProForm>
    </Modal>
  );
};

export default JobForm;
