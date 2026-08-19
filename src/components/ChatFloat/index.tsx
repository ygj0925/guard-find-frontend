import { CommentOutlined } from '@ant-design/icons';
import React, { Suspense, useCallback, useRef, useState } from 'react';
import './index.css';

const ChatWindow = React.lazy(() => import('./ChatWindow'));

const DRAG_THRESHOLD = 5;
const BUTTON_SIZE = 48;
const EDGE_MARGIN = 12;

const ChatFloat: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(() => ({
    x: window.innerWidth - BUTTON_SIZE - 24,
    y: window.innerHeight - BUTTON_SIZE - 24,
  }));
  const dragState = useRef({
    dragging: false,
    startX: 0,
    startY: 0,
    startPosX: 0,
    startPosY: 0,
    moved: false,
  });

  const clamp = useCallback((x: number, y: number) => {
    const maxX = window.innerWidth - BUTTON_SIZE - EDGE_MARGIN;
    const maxY = window.innerHeight - BUTTON_SIZE - EDGE_MARGIN;
    return {
      x: Math.max(EDGE_MARGIN, Math.min(x, maxX)),
      y: Math.max(EDGE_MARGIN, Math.min(y, maxY)),
    };
  }, []);

  const snapToEdge = useCallback((x: number, y: number) => {
    const midX = window.innerWidth / 2;
    const snapX =
      x + BUTTON_SIZE / 2 < midX
        ? EDGE_MARGIN
        : window.innerWidth - BUTTON_SIZE - EDGE_MARGIN;
    return { x: snapX, y };
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      dragState.current = {
        dragging: true,
        startX: e.clientX,
        startY: e.clientY,
        startPosX: pos.x,
        startPosY: pos.y,
        moved: false,
      };
    },
    [pos],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const ds = dragState.current;
      if (!ds.dragging) return;

      const dx = e.clientX - ds.startX;
      const dy = e.clientY - ds.startY;

      if (!ds.moved && Math.abs(dx) + Math.abs(dy) > DRAG_THRESHOLD) {
        ds.moved = true;
      }

      if (ds.moved) {
        const clamped = clamp(ds.startPosX + dx, ds.startPosY + dy);
        setPos(clamped);
      }
    },
    [clamp],
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      const ds = dragState.current;
      ds.dragging = false;

      if (ds.moved) {
        const snapped = snapToEdge(pos.x, pos.y);
        setPos(clamp(snapped.x, snapped.y));
      } else {
        setOpen((prev) => !prev);
      }

      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    },
    [pos, snapToEdge, clamp],
  );

  return (
    <>
      {/* Draggable Button */}
      <div
        className="chat-float-btn"
        style={{
          transform: `translate3d(${pos.x}px, ${pos.y}px, 0)`,
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <CommentOutlined style={{ fontSize: 22, color: '#fff' }} />
      </div>

      {open && (
        <Suspense fallback={null}>
          <ChatWindow onClose={() => setOpen(false)} />
        </Suspense>
      )}
    </>
  );
};

export default ChatFloat;
