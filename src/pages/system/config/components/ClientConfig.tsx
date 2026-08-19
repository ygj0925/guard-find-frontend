import React from 'react';
import OptionForm from './OptionForm';

const ClientConfig: React.FC = () => (
  <OptionForm
    category="client"
    fields={[
      { name: 'client_id', label: '客户端ID' },
      { name: 'client_secret', label: '客户端密钥', type: 'password' },
      { name: 'client_redirect_uri', label: '回调地址' },
    ]}
  />
);

export default ClientConfig;
