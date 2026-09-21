import { history, useModel } from '@umijs/max';
import { Result, Spin } from 'antd';
import React, { useEffect, useState } from 'react';
import { socialLogin } from '@/services/web/login';
import {
  establishAuthSession,
  resolveLoginRedirect,
} from '@/utils/AuthSession';

const SocialCallback: React.FC = () => {
  const { setInitialState } = useModel('@@initialState');
  const [error, setError] = useState('');

  useEffect(() => {
    const run = async () => {
      try {
        const params = new URLSearchParams(history.location.search);
        const source = params.get('source') || '';
        const payload = Object.fromEntries(params.entries());
        delete payload.redirect;
        const response = await socialLogin(source, payload);
        const user = await establishAuthSession(
          response.data.token,
          response.data.tenantId,
        );
        setInitialState((state) => ({ ...state, user }));
        window.location.replace(resolveLoginRedirect(history.location.search));
      } catch {
        setError('第三方登录失败，请重新选择登录方式');
      }
    };
    run();
  }, [setInitialState]);

  if (error)
    return (
      <Result
        status="error"
        title={error}
        extra={<a href="/corp-select">返回企业选择</a>}
      />
    );
  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
      <Spin size="large" tip="正在登录" />
    </div>
  );
};

export default SocialCallback;
