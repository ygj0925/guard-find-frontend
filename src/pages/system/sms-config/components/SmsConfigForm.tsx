import {
  ModalForm,
  ProFormSelect,
  ProFormText,
  ProFormTextArea,
} from '@ant-design/pro-components';
import { message } from 'antd';
import React from 'react';
import { createSmsConfig, updateSmsConfig } from '@/services/web/sms/config';
import type { SmsConfigVo } from '@/services/web/sms/typings';

interface SmsConfigFormProps {
  visible: boolean;
  record: SmsConfigVo | null;
  onCancel: () => void;
  onSuccess: () => void;
}

const SmsConfigForm: React.FC<SmsConfigFormProps> = ({
  visible,
  record,
  onCancel,
  onSuccess,
}) => {
  const handleSubmit = async (values: any) => {
    try {
      if (record) {
        await updateSmsConfig({ ...values, id: record.id });
      } else {
        await createSmsConfig(values);
      }
      message.success(record ? '编辑成功' : '新增成功');
      onSuccess();
      return true;
    } catch (error) {
      console.error('Submit failed:', error);
      return false;
    }
  };

  return (
    <ModalForm
      title={record ? '编辑短信配置' : '新增短信配置'}
      open={visible}
      modalProps={{
        onCancel,
        destroyOnClose: true,
      }}
      initialValues={record || {}}
      onFinish={handleSubmit}
      width={600}
    >
      <ProFormText
        name="name"
        label="名称"
        placeholder="请输入名称"
        rules={[{ required: true, message: '请输入名称' }]}
      />
      <ProFormSelect
        name="platform"
        label="平台"
        placeholder="请选择平台"
        rules={[{ required: true, message: '请选择平台' }]}
        options={[
          { label: '阿里云', value: '阿里云' },
          { label: '腾讯云', value: '腾讯云' },
          { label: '华为云', value: '华为云' },
        ]}
      />
      <ProFormText
        name="accessKey"
        label="AccessKey"
        placeholder="请输入AccessKey"
        rules={[{ required: true, message: '请输入AccessKey' }]}
      />
      <ProFormText.Password
        name="secretKey"
        label="SecretKey"
        placeholder="请输入SecretKey"
        rules={[{ required: true, message: '请输入SecretKey' }]}
      />
      <ProFormText
        name="signName"
        label="签名"
        placeholder="请输入短信签名"
        rules={[{ required: true, message: '请输入短信签名' }]}
      />
      <ProFormText
        name="templateId"
        label="模板ID"
        placeholder="请输入模板ID"
      />
      <ProFormTextArea
        name="description"
        label="描述"
        placeholder="请输入描述"
      />
    </ModalForm>
  );
};

export default SmsConfigForm;
