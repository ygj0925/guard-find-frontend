## 1. API Proxy Configuration

- [x] 1.1 Update `config/proxy.ts`: change `/sss-task/` to `/dev-api/`, add `pathRewrite: { '^/dev-api': '' }`
- [x] 1.2 Update `config/config.dev.ts`: change all `process.env.requestPrefix` values from `/sss-task` to `/dev-api`
- [x] 1.3 Update `config/config.prod.ts`: update production `requestPrefix` to match deployment
- [ ] 1.4 Verify existing pages (login, user list, role list) work correctly with new proxy

## 2. Dashboard - Workplace

- [x] 2.1 Create service: `src/services/web/dashboard/index.ts` with statistics, activity, and todo APIs
- [x] 2.2 Create service typings: `src/services/web/dashboard/typings.ts`
- [x] 2.3 Create page: `src/pages/dashboard/workplace/WorkplacePage.tsx` with statistics cards, shortcuts, activity timeline
- [x] 2.4 Install `@ant-design/charts` dependency for chart components
- [x] 2.5 Run `node scripts/genPageMap.js` to register new page

## 3. Dashboard - Analysis

- [x] 3.1 Create page: `src/pages/dashboard/analysis/AnalysisPage.tsx` with charts (line, column, pie) and ranking tables
- [x] 3.2 Create chart sub-components: `src/pages/dashboard/analysis/components/` (TrendChart, ModuleUsageChart, RankingList)
- [x] 3.3 Implement date range filter and data refresh logic
- [x] 3.4 Run `node scripts/genPageMap.js` to register new page

## 4. User Profile (Personal Center)

- [x] 4.1 Create service: `src/services/web/user-profile/index.ts` (get profile, update basic, upload avatar, change password/phone/email, social bindings)
- [x] 4.2 Create service typings: `src/services/web/user-profile/typings.ts`
- [x] 4.3 Create page: `src/pages/user/profile/ProfilePage.tsx` with tabbed layout (Basic Info, Security, Social Accounts)
- [x] 4.4 Create component: `src/pages/user/profile/components/BasicInfoForm.tsx`
- [x] 4.5 Create component: `src/pages/user/profile/components/AvatarUpload.tsx` (using existing AvatarCropper component)
- [x] 4.6 Create component: `src/pages/user/profile/components/SecurityForm.tsx` (password, phone, email change with captcha)
- [x] 4.7 Create component: `src/pages/user/profile/components/SocialBindings.tsx`
- [x] 4.8 Run `node scripts/genPageMap.js` to register new page

## 5. User Message Center

- [x] 5.1 Create service: `src/services/web/user-message/index.ts` (list messages, mark read, delete, unread count, notices)
- [x] 5.2 Create service typings: `src/services/web/user-message/typings.ts`
- [x] 5.3 Create page: `src/pages/user/message/MessagePage.tsx` with message list and actions
- [x] 5.4 Create component: `src/pages/user/message/components/MessageList.tsx`
- [x] 5.5 Create component: `src/pages/user/message/components/NoticeDetail.tsx`
- [ ] 5.6 Add unread badge to header (integrate with RightContent/AvatarDropdown)
- [x] 5.7 Run `node scripts/genPageMap.js` to register new page

## 6. Monitor - Online Users

- [x] 6.1 Create service: `src/services/web/monitor/online.ts` (list online users, kickout)
- [x] 6.2 Create service typings: `src/services/web/monitor/typings.ts`
- [x] 6.3 Create page: `src/pages/monitor/online/OnlinePage.tsx` with ProTable (username, IP, login time, browser, OS) and kickout button
- [x] 6.4 Run `node scripts/genPageMap.js` to register new page

## 7. System - File Management

- [x] 7.1 Create service: `src/services/web/file/index.ts` (upload, list, delete, recycle CRUD, statistics)
- [x] 7.2 Create service typings: `src/services/web/file/typings.ts`
- [x] 7.3 Create page: `src/pages/system/file/FilePage.tsx` with file list table, upload area, and tab for recycle bin
- [x] 7.4 Create component: `src/pages/system/file/components/FileUpload.tsx` (drag-and-drop upload)
- [x] 7.5 Create component: `src/pages/system/file/components/RecycleBin.tsx`
- [x] 7.6 Create component: `src/pages/system/file/components/StorageStats.tsx` (statistics cards)
- [x] 7.7 Run `node scripts/genPageMap.js` to register new page

## 8. System - Storage Management

- [x] 8.1 Create service: `src/services/web/storage/index.ts` (CRUD, set default, toggle status)
- [x] 8.2 Create service typings: `src/services/web/storage/typings.ts`
- [x] 8.3 Create page: `src/pages/system/storage/StoragePage.tsx` with ProTable and actions
- [x] 8.4 Create component: `src/pages/system/storage/components/StorageForm.tsx` (ModalForm with type-specific fields)
- [x] 8.5 Run `node scripts/genPageMap.js` to register new page

## 9. System - Config Sub-pages Enhancement

- [x] 9.1 Refactor `src/pages/system/config/SysConfigPage.tsx` to use Ant Design Tabs
- [x] 9.2 Create component: `src/pages/system/config/components/SiteConfig.tsx`
- [x] 9.3 Create component: `src/pages/system/config/components/SecurityConfig.tsx`
- [x] 9.4 Create component: `src/pages/system/config/components/MailConfig.tsx`
- [x] 9.5 Create component: `src/pages/system/config/components/LoginConfig.tsx`
- [x] 9.6 Create component: `src/pages/system/config/components/StorageConfig.tsx`
- [x] 9.7 Create component: `src/pages/system/config/components/SmsConfig.tsx`
- [x] 9.8 Create component: `src/pages/system/config/components/ClientConfig.tsx`

## 10. System - SMS Platform Configuration

- [x] 10.1 Create service: `src/services/web/sms/config.ts` (CRUD, set default)
- [x] 10.2 Create service typings: `src/services/web/sms/typings.ts`
- [x] 10.3 Create page: `src/pages/system/sms-config/SmsConfigPage.tsx` with ProTable
- [x] 10.4 Create component: `src/pages/system/sms-config/components/SmsConfigForm.tsx`
- [x] 10.5 Run `node scripts/genPageMap.js` to register new page

## 11. Monitor - SMS Send Log

- [x] 11.1 Create service: `src/services/web/sms/log.ts` (list, delete, export)
- [x] 11.2 Create page: `src/pages/monitor/sms-log/SmsLogPage.tsx` with ProTable, batch delete, export button
- [x] 11.3 Run `node scripts/genPageMap.js` to register new page

## 12. Schedule - Job Management

- [x] 12.1 Create service: `src/services/web/schedule/job.ts` (CRUD, trigger, toggle status)
- [x] 12.2 Create service typings: `src/services/web/schedule/typings.ts`
- [x] 12.3 Create page: `src/pages/schedule/job/JobPage.tsx` with ProTable, trigger/pause/resume actions
- [x] 12.4 Create component: `src/pages/schedule/job/components/JobForm.tsx` (ModalForm with cron expression input)
- [x] 12.5 Run `node scripts/genPageMap.js` to register new page

## 13. Schedule - Job Execution Log

- [x] 13.1 Create service: `src/services/web/schedule/log.ts` (list, stop, retry)
- [x] 13.2 Create page: `src/pages/schedule/log/JobLogPage.tsx` with ProTable, filter by job/status, stop/retry actions
- [x] 13.3 Run `node scripts/genPageMap.js` to register new page

## 14. Tenant Management

- [x] 14.1 Create service: `src/services/web/tenant/management.ts` (CRUD, reset password)
- [x] 14.2 Create service typings: `src/services/web/tenant/typings.ts`
- [x] 14.3 Create page: `src/pages/tenant/management/TenantPage.tsx` with ProTable
- [x] 14.4 Create component: `src/pages/tenant/management/components/TenantForm.tsx`
- [x] 14.5 Create component: `src/pages/tenant/management/components/ResetPassword.tsx` (with RSA encryption)
- [x] 14.6 Run `node scripts/genPageMap.js` to register new page

## 15. Tenant Package

- [x] 15.1 Create service: `src/services/web/tenant/package.ts` (CRUD, menu tree, assign menus)
- [x] 15.2 Create page: `src/pages/tenant/package/PackagePage.tsx` with ProTable
- [x] 15.3 Create component: `src/pages/tenant/package/components/PackageForm.tsx`
- [x] 15.4 Create component: `src/pages/tenant/package/components/MenuAssign.tsx` (tree checkbox selector)
- [x] 15.5 Run `node scripts/genPageMap.js` to register new page

## 16. Open Platform - App Management

- [x] 16.1 Create service: `src/services/web/open/app.ts` (CRUD, get/reset secret, export)
- [x] 16.2 Create service typings: `src/services/web/open/typings.ts`
- [x] 16.3 Create page: `src/pages/open/app/AppPage.tsx` with ProTable and export button
- [x] 16.4 Create component: `src/pages/open/app/components/AppForm.tsx`
- [x] 16.5 Create component: `src/pages/open/app/components/SecretModal.tsx` (view/reset secret)
- [x] 16.6 Run `node scripts/genPageMap.js` to register new page

## 17. Code Generator

- [x] 17.1 Create service: `src/services/web/code/generator.ts` (list tables, config, field config, preview, download, generate)
- [x] 17.2 Create service typings: `src/services/web/code/typings.ts`
- [x] 17.3 Create page: `src/pages/code/generator/GeneratorPage.tsx` with table list and configure/preview/download actions
- [x] 17.4 Create component: `src/pages/code/generator/components/TableConfig.tsx` (table-level settings form)
- [x] 17.5 Create component: `src/pages/code/generator/components/FieldConfig.tsx` (editable field table)
- [x] 17.6 Create component: `src/pages/code/generator/components/CodePreview.tsx` (tabbed code display with syntax highlight)
- [x] 17.7 Run `node scripts/genPageMap.js` to register new page

## 18. Final Integration & Verification

- [x] 18.1 Run full `node scripts/genPageMap.js` to ensure all new pages are registered in pageImports.ts
- [ ] 18.2 Configure backend menus for all new pages (provide SQL or guide)
- [ ] 18.3 Verify all pages load correctly with dynamic routing
- [ ] 18.4 Verify permission controls work on all new pages
- [x] 18.5 Run TypeScript type check (`tsc --noEmit`) to ensure no type errors
