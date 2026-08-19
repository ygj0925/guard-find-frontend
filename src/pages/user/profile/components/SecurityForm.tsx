import { ProForm, ProFormText } from '@ant-design/pro-components';
import { Card, message } from 'antd';
import React from 'react';
import * as profileService from '@/services/web/user-profile';
import { encryptByRsa } from '@/utils/Encrypt';

const SecurityForm: React.FC = () => {
  const handlePasswordChange = async (values: any) => {
    const data = {
      oldPassword: encryptByRsa(values.oldPassword) || values.oldPassword,
      newPassword: encryptByRsa(values.newPassword) || values.newPassword,
    };
    await profileService.changePassword(data);
    message.success('密码修改成功');
  };

  return (
    <div style={{ maxWidth: 500 }}>
      <Card title="修改密码" size="small" style={{ marginBottom: 16 }}>
        <ProForm
          onFinish={handlePasswordChange}
          layout="horizontal"
          labelCol={{ span: 6 }}
        >
          <ProFormText.Password
            label="当前密码"
            name="oldPassword"
            rules={[{ required: true, message: '请输入当前密码' }]}
          />
          <ProFormText.Password
            label="新密码"
            name="newPassword"
            rules={[
              { required: true, message: '请输入新密码' },
              { min: 6, message: '密码至少6位' },
            ]}
          />
          <ProFormText.Password
            label="确认密码"
            name="confirmPassword"
            dependencies={['newPassword']}
            rules={[
              { required: true, message: '请确认新密码' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('两次密码不一致'));
                },
              }),
            ]}
          />
        </ProForm>
      </Card>
    </div>
  );
};

export default SecurityForm;
