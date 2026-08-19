import {
  LockOutlined,
  MailOutlined,
  MobileOutlined,
  SafetyCertificateOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { history, useModel } from '@umijs/max';
import {
  App,
  Button,
  Checkbox,
  Divider,
  Form,
  Input,
  Tabs,
  Typography,
} from 'antd';
import React, { useCallback, useEffect, useState } from 'react';
import {
  emailLogin,
  getEmailCaptcha,
  getImageCaptcha,
  getSmsCaptcha,
  login,
  phoneLogin,
} from '@/services/web/login';
import {
  establishAuthSession,
  resolveLoginRedirect,
} from '@/utils/AuthSession';
import { encryptByRsa } from '@/utils/Encrypt';
import { isPasswordLoginEnabled, redirectToLogin } from '@/utils/LoginRedirect';
import Settings from '../../../config/defaultSettings';

type LoginMode = 'account' | 'phone' | 'email';
type LoginFormValues = {
  username?: string;
  password?: string;
  phone?: string;
  email?: string;
  captcha?: string;
  remember?: boolean;
};

const AuthLogin: React.FC = () => {
  const { message } = App.useApp();
  const { setInitialState } = useModel('@@initialState');
  const passwordLoginEnabled = isPasswordLoginEnabled();
  const searchParams = new URLSearchParams(history.location.search);
  const ssoError = searchParams.get('ssoError') === '1';
  const loginRedirect = searchParams.get('redirect') || '/';
  const [form] = Form.useForm<LoginFormValues>();
  const [mode, setMode] = useState<LoginMode>('account');
  const [loading, setLoading] = useState(false);
  const [captchaLoading, setCaptchaLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [captcha, setCaptcha] = useState({
    uuid: '',
    img: '',
    isEnabled: true,
  });

  const loadCaptcha = useCallback(async () => {
    setCaptchaLoading(true);
    try {
      const response = await getImageCaptcha();
      setCaptcha({
        uuid: response.data.uuid,
        img: response.data.img,
        isEnabled: response.data.isEnabled,
      });
    } finally {
      setCaptchaLoading(false);
    }
  }, []);

  useEffect(() => {
    if (passwordLoginEnabled) void loadCaptcha();
  }, [loadCaptcha, passwordLoginEnabled]);
  useEffect(() => {
    if (!passwordLoginEnabled && !ssoError) {
      void redirectToLogin(loginRedirect);
    }
  }, [loginRedirect, passwordLoginEnabled, ssoError]);
  useEffect(() => {
    if (!countdown) return;
    const timer = window.setInterval(
      () => setCountdown((value) => Math.max(0, value - 1)),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [countdown]);

  const finishLogin = async (token: string, tenantId: string) => {
    const user = await establishAuthSession(token, tenantId);
    setInitialState((state) => ({ ...state, user }));
    message.success('欢迎使用');
    window.location.replace(resolveLoginRedirect(history.location.search));
  };

  const handleSubmit = async (values: LoginFormValues) => {
    setLoading(true);
    try {
      if (mode === 'account') {
        const response = await login({
          username: values.username || '',
          password: encryptByRsa(values.password || ''),
          captcha: values.captcha || '',
          uuid: captcha.uuid,
          clientId: process.env.clientId,
        });
        await finishLogin(response.data.token, response.data.tenantId);
      } else if (mode === 'phone') {
        const response = await phoneLogin({
          phone: values.phone || '',
          captcha: values.captcha || '',
        });
        await finishLogin(response.data.token, response.data.tenantId);
      } else {
        const response = await emailLogin({
          email: values.email || '',
          captcha: values.captcha || '',
        });
        await finishLogin(response.data.token, response.data.tenantId);
      }
    } catch {
      if (mode === 'account') await loadCaptcha();
    } finally {
      setLoading(false);
    }
  };

  const sendCode = async () => {
    const field = mode === 'phone' ? 'phone' : 'email';
    await form.validateFields([field]);
    setCaptchaLoading(true);
    try {
      if (mode === 'phone')
        await getSmsCaptcha(form.getFieldValue('phone') || '');
      else await getEmailCaptcha(form.getFieldValue('email') || '');
      setCountdown(60);
      message.success('验证码已发送');
    } finally {
      setCaptchaLoading(false);
    }
  };

  const codeInput = (
    <Form.Item
      name="captcha"
      rules={[{ required: true, message: '请输入验证码' }]}
    >
      <Input
        size="large"
        prefix={<SafetyCertificateOutlined />}
        placeholder="验证码"
        suffix={
          <Button
            type="link"
            loading={captchaLoading}
            disabled={countdown > 0}
            onClick={sendCode}
          >
            {countdown ? `${countdown}s` : '获取验证码'}
          </Button>
        }
      />
    </Form.Item>
  );

  if (!passwordLoginEnabled) {
    if (!ssoError) return null;
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
        }}
      >
        <Typography.Title level={4}>三方登录暂时不可用</Typography.Title>
        <Typography.Text type="secondary">
          请检查网络后重新发起登录。
        </Typography.Text>
        <Button
          type="primary"
          onClick={() => void redirectToLogin(loginRedirect)}
        >
          重新登录
        </Button>
      </div>
    );
  }

  return (
    <main className="login-page">
      <section className="login-panel">
        <div className="login-brand">
          <Typography.Title level={2}>{Settings.title}</Typography.Title>
          <div>
            <Typography.Title level={1}>高效协同，从空间开始</Typography.Title>
            <Typography.Paragraph>
              统一会议室预约、权限与组织资源，让每一次会议更简单。
            </Typography.Paragraph>
          </div>
        </div>
        <div className="login-form-area">
          <Typography.Title level={2}>欢迎登录</Typography.Title>
          <Tabs
            activeKey={mode}
            onChange={(key) => {
              setMode(key as LoginMode);
              form.resetFields();
            }}
            items={[
              { key: 'account', label: '账号登录' },
              { key: 'phone', label: '手机号登录' },
              { key: 'email', label: '邮箱登录' },
            ]}
          />
          <Form<LoginFormValues>
            form={form}
            layout="vertical"
            initialValues={{ remember: true }}
            onFinish={handleSubmit}
            requiredMark={false}
          >
            {mode === 'account' && (
              <>
                <Form.Item
                  name="username"
                  rules={[{ required: true, message: '请输入用户名' }]}
                >
                  <Input
                    size="large"
                    prefix={<UserOutlined />}
                    placeholder="用户名"
                    autoComplete="username"
                  />
                </Form.Item>
                <Form.Item
                  name="password"
                  rules={[{ required: true, message: '请输入密码' }]}
                >
                  <Input.Password
                    size="large"
                    prefix={<LockOutlined />}
                    placeholder="密码"
                    autoComplete="current-password"
                  />
                </Form.Item>
                {captcha.isEnabled && (
                  <Form.Item
                    name="captcha"
                    rules={[{ required: true, message: '请输入验证码' }]}
                  >
                    <Input
                      size="large"
                      prefix={<SafetyCertificateOutlined />}
                      placeholder="验证码"
                      suffix={
                        <Button
                          type="text"
                          loading={captchaLoading}
                          onClick={loadCaptcha}
                          className="captcha-button"
                        >
                          {captcha.img ? (
                            <img src={captcha.img} alt="验证码" />
                          ) : (
                            '刷新'
                          )}
                        </Button>
                      }
                    />
                  </Form.Item>
                )}
                <Form.Item name="remember" valuePropName="checked">
                  <Checkbox>记住我</Checkbox>
                </Form.Item>
              </>
            )}
            {mode === 'phone' && (
              <>
                <Form.Item
                  name="phone"
                  rules={[
                    { required: true, message: '请输入手机号' },
                    { pattern: /^1\d{10}$/, message: '请输入正确的手机号' },
                  ]}
                >
                  <Input
                    size="large"
                    prefix={<MobileOutlined />}
                    placeholder="手机号"
                  />
                </Form.Item>
                {codeInput}
              </>
            )}
            {mode === 'email' && (
              <>
                <Form.Item
                  name="email"
                  rules={[
                    { required: true, message: '请输入邮箱' },
                    { type: 'email', message: '请输入正确的邮箱' },
                  ]}
                >
                  <Input
                    size="large"
                    prefix={<MailOutlined />}
                    placeholder="邮箱"
                  />
                </Form.Item>
                {codeInput}
              </>
            )}
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              loading={loading}
              block
            >
              立即登录
            </Button>
            <Divider plain>其他登录方式</Divider>
            <Button
              onClick={() =>
                history.push(`/corp-select${history.location.search}`)
              }
              block
            >
              企业微信登录
            </Button>
          </Form>
        </div>
      </section>
      <style>{`.login-page{min-height:100vh;display:grid;place-items:center;padding:24px;background:radial-gradient(circle at 15% 20%,rgba(22,119,255,.18),transparent 32%),linear-gradient(145deg,#f4f8ff,#eef3fa)}.login-panel{width:min(920px,100%);min-height:520px;display:grid;grid-template-columns:minmax(0,1.15fr) minmax(380px,.85fr);overflow:hidden;border-radius:20px;background:#fff;box-shadow:0 24px 70px rgba(31,55,90,.16)}.login-brand{padding:56px;color:#fff;display:flex;flex-direction:column;justify-content:space-between;background:linear-gradient(145deg,#0958d9,#1677ff 62%,#69b1ff)}.login-brand .ant-typography{color:#fff}.login-brand p.ant-typography{color:rgba(255,255,255,.78);font-size:16px}.login-form-area{padding:48px;align-self:center}.captcha-button{height:34px;padding:0}.captcha-button img{width:104px;height:34px;object-fit:cover}@media(max-width:760px){.login-panel{grid-template-columns:1fr}.login-brand{display:none}.login-form-area{padding:40px 28px}}`}</style>
    </main>
  );
};

export default AuthLogin;
