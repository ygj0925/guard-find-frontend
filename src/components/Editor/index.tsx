import { Spin } from 'antd';
import { lazy, memo, Suspense } from 'react';
import type { EditorProps } from './EditorImpl';

const EditorImpl = lazy(() => import('./EditorImpl'));

function Editor(props: EditorProps) {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: props.height ?? 300,
            display: 'grid',
            placeItems: 'center',
          }}
        >
          <Spin />
        </div>
      }
    >
      <EditorImpl {...props} />
    </Suspense>
  );
}

export default memo(Editor);
