import React from 'react';
import OptionForm from './OptionForm';

const SmsConfig: React.FC = () => (
  <OptionForm
    category="sms"
    fields={[
      { name: 'sms_enabled', label: '启用短信' },
      { name: 'sms_default_platform', label: '默认平台' },
      { name: 'sms_sign_name', label: '短信签名' },
    ]}
  />
);

export default SmsConfig;
