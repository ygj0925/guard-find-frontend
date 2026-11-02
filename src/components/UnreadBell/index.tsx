import { BellOutlined } from '@ant-design/icons';
import { history, useModel } from '@umijs/max';
import { Badge } from 'antd';

/** Count updates should only render the badge, not the application layout. */
export default function UnreadBell() {
  const count = useModel(
    'unread',
    (model) => model.messageUnread + model.noticeUnread,
  );
  return (
    <Badge count={count} size="small" offset={[-2, 2]}>
      <BellOutlined
        style={{ fontSize: 16, cursor: 'pointer' }}
        onClick={() => history.push('/user/message')}
      />
    </Badge>
  );
}
