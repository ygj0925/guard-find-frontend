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
        initialValues={{ status: 1 }}
      >
        <ProFormText
          name="name"
          label="任务名称"
          placeholder="请输入任务名称"
          rules={[{ required: true, message: '请输入任务名称' }]}
        />
        <ProFormText
          name="jobGroup"
          label="任务分组"
          placeholder="请输入任务分组"
          rules={[{ required: true, message: '请输入任务分组' }]}
        />
        <ProFormText
          name="cronExpression"
          label="Cron表达式"
          placeholder="请输入Cron表达式"
          rules={[{ required: true, message: '请输入Cron表达式' }]}
        />
        <ProFormText
          name="targetBean"
          label="目标Bean"
          placeholder="请输入目标Bean"
          rules={[{ required: true, message: '请输入目标Bean' }]}
        />
        <ProFormText
          name="targetMethod"
          label="目标方法"
          placeholder="请输入目标方法"
          rules={[{ required: true, message: '请输入目标方法' }]}
        />
        <ProFormTextArea
          name="targetParams"
          label="目标参数"
          placeholder="请输入目标参数"
        />
        <ProFormTextArea
          name="description"
          label="描述"
          placeholder="请输入描述"
        />
        <ProFormRadio.Group
          name="status"
          label="状态"
          options={[
            { label: '暂停', value: 0 },
            { label: '运行', value: 1 },
          ]}
        />
      </ProForm>
    </Modal>
  );
};

export default JobForm;
