import React from 'react';
import OptionForm from './OptionForm';

/** 邮件设置：category=MAIL */
const MailConfig: React.FC = () => (
  <OptionForm
    category="MAIL"
    fields={[
      { code: 'MAIL_PROTOCOL', label: '邮件协议' },
      { code: 'MAIL_HOST', label: '服务器地址' },
      { code: 'MAIL_PORT', label: '服务器端口' },
      { code: 'MAIL_USERNAME', label: '邮箱账号' },
      { code: 'MAIL_PASSWORD', label: '邮箱密码', type: 'password' },
      { code: 'MAIL_SSL_ENABLED', label: '启用SSL加密' },
      { code: 'MAIL_SSL_PORT', label: 'SSL端口号' },
    ]}
  />
);

export default MailConfig;
