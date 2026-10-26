import type { OptionCategory } from '@/services/web/system';

const resources: Record<OptionCategory, string> = {
  SITE: 'siteConfig',
  PASSWORD: 'securityConfig',
  MAIL: 'mailConfig',
  LOGIN: 'loginConfig',
};

export const getOptionPermission = (
  category: OptionCategory,
  action: 'get' | 'update',
) => `system:${resources[category]}:${action}`;
