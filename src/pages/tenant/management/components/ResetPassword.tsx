import { ProForm, ProFormText } from '@ant-design/pro-components';
import { Modal, message } from 'antd';
import React from 'react';
import { resetTenantPassword } from '@/services/web/tenant/management';
import { encryptByRsa } from '@/utils/Encrypt';

interface ResetPasswordProps {
  visible: boolean;
  tenantId: number | null;
  onCancel: () => void;
  onSuccess: () => void;
}

const ResetPassword: React.FC<ResetPasswordProps> = ({
  visible,
  tenantId,
  onCancel,
  onSuccess,
}) => {
  const [form] = ProForm.useForm();

  const handleSubmit = async (values: any) => {
    if (!tenantId) return;
    try {
      const encryptedPassword = encryptByRsa(values.password);
      await resetTenantPassword(tenantId, encryptedPassword);
      message.success('密码重置成功');
      onSuccess();
    } catch (error) {
      console.error('Reset password failed:', error);
    }
  };

  return (
    <Modal
      title="重置密码"
      open={visible}
      onCancel={onCancel}
      footer={null}
      destroyOnClose
    >
      <ProForm form={form} onFinish={handleSubmit}>
        <ProFormText.Password
          name="password"
          label="新密码"
          placeholder="请输入新密码"
          rules={[{ required: true, message: '请输入新密码' }]}
        />
        <ProFormText.Password
          name="confirmPassword"
          label="确认密码"
          placeholder="请再次输入新密码"
          rules={[
            { required: true, message: '请再次输入新密码' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('password') === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error('两次输入的密码不一致'));
              },
            }),
          ]}
        />
      </ProForm>
    </Modal>
  );
};

export default ResetPassword;
