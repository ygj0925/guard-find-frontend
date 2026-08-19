import type { KeepAliveRef } from 'keepalive-for-react';
import KeepAliveRouteOutlet from 'keepalive-for-react-router';
import type { RefObject } from 'react';
import React from 'react';

interface KeepAliveOutletProps {
  aliveRef: RefObject<KeepAliveRef | null>;
}

const KeepAliveOutlet: React.FC<KeepAliveOutletProps> = ({ aliveRef }) => {
  return (
    <KeepAliveRouteOutlet
      aliveRef={aliveRef}
      max={20}
      exclude={[/^\/user\//, '/404']}
    />
  );
};

export default KeepAliveOutlet;
