import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { IApi } from '@umijs/max';

export default function routeTabs(api: IApi) {
  // The preset otherwise wraps the entire convention layout in cached tabs.
  // Mount useKeepOutlets inside ProLayout instead, so navigation is never cached.
  api.skipPlugins(['maxtabs']);

  api.onGenerateFiles({
    stage: Infinity,
    fn() {
      // Alita 3.5.5 does not unsubscribe its event listeners on unmount.
      // Authorization changes remount the outlet, so release those subscriptions.
      const path = 'plugin-keepalive/context.tsx';
      const content = readFileSync(join(api.paths.absTmpPath, path), 'utf8')
        .replace(
          'this.subscriptions.add(subscription);',
          'this.subscriptions.add(subscription); return () => this.subscriptions.delete(subscription);',
        )
        .replace(
          '\n      keepaliveEmitter?.useSubscription?.((event)',
          '\n      return keepaliveEmitter?.useSubscription?.((event)',
        );
      api.writeTmpFile({ path, content, noPluginDir: true });
    },
  });
}
