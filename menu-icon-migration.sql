-- Normalize menu icons to names registered by src/components/Icon/icons.ts.
-- The update is limited to existing menu rows with one of the legacy names.
START TRANSACTION;

UPDATE sys_menu
SET icon = CASE icon
  WHEN 'settings' THEN 'setting'
  WHEN 'user-management' THEN 'team'
  WHEN 'mind-mapping' THEN 'apartment'
  WHEN 'bookmark' THEN 'book'
  WHEN 'config' THEN 'setting'
  WHEN 'apps' THEN 'appstore'
  WHEN 'safe' THEN 'safety'
  WHEN 'email' THEN 'mail'
  WHEN 'storage' THEN 'database'
  WHEN 'computer' THEN 'desktop'
  WHEN 'expand' THEN 'fullscreen'
  WHEN 'common' THEN 'appstore'
  WHEN 'select-all' THEN 'check-square'
  WHEN 'find-replace' THEN 'search'
  WHEN 'code-release-managment' THEN 'code'
  ELSE icon
END
WHERE deleted = 0
  AND icon IN (
    'settings',
    'user-management',
    'mind-mapping',
    'bookmark',
    'config',
    'apps',
    'safe',
    'email',
    'storage',
    'computer',
    'expand',
    'common',
    'select-all',
    'find-replace',
    'code-release-managment'
  );

COMMIT;

-- Optional verification:
-- SELECT id, title, icon
-- FROM sys_menu
-- WHERE deleted = 0
-- ORDER BY id;
