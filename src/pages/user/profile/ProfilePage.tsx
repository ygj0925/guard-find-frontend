import { PageContainer } from '@ant-design/pro-components';
import { useModel } from '@umijs/max';
import { Card, Tabs } from 'antd';
import React from 'react';
import AvatarUpload from './components/AvatarUpload';
import BasicInfoForm from './components/BasicInfoForm';
import SecurityForm from './components/SecurityForm';
import SocialBindings from './components/SocialBindings';

const ProfilePage: React.FC = () => {
  const { initialState, refresh } = useModel('@@initialState');
  const userInfo = initialState?.user;

  return (
    <PageContainer>
      <Card>
        <div style={{ display: 'flex', gap: 24, marginBottom: 24 }}>
          <AvatarUpload avatar={userInfo?.avatar} onSuccess={refresh} />
          <div>
            <h3>{userInfo?.nickname || userInfo?.username}</h3>
            <p style={{ color: '#666' }}>{userInfo?.deptName || '暂无部门'}</p>
          </div>
        </div>
        <Tabs
          items={[
            {
              key: 'basic',
              label: '基本信息',
              children: (
                <BasicInfoForm userInfo={userInfo} onSuccess={refresh} />
              ),
            },
            {
              key: 'security',
              label: '安全设置',
              children: <SecurityForm />,
            },
            {
              key: 'social',
              label: '社交账号',
              children: <SocialBindings />,
            },
          ]}
        />
      </Card>
    </PageContainer>
  );
};

export default ProfilePage;
