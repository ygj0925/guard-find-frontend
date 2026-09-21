import { BankOutlined } from '@ant-design/icons';
import { history } from '@umijs/max';
import { Alert, Button, Card, Space, Typography } from 'antd';
import React, { useEffect, useState } from 'react';
import { socialAuth } from '@/services/web/login';
import { LoginCorp, LoginRedirect } from '@/utils/Web';

const corporations = [
  { code: 'WXCP_PHARMA', name: '三生制药' },
  { code: 'WXCP_GUOJIAN', name: '三生国健' },
];

const CorpSelect: React.FC = () => {
  const [loadingCorp, setLoadingCorp] = useState('');
  const [error, setError] = useState('');

  const startLogin = async (corp: string) => {
    setLoadingCorp(corp);
    setError('');
    LoginCorp.set(corp);
    try {
      const response = await socialAuth(corp);
      const authorizeUrl = new URL(response.data.authorizeUrl);
      const redirect =
        new URLSearchParams(history.location.search).get('redirect') ||
        LoginRedirect.get();
      if (redirect) {
        LoginRedirect.set(redirect);
        authorizeUrl.searchParams.set('redirect', redirect);
      }
      window.location.replace(authorizeUrl.toString());
    } catch {
      setError('获取登录地址失败，请重试');
      setLoadingCorp('');
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(history.location.search);
    const corp = (params.get('corp') || LoginCorp.get() || '').toUpperCase();
    if (corporations.some((item) => item.code === corp)) startLogin(corp);
  }, []);

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
      <Card style={{ width: 'min(560px, 100%)', borderRadius: 16 }}>
        <Typography.Title level={2}>选择企业</Typography.Title>
        <Typography.Paragraph type="secondary">
          请选择要登录的企业主体
        </Typography.Paragraph>
        {error && (
          <Alert
            type="error"
            message={error}
            showIcon
            style={{ marginBottom: 20 }}
          />
        )}
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          {corporations.map((corp) => (
            <Button
              key={corp.code}
              size="large"
              icon={<BankOutlined />}
              loading={loadingCorp === corp.code}
              disabled={Boolean(loadingCorp)}
              onClick={() => startLogin(corp.code)}
              block
            >
              {corp.name}
            </Button>
          ))}
          <Button type="link" onClick={() => history.push('/user/login')}>
            使用账号密码登录
          </Button>
        </Space>
      </Card>
    </main>
  );
};

export default CorpSelect;
