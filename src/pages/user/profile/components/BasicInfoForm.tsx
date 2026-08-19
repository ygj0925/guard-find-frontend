import { ProForm, ProFormRadio, ProFormText } from '@ant-design/pro-components';
import { message } from 'antd';
import React from 'react';
import * as profileService from '@/services/web/user-profile';

interface Props {
  userInfo?: {
    username?: string;
    nickname?: string;
    gender?: number;
    email?: string;
    phone?: string;
  };
  onSuccess: () => void;
}

const BasicInfoForm: React.FC<Props> = ({ userInfo, onSuccess }) => {
  const handleSubmit = async (values: any) => {
    await profileService.updateBasicInfo(values);
    message.success('修改成功');
    onSuccess();
  };

  return (
    <ProForm
      initialValues={{
        nickname: userInfo?.nickname,
        gender: userInfo?.gender,
      }}
      onFinish={handleSubmit}
      layout="horizontal"
      labelCol={{ span: 4 }}
      wrapperCol={{ span: 12 }}
    >
      <ProFormText
        label="用户名"
        name="username"
        disabled
        initialValue={userInfo?.username}
      />
      <ProFormText
        label="昵称"
        name="nickname"
        rules={[{ required: true, message: '请输入昵称' }]}
      />
      <ProFormRadio.Group
        label="性别"
        name="gender"
        options={[
          { label: '未知', value: 0 },
          { label: '男', value: 1 },
          { label: '女', value: 2 },
        ]}
      />
      <ProFormText
        label="邮箱"
        name="email"
        disabled
        initialValue={userInfo?.email}
      />
      <ProFormText
        label="手机号"
        name="phone"
        disabled
        initialValue={userInfo?.phone}
      />
    </ProForm>
  );
};

export default BasicInfoForm;
