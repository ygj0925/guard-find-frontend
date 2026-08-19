import type { Route } from '@ant-design/pro-layout/lib/typing';
import { Component } from 'react';

export type InlineMeta = {
  uri: string;
};

export interface InlineState {
  meta: InlineMeta;
}

export type InlineProps = {
  meta?: InlineMeta;
  route?: Route;
};

class Inline extends Component<InlineProps, InlineState> {
  constructor(props: InlineProps) {
    super(props);
    const { meta, route } = props;
    this.state = { meta: meta || route?.meta };
  }

  render() {
    const { meta } = this.state;

    return (
      <iframe
        title="嵌入页面"
        style={{
          boxSizing: 'border-box',
          height: '100%',
          width: '100%',
          border: '0',
        }}
        src={meta?.uri || ''}
      />
    );
  }
}

export default Inline;
