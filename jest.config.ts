import { createConfig } from '@umijs/max/test';

export default async (): Promise<any> => {
  const config = createConfig({
    target: 'browser',
  });
  return {
    ...config,
    // These match tsconfig.json; resolving them must not compile the app.
    moduleNameMapper: {
      ...config.moduleNameMapper,
      '^@/(.*)$': '<rootDir>/src/$1',
      '^@@/(.*)$': '<rootDir>/src/.umi/$1',
      '^~/config/(.*)$': '<rootDir>/config/$1',
    },
    testEnvironmentOptions: {
      ...(config?.testEnvironmentOptions || {}),
      url: 'http://localhost:8000',
    },
    setupFiles: [...(config.setupFiles || []), './tests/setupTests.jsx'],
    globals: {
      ...config.globals,
      'jest-esbuild': { jsx: 'automatic' },
      localStorage: null,
    },
  };
};
