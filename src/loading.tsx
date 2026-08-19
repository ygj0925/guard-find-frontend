import { Spin } from 'antd';

const Loading: React.FC = () => (
  <Spin
    size="default"
    style={{
      margin: '24px 40px',
      position: 'fixed',
      left: '50%',
      transform: 'translateX(-50%)',
    }}
  />
);

export default Loading;
