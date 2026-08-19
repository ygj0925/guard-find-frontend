import React from 'react';
import OptionForm from './OptionForm';

const MailConfig: React.FC = () => (
  <OptionForm
    category="mail"
    fields={[
      { name: 'mail_host', label: 'SMTP主机' },
      { name: 'mail_port', label: '端口' },
      { name: 'mail_username', label: '用户名' },
      { name: 'mail_password', label: '密码', type: 'password' },
      { name: 'mail_from', label: '发件人地址' },
      { name: 'mail_ssl_enabled', label: '启用SSL' },
    ]}
  />
);

export default MailConfig;
