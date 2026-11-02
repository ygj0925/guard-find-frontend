import {
  Fragment,
  type ReactNode,
  useState,
  useSyncExternalStore,
} from 'react';

interface DialogSnapshot<T> {
  visible: boolean;
  data: T;
  instance: number;
}

interface DialogController<T> {
  open: (data: T) => void;
  close: () => void;
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => DialogSnapshot<T> | null;
}

/** Only DialogHost subscribes, so opening a dialog does not render its page/table. */
export function useDialog<T = undefined>(): DialogController<T> {
  const [dialog] = useState(() => {
    let snapshot: DialogSnapshot<T> | null = null;
    const listeners = new Set<() => void>();
    const notify = () => {
      listeners.forEach((listener) => {
        listener();
      });
    };

    return {
      open(data: T) {
        snapshot = {
          visible: true,
          data,
          instance: (snapshot?.instance ?? 0) + 1,
        };
        notify();
      },
      close() {
        if (!snapshot?.visible) return;
        // Retain content until the closing animation finishes.
        snapshot = { ...snapshot, visible: false };
        notify();
      },
      subscribe(listener: () => void) {
        listeners.add(listener);
        return () => {
          listeners.delete(listener);
        };
      },
      getSnapshot: () => snapshot,
    };
  });
  return dialog;
}

export default function DialogHost<T>({
  dialog,
  children,
}: {
  dialog: DialogController<T>;
  children: (state: DialogSnapshot<T>) => ReactNode;
}) {
  const snapshot = useSyncExternalStore(
    dialog.subscribe,
    dialog.getSnapshot,
    dialog.getSnapshot,
  );
  // Mount on first use. A new instance resets form/selection state on every open.
  return snapshot ? (
    <Fragment key={snapshot.instance}>{children(snapshot)}</Fragment>
  ) : null;
}
