import { history } from '@umijs/max';
import { App, Button, Card, Form, Input, Typography } from 'antd';
import React, { useState } from 'react';
import { updateUserPassword } from '@/services/web/login';
import { encryptByRsa } from '@/utils/Encrypt';
import { clearAuthStorage } from '@/utils/Web';

type PasswordForm = {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
};

const PasswordExpired: React.FC = () => {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm<PasswordForm>();

  const submit = async (values: PasswordForm) => {
    setLoading(true);
    try {
      await updateUserPassword({
        oldPassword: encryptByRsa(values.oldPassword),
        newPassword: encryptByRsa(values.newPassword),
      });
      clearAuthStorage();
      message.success('密码修改成功，请重新登录');
      history.replace('/user/login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: 24,
        background: '#f3f6fb',
      }}
    >
      <Card style={{ width: 'min(480px, 100%)', borderRadius: 16 }}>
        <Typography.Title level={2}>密码已过期</Typography.Title>
        <Typography.Paragraph type="danger">
          请修改密码后重新登录
        </Typography.Paragraph>
        <Form
          form={form}
          layout="vertical"
          onFinish={submit}
          requiredMark={false}
        >
          <Form.Item
            name="oldPassword"
            label="当前密码"
            rules={[{ required: true, message: '请输入当前密码' }]}
          >
            <Input.Password />
          </Form.Item>
          <Form.Item
            name="newPassword"
            label="新密码"
            dependencies={['oldPassword']}
            rules={[
              { required: true, message: '请输入新密码' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  return value && value === getFieldValue('oldPassword')
                    ? Promise.reject(new Error('新密码不能与当前密码相同'))
                    : Promise.resolve();
                },
              }),
            ]}
          >
            <Input.Password />
          </Form.Item>
          <Form.Item
            name="confirmPassword"
            label="确认新密码"
            dependencies={['newPassword']}
            rules={[
              { required: true, message: '请再次输入新密码' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  return value !== getFieldValue('newPassword')
                    ? Promise.reject(new Error('两次输入的密码不一致'))
                    : Promise.resolve();
                },
              }),
            ]}
          >
            <Input.Password />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={loading} block>
            立即修改
          </Button>
        </Form>
      </Card>
    </main>
  );
};

export default PasswordExpired;
