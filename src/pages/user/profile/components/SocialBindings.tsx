import { Button, List, message, Popconfirm, Tag } from 'antd';
import React, { useEffect, useState } from 'react';
import * as profileService from '@/services/web/user-profile';
import type { SocialBindVo } from '@/services/web/user-profile/typings';

const SocialBindings: React.FC = () => {
  const [bindings, setBindings] = useState<SocialBindVo[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchBindings = async () => {
    setLoading(true);
    try {
      const res = await profileService.getSocialBindings();
      if (res.data) setBindings(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBindings();
  }, []);

  const handleUnbind = async (source: string) => {
    await profileService.unbindSocial(source);
    message.success('解绑成功');
    fetchBindings();
  };

  return (
    <List
      loading={loading}
      dataSource={bindings}
      renderItem={(item) => (
        <List.Item
          actions={[
            item.bound ? (
              <Popconfirm
                key="unbind"
                title="确定要解绑该账号吗？"
                onConfirm={() => handleUnbind(item.source)}
              >
                <Button type="link" danger>
                  解绑
                </Button>
              </Popconfirm>
            ) : (
              <Button key="bind" type="link">
                绑定
              </Button>
            ),
          ]}
        >
          <List.Item.Meta
            title={item.description || item.source}
            description={
              item.bound ? <Tag color="green">已绑定</Tag> : <Tag>未绑定</Tag>
            }
          />
        </List.Item>
      )}
    />
  );
};

export default SocialBindings;
