import { UserOutlined } from '@ant-design/icons';
import { Avatar, message } from 'antd';
import React, { useState } from 'react';
import AvatarCropper from '@/components/AvatarCropper';
import * as profileService from '@/services/web/user-profile';

interface Props {
  avatar?: string;
  onSuccess: () => void;
}

const AvatarUpload: React.FC<Props> = ({ avatar, onSuccess }) => {
  const [visible, setVisible] = useState(false);

  const handleUpload = async (file: Blob) => {
    await profileService.uploadAvatar(file, 'avatar.jpg');
    message.success('头像更新成功');
    setVisible(false);
    onSuccess();
  };

  return (
    <>
      <Avatar
        size={80}
        src={avatar}
        icon={<UserOutlined />}
        style={{ cursor: 'pointer' }}
        onClick={() => setVisible(true)}
      />
      <AvatarCropper
        visible={visible}
        onCancel={() => setVisible(false)}
        onUpload={handleUpload}
      />
    </>
  );
};

export default AvatarUpload;
